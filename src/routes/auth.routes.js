import { Router } from "express";
import jwt from "jsonwebtoken";
import { getUserById } from "../data/mockData.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Mock login: in the real ERP this would check a password / OTP / SSO.
// Here we just trust a userId that exists in our mock user table, so the
// assignment's "role detection" and "permission validation" can be
// demoed without building a real identity provider.
router.post("/login", (req, res) => {
  const { userId } = req.body || {};
  const user = getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "Unknown userId. Try STU001, PAR001, TCH001, or PRI001." });
  }
  const token = jwt.sign(
    { userId: user.userId, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, user: { userId: user.userId, role: user.role, name: user.name } });
});

// List demo accounts so the frontend login screen can show them.
router.get("/demo-users", (req, res) => {
  res.json([
    { userId: "STU001", role: "student", name: "Rahul Sharma" },
    { userId: "PAR001", role: "parent", name: "Sunita Sharma (Rahul's mother)" },
    { userId: "TCH001", role: "teacher", name: "Mrs. Fatima Khan" },
    { userId: "PRI001", role: "principal", name: "Mr. David Owusu" },
  ]);
});

export default router;
