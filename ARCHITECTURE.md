# Architecture & Engineering Note: Ajaia Docs
**Candidate:** Dureti Mohammedsani (`dureti104@gmail.com`)  
**Company:** Ajaia LLC  
**Role:** AI-Native Full Stack Developer Assignment  

---

## 1. Executive Summary & Product Architecture

Ajaia Docs is a lightweight, high-performance, real-time collaborative document platform engineered for internal teams. Inspired by modern productivity suites like Google Docs, it prioritizes reliable concurrency, rock-solid data integrity, low-latency collaboration, clear access control, and intuitive document lifecycle management.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 19 + Vite)                  │
│                                                                        │
│   ┌────────────────────┐    ┌───────────────────┐    ┌───────────────┐ │
│   │ Document Dashboard │    │ Quill Rich Editor │    │ Comment Panel │ │
│   │ (Filter, Upload)   │    │ (Blots, Shortcuts)│    │ (Highlights)  │ │
│   └─────────┬──────────┘    └─────────┬─────────┘    └───────┬───────┘ │
│             │                         │                      │         │
│   ┌─────────┴─────────────────────────┴──────────────────────┴───────┐ │
│   │               useDocumentSync + Socket.IO Client                 │ │
│   └───────────────────────────────────┬──────────────────────────────┘ │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │ WebSocket (Socket.IO) & REST
┌───────────────────────────────────────┼────────────────────────────────┐
│                        SERVER LAYER (Node.js + Express)                │
│                                       │                                │
│   ┌───────────────────────────────────▼──────────────────────────────┐ │
│   │ Socket Event Router & Room Orchestrator                          │ │
│   │  - Client authentication & presence mapping                      │ │
│   │  - Role-based authorization guard (Owner, Editor, Comment, View) │ │
│   └───────────────────────────────────┬──────────────────────────────┘ │
│                                       │                                │
│   ┌───────────────────────────────────▼──────────────────────────────┐ │
│   │ In-Memory Canonical Delta Engine                                 │ │
│   │  - Sequential Delta Composition via quill-delta                  │ │
│   │  - Broadcast diffs to active room members                        │ │
│   │  - Debounced async persistence queue (1500ms delay)              │ │
│   └───────────────────────────────────┬──────────────────────────────┘ │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │ Mongoose ODM
┌───────────────────────────────────────┼────────────────────────────────┐
│                        DATA PERSISTENCE LAYER (MongoDB Atlas)          │
│   ┌───────────────────────────────────▼──────────────────────────────┐ │
│   │ Collections: Documents (Delta Ops, Roles, Comments, Versions)    │ │
│   │              Users (Seeded Test Accounts, Passwords, Colors)     │ │
│   └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Decisions & Trade-Offs

### 2.1 Concurrency Model: Operational Transformation via Quill Delta
* **Decision:** We opted for Quill Deltas paired with server-side sequential composition rather than client-side full-document overwrite or raw CRDT libraries (e.g., Yjs).
* **Rationale:**
  1. *Bandwidth Efficiency:* Clients only transmit concise JSON operational diffs (`retain`, `insert`, `delete`), minimizing payload sizes over WebSockets.
  2. *Single Source of Truth:* The Node.js server maintains an in-memory document state composed sequentially. When clients broadcast changes, the server composes them into the canonical state before writing to MongoDB.
  3. *Conflict Avoidance:* Previous versions suffered from "last write wins" document clobbering. In the new architecture, concurrent edits compose cleanly without losing user keystrokes.
* **Trade-Off:** While full distributed CRDTs provide peer-to-peer eventual consistency for offline-first networks, server-authoritative delta composition is substantially easier to reason about, enforce access control upon, and persist directly to relational or document databases within a 4–6 hour delivery window.

