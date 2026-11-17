# AI-Native Workflow Note: Practical AI Usage & Engineering Judgment
**Candidate:** Dureti Mohammedsani (`dureti104@gmail.com`)  
**Company:** Ajaia LLC  
**Role:** AI-Native Full Stack Developer Assignment  

---

## 1. AI Tools Utilized

* **Antigravity AI Agent & Google Gemini Flash/Pro:** Used as the primary intelligent pair programmer and orchestration assistant for code refactoring, full-stack architectural exploration, boilerplate generation, and rapid test generation.
* **TypeScript Compiler (`tsc`) & Vitest Test Runner:** Used continuously in tight feedback loops to mechanically verify AI suggestions and identify type mismatches or logical regressions.

---

## 2. Where AI Materially Sped Up the Work

1. **Rapid Delta Transformation & Quill 2 Blot Construction:**
   Implementing custom inline Parchment Blots in Quill 2 (`CommentBlot`) often involves subtle DOM lifecycle details (formats, DOM node creation, static properties). AI helped formulate the Blot class skeleton and sanitize the DOM attributes within minutes, shaving over an hour off custom editor extension development.

2. **Automated Test Scaffolding for Concurrency & WebSockets:**
   Writing end-to-end integration tests with mock Socket.IO clients and concurrent socket emitters is notoriously verbose. AI generated clean Vitest test templates that simulate multiple simultaneous browser clients joining rooms, sending concurrent delta ops, and validating server reconciliation.

3. **Multi-Format Export Logic:**
   AI rapidly implemented clean serialization routines for PDF generation (via `window.print` styled media rules), Markdown AST parsing, HTML cleaning, and plain-text conversion.

4. **UI Styling & Responsive Layout Systems:**
   AI accelerated the generation of modern CSS variables, responsive flex/grid layouts, Google Docs-style clean toolbars, interactive avatars, and dashboard filter tabs.

---

## 3. What AI-Generated Output Was Changed or Rejected

Practical AI usage requires rigorous human oversight and architectural judgment. Several initial AI proposals were modified or outright rejected:

1. **Rejected: Full-Document Overwrite on Delta Sync**
   * *AI Suggestion:* Early code generations proposed emitting the full document HTML string on every keystroke and storing it directly to MongoDB using standard REST endpoints.
   * *Engineering Decision:* **Rejected.** Full document overwrites inevitably cause race conditions and clobber concurrent collaborator keystrokes ("last-write-wins" bug). We insisted on an operational delta pipeline using Quill Delta composition on the server.

2. **Modified: Quill Selection Loss on Comment Trigger**
   * *AI Suggestion:* The initial AI handler for text selection listened directly to Quill's `selection-change` and immediately wiped `selectedText` when `range === null`.
   * *Engineering Decision:* **Modified.** In real browser usage, when a user selects text and moves their cursor to click the "Add Comment" button or types into a comment input, Quill emits a blur event (`range === null`). If the state is wiped immediately, the selection disappears before the comment can be saved. We modified the logic to preserve `selectedText` and `selectedRange` across blur events, and added `e.preventDefault()` on button `onMouseDown` so editor focus is not lost.

3. **Modified: In-Memory Only Role Permissions**
   * *AI Suggestion:* AI initially proposed storing collaborator permissions strictly in an ephemeral JavaScript `Map` inside the Socket.IO handler.
   * *Engineering Decision:* **Modified.** If the server restarts or a new server instance scales, users lose their assigned roles. We updated the Mongoose `DocumentSchema` to store `ownerEmail`, `collaboratorRoles`, and `defaultRole` persistently in MongoDB Atlas, hydrating the socket session on room join.

4. **Rejected: Heavy Third-Party Parsing Libraries for File Upload**
   * *AI Suggestion:* AI suggested installing heavyweight npm packages (`mammoth`, `docx`, `pdf-parse`) to support binary documents.
   * *Engineering Decision:* **Rejected.** Adding multiple unvetted binary parsing libraries introduces security attack vectors (buffer overflows, prototype pollution), inflates build bundles, and violated the constraint to avoid unnecessary dependencies. We scoped the upload feature strictly to `.txt` and `.md` using native browser `FileReader`/`File.text()`, which directly fits internal team markdown/text workflows.

---

## 4. Verification of Correctness, UX Quality, and Reliability

To ensure high engineering standards without blindly trusting AI-generated code:

1. **Automated Testing:**
   * Ran continuous test suites across both client and server: **26 tests passing** (16 client tests, 10 server tests).
   * Verified concurrency edge cases: simultaneous edits from two distinct client sockets verify that deltas compose without dropping characters.

2. **Strict Compiler Type Checking:**
   * Enforced zero TypeScript errors using `tsc --noEmit` across both `/client` and `/server`.
   * Corrected subtle Quill types where AI attempted to treat `Quill.find(mark)` as a Quill instance rather than a `Blot`.

3. **Live End-to-End Simulation in Dual Browser Sessions:**
   * Tested real-time synchronization by running two simulated user sessions side-by-side (`sarah.connor@gmail.com` as Editor, and `alex.morgan@gmail.com` as Viewer).
   * Confirmed that role enforcement successfully blocks viewers from typing, renaming, or importing files while allowing text selection and comment inspection.
   * Tested comment highlighting, ensuring clicking the highlighted document text smoothly opens the sidebar and brings the comment card into focus.
   * Tested file upload with sample `.txt` and `.md` files, ensuring clean document initialization in the dashboard and smooth file import inside active drafts.
