export type UserRole = "owner" | "editor" | "commenter" | "viewer";

export interface DeltaOp {
  insert?: string | Record<string, unknown>;
  delete?: number;
  retain?: number;
  attributes?: Record<string, unknown>;
}

export interface Delta {
  ops?: DeltaOp[];
}

export interface DocumentCommentReply {
  id: string;
  author: {
    name: string;
    email?: string;
    color: string;
  };
  text: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  author: {
    name: string;
    email?: string;
    color: string;
  };
  text: string;
  selectionText?: string;
  createdAt: string;
  resolved: boolean;
  replies: DocumentCommentReply[];
}

export interface DocumentVersion {
  id: string;
  title: string;
  data: Delta;
  authorName: string;
  createdAt: string;
  label?: string;
}

export interface CollaboratorRoleAssignment {
  email: string;
  role: UserRole;
}

export interface DocumentData {
  id: string;
  title: string;
  data: Delta;
  role?: UserRole;
  defaultRole?: UserRole;
  collaboratorRoles?: CollaboratorRoleAssignment[];
  comments?: DocumentComment[];
  versions?: DocumentVersion[];
}
