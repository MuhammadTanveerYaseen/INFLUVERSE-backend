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
exports.getUserChats = exports.getMessages = exports.getChatDetails = exports.checkBlockStatus = exports.toggleBlockUser = exports.deleteChat = exports.clearChat = exports.sendMessage = exports.startChat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
const Order_1 = __importDefault(require("../models/Order"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
const User_1 = __importDefault(require("../models/User"));
const socket_service_1 = require("../services/socket.service");
const redis_1 = __importDefault(require("../config/redis"));
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
        const otherParticipantId = chat.participants.find(p => p.toString() !== userId);
        const [settings, otherUser, senderUser, lastMessageInChat] = yield Promise.all([
            PlatformSettings_1.default.findOne(),
            otherParticipantId ? User_1.default.findById(otherParticipantId) : Promise.resolve(null),
            User_1.default.findById(userId),
            Message_1.default.findOne({ chat: chatId }).sort({ createdAt: -1 })
        ]);
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
        // Check for block status using pre-fetched data
        if (otherParticipantId && otherUser) {
            if (otherUser.blockedUsers.some(id => id.toString() === userId)) {
                return res.status(403).json({ message: 'You have been blocked by this user.' });
            }
            if (senderUser && senderUser.blockedUsers.some(id => id.toString() === otherParticipantId.toString())) {
                return res.status(403).json({ message: 'You have blocked this user. Unblock them to send messages.' });
            }
        }
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const shouldSendEmail = !lastMessageInChat || lastMessageInChat.createdAt < twentyFourHoursAgo;
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
        const populatedMessage = yield message.populate('sender', 'username profilePhoto');
        // Deduplicate participants to avoid sending multiple socket events to the same user
        const uniqueParticipants = Array.from(new Set(chat.participants.map(p => p.toString())));
        uniqueParticipants.forEach((participantId) => {
            (0, socket_service_1.emitToUser)(participantId, 'chat_message', {
                chatId,
                message: populatedMessage
            });
            (0, socket_service_1.emitToUser)(participantId, 'refresh_chats', {});
        });
        if (shouldSendEmail && otherParticipantId) {
            // FIRE AND FORGET: Do not await email sending to avoid blocking the chat UI
            (() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const recipientUser = yield User_1.default.findById(otherParticipantId);
                    const senderUser = yield User_1.default.findById(userId);
                    if (recipientUser && senderUser) {
                        const { sendEmail, emailTemplates } = require('../utils/emailService');
                        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const link = `${frontendUrl}/dashboard/${recipientUser.role}/messages/${chatId}`;
                        const template = emailTemplates.newMessage(senderUser.username, link, recipientUser.preferredLanguage || 'de');
                        yield sendEmail(recipientUser.email, template.subject, template.html);
                    }
                }
                catch (err) {
                    console.error('[Chat] Background email send failed:', err);
                }
            }))();
        }
        if (redis_1.default.isReady) {
            uniqueParticipants.forEach((participantId) => {
                redis_1.default.del(`chats_${participantId}`);
            });
        }
        res.status(201).json(populatedMessage);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.sendMessage = sendMessage;
