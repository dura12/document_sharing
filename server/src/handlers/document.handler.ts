import crypto from "node:crypto";
import type { Server, Socket } from "socket.io";
import QuillDelta from "quill-delta";
import { Document } from "../models/document.model.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UserPresence,
  CursorRange,
  DocumentData,
  Delta as DeltaType,
  UserRole,
  DocumentComment,
  DocumentVersion,
  CollaboratorRoleAssignment,
} from "../types/index.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface CollaboratorSession {
  user: UserPresence;
  socketIds: Set<string>;
}

interface ActiveDocument {
  id: string;
  title: string;
  delta: QuillDelta;
  isDirty: boolean;
  saveTimer: NodeJS.Timeout | null;
  collaborators: Map<string, CollaboratorSession>; // userKey -> { user, socketIds }
  defaultRole: UserRole;
  collaboratorRoles: Map<string, UserRole>; // email -> role
  comments: DocumentComment[];
  versions: DocumentVersion[];
  lastVersionSavedAt: number;
}

const activeDocuments = new Map<string, ActiveDocument>();
const pendingDocumentLoads = new Map<string, Promise<ActiveDocument>>();

const USER_COLORS = [
  "#1a73e8", // Google Blue
  "#d93025", // Google Red
  "#188038", // Google Green
  "#f29900", // Google Yellow/Orange
  "#9334e6", // Purple
  "#12b5cb", // Cyan
  "#e52592", // Pink
];

const ANIMAL_NAMES = [
  "Panda",
  "Fox",
  "Falcon",
  "Otter",
  "Koala",
  "Lynx",
  "Badger",
  "Dolphin",
];

function getUserSessionKey(
  user: UserPresence | null,
  socketId: string,
): string {
  if (user?.email) {
    return `email:${user.email.toLowerCase().trim()}`;
  }
  return `socket:${socketId}`;
}

function getRandomUser(socketId: string): UserPresence {
  const hash = Array.from(socketId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  const color = USER_COLORS[hash % USER_COLORS.length] ?? "#1a73e8";
  const animal = ANIMAL_NAMES[hash % ANIMAL_NAMES.length] ?? "Panda";
  return {
    id: socketId,
    name: `Anonymous ${animal}`,
    color,
  };
}

function computeUserRole(
  activeDoc: ActiveDocument,
  email?: string,
  requestedRole?: UserRole,
): UserRole {
  if (requestedRole === "viewer" || requestedRole === "commenter") {
    return requestedRole;
  }
  if (email && activeDoc.collaboratorRoles.has(email.toLowerCase().trim())) {
    return activeDoc.collaboratorRoles.get(email.toLowerCase().trim())!;
  }
  return activeDoc.defaultRole || "editor";
}

async function getOrCreateActiveDocument(
  id: string,
  creatorEmail?: string,
): Promise<ActiveDocument> {
  const existing = activeDocuments.get(id);
  if (existing) return existing;

  const inFlight = pendingDocumentLoads.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const dbDoc = await Document.findById(id);
      let title = "Untitled Document";
      let deltaInstance = new QuillDelta({ ops: [] });
      let defaultRole: UserRole = "editor";
      const collaboratorRoles = new Map<string, UserRole>();
      let comments: DocumentComment[] = [];
      let versions: DocumentVersion[] = [];

      if (dbDoc) {
        title = dbDoc.title || "Untitled Document";
        if (dbDoc.data && Array.isArray((dbDoc.data as DeltaType).ops)) {
          deltaInstance = new QuillDelta((dbDoc.data as DeltaType).ops);
        }
        defaultRole = dbDoc.defaultRole || "editor";
        if (Array.isArray(dbDoc.collaboratorRoles)) {
          for (const r of dbDoc.collaboratorRoles) {
            if (r.email) collaboratorRoles.set(r.email.toLowerCase().trim(), r.role);
          }
        }
        comments = (dbDoc.comments as DocumentComment[]) || [];
        versions = (dbDoc.versions as DocumentVersion[]) || [];
      } else {
        const normalizedCreator = creatorEmail?.toLowerCase().trim();
        if (normalizedCreator) {
          collaboratorRoles.set(normalizedCreator, "owner");
        }

        const initialVersion: DocumentVersion = {
          id: crypto.randomUUID(),
          title,
          data: { ops: [] },
          authorName: "System",
          createdAt: new Date().toISOString(),
          label: "Initial Document Created",
        };
        versions = [initialVersion];

        await Document.create({
          _id: id,
          title,
          ownerEmail: normalizedCreator || null,
          data: { ops: [] },
          defaultRole: "editor",
          collaboratorRoles: normalizedCreator
            ? [{ email: normalizedCreator, role: "owner" }]
            : [],
          comments: [],
          versions: [initialVersion],
        });
      }

      // Ensure at least one version exists in history
      if (versions.length === 0) {
        versions = [
          {
            id: crypto.randomUUID(),
            title,
            data: { ops: deltaInstance.ops },
            authorName: "System",
            createdAt: new Date().toISOString(),
            label: "Initial Document",
          },
        ];
      }

      const activeDoc: ActiveDocument = {
        id,
        title,
        delta: deltaInstance,
        isDirty: false,
        saveTimer: null,
        collaborators: new Map(),
        defaultRole,
        collaboratorRoles,
        comments,
        versions,
        lastVersionSavedAt: Date.now(),
      };

      activeDocuments.set(id, activeDoc);
      return activeDoc;
    } finally {
      pendingDocumentLoads.delete(id);
    }
  })();

  pendingDocumentLoads.set(id, promise);
  return promise;
}

