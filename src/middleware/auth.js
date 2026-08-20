import jwt from "jsonwebtoken";
import { getUserById } from "../data/mockData.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// This is the crux of the "security & safety" requirement: the user's role
// is established ONCE here, from a signed token, using the server's own
// user table. It is never taken from the chat message text or from
// anything the LLM says. A parent's session cannot become a teacher's
// session no matter what the user types in the chat box.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const freshUser = getUserById(payload.userId); // re-check against source of truth, not just the token claims
    if (!freshUser) return res.status(401).json({ error: "User no longer exists" });
    req.authUser = freshUser;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
