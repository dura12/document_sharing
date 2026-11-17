import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";

const router = Router();

const USER_COLORS = [
  "#1a73e8", // Google Blue
  "#d93025", // Google Red
  "#188038", // Google Green
  "#f29900", // Yellow / Orange
  "#9334e6", // Purple
  "#12b5cb", // Cyan
  "#e52592", // Pink
];

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(testHash, "hex"),
  );
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters" });
      return;
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const randomColor =
      USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)] ?? "#1a73e8";

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      color: randomColor,
    });

    const token = crypto.randomBytes(32).toString("hex");

    res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        color: user.color,
      },
      token,
    });
  } catch (err) {
    console.error("[auth] Registration error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        color: user.color,
      },
      token,
    });
  } catch (err) {
    console.error("[auth] Login error:", err);
    res.status(500).json({ error: "Failed to log in" });
  }
});

export { router as authRouter };