### 2.2 Role-Based Access Control (RBAC) & Permission Enforcement
* **Decision:** Granular enforcement at two distinct boundaries: the WebSocket ingestion layer and the client UI layer.
* **Roles Supported:**
  - **Owner:** Full administrative rights, share permission mutation, title editing, content editing, deletion.
  - **Editor:** Read, write, format, import files, and comment.
  - **Commenter:** Read document, highlight text, post comments/replies, and toggle resolution. Direct content mutations and title updates are blocked.
  - **Viewer:** Read-only access. Toolbar, editing keystrokes, and title updates are locked. Text selection and export (PDF/Markdown) remain enabled.
* **Enforcement Strategy:**
  - *Client Side:* Disables Quill root (`quill.disable()`), hides editing toolbar buttons, disables title `<input>`, and attaches a `role-notice-banner` warning users of their access tier.
  - *Server Side:* Every `send-changes` and `update-title` socket event verifies the active session role against the document's stored `ownerEmail` and `collaboratorRoles`. If a viewer or commenter attempts to emit mutations, the server rejects the event and logs a security violation.

### 2.3 Two-Way In-Text Comment Anchoring
* **Decision:** Implemented a custom Parchment Blot (`CommentBlot`) that renders an inline `<mark class="doc-comment-highlight">`.
* **Rationale:** Rather than merely listing floating comments detached from the text, our comments are anchored directly to selected text ranges:
  - Clicking any colored text highlight in the document automatically scrolls the right-hand sidebar to the corresponding comment card.
  - Clicking the highlighted quote snippet inside a comment card scrolls the document canvas to the exact text location.
  - Resolving a comment immediately removes the `<mark>` wrapper, cleaning up the text layout seamlessly.

### 2.4 File Upload & Ingestion Strategy
* **Decision:** Lightweight, client-parsed file ingestion supporting `.txt` and `.md` formats.
* **Workflows Supported:**
  1. *Dashboard Ingestion:* Users upload `.txt` or `.md` files directly on the dashboard. The application parses the text, formats it as an initial Quill delta, creates a new document entry in MongoDB with the file name as title, and routes the user into the editor.
  2. *Draft Ingestion:* Users inside an active document can select "Import File" from the File menu to merge external text into their draft without leaving the editing session.
* **Trade-Off:** We deliberately deprioritized complex binary formats (e.g., proprietary `.docx` AST parsing) to keep the dependency footprint small, avoid external parsing security vulnerabilities, and adhere strictly to the 4–6 hour timebox.

### 2.5 Persistence & Debounced Database Writes
* **Decision:** In-memory delta aggregation with a 1500ms debounce timer for MongoDB Atlas writes.
* **Rationale:** Writing to MongoDB Atlas on every keystroke would overwhelm database connections, trigger throttling, and increase network latency. Debouncing coalesces rapid user bursts into a single write operation. Additionally, a process-level graceful shutdown hook (`SIGTERM`/`SIGINT`) automatically flushes all pending document writes before exiting.

---

## 3. Engineering Quality & Verification

* **Strict Type Safety:** Both client and server run on TypeScript 5 with strict compiler flags enabled (`noImplicitAny`, `strictNullChecks`).
* **Automated Test Suites:**
  - **Client Tests (`client/src`):** 16 unit tests covering document sync state machines, delta composition, and multi-format exports (PDF, Markdown, HTML, Plain Text).
  - **Server Tests (`server/src`):** 10 integration and end-to-end tests covering socket room lifecycles, concurrent delta composition, presence broadcasting, version snapshots, comment lifecycles, and RBAC rejection for viewers.
* **Zero Critical Vulnerabilities:** Dependencies audited via `npm audit` with no paid third-party dependencies introduced.

---

## 4. What Was Deprioritized & Future Roadmap

Given the 4–6 hour timebox constraint, the following items were deliberately deprioritized:
1. *Nested Folder Structure:* Documents currently reside in a flat list with filter tabs (`All`, `Owned by me`, `Shared with me`). A hierarchical folder tree would be built next.
2. *Real-time Comment Cursor Tracking:* While main editor cursors are tracked in real-time via `quill-cursors`, typing indicators within the comment input field are localized.
3. *Offline IndexedDB Caching:* The app currently depends on active network connectivity to MongoDB Atlas. A service worker and IndexedDB sync engine would be added in Phase 2.
