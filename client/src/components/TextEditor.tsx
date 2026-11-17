import { useCallback, useState, useEffect } from "react";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import { useParams } from "react-router";
import { useSocket } from "@/hooks/useSocket";
import { useDocumentSync } from "@/hooks/useDocumentSync";
import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { CommentsSidebar } from "@/components/CommentsSidebar";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
import { AuthModal } from "@/components/AuthModal";
import {
  exportToPdf,
  exportToMarkdown,
  exportToHtml,
  exportToTxt,
} from "@/utils/export";
import "quill/dist/quill.snow.css";
import "quill-cursors/css";

// Register QuillCursors module
Quill.register("modules/cursors", QuillCursors);

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["blockquote", "code-block"],
  ["link", "image"],
  ["clean"],
];

export function TextEditor() {
  const { id: documentId } = useParams<"id">();
  const { socket, status: connectionStatus } = useSocket();
  const { user } = useAuth();
  const [quill, setQuill] = useState<Quill | null>(null);

  const [editorMode, setEditorMode] = useState<
    "editing" | "suggesting" | "viewing"
  >("editing");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [floatingCommentBtn, setFloatingCommentBtn] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const {
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
  } = useDocumentSync(
    socket,
    quill,
    documentId || "",
    user ? { name: user.name, color: user.color, email: user.email } : null,
  );

  // Sync effective editor mode with role restrictions
  useEffect(() => {
    if (role === "viewer") {
      setEditorMode("viewing");
      quill?.disable();
    } else if (role === "commenter") {
      setEditorMode("suggesting");
      quill?.disable();
    } else if (editorMode === "viewing") {
      quill?.disable();
    } else {
      quill?.enable();
    }
  }, [role, editorMode, quill]);

  // Track selection for commenting and floating action button
  useEffect(() => {
    if (!quill) return;

    const handleSelection = () => {
      const range = quill.getSelection();
      if (range && range.length > 0) {
        const text = quill.getText(range.index, range.length).trim();
        setSelectedText(text);

        const bounds = quill.getBounds(range.index, range.length);
        if (bounds) {
          const editorElement = quill.root.parentElement;
          const rect = editorElement?.getBoundingClientRect();
          if (rect) {
            setFloatingCommentBtn({
              x: rect.left + bounds.left + bounds.width + 10,
              y: rect.top + bounds.top - 10,
            });
          }
        }
      } else {
        setSelectedText("");
        setFloatingCommentBtn(null);
      }
    };

    quill.on("selection-change", handleSelection);
    return () => {
      quill.off("selection-change", handleSelection);
    };
  }, [quill]);

  const editorRef = useCallback((wrapper: HTMLDivElement | null) => {
    if (!wrapper) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        cursors: {
          transformOnTextChange: true,
        },
      },
    });

    q.disable();
    q.setText("Loading document from server...");
    setQuill(q);
  }, []);

  const openCommentsWithSelection = () => {
    setIsCommentsOpen(true);
    setFloatingCommentBtn(null);
  };

  const openCommentsCount = comments.filter((c) => !c.resolved).length;
  const canEdit = role === "owner" || role === "editor";

  return (
    <div className={`editor-shell ${editorMode}`}>
      <Header
        title={title}
        onTitleChange={updateTitle}
        collaborators={collaborators}
        saveStatus={saveStatus}
        connectionStatus={connectionStatus}
        documentId={documentId || ""}
        role={role}
        defaultRole={defaultRole}
        collaboratorRoles={collaboratorRoles}
        onUpdatePermissions={updatePermissions}
        typingUsers={typingUsers}
        onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
        onExportPdf={() => exportToPdf(title)}
        onExportMarkdown={() => exportToMarkdown(title, quill)}
        onExportHtml={() => exportToHtml(title, quill)}
        onExportTxt={() => exportToTxt(title, quill)}
      />

      {/* Role Notice Banner */}
      {role === "viewer" && (
        <div className="role-notice-banner viewing">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          Viewing only &mdash; You have read-only access to this document. Contact the owner to request edit access.
        </div>
      )}

      {role === "commenter" && (
        <div className="role-notice-banner commenting">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          Comment-only mode &mdash; You can highlight text to leave suggestions and comments, but cannot edit document text directly.
        </div>
      )}

      {!isLoaded && (
        <div className="loading-banner">
          <span className="spinner" /> Connecting to collaboration server...
        </div>
      )}

      <div className="editor-main-layout">
        <div
          className={`editor-workspace ${role === "viewer" ? "role-viewer" : role === "commenter" ? "role-commenter" : ""}`}
          ref={editorRef}
          onKeyDownCapture={(e) => {
            if (role === "viewer" || role === "commenter") {
              // Allow Ctrl/Cmd + C (copy) and Ctrl/Cmd + A (select all)
              if (
                (e.ctrlKey || e.metaKey) &&
                ["c", "C", "a", "A"].includes(e.key)
              ) {
                return;
              }
              // Allow navigation arrows and page scroll keys
              if (
                [
                  "ArrowUp",
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(e.key)
              ) {
                return;
              }
              // Block all typing, deletion, formatting shortcuts
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />

        {/* Comment button docked to the right of the document */}
        {!isCommentsOpen && (
          <div className="doc-side-comment-dock">
            <button
              type="button"
              className="btn-doc-side-comment"
              onClick={() => setIsCommentsOpen(true)}
              title="Open comments"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
              <span>Comments</span>
              {openCommentsCount > 0 && (
                <span className="comments-count-badge">{openCommentsCount}</span>
              )}
            </button>
          </div>
        )}

        {/* Slide-out Comments Sidebar */}
        <CommentsSidebar
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
          comments={comments}
          selectedText={selectedText}
          onAddComment={addComment}
          onResolveComment={resolveComment}
          onReplyComment={replyComment}
          onDeleteComment={deleteComment}
          userRole={role}
        />
      </div>

      {/* Floating Add Comment Action Button when text is highlighted */}
      {floatingCommentBtn && role !== "viewer" && !isCommentsOpen && (
        <button
          type="button"
          className="floating-add-comment-btn"
          style={{
            position: "fixed",
            left: `${floatingCommentBtn.x}px`,
            top: `${floatingCommentBtn.y}px`,
            zIndex: 1000,
          }}
          onClick={openCommentsWithSelection}
          title="Add comment to selected text"
        >
          💬 +
        </button>
      )}

      {/* Version History Modal / Drawer */}
      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        versions={versions}
        currentTitle={title}
        onRestoreVersion={restoreVersion}
        onCreateSnapshot={createVersion}
        canEdit={canEdit}
      />

      <AuthModal />
    </div>
  );
}
