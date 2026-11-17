import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { SERVER_URL } from "@/config/env";

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("gdocs_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("gdocs_token") || null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem("gdocs_user", JSON.stringify(user));
      localStorage.setItem("gdocs_token", token);
    } else {
      localStorage.removeItem("gdocs_user");
      localStorage.removeItem("gdocs_token");
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }
      setUser(data.user);
      setToken(data.token);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      const isMisconfiguredProd =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        SERVER_URL.includes("localhost");
      return {
        success: false,
        error: isMisconfiguredProd
          ? "Backend server is not configured (VITE_SERVER_URL is pointing to localhost). Set VITE_SERVER_URL in Vercel to your Render backend URL."
          : "Unable to connect to authentication server. The server may be starting up — please try again in a few seconds.",
      };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }
      setUser(data.user);
      setToken(data.token);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      const isMisconfiguredProd =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        SERVER_URL.includes("localhost");
      return {
        success: false,
        error: isMisconfiguredProd
          ? "Backend server is not configured (VITE_SERVER_URL is pointing to localhost). Set VITE_SERVER_URL in Vercel to your Render backend URL."
          : "Unable to connect to authentication server. The server may be starting up — please try again in a few seconds.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
