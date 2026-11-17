# Ajaia LLC - AI-Native Full Stack Developer Assignment Submission
**Candidate:** Dureti Mohammedsani  
**Email:** dureti104@gmail.com  
**Target Role:** AI-Native Full Stack Developer  
**Company:** Ajaia LLC  
**Repository:** [https://github.com/dura12/document_sharing.git](https://github.com/dura12/document_sharing.git)  
**Walkthrough Video Link:** [https://www.loom.com/share/1aeec7095dd34e038bd24f75aec82dcd](https://www.loom.com/share/1aeec7095dd34e038bd24f75aec82dcd)  
**Live Deployment URL:** [https://document-sharing-client.vercel.app](https://document-sharing-client.vercel.app) *(or your deployed Render/Vercel URL)*  
**Google Drive Submission Folder:** [https://drive.google.com/drive/folders/placeholder-ajaia-submission](https://drive.google.com/drive/folders/placeholder-ajaia-submission)  

---

## 1. Seeded Test Accounts

To test role-based sharing, document ownership, and collaboration, the MongoDB Atlas database has been pre-seeded with test accounts. Use any of the credentials below via the **Sign In** button:

| Name | Email Address | Password | Intended Role in Demos |
| :--- | :--- | :--- | :--- |
| **Dureti Mohammedsani** | `dureti104@gmail.com` | `1234` | Primary Document Owner |
| **Sarah Connor** | `sarah.connor@gmail.com` | `1234` | Collaborating Editor |
| **Alex Morgan** | `alex.morgan@gmail.com` | `1234` | Commenter (Feedback / Reviewer) |
| **David Kim** | `david.kim@kim.com` | `1234` | Viewer (Read-only access) |
| **Emily Watson** | `emily.watson@gmail.com` | `1234` | Secondary Collaborator |
| **Michael Chen** | `michael.chen@gmail.com` | `1234` | Secondary Collaborator |

---

## 2. Core Feature Checklist & Status

| Task Area | Requirement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **1. Document Creation & Editing** | Create, rename, rich-text edit, autosave & reopen | **Complete (100%)** | Rich-text formatting (bold, italic, underline, headers H1-H3, bullets, numbers, alignment, fonts, colors). Full autosave indicator with offline & error states. Survives refresh. |
| **2. File Upload** | Upload `.txt` or `.md` to create editable doc; import into draft | **Complete (100%)** | Dashboard "Upload File" card parses `.txt`/`.md` into new docs; in-editor "File → Import File" merges text directly into drafts. Supported formats clearly indicated. |
| **3. Sharing Model** | Document owner, role assignment, owned vs shared distinction | **Complete (100%)** | Multi-role RBAC (`Owner`, `Editor`, `Commenter`, `Viewer`). Dashboard filter tabs (`All`, `Owned by me`, `Shared with me`) and visual ownership badges on cards. |
| **4. Persistence** | Database persistence surviving refresh/reload | **Complete (100%)** | MongoDB Atlas with Mongoose. Canonical operational delta compositions stored with 1500ms debounce. Threaded comments & version history also persisted. |
| **5. Product & Engineering Quality** | Automated tests, setup docs, type-safety, architecture note | **Complete (100%)** | **26 automated Vitest tests passing** (16 client, 10 server). Strict TypeScript on both layers. [ARCHITECTURE.md](ARCHITECTURE.md) and [AI_WORKFLOW.md](AI_WORKFLOW.md) included. |
| **Optional Stretch** | Real-time collaboration cursors, comments, versioning, export | **Complete (Bonus)** | Live multi-cursor flags via `quill-cursors`, 2-way anchored in-text comments with `<mark>` highlight, version history restore, and PDF/Markdown export. |

---

## 3. What Is Incomplete & What I Would Build Next (2-4 Hours)

### Deliberate Scope Reductions:
1. **Binary Word (.docx) Parsing:** Deliberately scoped file upload to native `.txt` and `.md` to avoid introducing bloated, unvetted external binary parsers under tight timebox constraints.
2. **Offline-First Synchronization (P2P CRDTs):** Chose server-authoritative operational delta composition over Yjs/Automerge to ensure strict RBAC access control and direct MongoDB persistence without synchronization divergence.

### Next Steps with Another 2-4 Hours:
1. **Folder Organization & Workspace Hierarchy:** Allow users to group documents into organizational folders and subfolders.
2. **Document Search In-Body Full Text:** Expand MongoDB Atlas search index to index the raw text inside delta ops in addition to document titles.
3. **Real-Time Comment Co-Presence:** Add live typing bubbles inside active comment threads when multiple reviewers comment at the same time.

---

## 4. Local Setup & Run Instructions

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm or pnpm
- MongoDB (A live MongoDB Atlas connection string is already configured in `server/.env`)

### Step 1: Clone Repository
```bash
git clone https://github.com/dura12/document_sharing.git
cd document_sharing
```

### Step 2: Install Dependencies
```bash
# Install Server Dependencies
cd server && npm install

# Install Client Dependencies
cd ../client && npm install
```

### Step 3: Run Automated Test Suites
```bash
# Run Server Unit & Integration Tests (10 tests)
npm test --prefix server

# Run Client Unit & Export Tests (16 tests)
npm test --prefix client
```

### Step 4: Run Development Servers
```bash
# Terminal 1: Run Backend API & WebSocket Server (Port 3001)
npm run dev --prefix server

# Terminal 2: Run Frontend Vite Dev Server (Port 5173)
npm run dev --prefix client
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Open an Incognito window side-by-side to test real-time collaboration between seeded accounts!
