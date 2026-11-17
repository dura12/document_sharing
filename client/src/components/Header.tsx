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
import { AjaiaLogo } from "@/components/AjaiaLogo";

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
  onOpenVersionHistory?: () => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportHtml?: () => void;
  onExportTxt?: () => void;
  onImportText?: (content: string, filename: string) => void;
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
  onOpenVersionHistory,
  onExportMarkdown,
  onExportPdf,
  onExportHtml,
  onExportTxt,
  onImportText,
}: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, openAuthModal } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "txt" && extension !== "md") {
      alert("Please upload a .txt or .md file.");
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      onImportText?.(text, file.name);
    } catch (err) {
      console.error("Failed to read file:", err);
      alert("Failed to read the selected file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

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
    (c, index, self) =>
      index ===
      self.findIndex(
        (u) =>
          (c.email && u.email && c.email.toLowerCase() === u.email.toLowerCase()) ||
          u.name === c.name ||
          u.id === c.id,
      ),
  );

  const isReadOnly = role === "viewer";
  const isCommentOnly = role === "commenter";

  return (
    <header className="doc-header">
      {/* Left Section: Logo, Title, Menubar & Status */}
      <div className="doc-header-left">
        <div
          className="docs-logo"
          title="Go to Ajaia Docs Home"
          onClick={() => navigate("/")}
        >
          <AjaiaLogo size={36} />
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

                  {onImportText && !isReadOnly && !isCommentOnly && (
                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        setIsFileMenuOpen(false);
                        importInputRef.current?.click();
                      }}
                      title="Import content from a .txt or .md file"
                    >
                      <span>📥 Import File (.txt, .md)</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={importInputRef}
                    accept=".txt,.md"
                    onChange={handleImportFile}
                    style={{ display: "none" }}
                  />

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

      {/* Right Section: Collaborators, Share Button & Profile */}
      <div className="doc-header-right">
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
