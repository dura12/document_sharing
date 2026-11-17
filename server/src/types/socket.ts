import type {
  Delta,
  DocumentData,
  UserRole,
  DocumentComment,
  DocumentCommentReply,
  DocumentVersion,
  CollaboratorRoleAssignment,
} from "./document.js";

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  email?: string;
  role?: UserRole;
}

export interface CursorRange {
  index: number;
  length: number;
}

export interface UserCursor {
  user: UserPresence;
  range: CursorRange | null;
}

export interface ClientToServerEvents {
  "get-document": (
    documentId: string,
    user?: Partial<UserPresence> & { email?: string },
  ) => void;
  "send-changes": (delta: Delta) => void;
  "change-title": (title: string) => void;
  "cursor-move": (range: CursorRange | null) => void;
  "save-document": () => void;
  "typing-start": () => void;
  "typing-stop": () => void;
  "add-comment": (comment: DocumentComment) => void;
  "resolve-comment": (commentId: string) => void;
  "reply-comment": (commentId: string, reply: DocumentCommentReply) => void;
  "delete-comment": (commentId: string) => void;
  "create-version": (label?: string) => void;
  "restore-version": (versionId: string) => void;
  "update-permissions": (
    defaultRole: UserRole,
    roles: CollaboratorRoleAssignment[],
  ) => void;
}

export interface ServerToClientEvents {
  "load-document": (document: DocumentData) => void;
  "receive-changes": (delta: Delta) => void;
  "title-updated": (title: string) => void;
  "presence-updated": (users: UserPresence[]) => void;
  "cursor-updated": (cursor: UserCursor) => void;
  "save-status": (status: "saving" | "saved" | "error") => void;
  "user-typing": (data: { user: UserPresence; isTyping: boolean }) => void;
  "comments-updated": (comments: DocumentComment[]) => void;
  "versions-updated": (versions: DocumentVersion[]) => void;
  "permissions-updated": (data: {
    defaultRole: UserRole;
    collaboratorRoles: CollaboratorRoleAssignment[];
  }) => void;
  "role-assigned": (role: UserRole) => void;
}
