import { GoogleGenAI } from "@google/genai";
import { toolsAllowedForRole } from "./tools.js";
import { executeTool } from "./executeTool.js";
import { PERSONAS, buildSystemPrompt } from "./personas.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Free-tier model on Google AI Studio — no credit card required.
const MODEL = "gemini-3.5-flash-lite";

// In-memory per-user conversation history for the demo. Swap for a real
// DB/session store in production.
const conversations = new Map(); // userId -> Content[] (Gemini's history format)

export function getHistory(userId) {
  return conversations.get(userId) || [];
}

export function resetHistory(userId) {
  conversations.set(userId, []);
}

// Our tool definitions (tools.js) are already plain JSON Schema
// ({type: "object", properties, required}), which Gemini's
// parametersJsonSchema accepts directly — no conversion needed.
function toGeminiTool(def) {
  return {
    name: def.name,
    description: def.description,
    parametersJsonSchema: def.input_schema,
  };
}

export async function handleChatMessage({ authUser, message, language = "English" }) {
  const persona = PERSONAS[authUser.role];
  const systemInstruction = buildSystemPrompt({ user: authUser, persona, language });
  const allowedTools = toolsAllowedForRole(authUser.role).map(toGeminiTool);

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction,
      tools: allowedTools.length ? [{ functionDeclarations: allowedTools }] : undefined,
    },
    history: getHistory(authUser.userId),
  });

  let toolActivity = [];
  let response = await chat.sendMessage({ message });

  const MAX_TURNS = 4; // guard against runaway tool-call loops

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const calls = response.functionCalls;
    if (!calls || calls.length === 0) break;

    // Execute each requested tool with server-side permission enforcement,
    // then feed all results back together so the model can respond in
    // natural language.
    const functionResponseParts = calls.map((call) => {
      const toolResult = executeTool(call.name, call.args, authUser);
      toolActivity.push({ tool: call.name, input: call.args, result: toolResult });
      return { functionResponse: { name: call.name, response: toolResult } };
    });

    response = await chat.sendMessage({ message: functionResponseParts });
  }

  const reply = (response.text || "").trim();
  conversations.set(authUser.userId, chat.getHistory());

  return { reply, toolActivity };
}
