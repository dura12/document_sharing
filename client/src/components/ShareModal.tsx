import { useState, useRef, useEffect } from "react";
import type { UserPresence, UserRole, CollaboratorRoleAssignment } from "@/types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentId: string;
  collaborators: UserPresence[];
  defaultRole?: UserRole;
  collaboratorRoles?: CollaboratorRoleAssignment[];
  onUpdatePermissions?: (
    defaultRole: UserRole,
    roles: CollaboratorRoleAssignment[],
  ) => void;
  currentUserRole?: UserRole;
}

export function ShareModal({
  isOpen,
  onClose,
  documentTitle,
  documentId,
  collaborators,
  defaultRole = "editor",
  collaboratorRoles = [],
  onUpdatePermissions,
  currentUserRole = "editor",
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("editor");
  const [localDefaultRole, setLocalDefaultRole] = useState<UserRole>(defaultRole);
  const [localRoles, setLocalRoles] =
    useState<CollaboratorRoleAssignment[]>(collaboratorRoles);

  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize state whenever props change or modal reopens
  useEffect(() => {
    setLocalDefaultRole(defaultRole);
    setLocalRoles(collaboratorRoles);
  }, [defaultRole, collaboratorRoles, isOpen]);

  if (!isOpen) return null;

  // Build the share link with the explicit role query parameter
  const shareUrl = `${window.location.origin}/documents/${documentId}?role=${localDefaultRole}`;

  const canManageRoles =
    currentUserRole === "owner" || currentUserRole === "editor";

  const copyText = async (text: string, label?: string) => {
    let success = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success && inputRef.current) {
      try {
        inputRef.current.value = text;
        inputRef.current.select();
        inputRef.current.setSelectionRange(0, 99999);
        document.execCommand("copy");
        success = true;
      } catch {
        success = false;
      }
    }

    setCopied(true);
    if (label) setCopiedRole(label);
    setTimeout(() => {
      setCopied(false);
      setCopiedRole(null);
    }, 2500);
  };

  const handleCopy = () => copyText(shareUrl);

  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && parts[0] && parts[1]
      ? (parts[0][0]! + parts[1][0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    const existingIndex = localRoles.findIndex((r) => r.email === email);
    let updated: CollaboratorRoleAssignment[];
    if (existingIndex >= 0) {
      updated = localRoles.map((r) =>
        r.email === email ? { ...r, role: inviteRole } : r,
      );
    } else {
      updated = [...localRoles, { email, role: inviteRole }];
    }

    setLocalRoles(updated);
    setInviteEmail("");
    onUpdatePermissions?.(localDefaultRole, updated);
  };

  const handleRoleChange = (email: string, newRole: UserRole) => {
    const updated = localRoles.map((r) =>
      r.email === email ? { ...r, role: newRole } : r,
    );
    setLocalRoles(updated);
    onUpdatePermissions?.(localDefaultRole, updated);
  };

  const handleRemoveRole = (email: string) => {
    const updated = localRoles.filter((r) => r.email !== email);
    setLocalRoles(updated);
    onUpdatePermissions?.(localDefaultRole, updated);
  };

  const handleDefaultRoleChange = (newDefault: UserRole) => {
    setLocalDefaultRole(newDefault);
    onUpdatePermissions?.(newDefault, localRoles);
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div
        className="share-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="share-modal-header">
          <div className="share-icon-circle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#1a73e8">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
            </svg>
          </div>
          <div>
            <h3>Share &ldquo;{documentTitle || "Untitled Document"}&rdquo;</h3>
            <p className="share-subtitle">
              Manage who can view, comment, or edit this document
            </p>
          </div>
        </div>

        {/* Add Collaborator with Specific Role */}
        {canManageRoles && (
          <form className="share-invite-form" onSubmit={handleAddPerson}>
            <label htmlFor="invite-email-input">Add people and groups:</label>
            <div className="share-invite-row">
              <input
                id="invite-email-input"
                type="email"
                placeholder="Enter collaborator email (e.g. sarah.connor@gmail.com)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <select
                className="role-selector"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
              >
                <option value="editor">Editor</option>
                <option value="commenter">Commenter</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                className="btn-add-person"
                disabled={!inviteEmail.trim()}
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* Assigned Roles List */}
        {localRoles.length > 0 && (
          <div className="assigned-roles-section">
            <h4>People with assigned roles ({localRoles.length}):</h4>
            <div className="roles-list">
              {localRoles.map((r) => (
                <div key={r.email} className="role-item-row">
                  <div className="role-user-badge">
                    <span className="role-email-text">{r.email}</span>
                  </div>
                  <div className="role-actions-right">
                    <select
                      className="role-selector-sm"
                      value={r.role}
                      disabled={!canManageRoles}
                      onChange={(e) =>
                        handleRoleChange(r.email, e.target.value as UserRole)
                      }
                    >
                      <option value="editor">Editor</option>
                      <option value="commenter">Commenter</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {canManageRoles && (
                      <button
                        type="button"
                        className="btn-remove-role"
                        onClick={() => handleRemoveRole(r.email)}
                        title="Remove access"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Access / Link Sharing Box */}
        <div className="general-access-box">
          <h4>General access:</h4>
          <div className="general-access-row">
            <div className="access-globe-icon">🌐</div>
            <div className="access-desc">
              <strong>Anyone with the link</strong>
              <span>Anyone on the internet with this link can access</span>
            </div>
            <select
              className="role-selector-sm"
              value={localDefaultRole}
              disabled={!canManageRoles}
              onChange={(e) =>
                handleDefaultRoleChange(e.target.value as UserRole)
              }
            >
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="share-input-group">
            <input
              id="share-url-input"
              ref={inputRef}
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className={`btn-copy-link ${copied && !copiedRole ? "copied" : ""}`}
              onClick={handleCopy}
            >
              {copied && !copiedRole ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="share-quick-roles">
            <span className="share-quick-label">Or copy direct link by role:</span>
            <div className="share-quick-buttons">
              <button
                type="button"
                className={`btn-role-copy ${copiedRole === "viewer" ? "copied" : ""}`}
                onClick={() =>
                  copyText(
                    `${window.location.origin}/documents/${documentId}?role=viewer`,
                    "viewer",
                  )
                }
                title="Copy view-only link"
              >
                👁️ Viewer Link
              </button>
              <button
                type="button"
                className={`btn-role-copy ${copiedRole === "commenter" ? "copied" : ""}`}
                onClick={() =>
                  copyText(
                    `${window.location.origin}/documents/${documentId}?role=commenter`,
                    "commenter",
                  )
                }
                title="Copy comment-only link"
              >
                💡 Commenter Link
              </button>
              <button
                type="button"
                className={`btn-role-copy ${copiedRole === "editor" ? "copied" : ""}`}
                onClick={() =>
                  copyText(
                    `${window.location.origin}/documents/${documentId}?role=editor`,
                    "editor",
                  )
                }
                title="Copy full edit link"
              >
                ✏️ Editor Link
              </button>
            </div>
          </div>

          {copied && (
            <span className="copy-success-hint">
              {copiedRole
                ? `✓ ${copiedRole.toUpperCase()} link copied to clipboard!`
                : "✓ Link copied! Anyone with this link can access with selected role."}
            </span>
          )}
        </div>

        {/* Active room collaborators */}
        <div className="share-collaborators-section">
          <h4>Active in room now ({collaborators.length}):</h4>
          <div className="share-collaborator-list">
            {collaborators.map((c) => (
              <div key={c.id} className="share-collaborator-item">
                <div
                  className="avatar-circle-sm"
                  style={{ backgroundColor: c.color }}
                >
                  {getUserInitials(c.name)}
                </div>
                <div className="share-collaborator-info">
                  <strong>{c.name}</strong>
                  <span>
                    Connected &bull; Role:{" "}
                    <b className="capitalize-role">{c.role || localDefaultRole}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="share-modal-footer">
          <span className="room-id-tag">Room ID: {documentId}</span>
          <button type="button" className="btn-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