// @desc    Clear all messages in a chat
const clearChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatId } = req.params;
        const userId = (req.user._id || req.user.id).toString();
        const chat = yield Chat_1.default.findById(chatId);
        if (!chat)
            return res.status(404).json({ message: 'Chat not found' });
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        yield Message_1.default.deleteMany({ chat: chatId });
        chat.participants.forEach((participantId) => {
            (0, socket_service_1.emitToUser)(participantId.toString(), 'chat_cleared', { chatId });
        });
        if (redis_1.default.isReady) {
            chat.participants.forEach((participantId) => {
                redis_1.default.del(`chats_${participantId.toString()}`);
            });
        }
        res.json({ message: 'Chat cleared successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.clearChat = clearChat;
// @desc    Delete a chat and its messages
const deleteChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatId } = req.params;
        const userId = (req.user._id || req.user.id).toString();
        const chat = yield Chat_1.default.findById(chatId);
        if (!chat)
            return res.status(404).json({ message: 'Chat not found' });
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        yield Message_1.default.deleteMany({ chat: chatId });
        yield chat.deleteOne();
        chat.participants.forEach((participantId) => {
            (0, socket_service_1.emitToUser)(participantId.toString(), 'chat_deleted', { chatId });
        });
        if (redis_1.default.isReady) {
            chat.participants.forEach((participantId) => {
                redis_1.default.del(`chats_${participantId.toString()}`);
            });
        }
        res.json({ message: 'Chat deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteChat = deleteChat;
// @desc    Block/Unblock a user
const toggleBlockUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetUserId } = req.body;
        const userId = (req.user._id || req.user.id).toString();
        if (targetUserId === userId) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const isBlocked = user.blockedUsers.some(id => id.toString() === targetUserId);
        if (isBlocked) {
            user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId);
            yield user.save();
            res.json({ message: 'User unblocked', isBlocked: false });
        }
        else {
            user.blockedUsers.push(targetUserId);
            yield user.save();
            res.json({ message: 'User blocked', isBlocked: true });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleBlockUser = toggleBlockUser;
// @desc    Check if a user is blocked
const checkBlockStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetUserId } = req.params;
        const userId = (req.user._id || req.user.id).toString();
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const isBlocked = user.blockedUsers.some(id => id.toString() === targetUserId);
        const targetUser = yield User_1.default.findById(targetUserId);
        const amIBlocked = (targetUser === null || targetUser === void 0 ? void 0 : targetUser.blockedUsers.some(id => id.toString() === userId)) || false;
        res.json({ isBlocked, amIBlocked });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.checkBlockStatus = checkBlockStatus;
// @desc    Get Single Chat Details
const getChatDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatId } = req.params;
        const { isUserOnline } = yield Promise.resolve().then(() => __importStar(require('../services/socket.service')));
        const userId = (req.user._id || req.user.id).toString();
        const chat = yield Chat_1.default.findById(chatId)
            .populate('participants', 'username profilePhoto role')
            .populate('order', 'status')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .lean();
        if (!chat)
            return res.status(404).json({ message: 'Chat not found' });
        const isParticipant = chat.participants.some(p => p._id.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const unreadCount = yield Message_1.default.countDocuments({
            chat: chat._id,
            readBy: { $ne: userId },
            sender: { $ne: userId }
        });
        const lastMessageObj = yield Message_1.default.findOne({ chat: chat._id })
            .sort({ createdAt: -1 })
            .select('content createdAt attachments');
        const participantsData = chat.participants.map((pid) => {
            return Object.assign(Object.assign({}, pid), { isOnline: isUserOnline(pid._id.toString()) });
        });
        const messages = yield Message_1.default.find({ chat: chat._id })
            .populate('sender', 'username profilePhoto')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .sort({ createdAt: 1 })
            .lean();
        // Background: Mark as read
        const unreadIds = messages
            .filter(msg => { var _a, _b; return !msg.readBy.some((r) => r.toString() === userId) && ((_b = (_a = msg.sender) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) !== userId && msg.sender !== userId; })
            .map(msg => msg._id);
        if (unreadIds.length > 0) {
            Message_1.default.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } }).catch(() => { });
            if (redis_1.default.isReady)
                redis_1.default.del(`chats_${userId}`).catch(() => { });
        }
        res.json(Object.assign(Object.assign({}, chat), { unreadCount, lastMessage: lastMessageObj, participants: participantsData, messages // Include messages in the details response
         }));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getChatDetails = getChatDetails;
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
            .populate('sender', 'username profilePhoto')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .sort({ createdAt: 1 })
            .lean();
        // Calculate unread IDs to mark as read
        const unreadIds = messages
            .filter(msg => { var _a, _b; return !msg.readBy.some((r) => r.toString() === userId) && ((_b = (_a = msg.sender) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) !== userId && msg.sender !== userId; })
            .map(msg => msg._id);
        if (unreadIds.length > 0) {
            // FIRE AND FORGET: Mark messages as read in the background
            Message_1.default.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } }).catch(err => console.error('[Chat] Background mark as read failed:', err));
            if (redis_1.default.isReady) {
                redis_1.default.del(`chats_${userId}`).catch(() => { });
            }
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
        const CACHE_KEY = `chats_${userId}`;
        if (redis_1.default.isReady) {
            const cachedData = yield redis_1.default.get(CACHE_KEY);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }
        const chats = yield Chat_1.default.find({ participants: userId })
            .populate('participants', 'username profilePhoto')
            .populate('order', 'status')
            .sort({ updatedAt: -1 })
            .lean();
        const chatIds = chats.map(c => c._id);
        // Fetch unread counts in one query
        const unreadCounts = yield Message_1.default.aggregate([
            { $match: { chat: { $in: chatIds }, readBy: { $ne: new mongoose_1.default.Types.ObjectId(userId) }, sender: { $ne: new mongoose_1.default.Types.ObjectId(userId) } } },
            { $group: { _id: '$chat', count: { $sum: 1 } } }
        ]);
        const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));
        // Fetch last messages in one query
        const lastMessages = yield Message_1.default.aggregate([
            { $match: { chat: { $in: chatIds } } },
            { $sort: { createdAt: -1 } },
            { $group: {
                    _id: '$chat',
                    content: { $first: '$content' },
                    createdAt: { $first: '$createdAt' },
                    attachments: { $first: '$attachments' }
                } }
        ]);
        const lastMsgMap = Object.fromEntries(lastMessages.map(m => [m._id.toString(), m]));
        const chatsWithDetails = chats.map((chat) => {
            const chatIdStr = chat._id.toString();
            const participantsData = chat.participants.map((pid) => {
                return Object.assign(Object.assign({}, pid), { isOnline: isUserOnline(pid._id.toString()) });
            });
            return Object.assign(Object.assign({}, chat), { unreadCount: unreadMap[chatIdStr] || 0, lastMessage: lastMsgMap[chatIdStr] || null, participants: participantsData });
        });
        if (redis_1.default.isReady) {
            yield redis_1.default.setEx(CACHE_KEY, 120, JSON.stringify(chatsWithDetails));
        }
        res.json(chatsWithDetails);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserChats = getUserChats;
