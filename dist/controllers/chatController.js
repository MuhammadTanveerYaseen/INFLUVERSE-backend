"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserChats = exports.getMessages = exports.sendMessage = exports.startChat = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
const Order_1 = __importDefault(require("../models/Order"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
const User_1 = __importDefault(require("../models/User"));
const socket_service_1 = require("../services/socket.service");
// Helper to filter sensitive info
const filterMessageContent = (content) => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const whatsappRegex = /(whatsapp)/gi;
    let filtered = content.replace(emailRegex, '[EMAIL HIDDEN]');
    filtered = filtered.replace(phoneRegex, '[PHONE HIDDEN]');
    filtered = filtered.replace(whatsappRegex, '[WHATSAPP HIDDEN]');
    return filtered;
};
// @desc    Start or Get Chat Context
const startChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { recipientId, orderId, offerId } = req.body;
    const senderId = req.user._id || req.user.id;
    try {
        let query = {
            participants: { $all: [senderId, recipientId] }
        };
        if (orderId)
            query.order = orderId;
        else if (offerId)
            query.offer = offerId;
        else
            query.contextType = 'general';
        let chat = yield Chat_1.default.findOne(query);
        if (!chat) {
            chat = yield Chat_1.default.create({
                participants: [senderId, recipientId],
                order: orderId,
                offer: offerId,
                contextType: orderId ? 'order' : (offerId ? 'offer' : 'general'),
                isReadOnly: false,
            });
        }
        res.json(chat);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.startChat = startChat;
// @desc    Send Message
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { content, attachments } = req.body;
    const { chatId } = req.params;
    try {
        const chat = yield Chat_1.default.findById(chatId);
        if (!chat)
            return res.status(404).json({ message: 'Chat not found' });
        const userId = (req.user.id || req.user._id).toString();
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            console.warn(`[ChatController] Unauthorized message attempt. User ${userId} tried to message chat ${chatId} where they are not a participant.`);
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (chat.order) {
            const order = yield Order_1.default.findById(chat.order);
            if (order && order.status === 'cancelled') {
                chat.isReadOnly = true;
                yield chat.save();
            }
        }
        if (chat.isReadOnly) {
            return res.status(400).json({ message: 'Chat is read-only because order is cancelled or completed.' });
        }
        const settings = yield PlatformSettings_1.default.findOne();
        let safeContent = filterMessageContent(content);
        if (settings && settings.bannedKeywords && Array.isArray(settings.bannedKeywords) && settings.bannedKeywords.length > 0) {
            settings.bannedKeywords.forEach((keyword) => {
                const regex = new RegExp(keyword, 'gi');
                safeContent = safeContent.replace(regex, '[REDACTED]');
            });
        }
        if (settings && settings.autoBanThreshold && settings.autoBanThreshold > 0) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const messageCount = yield Message_1.default.countDocuments({
                sender: userId,
                createdAt: { $gte: oneHourAgo },
                content: content
            });
            if (messageCount >= settings.autoBanThreshold) {
                yield User_1.default.findByIdAndUpdate(userId, {
                    status: 'suspended',
                    rejectionReason: 'Auto-ban: Spamming identical messages.'
                });
                return res.status(403).json({ message: 'Account suspended due to spamming.' });
            }
        }
        const message = yield Message_1.default.create({
            chat: chatId,
            sender: userId,
            content: safeContent,
            attachments: attachments || [],
            isSystemMessage: false,
            readBy: [userId], // sender implicitly read
        });
        chat.updatedAt = new Date();
        yield chat.save();
        const populatedMessage = yield Message_1.default.findById(message._id).populate('sender', 'username');
        chat.participants.forEach((participantId) => {
            (0, socket_service_1.emitToUser)(participantId.toString(), 'chat_message', {
                chatId,
                message: populatedMessage
            });
            (0, socket_service_1.emitToUser)(participantId.toString(), 'refresh_chats', {});
        });
        res.status(201).json(populatedMessage);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.sendMessage = sendMessage;
// @desc    Get Messages & Mark as Read
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatId } = req.params;
        const chat = yield Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const userId = (req.user._id || req.user.id).toString();
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const messages = yield Message_1.default.find({ chat: chatId })
            .populate('sender', 'username')
            .populate('offer')
            .sort({ createdAt: 1 });
        const unreadIds = messages
            .filter(msg => !msg.readBy.some(r => r.toString() === userId) && msg.sender._id.toString() !== userId)
            .map(msg => msg._id);
        if (unreadIds.length > 0) {
            yield Message_1.default.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } });
        }
        res.json(messages);
    }
    catch (error) {
        console.error("Error in getMessages:", error);
        res.status(500).json({ message: error.message });
    }
});
exports.getMessages = getMessages;
// @desc    Get All Chats for User
const getUserChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isUserOnline } = yield Promise.resolve().then(() => __importStar(require('../services/socket.service')));
        const userId = (req.user._id || req.user.id).toString();
        const chats = yield Chat_1.default.find({ participants: userId })
            .populate('participants', 'username')
            .populate('order', 'status')
            .sort({ updatedAt: -1 });
        const chatsWithDetails = yield Promise.all(chats.map((chat) => __awaiter(void 0, void 0, void 0, function* () {
            const unreadCount = yield Message_1.default.countDocuments({
                chat: chat._id,
                readBy: { $ne: userId },
                sender: { $ne: userId }
            });
            const lastMessageObj = yield Message_1.default.findOne({ chat: chat._id })
                .sort({ createdAt: -1 })
                .select('content createdAt attachments');
            const participantsData = chat.participants.map((pid) => {
                return Object.assign(Object.assign({}, pid.toObject()), { isOnline: isUserOnline(pid._id.toString()) });
            });
            return Object.assign(Object.assign({}, chat.toObject()), { unreadCount, lastMessage: lastMessageObj, participants: participantsData });
        })));
        res.json(chatsWithDetails);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserChats = getUserChats;
