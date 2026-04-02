import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { allowedOrigins } from '../config/cors';

let io: Server;
const onlineUsers = new Map<string, string>(); // userId -> socketId (simplified, assumes one session per user for status)
// Better: Map<string, Set<string>> userId -> socketIds

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: true,
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        let currentUserId: string | null = null;
        console.log('User connected:', socket.id);

        socket.on('join', (userId: string) => {
            if (userId) {
                currentUserId = userId;
                socket.join(userId);
                onlineUsers.set(userId, socket.id);

                // Broadcast that user is online
                socket.broadcast.emit('user_status_change', { userId, status: 'online' });
                console.log(`User ${userId} joined and is now online`);
            }
        });

        // Typing indicators
        socket.on('typing', ({ chatId, recipientId }) => {
            if (recipientId) {
                io.to(recipientId).emit('user_typing', { chatId, userId: currentUserId });
            }
        });

        socket.on('stop_typing', ({ chatId, recipientId }) => {
            if (recipientId) {
                io.to(recipientId).emit('user_stop_typing', { chatId, userId: currentUserId });
            }
        });

        socket.on('disconnect', () => {
            if (currentUserId) {
                onlineUsers.delete(currentUserId);
                // Broadcast that user is offline
                socket.broadcast.emit('user_status_change', { userId: currentUserId, status: 'offline' });
                console.log(`User ${currentUserId} disconnected and is now offline`);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
};

export const emitToUser = (userId: string, event: string, data: any) => {
    if (io) {
        io.to(userId).emit(event, data);
    }
};
