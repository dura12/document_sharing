import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { documentRouter } from "./routes/document.routes.js";
import {
  registerDocumentHandlers,
  flushAllActiveDocuments,
} from "./handlers/document.handler.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types/index.js";

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (env.CLIENT_ORIGIN === "*") return true;
  const allowedList = env.CLIENT_ORIGIN.split(",").map((o) =>
    o.trim().replace(/\/$/, ""),
  );
  const normalized = origin.replace(/\/$/, "");
  return (
    allowedList.includes(normalized) ||
    normalized.endsWith(".vercel.app") ||
    normalized.startsWith("http://localhost:")
  );
};

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());

// REST API Routes
app.use("/api/auth", authRouter);
app.use("/api/documents", documentRouter);

// Health check endpoint (supports both /health and /api/health for Render/monitoring)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

async function bootstrap(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log(`[db] Connected to MongoDB`);

  io.on("connection", (socket) => {
    registerDocumentHandlers(io, socket);
  });

  httpServer.listen(env.PORT, () => {
    console.log(`[server] HTTP & Socket.IO server running on port ${env.PORT}`);
  });
}

async function shutdown(): Promise<void> {
  console.log("\n[server] Shutting down gracefully...");
  io.close();
  await flushAllActiveDocuments();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.connection.close();
  console.log("[db] Connection closed");
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown().catch((err) => {
    console.error("[server] Error during shutdown:", err);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown().catch((err) => {
    console.error("[server] Error during shutdown:", err);
    process.exit(1);
  });
});

bootstrap().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
