import { useEffect, useState, useCallback, useRef } from "react";
import type Quill from "quill";
import type {
  Delta,
  DocumentData,
  UserPresence,
  UserCursor,
  SaveStatus,
  UserRole,
  DocumentComment,
  DocumentCommentReply,
  DocumentVersion,
  CollaboratorRoleAssignment,
} from "@/types";
import type { TypedSocket } from "./useSocket";

export interface UseDocumentSyncReturn {
  title: string;
  updateTitle: (newTitle: string) => void;
  collaborators: UserPresence[];
  saveStatus: SaveStatus;
  isLoaded: boolean;
  role: UserRole;
  defaultRole: UserRole;
  collaboratorRoles: CollaboratorRoleAssignment[];
  comments: DocumentComment[];
  versions: DocumentVersion[];
  typingUsers: UserPresence[];
  addComment: (text: string, selectionText?: string) => void;
  resolveComment: (commentId: string) => void;
  replyComment: (commentId: string, reply: DocumentCommentReply) => void;
  deleteComment: (commentId: string) => void;
  createVersion: (label?: string) => void;
  restoreVersion: (versionId: string) => void;
  updatePermissions: (
    defaultRole: UserRole,
    roles: CollaboratorRoleAssignment[],
  ) => void;
}

export function useDocumentSync(
  socket: TypedSocket | null,
  quill: Quill | null,
  documentId: string,
  userOverride?: { name: string; color: string; email?: string; role?: UserRole } | null,
): UseDocumentSyncReturn {
  // Read role from query parameters (?role=viewer or ?role=commenter or ?role=editor)
  const urlRole =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("role") as UserRole | null)
      : null;
  const initialRole: UserRole =
    urlRole === "viewer" || urlRole === "commenter"
      ? urlRole
      : userOverride?.role || "editor";

  const [title, setTitle] = useState<string>("Untitled Document");
  const [collaborators, setCollaborators] = useState<UserPresence[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [defaultRole, setDefaultRole] = useState<UserRole>("editor");
  const [collaboratorRoles, setCollaboratorRoles] = useState<
    CollaboratorRoleAssignment[]
  >([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [typingUsers, setTypingUsers] = useState<UserPresence[]>([]);

  const roleRef = useRef<UserRole>(initialRole);
  roleRef.current = role;

  const cursorsModuleRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize cursor module reference and lock editor if restricted
  useEffect(() => {
    if (quill) {
      if (roleRef.current === "viewer" || roleRef.current === "commenter") {
        quill.disable();
      }
      try {
        cursorsModuleRef.current = quill.getModule("cursors");
      } catch {
        cursorsModuleRef.current = null;
      }
    }
  }, [quill]);

  // Request document on mount / socket connect / user change
  useEffect(() => {
    if (!socket || !documentId) return;

    setIsLoaded(false);
    setSaveStatus("saving");

    const handleLoadDocument = (doc: DocumentData) => {
      const assignedRole = doc.role || roleRef.current || "editor";
      setRole(assignedRole);
      roleRef.current = assignedRole;
      setDefaultRole(doc.defaultRole || "editor");
      setCollaboratorRoles(doc.collaboratorRoles || []);
      setComments(doc.comments || []);
      setVersions(doc.versions || []);

      if (quill) {
        quill.setContents(doc.data as any);
        if (assignedRole === "viewer" || assignedRole === "commenter") {
          quill.disable();
        } else {
          quill.enable();
        }
      }

      setTitle(doc.title || "Untitled Document");
      document.title = `${doc.title || "Untitled Document"} - Google Docs Clone`;
      setIsLoaded(true);
      setSaveStatus("saved");
    };

    socket.on("load-document", handleLoadDocument);

    const userPayload = userOverride
      ? { ...userOverride, role: urlRole || userOverride.role }
      : urlRole
      ? { role: urlRole }
      : undefined;

    socket.emit("get-document", documentId, userPayload as any);

    return () => {
      socket.off("load-document", handleLoadDocument);
    };
  }, [
    socket,
    quill,
    documentId,
    urlRole,
    userOverride?.name,
    userOverride?.color,
    userOverride?.email,
    userOverride?.role,
  ]);

  // Handle local text changes -> broadcast delta & typing indicator
  useEffect(() => {
    if (!socket || !quill) return;

    const handleTextChange = (
      delta: Delta,
      _oldDelta: Delta,
      source: string,
    ) => {
      if (source !== "user") return;

      // Viewer / Commenter cannot edit text
      if (roleRef.current === "viewer" || roleRef.current === "commenter") return;

      setSaveStatus("saving");
      socket.emit("send-changes", delta);

      // Trigger typing indicator
      socket.emit("typing-start");
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        socket.emit("typing-stop");
      }, 1500);
    };

    quill.on("text-change", handleTextChange);
    return () => {
      quill.off("text-change", handleTextChange);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [socket, quill, role]);

  // Handle remote changes incoming from server
  useEffect(() => {
    if (!socket || !quill) return;

    const handleReceiveChanges = (delta: Delta) => {
      quill.updateContents(delta as any);
    };

    socket.on("receive-changes", handleReceiveChanges);
    return () => {
      socket.off("receive-changes", handleReceiveChanges);
    };
  }, [socket, quill]);

  // Handle local cursor / selection movement -> broadcast cursor range
  useEffect(() => {
    if (!socket || !quill) return;

    const handleSelectionChange = (
      range: { index: number; length: number } | null,
      _oldRange: unknown,
      source: string,
    ) => {
      if (source !== "user") return;
      socket.emit("cursor-move", range);
    };

    quill.on("selection-change", handleSelectionChange);
    return () => {
      quill.off("selection-change", handleSelectionChange);
    };
  }, [socket, quill]);

  // Handle remote collaborator cursor updates
  useEffect(() => {
    if (!socket || !quill) return;

    const handleCursorUpdated = ({ user, range }: UserCursor) => {
      const cursors = cursorsModuleRef.current;
      if (!cursors) return;

      if (!range) {
        cursors.removeCursor(user.id);
        return;
      }

      cursors.createCursor(user.id, user.name, user.color);
      cursors.moveCursor(user.id, range);
    };

    socket.on("cursor-updated", handleCursorUpdated);
    return () => {
      socket.off("cursor-updated", handleCursorUpdated);
    };
  }, [socket, quill]);

  // Handle collaborator presence updates
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdated = (users: UserPresence[]) => {
      setCollaborators(users);

      const cursors = cursorsModuleRef.current;
      if (cursors) {
        const activeIds = new Set(users.map((u) => u.id));
        const allCursors = cursors.cursors();
        for (const c of allCursors) {
          if (!activeIds.has(c.id)) {
            cursors.removeCursor(c.id);
          }
        }
      }
    };

    socket.on("presence-updated", handlePresenceUpdated);
    return () => {
      socket.off("presence-updated", handlePresenceUpdated);
    };
  }, [socket]);

  // Handle typing indicators from other users
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = ({
      user,
      isTyping,
    }: {
      user: UserPresence;
      isTyping: boolean;
    }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.some((u) => u.name === user.name)) {
            return [...prev, user];
          }
          return prev;
        }
        return prev.filter((u) => u.name !== user.name);
      });
    };

    socket.on("user-typing", handleUserTyping);
    return () => {
      socket.off("user-typing", handleUserTyping);
    };
  }, [socket]);

  // Handle comments updates
  useEffect(() => {
    if (!socket) return;

    const handleCommentsUpdated = (newComments: DocumentComment[]) => {
      setComments(newComments);
    };

    socket.on("comments-updated", handleCommentsUpdated);
    return () => {
      socket.off("comments-updated", handleCommentsUpdated);
    };
  }, [socket]);

  // Handle versions updates
  useEffect(() => {
    if (!socket) return;

    const handleVersionsUpdated = (newVersions: DocumentVersion[]) => {
      setVersions(newVersions);
    };

    socket.on("versions-updated", handleVersionsUpdated);
    return () => {
      socket.off("versions-updated", handleVersionsUpdated);
    };
  }, [socket]);

  // Handle permissions updates
  useEffect(() => {
    if (!socket) return;

    const handlePermissionsUpdated = (data: {
      defaultRole: UserRole;
      collaboratorRoles: CollaboratorRoleAssignment[];
    }) => {
      setDefaultRole(data.defaultRole);
      setCollaboratorRoles(data.collaboratorRoles);
    };

    const handleRoleAssigned = (newRole: UserRole) => {
      setRole(newRole);
      roleRef.current = newRole;
      if (quill) {
        if (newRole === "viewer" || newRole === "commenter") {
          quill.disable();
        } else {
          quill.enable();
        }
      }
    };

    socket.on("permissions-updated", handlePermissionsUpdated);
    socket.on("role-assigned", handleRoleAssigned);

    return () => {
      socket.off("permissions-updated", handlePermissionsUpdated);
      socket.off("role-assigned", handleRoleAssigned);
    };
  }, [socket, quill]);

  // Handle title updates from server
  useEffect(() => {
    if (!socket) return;

    const handleTitleUpdated = (newTitle: string) => {
      setTitle(newTitle);
      document.title = `${newTitle} - Google Docs Clone`;
    };

    socket.on("title-updated", handleTitleUpdated);
    return () => {
      socket.off("title-updated", handleTitleUpdated);
    };
  }, [socket]);

  // Handle server save status
  useEffect(() => {
    if (!socket) return;

    const handleSaveStatus = (status: "saving" | "saved" | "error") => {
      setSaveStatus(status);
    };

    socket.on("save-status", handleSaveStatus);
    return () => {
      socket.off("save-status", handleSaveStatus);
    };
  }, [socket]);

  const updateTitle = useCallback(
    (newTitle: string) => {
      if (roleRef.current === "viewer" || roleRef.current === "commenter") return;
      setTitle(newTitle);
      document.title = `${newTitle} - Google Docs Clone`;
      if (socket) {
        setSaveStatus("saving");
        socket.emit("change-title", newTitle);
      }
    },
    [socket],
  );

  const addComment = useCallback(
    (text: string, selectionText?: string) => {
      if (!socket || roleRef.current === "viewer") return;
      const newComment: DocumentComment = {
        id: crypto.randomUUID(),
        author: {
          name: userOverride?.name || "Anonymous Collaborator",
          email: userOverride?.email,
          color: userOverride?.color || "#1a73e8",
        },
        text,
        selectionText,
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      };
      socket.emit("add-comment", newComment);
    },
    [socket, userOverride],
  );

  const resolveComment = useCallback(
    (commentId: string) => {
      if (!socket || roleRef.current === "viewer") return;
      socket.emit("resolve-comment", commentId);
    },
    [socket],
  );

  const replyComment = useCallback(
    (commentId: string, reply: DocumentCommentReply) => {
      if (!socket || roleRef.current === "viewer") return;
      socket.emit("reply-comment", commentId, reply);
    },
    [socket],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      if (!socket || roleRef.current === "viewer") return;
      socket.emit("delete-comment", commentId);
    },
    [socket],
  );

  const createVersion = useCallback(
    (label?: string) => {
      if (!socket || roleRef.current === "viewer" || roleRef.current === "commenter") return;
      socket.emit("create-version", label);
    },
    [socket],
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      if (!socket || roleRef.current === "viewer" || roleRef.current === "commenter") return;
      socket.emit("restore-version", versionId);
    },
    [socket],
  );

  const updatePermissions = useCallback(
    (newDefaultRole: UserRole, roles: CollaboratorRoleAssignment[]) => {
      if (!socket || roleRef.current === "viewer" || roleRef.current === "commenter") return;
      socket.emit("update-permissions", newDefaultRole, roles);
    },
    [socket],
  );

  return {
    title,
    updateTitle,
    collaborators,
    saveStatus,
    isLoaded,
    role,
    defaultRole,
    collaboratorRoles,
    comments,
    versions,
    typingUsers,
    addComment,
    resolveComment,
    replyComment,
    deleteComment,
    createVersion,
    restoreVersion,
    updatePermissions,
  };
}
