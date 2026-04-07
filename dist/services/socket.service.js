"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.isUserOnline = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const onlineUsers = new Map(); // userId -> socketId (simplified, assumes one session per user for status)
// Better: Map<string, Set<string>> userId -> socketIds
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: true,
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        let currentUserId = null;
        console.log('User connected:', socket.id);
        socket.on('join', (userId) => {
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
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;
const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};
exports.isUserOnline = isUserOnline;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
