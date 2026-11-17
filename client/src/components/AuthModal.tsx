import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isRegisterMode) {
      const res = await register(name, email, password);
      if (!res.success) {
        setError(res.error || "Failed to create account");
      }
    } else {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || "Failed to sign in");
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-backdrop" onClick={closeAuthModal}>
      <div
        className="auth-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={closeAuthModal}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#4285F4">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          </div>
          <h2>{isRegisterMode ? "Create Google Docs Account" : "Sign In to Google Docs"}</h2>
          <p className="auth-subtitle">
            {isRegisterMode
              ? "Collaborate with your real identity and custom cursor color"
              : "Access your documents and collaborate seamlessly"}
          </p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegisterMode ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
            >
              {isRegisterMode ? "Sign In" : "Create Account"}
            </button>
          </p>
          <button
            type="button"
            className="auth-guest-link"
            onClick={closeAuthModal}
          >
            Continue as Guest (Anonymous)
          </button>
        </div>
      </div>
    </div>
  );
}
