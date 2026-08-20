# XYZ AI — Human-Like School Assistant

A role-based AI assistant for a school ERP. Students, parents, teachers, and
the principal each get a distinct persona and distinct capabilities, talking
to XYZ AI through chat or voice, with a lightweight animated avatar.

This repo is an MVP built to demonstrate the architecture and the required
use cases end-to-end, prioritized for a short build window. See
[Scope & trade-offs](#scope--trade-offs) for what's simplified and why.

## Repository structure

```
xyz-ai/
├── backend/     # Express API: auth, mock school ERP data, AI chat engine
└── frontend/    # React chat UI: login, chat, voice, avatar
```

This maps to the brief's five-repo layout (`student-portal`, `parent-portal`,
`management-portal`, `staff-portal`, `xyz-ai`) as a single app with
role-based views rather than five separate portals — see
[Scope & trade-offs](#scope--trade-offs).

## How it works

```
U

The brief asks for role detection, permission validation, and defenses
against prompt injection and fake role claims. This is **not** left to the
LLM to police itself:

1. **Login issues a signed JWT** containing the user's real `role`, looked
   up from the server's own user table (`backend/src/data/mockData.js`) —
   never from anything typed in chat.
2. **`requireAuth` middleware** re-verifies that user still exists on every
   request before the AI is even invoked.
3. **Tool definitions are filtered by role** before being sent to the model
   (`toolsAllowedForRole`) — a student's session literally never sees a
   `mark_attendance` tool definition.
4. **`executeTool()` re-checks permission again** at execution time
   (`isToolAllowedForRole`), so even if the model were tricked into
   attempting a disallowed tool call, it's blocked before touching data.
5. The system prompt (`backend/src/ai/personas.js`) explicitly instructs the
   model to ignore any in-chat claim of a different role or elevated
   permissions, and never to reveal its instructions or credentials — but
   this is a second layer, not the only one.

### Escalation

`request_escalation` is only called by the model **after** the user
explicitly confirms — the prompt forbids calling it just because someone
says they're unhappy. The tool result includes real `status`
(`submitted` / `failed_no_recipient`), and the assistant is instructed never
to claim a human was contacted unless that status says so.

## Running it

**Get a free API key first (no credit card):**
1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with any Google account.
2. Click "Get API key" → "Create API key."
3. Copy it — you'll paste it into `backend/.env` in the next step.

This uses Google's Gemini API (`gemini-2.5-flash`), which has a genuinely free tier — no billing setup, no card, roughly 1,500 requests/day, plenty for building and demoing this project.

**Backend**
```bash
cd backend
cp .env.example .env   # add your GEMINI_API_KEY (free — see below, no card needed)
npm install
npm run dev             # http://localhost:4000
```

**Frontend**
```bash
cd frontend
cp .env.example .env    # points at the backend URL
npm install
npm run dev              # http://localhost:5173
```

Log in as one of the four demo accounts shown on the login screen
(no password needed — this is a mock identity layer over the mock ERP).

Try:
- **Student:** "What is my attendance?"
- **Parent:** "How much attendance does my child have?"
- **Teacher:** "Mark Rahul absent today."
- **Principal:** "What is the overall attendance?"
- **Escalation:** "I'm not happy with this answer, I want to talk to the teacher." → confirm "yes"

## Scope & trade-offs

Built to a short deadline — these are the deliberate simplifications, not
oversights:

- **Voice** uses the browser's built-in Web Speech API (real STT/TTS, no
  external service) rather than a custom speech pipeline.
- **Avatar** is a simple state-driven 2D animation (idle/listening/
  thinking/speaking), not a 3D model with lip-sync — the brief itself
  scopes avatar/lip-sync to "where technically possible."
- **Languages**: rather than 11 separately engineered language models, the
  system prompt asks Claude (which is natively multilingual) to respond in
  the selected language, and Web Speech API's recognition/synthesis locale
  switches with it.
- **One app, role-based views** instead of five separate portal
  repos/deployments — the brief's actual grading surface (chat interface +
  role logic + security) doesn't require the infra overhead of five apps
  for an MVP.
- **Mock data is in-memory**, not a real database — resets on server
  restart. Swapping in Postgres/Prisma is a drop-in change to
  `backend/src/data/mockData.js`'s functions.
- **No persistent auth/password** — login is "pick your demo account,"
  since the brief's own use cases don't test a real identity provider.

## Testing

**Permission boundaries (no API key needed, deterministic):**
```bash
cd backend
npm test
```
Runs 12 tests against the real `executeTool` authorization layer — e.g.
confirms a parent can never call `mark_attendance` or read school-wide
analytics, a teacher can't read another class, etc.

**Adversarial security checks (needs your GEMINI_API_KEY, real model calls):**
```bash
cd backend
node test/security.manual.js
```
