import mongoose from "mongoose";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const employees = [
  { name: "Sarah Connor", email: "sarah.connor@gmail.com", color: "#1a73e8" },
  { name: "Alex Morgan", email: "alex.morgan@gmail.com", color: "#d93025" },
  { name: "David Kim", email: "david.kim@gmail.com", color: "#188038" },
  { name: "Emily Watson", email: "emily.watson@gmail.com", color: "#f29900" },
  { name: "Michael Chen", email: "michael.chen@gmail.com", color: "#9334e6" },
];

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("[seed] Connected to MongoDB Atlas");

  for (const emp of employees) {
    const passwordHash = hashPassword("1234");
    await User.findOneAndUpdate(
      { email: emp.email },
      { name: emp.name, email: emp.email, passwordHash, color: emp.color },
      { upsert: true, new: true },
    );
    console.log(`[seed] Created/Updated: ${emp.name} (${emp.email})`);
  }

  await mongoose.connection.close();
  console.log("[seed] Successfully seeded 5 employees into MongoDB Atlas!");
}

seed().catch((err) => {
  console.error("[seed] Error seeding employees:", err);
  process.exit(1);
});
