import { useState } from "react";
import type { DocumentComment, DocumentCommentReply } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: DocumentComment[];
  selectedText: string;
  onAddComment: (text: string, selectionText?: string) => void;
  onResolveComment: (commentId: string) => void;
  onReplyComment: (commentId: string, reply: DocumentCommentReply) => void;
  onDeleteComment: (commentId: string) => void;
  userRole?: string;
}

export function CommentsSidebar({
  isOpen,
  onClose,
  comments,
  selectedText,
  onAddComment,
  onResolveComment,
  onReplyComment,
  onDeleteComment,
  userRole = "editor",
}: CommentsSidebarProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) =>
    tab === "open" ? !c.resolved : c.resolved,
  );

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && parts[0] && parts[1]
      ? (parts[0][0]! + parts[1][0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim(), selectedText.trim() || undefined);
    setNewCommentText("");
  };

  const handleSendReply = (commentId: string) => {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;

    const reply: DocumentCommentReply = {
      id: crypto.randomUUID(),
      author: {
        name: user?.name || "Anonymous Collaborator",
        email: user?.email,
        color: user?.color || "#1a73e8",
      },
      text,
      createdAt: new Date().toISOString(),
    };

    onReplyComment(commentId, reply);
    setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
    setActiveReplyId(null);
  };

  const isReadOnly = userRole === "viewer";

  return (
    <aside className="comments-sidebar">
      {/* Sidebar Header */}
      <div className="comments-header">
        <div className="comments-title-row">
          <h3>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
            Comments & Suggestions
          </h3>
          <button
            type="button"
            className="btn-close-sidebar"
            onClick={onClose}
            title="Close comments"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher: Open vs Resolved */}
        <div className="comments-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "open" ? "active" : ""}`}
            onClick={() => setTab("open")}
          >
            Open ({comments.filter((c) => !c.resolved).length})
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "resolved" ? "active" : ""}`}
            onClick={() => setTab("resolved")}
          >
            Resolved ({comments.filter((c) => c.resolved).length})
          </button>
        </div>
      </div>

      {/* Add New Comment Box (if not viewer) */}
      {!isReadOnly && tab === "open" && (
        <form className="add-comment-card" onSubmit={handleCreateComment}>
          {selectedText && (
            <div className="selection-quote-box">
              <span className="quote-label">Selected text:</span>
              <p className="quote-content">"{selectedText}"</p>
            </div>
          )}
          <textarea
            className="comment-textarea"
            placeholder={
              selectedText
                ? "Add a comment on selected text..."
                : "Add a comment to this document..."
            }
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            rows={3}
          />
          <div className="comment-card-actions">
            {selectedText && (
              <span className="quote-badge">Attached to selection</span>
            )}
            <button
              type="submit"
              className="btn-post-comment"
              disabled={!newCommentText.trim()}
            >
              Comment
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {filteredComments.length === 0 ? (
          <div className="empty-comments-state">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#dadce0">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
            <p>
              {tab === "open"
                ? "No open comments. Highlight text in the document and click comment!"
                : "No resolved comments yet."}
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-thread-card ${comment.resolved ? "resolved" : ""}`}
            >
              {/* Comment Header */}
              <div className="comment-thread-header">
                <div className="comment-author-info">
                  <div
                    className="avatar-circle-sm"
                    style={{ backgroundColor: comment.author.color }}
                  >
                    {getInitials(comment.author.name)}
                  </div>
                  <div>
                    <strong className="comment-author-name">
                      {comment.author.name}
                    </strong>
                    <span className="comment-time">
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Resolve checkmark and delete buttons */}
                <div className="comment-header-actions">
                  {!isReadOnly && (
                    <button
                      type="button"
                      className={`btn-resolve ${comment.resolved ? "resolved" : ""}`}
                      onClick={() => onResolveComment(comment.id)}
                      title={
                        comment.resolved
                          ? "Re-open comment"
                          : "Mark as resolved"
                      }
                    >
                      ✓
                    </button>
                  )}
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="btn-delete-comment"
                      onClick={() => onDeleteComment(comment.id)}
                      title="Delete thread"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Selected quote if present */}
              {comment.selectionText && (
                <div className="thread-selection-quote">
                  "{comment.selectionText}"
                </div>
              )}

              {/* Comment Body */}
              <p className="comment-body-text">{comment.text}</p>

              {/* Thread Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="comment-replies-list">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="comment-reply-item">
                      <div
                        className="avatar-circle-xs"
                        style={{ backgroundColor: reply.author.color }}
                      >
                        {getInitials(reply.author.name)}
                      </div>
                      <div className="reply-content">
                        <div className="reply-header">
                          <strong>{reply.author.name}</strong>
                          <span className="comment-time">
                            {new Date(reply.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p>{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input Box */}
              {!isReadOnly && !comment.resolved && (
                <div className="comment-reply-box">
                  {activeReplyId === comment.id ? (
                    <div className="active-reply-form">
                      <input
                        type="text"
                        placeholder="Reply to this comment..."
                        value={replyTexts[comment.id] || ""}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({
                            ...prev,
                            [comment.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendReply(comment.id);
                        }}
                      />
                      <div className="reply-btn-row">
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={() => setActiveReplyId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary-sm"
                          onClick={() => handleSendReply(comment.id)}
                          disabled={!replyTexts[comment.id]?.trim()}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-trigger-reply"
                      onClick={() => setActiveReplyId(comment.id)}
                    >
                      Reply...
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
