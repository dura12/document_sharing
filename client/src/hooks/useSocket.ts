import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SERVER_URL } from "@/config/env";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  status: "connecting" | "connected" | "disconnected" | "error";
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<UseSocketReturn["status"]>("connecting");

  useEffect(() => {
    const s: TypedSocket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      setIsConnected(true);
      setStatus("connected");
    });

    s.on("disconnect", () => {
      setIsConnected(false);
      setStatus("disconnected");
    });

    s.on("connect_error", () => {
      setIsConnected(false);
      setStatus("error");
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, isConnected, status };
}
