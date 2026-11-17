import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { SERVER_URL } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AjaiaLogo } from "@/components/AjaiaLogo";

interface DocItem {
  id: string;
  title: string;
  ownerEmail?: string | null;
  collaboratorRoles?: { email: string; role: string }[];
  defaultRole?: string;
  createdAt: string;
  updatedAt: string;
}

export function DocumentDashboard() {
  const navigate = useNavigate();
  const { user, logout, openAuthModal } = useAuth();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "owned" | "shared">("all");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SERVER_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateNew = () => {
    const newId = crypto.randomUUID();
    navigate(`/documents/${newId}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "txt" && extension !== "md") {
      alert("Please upload a .txt or .md file. Other formats are currently not supported.");
      e.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const text = await file.text();
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      const newId = crypto.randomUUID();

      const payload = {
        id: newId,
        title: cleanTitle,
        ownerEmail: user?.email || null,
        data: {
          ops: [{ insert: text + "\n" }],
        },
      };

      const res = await fetch(`${SERVER_URL}/api/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate(`/documents/${newId}`);
      } else {
        alert("Failed to upload document. Please try again.");
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
      alert("An error occurred while uploading the file.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const isOwner = (doc: DocItem) => {
    if (!user?.email) return false;
    return doc.ownerEmail?.toLowerCase() === user.email.toLowerCase();
  };

  const isShared = (doc: DocItem) => {
    if (!user?.email) return false;
    if (isOwner(doc)) return false;
    const inCollaborators = doc.collaboratorRoles?.some(
      (c) => c.email.toLowerCase() === user.email.toLowerCase(),
    );
    return Boolean(inCollaborators || (doc.ownerEmail && doc.ownerEmail !== user.email));
  };

  const ownedCount = user?.email
    ? documents.filter((d) => isOwner(d)).length
    : 0;
  const sharedCount = user?.email
    ? documents.filter((d) => isShared(d)).length
    : documents.filter((d) => d.ownerEmail).length;

  const filteredDocs = documents
    .filter((doc) => {
      if (filterTab === "owned") {
        return isOwner(doc);
      }
      if (filterTab === "shared") {
        return isShared(doc) || (!user?.email && doc.ownerEmail);
      }
      return true;
    })
    .filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const formatDate = (isoString: string) => {
    if (!isoString) return "Recently";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && parts[0] && parts[1]
      ? (parts[0][0]! + parts[1][0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="dashboard-page">
      {/* Top Navigation Bar */}
      <header className="dashboard-nav">
        <div className="dashboard-nav-left">
          <div className="docs-brand" onClick={() => navigate("/")} title="Ajaia LLC">
            <AjaiaLogo size={36} showWordmark={true} tagline="Collaborative Docs" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="dashboard-search-container">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="#5f6368"
            className="search-icon"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            className="dashboard-search-input"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              &times;
            </button>
          )}
        </div>

        {/* User Account Section */}
        <div className="dashboard-nav-right">
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
                      <span className="profile-badge">Active User</span>
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
              className="btn-signin"
              onClick={openAuthModal}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Template / Create New Section */}
      <section className="dashboard-templates-section">
        <div className="dashboard-container">
          <div className="section-header">
            <h3>Start a new document</h3>
            <span className="template-subtitle">Create a blank document or upload text/markdown files</span>
          </div>
          <div className="template-cards-row">
            <div className="template-card-wrapper" onClick={handleCreateNew}>
              <div className="template-card blank-card">
                <svg viewBox="0 0 48 48" width="56" height="56">
                  <path fill="#4285F4" d="M22 6h4v36h-4z" />
                  <path fill="#EA4335" d="M6 22h36v4H6z" />
                </svg>
              </div>
              <span className="template-label">Blank document</span>
            </div>

            <div
              className="template-card-wrapper"
              onClick={() => fileInputRef.current?.click()}
              title="Upload a .txt or .md file to create an editable document"
            >
              <div className="template-card upload-card">
                {isUploading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="44" height="44" fill="#0b57d0">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                    </svg>
                    <span className="upload-badge">.txt &bull; .md</span>
                  </>
                )}
              </div>
              <span className="template-label">Upload File</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.md"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </section>

      {/* Recent Documents List Section */}
      <section className="dashboard-documents-section">
        <div className="dashboard-container">
          <div className="docs-list-top-bar">
            <div className="docs-filter-tabs">
              <button
                type="button"
                className={`filter-tab-btn ${filterTab === "all" ? "active" : ""}`}
                onClick={() => setFilterTab("all")}
              >
                All documents ({documents.length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${filterTab === "owned" ? "active" : ""}`}
                onClick={() => setFilterTab("owned")}
              >
                Owned by me ({ownedCount})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${filterTab === "shared" ? "active" : ""}`}
                onClick={() => setFilterTab("shared")}
              >
                Shared with me ({sharedCount})
              </button>
            </div>

            <button
              type="button"
              className="btn-refresh"
              onClick={fetchDocuments}
              title="Refresh list"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#5f6368">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="docs-loading-state">
              <span className="spinner" /> Loading documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="docs-empty-state">
              <p>
                {filterTab === "owned"
                  ? "You don't own any documents yet."
                  : filterTab === "shared"
                    ? "No documents have been shared with you yet."
                    : "No documents found."}
              </p>
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn-primary-create"
                  onClick={handleCreateNew}
                >
                  + Create New Document
                </button>
                <button
                  type="button"
                  className="btn-secondary-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📥 Upload .txt or .md
                </button>
              </div>
            </div>
          ) : (
            <div className="docs-grid">
              {filteredDocs.map((doc) => {
                const owner = isOwner(doc);
                return (
                  <div
                    key={doc.id}
                    className="doc-card"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <div className="doc-card-preview">
                      <svg viewBox="0 0 24 24" width="44" height="44" fill="#0b57d0">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                      </svg>
                      <div className="doc-ownership-badge-wrap">
                        {owner ? (
                          <span className="doc-ownership-pill owned" title="You are the document owner">
                            Owned by me
                          </span>
                        ) : doc.ownerEmail ? (
                          <span
                            className="doc-ownership-pill shared"
                            title={`Document owned by ${doc.ownerEmail}`}
                          >
                            Shared &bull; {doc.ownerEmail.split("@")[0]}
                          </span>
                        ) : (
                          <span className="doc-ownership-pill public" title="Public document">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="doc-card-info">
                      <h4 className="doc-card-title" title={doc.title}>
                        {doc.title || "Untitled Document"}
                      </h4>
                      <div className="doc-card-meta">
                        <span>Edited {formatDate(doc.updatedAt || doc.createdAt)}</span>
                        <button
                          type="button"
                          className="doc-delete-btn"
                          onClick={(e) => handleDelete(e, doc.id, doc.title)}
                          title="Delete document"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="#5f6368"
                          >
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AuthModal />
    </div>
  );
}
