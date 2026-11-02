import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { playEmailChime, playDsrChime } from "../utils/audioChime";
import { Mail, Clock } from "lucide-react";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const getSocketUrl = () => {
    let base = import.meta.env.VITE_BASE_URL;
    const isLocalhost = typeof window !== "undefined" && 
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (!base || typeof base !== "string" || !base.trim()) {
        return isLocalhost ? "http://localhost:5000" : "https://backend.ideafueled.com";
    }

    let url = base.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://backend.ideafueled.com")) {
        url = url.replace(/^http:\/\//i, "https://");
    }
    return url;
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
        const token = (() => {
            try { return localStorage.getItem("token"); } catch { return null; }
        })();
        const socket = io(socketUrl, {
            withCredentials: true,
            auth: {
                token: token,
            },
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

        // Handle incoming 5:30 PM DSR Reminder event
        socket.on("dsr_reminder", (data) => {
            // 1. Play distinct, longer 2-second DSR chime
            playDsrChime();

            // 2. Dispatch events for UI updates
            window.dispatchEvent(new CustomEvent("hrms:dsr_reminder", { detail: data }));
            window.dispatchEvent(new CustomEvent("hrms:new_email", { detail: data }));

            // 3. Show high-priority Toast alert with immediate action
            toast("Daily Status Report (DSR) Due", {
                description: data?.message || "Please submit your DSR report for today before wrapping up your day.",
                icon: <Clock className="w-4 h-4 text-amber-500" />,
                duration: 15000,
                action: {
                    label: "Write DSR Now",
                    onClick: () => {
                        window.dispatchEvent(
                            new CustomEvent("hrms:open_dsr_compose", { detail: data })
                        );
                        navigate("/inbox?compose=dsr");
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
