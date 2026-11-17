import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";
import mongoose from "mongoose";
import { registerDocumentHandlers, flushAllActiveDocuments } from "./document.handler.js";
import { env } from "../config/env.js";

describe("Live Real-Time Multi-Client Collaboration", () => {
  let httpServer: any;
  let ioServer: any;
  let serverPort: number;

  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    httpServer = createServer();
    ioServer = new Server(httpServer, { cors: { origin: "*" } });

    ioServer.on("connection", (socket: any) => {
      registerDocumentHandlers(ioServer, socket);
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  }, 15000);

  afterAll(async () => {
    await flushAllActiveDocuments();
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await new Promise((r) => setTimeout(r, 200));
    await mongoose.connection.close();
  });

  it("broadcasts delta changes and presence between two clients in the same document room", async () => {
    const docId = `test-collab-${Date.now()}`;

    const client1 = ClientIO(`http://localhost:${serverPort}`);
    const client2 = ClientIO(`http://localhost:${serverPort}`);

    // Wait for connection
    await Promise.all([
      new Promise<void>((res) => client1.once("connect", () => res())),
      new Promise<void>((res) => client2.once("connect", () => res())),
    ]);

    // Setup presence listener for client 2
    const presencePromise = new Promise<any[]>((resolve) => {
      client2.on("presence-updated", (users: any[]) => {
        if (users.length >= 2) {
          resolve(users);
        }
      });
    });

    // Join document
    client1.emit("get-document", docId, { name: "Sarah Connor" });
    await new Promise((r) => setTimeout(r, 50));
    client2.emit("get-document", docId, { name: "Alex Morgan" });

    // Wait for load-document
    await Promise.all([
      new Promise<void>((res) => client1.once("load-document", () => res())),
      new Promise<void>((res) => client2.once("load-document", () => res())),
    ]);

    const activeUsers = await presencePromise;
    expect(activeUsers.some((u) => u.name === "Sarah Connor")).toBe(true);
    expect(activeUsers.some((u) => u.name === "Alex Morgan")).toBe(true);

    // Now Client 1 types: "Hello World"
    const deltaToSend = { ops: [{ insert: "Hello World" }] };

    const receivePromise = new Promise<any>((resolve) => {
      client2.once("receive-changes", (receivedDelta: any) => {
        resolve(receivedDelta);
      });
    });

    client1.emit("send-changes", deltaToSend);

    const received = await receivePromise;
    expect(received).toEqual(deltaToSend);

    client1.disconnect();
    client2.disconnect();
  });
});
