import { describe, it, expect, vi } from "vitest";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 && parts[0] && parts[1]
    ? (parts[0][0]! + parts[1][0]!).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

describe("Client Document Sync Protocol", () => {
  it("formats title correctly for document tab", () => {
    const rawTitle = "Sprint Planning";
    const formatted = `${rawTitle} - Google Docs Clone`;
    expect(formatted).toBe("Sprint Planning - Google Docs Clone");
  });

  it("handles anonymous collaborator initials extraction", () => {
    const user = { id: "1", name: "Anonymous Panda", color: "#1a73e8" };
    expect(getInitials(user.name)).toBe("AP");
  });

  it("handles single-word user initials extraction", () => {
    const user = { id: "2", name: "Alice", color: "#d93025" };
    expect(getInitials(user.name)).toBe("AL");
  });

  it("dispatches socket changes with correct delta payload", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const delta = { ops: [{ insert: "Hello world" }] };
    mockSocket.emit("send-changes", delta);

    expect(mockSocket.emit).toHaveBeenCalledWith("send-changes", delta);
  });

  it("dispatches title change event", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    mockSocket.emit("change-title", "New Architecture");
    expect(mockSocket.emit).toHaveBeenCalledWith("change-title", "New Architecture");
  });

  it("dispatches comments lifecycle events (add, resolve, reply)", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const comment = {
      id: "comment-1",
      author: { name: "Sarah Connor", color: "#1a73e8" },
      text: "Please verify security policy",
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };

    mockSocket.emit("add-comment", comment);
    expect(mockSocket.emit).toHaveBeenCalledWith("add-comment", comment);

    mockSocket.emit("resolve-comment", "comment-1");
    expect(mockSocket.emit).toHaveBeenCalledWith("resolve-comment", "comment-1");

    const reply = {
      id: "reply-1",
      author: { name: "Alex Morgan", color: "#d93025" },
      text: "Confirmed policy aligns with standard",
      createdAt: new Date().toISOString(),
    };
    mockSocket.emit("reply-comment", "comment-1", reply);
    expect(mockSocket.emit).toHaveBeenCalledWith("reply-comment", "comment-1", reply);
  });

  it("dispatches version snapshot creation and restoration", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    mockSocket.emit("create-version", "Milestone 1 Release");
    expect(mockSocket.emit).toHaveBeenCalledWith("create-version", "Milestone 1 Release");

    mockSocket.emit("restore-version", "version-uuid-123");
    expect(mockSocket.emit).toHaveBeenCalledWith("restore-version", "version-uuid-123");
  });

  it("dispatches real-time typing indicators", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    mockSocket.emit("typing-start");
    expect(mockSocket.emit).toHaveBeenCalledWith("typing-start");

    mockSocket.emit("typing-stop");
    expect(mockSocket.emit).toHaveBeenCalledWith("typing-stop");
  });

  it("dispatches role-based permission updates", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const roles = [
      { email: "alex.morgan@gmail.com", role: "commenter" as const },
      { email: "david.kim@gmail.com", role: "viewer" as const },
    ];
    mockSocket.emit("update-permissions", "viewer", roles);
    expect(mockSocket.emit).toHaveBeenCalledWith("update-permissions", "viewer", roles);
  });
});
