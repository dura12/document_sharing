import { describe, it, expect, vi, beforeEach } from "vitest";
import { Document } from "../models/document.model.js";
import {
  registerDocumentHandlers,
  flushAllActiveDocuments,
} from "./document.handler.js";

// Mock Mongoose model
vi.mock("../models/document.model.js", () => {
  return {
    Document: {
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      create: vi.fn(),
    },
  };
});

describe("Document Socket Handlers & Synchronization", () => {
  let mockIo: any;
  let mockSocket: any;
  let socketListeners: Map<string, Function>;
  let roomEmits: Map<string, { event: string; data: any }[]>;

  beforeEach(async () => {
    await flushAllActiveDocuments();
    vi.clearAllMocks();

    socketListeners = new Map();
    roomEmits = new Map();

    mockIo = {
      to: vi.fn((room: string) => ({
        emit: vi.fn((event: string, data: any) => {
          const list = roomEmits.get(room) || [];
          list.push({ event, data });
          roomEmits.set(room, list);
        }),
      })),
    };

    mockSocket = {
      id: "socket-123",
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      broadcast: {
        to: vi.fn((room: string) => ({
          emit: vi.fn((event: string, data: any) => {
            const list = roomEmits.get(room) || [];
            list.push({ event, data });
            roomEmits.set(room, list);
          }),
        })),
      },
      on: vi.fn((event: string, callback: Function) => {
        socketListeners.set(event, callback);
      }),
    };

    (Document.findById as any).mockResolvedValue(null);
    (Document.create as any).mockResolvedValue({
      _id: "doc-1",
      title: "Untitled Document",
      data: { ops: [] },
    });
    (Document.findByIdAndUpdate as any).mockResolvedValue({});
  });

  it("registers listeners without nesting or memory leaks", () => {
    registerDocumentHandlers(mockIo, mockSocket);

    expect(socketListeners.has("get-document")).toBe(true);
    expect(socketListeners.has("send-changes")).toBe(true);
    expect(socketListeners.has("change-title")).toBe(true);
    expect(socketListeners.has("cursor-move")).toBe(true);
    expect(socketListeners.has("save-document")).toBe(true);
    expect(socketListeners.has("disconnect")).toBe(true);

    // Call get-document: should not re-register socket.on
    const getDocHandler = socketListeners.get("get-document")!;
    const initialListenerCount = mockSocket.on.mock.calls.length;

    getDocHandler("doc-1");
    expect(mockSocket.on.mock.calls.length).toBe(initialListenerCount);
  });

  it("loads document and tracks user presence", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;

    await getDocHandler("doc-1", { name: "Alice" });

    expect(mockSocket.join).toHaveBeenCalledWith("doc-1");
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "load-document",
      expect.objectContaining({
        id: "doc-1",
        title: "Untitled Document",
        data: { ops: [] },
      }),
    );

    const roomEvents = roomEmits.get("doc-1") || [];
    const presenceEvent = roomEvents.find((e) => e.event === "presence-updated");
    expect(presenceEvent).toBeDefined();
    expect(presenceEvent?.data).toEqual([
      expect.objectContaining({ id: "socket-123", name: "Alice" }),
    ]);
  });

  it("correctly composes concurrent deltas into canonical state", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-1");

    const sendChangesHandler = socketListeners.get("send-changes")!;

    // First change: insert "Hello"
    sendChangesHandler({ ops: [{ insert: "Hello" }] });

    // Second change: retain 5, insert " World"
    sendChangesHandler({ ops: [{ retain: 5 }, { insert: " World" }] });

    // Check broadcast to other clients
    expect(mockSocket.broadcast.to).toHaveBeenCalledWith("doc-1");

    // Force flush
    await flushAllActiveDocuments();

    // Verify persisted to DB as composed ops
    expect(Document.findByIdAndUpdate).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({
        title: "Untitled Document",
        data: { ops: [{ insert: "Hello World" }] },
      }),
    );
  });

  it("handles title updates and broadcasts to collaborators", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-1");

    const changeTitleHandler = socketListeners.get("change-title")!;
    await changeTitleHandler("Quarterly Roadmap");

    const roomEvents = roomEmits.get("doc-1") || [];
    const titleEvent = roomEvents.find((e) => e.event === "title-updated");
    expect(titleEvent?.data).toBe("Quarterly Roadmap");
  });

  it("cleans up user presence on disconnect", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-1");

    const disconnectHandler = socketListeners.get("disconnect")!;
    await disconnectHandler();

    expect(mockSocket.leave).toHaveBeenCalledWith("doc-1");
  });

  it("enforces role-based permissions: viewer cannot edit content or change title", async () => {
    (Document.findById as any).mockResolvedValue({
      _id: "doc-perm",
      title: "Protected Doc",
      data: { ops: [{ insert: "Original Content" }] },
      defaultRole: "viewer",
      collaboratorRoles: [],
      comments: [],
      versions: [],
    });

    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-perm", { name: "Guest Viewer" });

    // Attempt to edit document text as viewer
    const sendChangesHandler = socketListeners.get("send-changes")!;
    sendChangesHandler({ ops: [{ insert: " Malicious Change" }] });

    // Broadcast should NOT have been called for send-changes
    expect(mockSocket.broadcast.to).not.toHaveBeenCalled();

    // Attempt to rename document as viewer
    const changeTitleHandler = socketListeners.get("change-title")!;
    await changeTitleHandler("Hacked Title");

    const roomEvents = roomEmits.get("doc-perm") || [];
    const titleEvent = roomEvents.find((e) => e.event === "title-updated");
    expect(titleEvent).toBeUndefined();
  });

  it("handles threaded comments lifecycle (add, resolve, reply, delete)", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-comments");

    const addCommentHandler = socketListeners.get("add-comment")!;
    const testComment = {
      id: "c-101",
      author: { name: "Sarah Connor", color: "#1a73e8" },
      text: "Please review section 2",
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };
    addCommentHandler(testComment);

    let roomEvents = roomEmits.get("doc-comments") || [];
    let commentsEvent = roomEvents.find((e) => e.event === "comments-updated");
    expect(commentsEvent).toBeDefined();
    expect(commentsEvent?.data[0].id).toBe("c-101");

    // Reply to comment
    const replyCommentHandler = socketListeners.get("reply-comment")!;
    replyCommentHandler("c-101", {
      id: "r-201",
      author: { name: "Alex Morgan", color: "#d93025" },
      text: "Done, section 2 updated.",
      createdAt: new Date().toISOString(),
    });

    roomEvents = roomEmits.get("doc-comments") || [];
    const lastCommentsEvent = roomEvents
      .filter((e) => e.event === "comments-updated")
      .pop();
    expect(lastCommentsEvent?.data[0].replies.length).toBe(1);

    // Resolve comment
    const resolveCommentHandler = socketListeners.get("resolve-comment")!;
    resolveCommentHandler("c-101");

    const afterResolve = roomEmits
      .get("doc-comments")!
      .filter((e) => e.event === "comments-updated")
      .pop();
    expect(afterResolve?.data[0].resolved).toBe(true);
  });

  it("handles version snapshots and manual version creation", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-versions");

    const createVersionHandler = socketListeners.get("create-version")!;
    createVersionHandler("Release v1.0");

    const roomEvents = roomEmits.get("doc-versions") || [];
    const versionsEvent = roomEvents.find((e) => e.event === "versions-updated");
    expect(versionsEvent).toBeDefined();
    expect(versionsEvent?.data[0].label).toBe("Release v1.0");
  });

  it("broadcasts real-time typing indicators", async () => {
    registerDocumentHandlers(mockIo, mockSocket);
    const getDocHandler = socketListeners.get("get-document")!;
    await getDocHandler("doc-typing");

    const typingStartHandler = socketListeners.get("typing-start")!;
    typingStartHandler();

    expect(mockSocket.broadcast.to).toHaveBeenCalledWith("doc-typing");

    const typingStopHandler = socketListeners.get("typing-stop")!;
    typingStopHandler();

    expect(mockSocket.broadcast.to).toHaveBeenCalledWith("doc-typing");
  });
});