async function persistDocument(activeDoc: ActiveDocument): Promise<void> {
  if (!activeDoc.isDirty) return;

  try {
    const formattedRoles: CollaboratorRoleAssignment[] = Array.from(
      activeDoc.collaboratorRoles.entries(),
    ).map(([email, role]) => ({ email, role }));

    await Document.findByIdAndUpdate(activeDoc.id, {
      title: activeDoc.title,
      data: { ops: activeDoc.delta.ops },
      defaultRole: activeDoc.defaultRole,
      collaboratorRoles: formattedRoles,
      comments: activeDoc.comments,
      versions: activeDoc.versions,
    });
    activeDoc.isDirty = false;
  } catch (err) {
    console.error(`[db] Failed to persist document ${activeDoc.id}:`, err);
  }
}

function scheduleSave(
  io: IOServer,
  activeDoc: ActiveDocument,
  debounceMs = 1500,
): void {
  activeDoc.isDirty = true;
  io.to(activeDoc.id).emit("save-status", "saving");

  if (activeDoc.saveTimer) {
    clearTimeout(activeDoc.saveTimer);
  }

  activeDoc.saveTimer = setTimeout(async () => {
    activeDoc.saveTimer = null;

    // Automatic periodic snapshot creation (every 3 minutes of active editing)
    if (Date.now() - activeDoc.lastVersionSavedAt > 180000 && activeDoc.delta.ops.length > 0) {
      const autoSnapshot: DocumentVersion = {
        id: crypto.randomUUID(),
        title: activeDoc.title,
        data: { ops: activeDoc.delta.ops },
        authorName: "Auto-save",
        createdAt: new Date().toISOString(),
        label: `Auto-saved Snapshot`,
      };
      activeDoc.versions.unshift(autoSnapshot);
      // Keep up to 50 versions
      if (activeDoc.versions.length > 50) {
        activeDoc.versions = activeDoc.versions.slice(0, 50);
      }
      activeDoc.lastVersionSavedAt = Date.now();
      io.to(activeDoc.id).emit("versions-updated", activeDoc.versions);
    }

    await persistDocument(activeDoc);
    io.to(activeDoc.id).emit("save-status", "saved");
  }, debounceMs);
}

