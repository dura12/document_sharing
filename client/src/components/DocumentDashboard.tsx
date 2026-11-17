import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { SERVER_URL } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";

interface DocItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function DocumentDashboard() {
  const navigate = useNavigate();
  const { user, logout, openAuthModal } = useAuth();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

  const filteredDocs = documents.filter((doc) =>
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
          <div className="docs-brand" onClick={() => navigate("/")}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#4285F4">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            <span className="brand-title">Docs</span>
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
          </div>
        </div>
      </section>

      {/* Recent Documents List Section */}
      <section className="dashboard-documents-section">
        <div className="dashboard-container">
          <div className="section-header docs-list-header">
            <h3>Recent documents</h3>
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
              <p>No documents found.</p>
              <button
                type="button"
                className="btn-primary-create"
                onClick={handleCreateNew}
              >
                + Create New Document
              </button>
            </div>
          ) : (
            <div className="docs-grid">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="doc-card"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <div className="doc-card-preview">
                    <svg viewBox="0 0 24 24" width="44" height="44" fill="#4285F4">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
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
              ))}
            </div>
          )}
        </div>
      </section>

      <AuthModal />
    </div>
  );
}
