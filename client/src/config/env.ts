const DEFAULT_PROD_SERVER_URL = "https://document-sharing-4zq6.onrender.com";

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? DEFAULT_PROD_SERVER_URL
    : "http://localhost:3001");
