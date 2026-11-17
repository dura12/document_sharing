import { Schema, model } from "mongoose";
import type {
  Delta,
  UserRole,
  DocumentComment,
  DocumentVersion,
  CollaboratorRoleAssignment,
} from "../types/index.js";

export interface IDocument {
  _id: string;
  title: string;
  data: Delta;
  defaultRole: UserRole;
  collaboratorRoles: CollaboratorRoleAssignment[];
  comments: DocumentComment[];
  versions: DocumentVersion[];
}

const documentSchema = new Schema<IDocument>(
  {
    _id: { type: String, required: true },
    title: { type: String, default: "Untitled Document" },
    data: { type: Schema.Types.Mixed, default: { ops: [] } },
    defaultRole: {
      type: String,
      enum: ["owner", "editor", "commenter", "viewer"],
      default: "editor",
    },
    collaboratorRoles: {
      type: [
        {
          email: { type: String, required: true },
          role: {
            type: String,
            enum: ["owner", "editor", "commenter", "viewer"],
            required: true,
          },
        },
      ],
      default: [],
    },
    comments: {
      type: [
        {
          id: { type: String, required: true },
          author: {
            name: { type: String, required: true },
            email: { type: String },
            color: { type: String, required: true },
          },
          text: { type: String, required: true },
          selectionText: { type: String },
          createdAt: { type: String, required: true },
          resolved: { type: Boolean, default: false },
          replies: [
            {
              id: { type: String, required: true },
              author: {
                name: { type: String, required: true },
                email: { type: String },
                color: { type: String, required: true },
              },
              text: { type: String, required: true },
              createdAt: { type: String, required: true },
            },
          ],
        },
      ],
      default: [],
    },
    versions: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          data: { type: Schema.Types.Mixed, required: true },
          authorName: { type: String, required: true },
          createdAt: { type: String, required: true },
          label: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Document = model<IDocument>("Document", documentSchema);
