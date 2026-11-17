# Walkthrough Video Script (3-5 Minutes)
**Candidate:** Dureti Mohammedsani (`dureti104@gmail.com`)  
**Assignment:** Ajaia LLC - AI-Native Full Stack Developer Assignment  
**Platform:** Ajaia Docs  

---

### Step-by-Step Recording Guide

#### 0:00 – 0:30 | Introduction & Scenario Setup
> *"Hi everyone, I’m Dureti Mohammedsani. Today I’m walking you through **Ajaia Docs**, a lightweight, real-time collaborative document editor I built for the Ajaia LLC AI-Native Full Stack Developer assignment.*
>
> *Our goal was to ship a focused, high-integrity product slice under tight time constraints, demonstrating full-stack engineering, sound product judgment, and practical AI leverage without outsourcing engineering discernment."*

---

#### 0:30 – 1:30 | Core Flow 1: Creation, Rich Editing & File Upload
> *(Action: Show the dashboard at localhost:5173 or the live deployment link)*
>
> *"Starting here on the Ajaia Docs dashboard, users can quickly start a blank document or upload an existing file. In our product workflow, teams frequently start from markdown drafts or text outlines. Let me demonstrate uploading a `.md` or `.txt` file..."*
>
> *(Action: Click 'Upload File', select a sample markdown/txt file, show it instantly creating the editable document)*
>
> *"Notice how the file name automatically becomes the document title, and the content is parsed into our rich-text editor. Inside the editor, we support clean typography: headings H1 through H3, bold, italic, underline, bullet and numbered lists, text alignments, and color palettes. We also have a live cloud-save indicator in the header that tracks saving state with debounced writes to MongoDB Atlas."*

---

#### 1:30 – 2:30 | Core Flow 2: Real-Time Collaboration, Roles & In-Text Comments
> *(Action: Open an Incognito window side-by-side. Log in as `dureti104@gmail.com` on the left (Owner) and `alex.morgan@gmail.com` on the right (Commenter or Viewer))*
>
> *"Now let's examine collaboration and our sharing model. I have two sessions open side-by-side:*
> 1. *On the left, I'm signed in as the document owner (`dureti104@gmail.com`).*
> 2. *On the right, Sarah or Alex is signed in as a collaborator.*
>
> *Notice live cursors via Quill Cursors showing each user's exact caret position and selection with personalized colors and names.*
>
> *Next is our role-based sharing model: by clicking the **Share** button, the owner can set granular permissions—Owner, Editor, Commenter, or Viewer. Notice that if a user is given Viewer or Commenter access, the client UI disables typing, displays an active mode banner, and our server-side WebSocket guards strictly reject any unauthorized delta mutations.*
>
> *One of my favorite additions is our **anchored in-text comments**: highlight any phrase in the document, click the comment button, and type feedback. The text is highlighted with an inline mark. Clicking the highlighted text in the document immediately scrolls to the comment card in the sidebar, and clicking the quote inside the card jumps right back to the text!"*

---

#### 2:30 – 3:30 | Core Flow 3: Dashboard Organization & Ownership Filtering
> *(Action: Navigate back to the home dashboard on both windows)*
>
> *"Back on the dashboard, we clearly satisfy Task 3's requirement for a visible distinction between owned and shared documents. Users can filter by 'All Documents', 'Owned by me', and 'Shared with me'. Each document card also displays a distinct status pill—green for 'Owned by me' and blue for 'Shared' with the owner's handle."*

---

#### 3:30 – 4:30 | Architecture Decisions, Tradeoffs & What Was Deprioritized
> *"From an architecture standpoint:*
> - *We chose **Operational Deltas via Quill** composed sequentially on our Node.js server rather than whole-document HTML overwrites. This eliminates race conditions and ensures concurrent edits merge smoothly.*
> - *For persistence, delta updates are coalesced via a 1500ms debounce queue to MongoDB Atlas, preventing database throttling.*
> - *Quality: The codebase is 100% strict TypeScript with **26 automated Vitest tests** passing across client and server.*
>
> *What did I intentionally deprioritize?*
> - *Proprietary binary `.docx` AST parsing—deliberately scoped to `.txt` and `.md` to avoid vulnerable, bloated third-party dependencies.*
> - *Complex nested folder trees—kept the dashboard focused on fast search and clear ownership tabs to deliver depth within the 4-6 hour timebox.*
> - *With another 2 to 4 hours, I would implement full-text search indexing inside delta operations and real-time co-presence within active comment threads."*

---

#### 4:30 – 5:00 | AI-Native Workflow & Conclusion
> *"How did AI support my workflow?*
> - *AI materially sped up generating test scaffolding for concurrent socket connections, Parchment Blot DOM boilerplate, and export parsers.*
> - *Crucially, I rejected AI suggestions that proposed simplistic document-overwrite sync or ephemeral memory-only permissions. Human judgment drove the data integrity and architectural boundaries.*
>
> *Thank you to the Ajaia team for reviewing this assignment. Everything is documented in SUBMISSION.md, ARCHITECTURE.md, and AI_WORKFLOW.md in the repository!"*
