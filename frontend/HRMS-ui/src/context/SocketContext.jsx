import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { playEmailChime } from "../utils/audioChime";
import { Mail } from "lucide-react";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const getSocketUrl = () => {
    const base = import.meta.env.VITE_BASE_URL;
    if (base) {
        return base.replace(/\/api\/?$/, "");
    }
    return "http://localhost:5000";
};

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || !user._id) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const socketUrl = getSocketUrl();
        const socket = io(socketUrl, {
            withCredentials: true,
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("join", {
                userId: user._id,
                email: user.email,
            });
        });

        // Handle incoming new_email real-time event
        socket.on("new_email", (data) => {
            // 1. Play synthesized Web Audio chime
            playEmailChime();

            // 2. Dispatch window event so Sidebar & Inbox can react in real-time
            window.dispatchEvent(new CustomEvent("hrms:new_email", { detail: data }));

            // 3. Show rich Sonner toast notification
            const senderName = data?.email?.senderName || "New Email";
            const subject = data?.email?.subject || "(No Subject)";

            toast(senderName, {
                description: subject,
                icon: <Mail className="w-4 h-4 text-[#225FA3]" />,
                duration: 6000,
                action: {
                    label: "Open Inbox",
                    onClick: () => {
                        navigate("/inbox");
                    },
                },
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, navigate]);

    return (
        <SocketContext.Provider value={socketRef.current}>
            {children}
        </SocketContext.Provider>
    );
};
