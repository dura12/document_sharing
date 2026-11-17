import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { Document } from "../models/document.model.js";

const router = Router();

// GET /api/documents - List all documents
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const docs = await Document.find(
      {},
      "_id title ownerEmail collaboratorRoles defaultRole createdAt updatedAt",
    ).sort({ updatedAt: -1 });

    const formatted = docs.map((d) => ({
      id: d._id,
      title: d.title || "Untitled Document",
      ownerEmail: d.ownerEmail || null,
      collaboratorRoles: d.collaboratorRoles || [],
      defaultRole: d.defaultRole || "editor",
      createdAt: (d as any).createdAt,
      updatedAt: (d as any).updatedAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("[db] Error fetching documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST /api/documents - Create a new document (supports text import & initial ops)
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const title = req.body.title?.trim() || "Untitled Document";
    const ownerEmail = req.body.ownerEmail || null;
    const data =
      req.body.data && Array.isArray(req.body.data.ops)
        ? req.body.data
        : { ops: [] };

    const doc = await Document.create({
      _id: id,
      title,
      ownerEmail,
      data,
      defaultRole: "editor",
      collaboratorRoles: ownerEmail
        ? [{ email: ownerEmail.toLowerCase().trim(), role: "owner" }]
        : [],
      comments: [],
      versions: [
        {
          id: crypto.randomUUID(),
          title,
          data,
          authorName: ownerEmail ? ownerEmail.split("@")[0] : "System",
          createdAt: new Date().toISOString(),
          label: "Initial Document / File Import",
        },
      ],
    });

    res.status(201).json({
      id: doc._id,
      title: doc.title,
      ownerEmail: doc.ownerEmail,
    });
  } catch (err) {
    console.error("[db] Error creating document:", err);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Document.findByIdAndDelete(id);
    res.json({ success: true, message: `Document ${id} deleted` });
  } catch (err) {
    console.error("[db] Error deleting document:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export { router as documentRouter };