export function registerDocumentHandlers(
  io: IOServer,
  socket: IOSocket,
): void {
  let currentDocId: string | null = null;
  let currentUser: UserPresence | null = null;

  async function leaveCurrentDocument(): Promise<void> {
    if (!currentDocId) return;

    const docId = currentDocId;
    currentDocId = null;
    await socket.leave(docId);

    const activeDoc = activeDocuments.get(docId);
    if (!activeDoc) return;

    const userKey = getUserSessionKey(currentUser, socket.id);

    const session = activeDoc.collaborators.get(userKey);
    if (session) {
      session.socketIds.delete(socket.id);
      if (session.socketIds.size === 0) {
        activeDoc.collaborators.delete(userKey);
      }
    }

    // Stop typing indicator on leave
    if (currentUser) {
      socket.broadcast.to(docId).emit("user-typing", {
        user: currentUser,
        isTyping: false,
      });
    }

    const uniqueUsers = Array.from(activeDoc.collaborators.values()).map(
      (s) => s.user,
    );
    io.to(docId).emit("presence-updated", uniqueUsers);

    // If no more active users, flush dirty data and clear cache
    if (activeDoc.collaborators.size === 0) {
      if (activeDoc.saveTimer) {
        clearTimeout(activeDoc.saveTimer);
        activeDoc.saveTimer = null;
      }
      await persistDocument(activeDoc);
      activeDocuments.delete(docId);
    }
  }

  function getEffectiveRole(activeDoc: ActiveDocument): UserRole {
    const userKey = getUserSessionKey(currentUser, socket.id);
    const liveRole = activeDoc.collaborators.get(userKey)?.user.role;
    return liveRole || currentUser?.role || activeDoc.defaultRole || "editor";
  }

  socket.on("get-document", async (documentId, userOverride) => {
    if (!documentId || typeof documentId !== "string") return;

    if (currentDocId && currentDocId !== documentId) {
      await leaveCurrentDocument();
    }

    const activeDoc = await getOrCreateActiveDocument(
      documentId,
      userOverride?.email,
    );
    currentDocId = documentId;

    const assignedRole = computeUserRole(
      activeDoc,
      userOverride?.email,
      userOverride?.role,
    );

    currentUser = {
      ...getRandomUser(socket.id),
      ...(userOverride?.name ? { name: userOverride.name } : {}),
      ...(userOverride?.color ? { color: userOverride.color } : {}),
      ...(userOverride?.email ? { email: userOverride.email } : {}),
      role: assignedRole,
    };

    const userKey = getUserSessionKey(currentUser, socket.id);

    const existingSession = activeDoc.collaborators.get(userKey);
    if (existingSession) {
      existingSession.socketIds.add(socket.id);
      existingSession.user = currentUser;
    } else {
      activeDoc.collaborators.set(userKey, {
        user: currentUser,
        socketIds: new Set([socket.id]),
      });
    }

    await socket.join(documentId);

    console.log(
      `[collab] ${currentUser.name} (${currentUser.role}) joined ${documentId} (active: ${activeDoc.collaborators.size})`,
    );

    const docPayload: DocumentData = {
      id: activeDoc.id,
      title: activeDoc.title,
      data: { ops: activeDoc.delta.ops },
      role: currentUser.role,
      defaultRole: activeDoc.defaultRole,
      collaboratorRoles: Array.from(activeDoc.collaboratorRoles.entries()).map(
        ([email, role]) => ({ email, role }),
      ),
      comments: activeDoc.comments,
      versions: activeDoc.versions,
    };

    socket.emit("load-document", docPayload);
    socket.emit("role-assigned", currentUser.role || "editor");

    const uniqueUsers = Array.from(activeDoc.collaborators.values()).map(
      (s) => s.user,
    );
    io.to(documentId).emit("presence-updated", uniqueUsers);
  });

  socket.on("send-changes", (incomingDelta) => {
    if (!currentDocId || !incomingDelta || !Array.isArray(incomingDelta.ops)) {
      return;
    }

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    // Role Enforcement: Viewers and Commenters cannot edit document content
    const effectiveRole = getEffectiveRole(activeDoc);
    if (effectiveRole === "viewer" || effectiveRole === "commenter") {
      console.warn(
        `[collab] Rejected edit from ${currentUser?.name || socket.id}: role '${effectiveRole}' is read-only.`,
      );
      return;
    }

    // 1. Broadcast delta immediately to other clients in room
    socket.broadcast.to(currentDocId).emit("receive-changes", incomingDelta);

    try {
      // 2. Compose incoming delta into canonical server-side Delta state
      activeDoc.delta = activeDoc.delta.compose(new QuillDelta(incomingDelta.ops));

      // 3. Debounce persistence
      scheduleSave(io, activeDoc);
    } catch (err) {
      console.error(`[sync] Failed to compose delta for ${currentDocId}:`, err);
    }
  });

  socket.on("change-title", async (newTitle) => {
    if (!currentDocId || typeof newTitle !== "string") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    // Role Enforcement: Viewers and Commenters cannot rename document
    const effectiveRole = getEffectiveRole(activeDoc);
    if (effectiveRole === "viewer" || effectiveRole === "commenter") {
      return;
    }

    const trimmed = newTitle.trim() || "Untitled Document";

    activeDoc.title = trimmed;
    scheduleSave(io, activeDoc, 500);
    io.to(currentDocId).emit("title-updated", trimmed);
  });

  socket.on("cursor-move", (range: CursorRange | null) => {
    if (!currentDocId || !currentUser) return;

    socket.broadcast.to(currentDocId).emit("cursor-updated", {
      user: currentUser,
      range,
    });
  });

  // Real-time typing indicators
  socket.on("typing-start", () => {
    if (!currentDocId || !currentUser) return;
    socket.broadcast.to(currentDocId).emit("user-typing", {
      user: currentUser,
      isTyping: true,
    });
  });

  socket.on("typing-stop", () => {
    if (!currentDocId || !currentUser) return;
    socket.broadcast.to(currentDocId).emit("user-typing", {
      user: currentUser,
      isTyping: false,
    });
  });

  // Commenting handlers
  socket.on("add-comment", (comment: DocumentComment) => {
    if (!currentDocId || !comment || !comment.id) return;
    if (currentUser?.role === "viewer") return; // Viewers cannot comment

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    activeDoc.comments.unshift(comment);
    scheduleSave(io, activeDoc, 500);
    io.to(currentDocId).emit("comments-updated", activeDoc.comments);
  });

  socket.on("resolve-comment", (commentId: string) => {
    if (!currentDocId || !commentId) return;
    if (currentUser?.role === "viewer") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    const target = activeDoc.comments.find((c) => c.id === commentId);
    if (target) {
      target.resolved = !target.resolved;
      scheduleSave(io, activeDoc, 500);
      io.to(currentDocId).emit("comments-updated", activeDoc.comments);
    }
  });

  socket.on("reply-comment", (commentId, reply) => {
    if (!currentDocId || !commentId || !reply) return;
    if (currentUser?.role === "viewer") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    const target = activeDoc.comments.find((c) => c.id === commentId);
    if (target) {
      target.replies.push(reply);
      scheduleSave(io, activeDoc, 500);
      io.to(currentDocId).emit("comments-updated", activeDoc.comments);
    }
  });

  socket.on("delete-comment", (commentId: string) => {
    if (!currentDocId || !commentId) return;
    if (currentUser?.role === "viewer") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    activeDoc.comments = activeDoc.comments.filter((c) => c.id !== commentId);
    scheduleSave(io, activeDoc, 500);
    io.to(currentDocId).emit("comments-updated", activeDoc.comments);
  });

  // Version History handlers
  socket.on("create-version", (label) => {
    if (!currentDocId || !currentUser) return;
    if (currentUser.role === "viewer" || currentUser.role === "commenter") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    const newVersion: DocumentVersion = {
      id: crypto.randomUUID(),
      title: activeDoc.title,
      data: { ops: activeDoc.delta.ops },
      authorName: currentUser.name,
      createdAt: new Date().toISOString(),
      label: label?.trim() || `Snapshot by ${currentUser.name}`,
    };

    activeDoc.versions.unshift(newVersion);
    activeDoc.lastVersionSavedAt = Date.now();
    scheduleSave(io, activeDoc, 500);
    io.to(currentDocId).emit("versions-updated", activeDoc.versions);
  });

  socket.on("restore-version", (versionId: string) => {
    if (!currentDocId || !currentUser) return;
    if (currentUser.role === "viewer" || currentUser.role === "commenter") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    const target = activeDoc.versions.find((v) => v.id === versionId);
    if (!target) return;

    activeDoc.delta = new QuillDelta(target.data.ops || []);
    activeDoc.title = target.title || activeDoc.title;

    const restoreSnapshot: DocumentVersion = {
      id: crypto.randomUUID(),
      title: activeDoc.title,
      data: { ops: activeDoc.delta.ops },
      authorName: currentUser.name,
      createdAt: new Date().toISOString(),
      label: `Restored to: ${target.label || "Revision"}`,
    };
    activeDoc.versions.unshift(restoreSnapshot);
    activeDoc.lastVersionSavedAt = Date.now();

    scheduleSave(io, activeDoc, 300);

    const docPayload: DocumentData = {
      id: activeDoc.id,
      title: activeDoc.title,
      data: { ops: activeDoc.delta.ops },
      role: currentUser.role,
      defaultRole: activeDoc.defaultRole,
      collaboratorRoles: Array.from(activeDoc.collaboratorRoles.entries()).map(
        ([email, role]) => ({ email, role }),
      ),
      comments: activeDoc.comments,
      versions: activeDoc.versions,
    };

    io.to(currentDocId).emit("load-document", docPayload);
    io.to(currentDocId).emit("versions-updated", activeDoc.versions);
  });

  // Permissions and role management
  socket.on("update-permissions", (defaultRole, roles) => {
    if (!currentDocId || !currentUser) return;
    if (currentUser.role === "viewer" || currentUser.role === "commenter") return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    activeDoc.defaultRole = defaultRole;
    activeDoc.collaboratorRoles.clear();
    for (const r of roles) {
      if (r.email) {
        activeDoc.collaboratorRoles.set(r.email.toLowerCase().trim(), r.role);
      }
    }

    // Recompute role for all sessions
    for (const session of activeDoc.collaborators.values()) {
      session.user.role = computeUserRole(activeDoc, session.user.email);
    }

    scheduleSave(io, activeDoc, 500);

    io.to(currentDocId).emit("permissions-updated", {
      defaultRole,
      collaboratorRoles: roles,
    });

    const uniqueUsers = Array.from(activeDoc.collaborators.values()).map(
      (s) => s.user,
    );
    io.to(currentDocId).emit("presence-updated", uniqueUsers);

    // Notify each collaborator socket of its assigned role
    for (const session of activeDoc.collaborators.values()) {
      for (const sId of session.socketIds) {
        io.to(sId).emit("role-assigned", session.user.role || activeDoc.defaultRole);
      }
    }
  });

  socket.on("save-document", async () => {
    if (!currentDocId) return;

    const activeDoc = activeDocuments.get(currentDocId);
    if (!activeDoc) return;

    if (activeDoc.saveTimer) {
      clearTimeout(activeDoc.saveTimer);
      activeDoc.saveTimer = null;
    }

    await persistDocument(activeDoc);
    io.to(currentDocId).emit("save-status", "saved");
  });

  socket.on("disconnect", async () => {
    await leaveCurrentDocument();
  });
}

export async function flushAllActiveDocuments(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const activeDoc of activeDocuments.values()) {
    if (activeDoc.saveTimer) {
      clearTimeout(activeDoc.saveTimer);
      activeDoc.saveTimer = null;
    }
    promises.push(persistDocument(activeDoc));
  }
  await Promise.all(promises);
  activeDocuments.clear();
}
