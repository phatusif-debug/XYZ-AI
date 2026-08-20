// Every tool the AI can call, and exactly which roles may call it.
// This map is the real access-control boundary. The system prompt also
// tells the model who it's talking to, but even if a user tricks the
// model into *trying* to call a tool it shouldn't, executeTool() below
// blocks it before any mock-API code runs.
export const TOOL_PERMISSIONS = {
  get_my_attendance: ["student"],
  get_child_attendance: ["parent"],
  mark_attendance: ["teacher"],
  get_school_attendance_summary: ["principal"],
  request_escalation: ["student", "parent"],
};

export const TOOL_DEFINITIONS = [
  {
    name: "get_my_attendance",
    description: "Get the currently logged-in student's own attendance percentage and recent record.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_child_attendance",
    description: "Get the attendance percentage and recent record for the logged-in parent's child.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "mark_attendance",
    description: "Mark a student present or absent for a given date. Only usable by teachers.",
    input_schema: {
      type: "object",
      properties: {
        studentName: { type: "string", description: "The student's name, e.g. 'Rahul'" },
        date: { type: "string", description: "Date in YYYY-MM-DD. Defaults to today if omitted." },
        status: { type: "string", enum: ["present", "absent"] },
      },
      required: ["studentName", "status"],
    },
  },
  {
    name: "get_school_attendance_summary",
    description: "Get school-wide / per-class attendance analytics. Only usable by the principal.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "request_escalation",
    description:
      "Submit a request to talk to a real teacher or contact school management. Only call this AFTER the user has explicitly confirmed (e.g. said 'yes') that they want the request sent — never call it just because they said they're unhappy.",
    input_schema: {
      type: "object",
      properties: {
        toRole: { type: "string", enum: ["teacher", "management"] },
        reason: { type: "string", description: "Short reason for the escalation." },
      },
      required: ["toRole", "reason"],
    },
  },
];

export function toolsAllowedForRole(role) {
  return TOOL_DEFINITIONS.filter((t) => TOOL_PERMISSIONS[t.name]?.includes(role));
}

export function isToolAllowedForRole(toolName, role) {
  return Boolean(TOOL_PERMISSIONS[toolName]?.includes(role));
}
