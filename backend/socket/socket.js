import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ["GET", "POST"],
        },
        pingTimeout: 60000,
    });

    io.on("connection", (socket) => {
        socket.on("join", ({ userId, email }) => {
            if (userId) {
                socket.join(`user_${String(userId)}`);
            }
            if (email) {
                socket.join(`email_${String(email).trim().toLowerCase()}`);
            }
        });

        socket.on("disconnect", () => {
            // client disconnected
        });
    });

    return io;
};

export const getIO = () => io;

/**
 * Emit real-time event to specific user by userId and/or email
 */
export const emitToUser = ({ userId, email }, event, data) => {
    if (!io) return;
    if (userId) {
        io.to(`user_${String(userId)}`).emit(event, data);
    }
    if (email) {
        io.to(`email_${String(email).trim().toLowerCase()}`).emit(event, data);
    }
};
