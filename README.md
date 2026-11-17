# Google Docs Clone

A real-time collaborative document editor built with React 19, Socket.IO, Quill 2, Quill Cursors, and MongoDB.

Multiple users can simultaneously edit the same document with real-time delta synchronization, live collaborator cursors, presence indicators, document title management, and automatic debounced persistence.

---

## Features

* **Real-Time Operational Delta Sync:** Keystrokes are captured as Quill Deltas, composed sequentially on the server, and broadcast to all collaborators.
* **Live Collaborator Cursors & Presence:** See where active collaborators are selecting or typing in real time with unique colors and anonymous animal names.
* **Document Title Sync:** Edit document titles inline with live broadcast across all open sessions.
* **Cloud Save & Connection Status:** Real-time indicator displaying save state (`Saving...`, `Saved to cloud`, `Reconnecting...`).
* **Debounced Persistence:** Eliminates client-side overwrite conflicts by maintaining canonical server-side document state with debounced MongoDB writes.
* **Graceful Lifecycle Management:** Automatic room cleanup on disconnect or document switch, with pending saves flushed on server termination.
* **Automated Test Coverage:** Unit and integration test suites using Vitest for both client and server sync protocols.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Client** | React 19, TypeScript 5, Vite 6, Quill 2, Quill Cursors, Socket.IO Client |
| **Server** | Node.js, TypeScript 5, Socket.IO 4.8, Quill Delta 5, Mongoose 8 |
| **Database** | MongoDB 8 |
| **Testing** | Vitest |
| **Tooling** | Docker Compose, tsx, ESLint |

---

## Architecture

```
client/                               server/
├── src/                              ├── src/
│   ├── components/                   │   ├── config/          # Zod env validation
│   │   ├── Header.tsx       # UI     │   ├── handlers/        # Socket handlers & delta engine
│   │   └── TextEditor.tsx   # Quill  │   ├── models/          # Document Mongoose schema
│   ├── hooks/                        │   ├── types/           # Shared socket & delta types
│   │   ├── useSocket.ts     # Lifecycle   └── index.ts        # Bootstrap & graceful shutdown
│   │   └── useDocumentSync.ts # Sync ├── tsconfig.json
│   ├── config/                       └── package.json
│   ├── types/
│   └── styles/
│       └── editor.css
```

---

## Quick Start with Docker

Run the complete stack (MongoDB, server, client) with a single command:

```bash
docker compose up --build
```

Once running, open [http://localhost:5173](http://localhost:5173). Open the same URL in an incognito window or separate browser tab to see real-time collaboration, presence, and live cursors in action.

---

## Manual Setup

### 1. Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Run Tests

```bash
# Server tests (5 tests)
npm test --prefix server

# Client tests (5 tests)
npm test --prefix client
```

### 3. Run Development Servers

```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

---

## Data Synchronization & Concurrency Model

1. **Connection & Presence:** When a user visits `/documents/:id`, the client connects via Socket.IO and emits `get-document`. The server registers the collaborator with a designated color and anonymous handle, returning canonical document data and emitting `presence-updated`.
2. **Delta Propagation:** As users type, Quill generates local Delta operations (`ops`). The client emits `send-changes`, which the server composes into the canonical in-memory state and broadcasts via `receive-changes` to all other room members.
3. **Cursor Tracking:** Quill selection changes trigger `cursor-move` events, rendering remote collaborator flags and selection boxes with `quill-cursors`.
4. **Debounced Persistence:** Instead of having clients periodically overwrite the database with full local snapshots, the server debounces writes (1500ms after last change) and persists the canonical Delta to MongoDB.

---

## Evaluation & Decision Log

See [DECISION_RECORD.md](DECISION_RECORD.md) for architectural trade-offs, bug fixes, and technical decisions made during refactoring.
