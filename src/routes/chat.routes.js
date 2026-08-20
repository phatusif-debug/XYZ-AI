import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { handleChatMessage, resetHistory } from "../ai/chatEngine.js";
import { escalations } from "../data/mockData.js";

const router = Router();

router.post("/message", requireAuth, async (req, res) => {
  const { message, language } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message (string) is required" });
  }
  try {
    const result = await handleChatMessage({ authUser: req.authUser, message, language });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI service error", detail: err.message });
  }
});

router.post("/reset", requireAuth, (req, res) => {
  resetHistory(req.authUser.userId);
  res.json({ ok: true });
});

// Lets the frontend show "your request was submitted" state, and gives
// teachers/management a place to see incoming escalations (mock inbox).
router.get("/escalations", requireAuth, (req, res) => {
  if (req.authUser.role === "teacher" || req.authUser.role === "principal") {
    const mine = escalations.filter(
      (e) => e.toUserId === req.authUser.userId || req.authUser.role === "principal"
    );
    return res.json(mine);
  }
  const mine = escalations.filter((e) => e.fromUserId === req.authUser.userId);
  res.json(mine);
});

export default router;
