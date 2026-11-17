import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import type {
  UserPresence,
  SaveStatus,
  UserRole,
  CollaboratorRoleAssignment,
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ShareModal } from "@/components/ShareModal";

interface HeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  collaborators: UserPresence[];
  saveStatus: SaveStatus;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  documentId: string;
  role?: UserRole;
  defaultRole?: UserRole;
  collaboratorRoles?: CollaboratorRoleAssignment[];
  onUpdatePermissions?: (
    defaultRole: UserRole,
    roles: CollaboratorRoleAssignment[],
  ) => void;
  typingUsers?: UserPresence[];
  openCommentsCount?: number;
  isCommentsOpen?: boolean;
  onToggleComments?: () => void;
  onOpenVersionHistory?: () => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportHtml?: () => void;
  onExportTxt?: () => void;
  editorMode?: "editing" | "suggesting" | "viewing";
  onModeChange?: (mode: "editing" | "suggesting" | "viewing") => void;
}

export function Header({
  title,
  onTitleChange,
  collaborators,
  saveStatus,
  connectionStatus,
  documentId,
  role = "editor",
  defaultRole = "editor",
  collaboratorRoles = [],
  onUpdatePermissions,
  typingUsers = [],
  openCommentsCount = 0,
  isCommentsOpen = false,
  onToggleComments,
  onOpenVersionHistory,
  onExportMarkdown,
  onExportPdf,
  onExportHtml,
  onExportTxt,
  editorMode = "editing",
  onModeChange,
}: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, openAuthModal } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
      if (
        fileMenuRef.current &&
        !fileMenuRef.current.contains(event.target as Node)
      ) {
        setIsFileMenuOpen(false);
      }
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(event.target as Node)
      ) {
        setIsModeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusDisplay = () => {
    if (connectionStatus === "disconnected" || connectionStatus === "error") {
      return (
        <span className="status-pill status-error" title="Reconnecting to server">
          <span className="status-dot error" /> Reconnecting...
        </span>
      );
    }
    if (saveStatus === "saving") {
      return (
        <span className="status-pill status-saving" title="Saving changes">
          <span className="status-dot saving" /> Saving...
        </span>
      );
    }
    return (
      <span className="status-pill status-saved" title="All changes saved to cloud">
        <svg className="cloud-icon" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17 15.09 9.08 16.5 10.5 10 17z"
          />
        </svg>
        Saved to cloud
      </span>
    );
  };

  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && parts[0] && parts[1]
      ? (parts[0][0]! + parts[1][0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const uniqueCollaborators = collaborators.filter(
    (c, index, self) => index === self.findIndex((u) => u.name === c.name),
  );

  const isReadOnly = role === "viewer";
  const isCommentOnly = role === "commenter";

  return (
    <header className="doc-header">
      {/* Left Section: Logo, Title, Menubar & Status */}
      <div className="doc-header-left">
        <div
          className="docs-logo"
          title="Go to Docs Home"
          onClick={() => navigate("/")}
        >
          <svg viewBox="0 0 24 24" width="34" height="34" fill="#4285F4">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </div>

        <div className="doc-details-col">
          <div className="doc-title-row">
            <input
              type="text"
              className="doc-title-input"
              value={title}
              disabled={isReadOnly || isCommentOnly}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Document"
              title={
                isReadOnly || isCommentOnly
                  ? "Read-only document"
                  : "Click to rename document"
              }
            />
            <div className="doc-status-badge">{getStatusDisplay()}</div>

            {/* Live Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator-pill">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-text">
                  {typingUsers.map((u) => u.name).join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            )}
          </div>

          <nav className="doc-menubar">
            {/* File Menu */}
            <div className="menu-item-wrapper" ref={fileMenuRef}>
              <span
                className="menu-item"
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
              >
                File
              </span>
              {isFileMenuOpen && (
                <div className="menu-dropdown">
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      navigate(`/documents/${crypto.randomUUID()}`);
                    }}
                  >
                    <span>+ New Document</span>
                  </div>
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      navigate("/");
                    }}
                  >
                    <span>📁 All Documents (Home)</span>
                  </div>
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onOpenVersionHistory?.();
                    }}
                  >
                    <span>🕒 Version History</span>
                  </div>

                  <div className="menu-dropdown-divider" />
                  <div className="menu-dropdown-header-label">Download As:</div>

                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onExportPdf?.();
                    }}
                  >
                    <span>📄 PDF Document (.pdf)</span>
                  </div>
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onExportMarkdown?.();
                    }}
                  >
                    <span>📝 Markdown (.md)</span>
                  </div>
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onExportHtml?.();
                    }}
                  >
                    <span>🌐 Web Page (.html)</span>
                  </div>
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onExportTxt?.();
                    }}
                  >
                    <span>📋 Plain Text (.txt)</span>
                  </div>

                  <div className="menu-dropdown-divider" />
                  <div
                    className="menu-dropdown-item"
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      window.print();
                    }}
                  >
                    <span>🖨️ Print</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Version History link in menubar */}
            <span
              className="menu-item vh-quick-trigger"
              onClick={onOpenVersionHistory}
              title="View revision snapshots"
            >
              Version History
            </span>

            <span className="menu-item">Edit</span>
            <span className="menu-item">View</span>
            <span className="menu-item">Insert</span>
            <span className="menu-item">Format</span>
            <span className="menu-item">Tools</span>
          </nav>
        </div>
      </div>

      {/* Right Section: Mode Selector, Comments, Collaborators, Share Button & Profile */}
      <div className="doc-header-right">
        {/* Editor Mode Selector (Editing, Suggesting, Viewing) */}
        <div className="mode-selector-wrapper" ref={modeMenuRef}>
          {isReadOnly ? (
            <span className="mode-badge-lock viewing" title="Viewing only">
              👁️ Viewing
            </span>
          ) : isCommentOnly ? (
            <span className="mode-badge-lock suggesting" title="Commenting only">
              💡 Suggesting
            </span>
          ) : (
            <>
              <button
                type="button"
                className="btn-mode-toggle"
                onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                title="Switch editing mode"
              >
                {editorMode === "editing" && "✏️ Editing"}
                {editorMode === "suggesting" && "💡 Suggesting"}
                {editorMode === "viewing" && "👁️ Viewing"}
                <span className="dropdown-arrow">▾</span>
              </button>

              {isModeMenuOpen && (
                <div className="mode-dropdown-menu">
                  <div
                    className={`mode-dropdown-item ${editorMode === "editing" ? "active" : ""}`}
                    onClick={() => {
                      onModeChange?.("editing");
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <strong>✏️ Editing</strong>
                    <span>Edit document directly</span>
                  </div>
                  <div
                    className={`mode-dropdown-item ${editorMode === "suggesting" ? "active" : ""}`}
                    onClick={() => {
                      onModeChange?.("suggesting");
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <strong>💡 Suggesting</strong>
                    <span>Edits become suggestions and comments</span>
                  </div>
                  <div
                    className={`mode-dropdown-item ${editorMode === "viewing" ? "active" : ""}`}
                    onClick={() => {
                      onModeChange?.("viewing");
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <strong>👁️ Viewing</strong>
                    <span>Read or print final document</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Comments Sidebar Toggle Button */}
        <button
          type="button"
          className={`btn-comments-toggle ${isCommentsOpen ? "active" : ""}`}
          onClick={onToggleComments}
          title="Open comments"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          Comments
          {openCommentsCount > 0 && (
            <span className="comments-count-pill">{openCommentsCount}</span>
          )}
        </button>

        {/* Collaborators Avatar Stack with Active Pulse */}
        <div
          className="collaborators-group"
          title={`${uniqueCollaborators.length} active editor(s)`}
        >
          <div className="collaborator-avatars">
            {uniqueCollaborators.map((c) => (
              <div
                key={c.id}
                className="avatar-circle"
                style={{ backgroundColor: c.color }}
                title={`${c.name} (${c.role || defaultRole})`}
              >
                {getUserInitials(c.name)}
                <span className="live-indicator-dot" />
              </div>
            ))}
          </div>
          <span className="collaborator-count">
            {uniqueCollaborators.length}{" "}
            {uniqueCollaborators.length === 1 ? "collaborator" : "collaborators"}
          </span>
        </div>

        {/* Share Button with Role Indicator */}
        <button
          type="button"
          className="btn-share"
          onClick={() => setIsShareModalOpen(true)}
          title="Share document link and permissions"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
          </svg>
          Share
        </button>

        {/* Share Modal Dialog with Role Permissions */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          documentTitle={title}
          documentId={documentId}
          collaborators={uniqueCollaborators}
          defaultRole={defaultRole}
          collaboratorRoles={collaboratorRoles}
          onUpdatePermissions={onUpdatePermissions}
          currentUserRole={role}
        />

        {/* Authentication Button / User Profile Dropdown */}
        <div className="auth-profile-section" ref={profileMenuRef}>
          {user ? (
            <div className="profile-container">
              <button
                type="button"
                className="profile-avatar-btn"
                style={{ backgroundColor: user.color }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title={`Signed in as ${user.name}`}
              >
                {getUserInitials(user.name)}
              </button>

              {isProfileMenuOpen && (
                <div className="profile-dropdown-card">
                  <div className="profile-dropdown-header">
                    <div
                      className="profile-dropdown-avatar"
                      style={{ backgroundColor: user.color }}
                    >
                      {getUserInitials(user.name)}
                    </div>
                    <div className="profile-dropdown-info">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                      <span className="profile-badge">
                        Role: {role.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <button
                    type="button"
                    className="profile-logout-btn"
                    onClick={() => {
                      logout();
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn-auth-signin"
              onClick={openAuthModal}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
