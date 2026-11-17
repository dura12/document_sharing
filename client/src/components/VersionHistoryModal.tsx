import { useState } from "react";
import type { DocumentVersion } from "@/types";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DocumentVersion[];
  currentTitle: string;
  onRestoreVersion: (versionId: string) => void;
  onCreateSnapshot: (label?: string) => void;
  canEdit: boolean;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  currentTitle,
  onRestoreVersion,
  onCreateSnapshot,
  canEdit,
}: VersionHistoryModalProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions[0]?.id || null,
  );
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [isNamingSnapshot, setIsNamingSnapshot] = useState(false);

  if (!isOpen) return null;

  const activeVersion =
    versions.find((v) => v.id === selectedVersionId) || versions[0];

  const handleSaveNamedSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotLabel.trim()) return;
    onCreateSnapshot(snapshotLabel.trim());
    setSnapshotLabel("");
    setIsNamingSnapshot(false);
  };

  const handleRestore = () => {
    if (!activeVersion) return;
    const ok = window.confirm(
      `Are you sure you want to restore "${activeVersion.label || "this revision"}"? Your current state will be saved as a new version.`,
    );
    if (ok) {
      onRestoreVersion(activeVersion.id);
      onClose();
    }
  };

  const formatVersionDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Convert Delta ops to preview string
  const renderPreviewText = (version?: DocumentVersion) => {
    if (!version || !version.data || !Array.isArray(version.data.ops)) {
      return "Empty document snapshot.";
    }
    const text = version.data.ops
      .map((op) => (typeof op.insert === "string" ? op.insert : " "))
      .join("");
    return text.trim() || "(Empty document at this snapshot)";
  };

  return (
    <div className="version-history-overlay">
      <div className="version-history-container">
        {/* Top Header Bar */}
        <div className="vh-header">
          <div className="vh-header-left">
            <button
              type="button"
              className="vh-btn-back"
              onClick={onClose}
              title="Return to document"
            >
              ←
            </button>
            <div className="vh-title-meta">
              <h2>Version History</h2>
              <span>{currentTitle || "Untitled Document"}</span>
            </div>
          </div>

          <div className="vh-header-right">
            {canEdit && activeVersion && (
              <button
                type="button"
                className="btn-restore-version"
                onClick={handleRestore}
                title="Restore this version to the live document"
              >
                ↻ Restore this version
              </button>
            )}
            <button
              type="button"
              className="btn-close-vh"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body: Left Timeline, Right Document Preview */}
        <div className="vh-body">
          {/* Versions Sidebar List */}
          <div className="vh-timeline-sidebar">
            <div className="vh-sidebar-actions">
              {canEdit && (
                <>
                  {isNamingSnapshot ? (
                    <form
                      className="vh-name-form"
                      onSubmit={handleSaveNamedSnapshot}
                    >
                      <input
                        type="text"
                        placeholder="Version name (e.g. Draft 1)"
                        value={snapshotLabel}
                        onChange={(e) => setSnapshotLabel(e.target.value)}
                        autoFocus
                      />
                      <div className="vh-name-buttons">
                        <button
                          type="button"
                          className="btn-secondary-xs"
                          onClick={() => setIsNamingSnapshot(false)}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn-primary-xs">
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="btn-name-current-version"
                      onClick={() => setIsNamingSnapshot(true)}
                    >
                      + Name current version
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="vh-versions-list">
              {versions.map((ver, idx) => {
                const isSelected =
                  ver.id === (activeVersion?.id || versions[0]?.id);
                return (
                  <div
                    key={ver.id}
                    className={`vh-version-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedVersionId(ver.id)}
                  >
                    <div className="vh-version-date">
                      {formatVersionDate(ver.createdAt)}
                    </div>
                    <div className="vh-version-label">
                      {ver.label || (idx === 0 ? "Current Version" : `Revision`)}
                    </div>
                    <div className="vh-version-author">
                      <span className="author-dot" />
                      {ver.authorName || "Collaborator"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Version Preview Pane */}
          <div className="vh-preview-pane">
            <div className="vh-preview-banner">
              <span>
                Viewing snapshot from{" "}
                <strong>
                  {activeVersion
                    ? formatVersionDate(activeVersion.createdAt)
                    : "now"}
                </strong>{" "}
                by{" "}
                <strong>{activeVersion?.authorName || "Collaborator"}</strong>
              </span>
            </div>
            <div className="vh-preview-sheet">
              <h1 className="vh-preview-doc-title">
                {activeVersion?.title || currentTitle}
              </h1>
              <div className="vh-preview-content">
                {renderPreviewText(activeVersion)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
