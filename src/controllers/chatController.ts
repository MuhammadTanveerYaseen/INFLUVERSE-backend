import { Request, Response } from 'express';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Order from '../models/Order';
import PlatformSettings from '../models/PlatformSettings';
import User from '../models/User';
import Offer from '../models/Offer';
import { emitToUser } from '../services/socket.service';
import redisClient from '../config/redis';

// Helper to filter sensitive info
const filterMessageContent = (content: string): string => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const whatsappRegex = /(whatsapp)/gi;

    let filtered = content.replace(emailRegex, '[EMAIL HIDDEN]');
    filtered = filtered.replace(phoneRegex, '[PHONE HIDDEN]');
    filtered = filtered.replace(whatsappRegex, '[WHATSAPP HIDDEN]');

    return filtered;
};

// @desc    Start or Get Chat Context
export const startChat = async (req: Request | any, res: Response) => {
    const { recipientId, orderId, offerId } = req.body;
    const senderId = req.user._id || req.user.id;

    try {
        let query: any = {
            participants: { $all: [senderId, recipientId] }
        };

        if (orderId) query.order = orderId;
        else if (offerId) query.offer = offerId;
        else query.contextType = 'general';

        let chat = await Chat.findOne(query);

        if (!chat) {
            chat = await Chat.create({
                participants: [senderId, recipientId],
                order: orderId,
                offer: offerId,
                contextType: orderId ? 'order' : (offerId ? 'offer' : 'general'),
                isReadOnly: false,
            });
        }

        res.json(chat);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send Message
export const sendMessage = async (req: Request | any, res: Response) => {
    const { content, attachments } = req.body;
    const { chatId } = req.params;

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const userId = (req.user.id || req.user._id).toString();
        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            console.warn(`[ChatController] Unauthorized message attempt. User ${userId} tried to message chat ${chatId} where they are not a participant.`);
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (chat.order) {
            const order = await Order.findById(chat.order);
            if (order && order.status === 'cancelled') {
                chat.isReadOnly = true;
                await chat.save();
            }
        }

        if (chat.isReadOnly) {
            return res.status(400).json({ message: 'Chat is read-only because order is cancelled or completed.' });
        }

        const settings = await PlatformSettings.findOne();

        let safeContent = filterMessageContent(content);
        if (settings && settings.bannedKeywords && Array.isArray(settings.bannedKeywords) && settings.bannedKeywords.length > 0) {
            settings.bannedKeywords.forEach((keyword: any) => {
                const regex = new RegExp(keyword as string, 'gi');
                safeContent = safeContent.replace(regex, '[REDACTED]');
            });
        }

        if (settings && settings.autoBanThreshold && settings.autoBanThreshold > 0) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const messageCount = await Message.countDocuments({
                sender: userId,
                createdAt: { $gte: oneHourAgo },
                content: content
            });

            if (messageCount >= settings.autoBanThreshold) {
                await User.findByIdAndUpdate(userId, {
                    status: 'suspended',
                    rejectionReason: 'Auto-ban: Spamming identical messages.'
                });
                return res.status(403).json({ message: 'Account suspended due to spamming.' });
            }
        }

        // Check for block status before creating message
        const otherParticipantId = chat.participants.find(p => p.toString() !== userId);
        if (otherParticipantId) {
            const recipient = await User.findById(otherParticipantId);
            if (recipient && recipient.blockedUsers.some(id => id.toString() === userId)) {
                console.log(`[Chat] Blocking message: recipient ${otherParticipantId} has blocked sender ${userId}`);
                return res.status(403).json({ message: 'You have been blocked by this user.' });
            }
            
            const sender = await User.findById(userId);
            if (sender && sender.blockedUsers.some(id => id.toString() === otherParticipantId.toString())) {
                console.log(`[Chat] Blocking message: sender ${userId} has blocked recipient ${otherParticipantId}`);
                return res.status(403).json({ message: 'You have blocked this user. Unblock them to send messages.' });
            }
        }

        const lastMessageInChat = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 });
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const shouldSendEmail = !lastMessageInChat || lastMessageInChat.createdAt < twentyFourHoursAgo;

        const message = await Message.create({
            chat: chatId,
            sender: userId,
            content: safeContent,
            attachments: attachments || [],
            isSystemMessage: false,
            readBy: [userId], // sender implicitly read
        });

        chat.updatedAt = new Date();
        await chat.save();
        const populatedMessage = await Message.findById(message._id).populate('sender', 'username');

        chat.participants.forEach((participantId: any) => {
            emitToUser(participantId.toString(), 'chat_message', {
                chatId,
                message: populatedMessage
            });
            emitToUser(participantId.toString(), 'refresh_chats', {});
        });

        if (shouldSendEmail && otherParticipantId) {
            try {
                const recipientUser = await User.findById(otherParticipantId);
                const senderUser = await User.findById(userId);
                if (recipientUser && senderUser) {
                    const { sendEmail, emailTemplates } = require('../utils/emailService');
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                    const link = `${frontendUrl}/dashboard/${recipientUser.role}/messages/${chatId}`;
                    await sendEmail(
                        recipientUser.email,
                        `New message from ${senderUser.username}`,
                        emailTemplates.newMessage(senderUser.username, link, 'en') // Assume 'en' as default
                    );
                }
            } catch (err) {
                console.error('[Chat] Failed to send new message email:', err);
            }
        }

        if (redisClient.isReady) {
            chat.participants.forEach((participantId: any) => {
                redisClient.del(`chats_${participantId.toString()}`);
            });
        }

        res.status(201).json(populatedMessage);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Clear all messages in a chat
export const clearChat = async (req: Request | any, res: Response) => {
    try {
        const { chatId } = req.params;
        const userId = (req.user._id || req.user.id).toString();

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Message.deleteMany({ chat: chatId });
        
        chat.participants.forEach((participantId: any) => {
            emitToUser(participantId.toString(), 'chat_cleared', { chatId });
        });

        if (redisClient.isReady) {
            chat.participants.forEach((participantId: any) => {
                redisClient.del(`chats_${participantId.toString()}`);
            });
        }

        res.json({ message: 'Chat cleared successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a chat and its messages
export const deleteChat = async (req: Request | any, res: Response) => {
    try {
        const { chatId } = req.params;
        const userId = (req.user._id || req.user.id).toString();

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Message.deleteMany({ chat: chatId });
        await chat.deleteOne();

        chat.participants.forEach((participantId: any) => {
            emitToUser(participantId.toString(), 'chat_deleted', { chatId });
        });

        if (redisClient.isReady) {
            chat.participants.forEach((participantId: any) => {
                redisClient.del(`chats_${participantId.toString()}`);
            });
        }

        res.json({ message: 'Chat deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Block/Unblock a user
export const toggleBlockUser = async (req: Request | any, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const userId = (req.user._id || req.user.id).toString();

        if (targetUserId === userId) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isBlocked = user.blockedUsers.some(id => id.toString() === targetUserId);

        if (isBlocked) {
            user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId);
            await user.save();
            res.json({ message: 'User unblocked', isBlocked: false });
        } else {
            user.blockedUsers.push(targetUserId);
            await user.save();
            res.json({ message: 'User blocked', isBlocked: true });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if a user is blocked
export const checkBlockStatus = async (req: Request | any, res: Response) => {
    try {
        const { targetUserId } = req.params;
        const userId = (req.user._id || req.user.id).toString();

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isBlocked = user.blockedUsers.some(id => id.toString() === targetUserId);
        
        const targetUser = await User.findById(targetUserId);
        const amIBlocked = targetUser?.blockedUsers.some(id => id.toString() === userId) || false;

        res.json({ isBlocked, amIBlocked });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Get Messages & Mark as Read
export const getMessages = async (req: Request | any, res: Response) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const userId = (req.user._id || req.user.id).toString();

        const isParticipant = chat.participants.some(p => p.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username')
            .populate('offer')
            .sort({ createdAt: 1 });

        const unreadIds = messages
            .filter(msg => !msg.readBy.some(r => r.toString() === userId) && msg.sender._id.toString() !== userId)
            .map(msg => msg._id);

        if (unreadIds.length > 0) {
            await Message.updateMany(
                { _id: { $in: unreadIds } },
                { $addToSet: { readBy: userId } }
            );
            if (redisClient.isReady) {
                await redisClient.del(`chats_${userId}`);
            }
        }

        res.json(messages);
    } catch (error: any) {
        console.error("Error in getMessages:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Chats for User
export const getUserChats = async (req: Request | any, res: Response) => {
    try {
        const { isUserOnline } = await import('../services/socket.service');
        const userId = (req.user._id || req.user.id).toString();

        const CACHE_KEY = `chats_${userId}`;
        if (redisClient.isReady) {
            const cachedData = await redisClient.get(CACHE_KEY);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        const chats = await Chat.find({ participants: userId })
            .populate('participants', 'username')
            .populate('order', 'status')
            .sort({ updatedAt: -1 });

        const chatsWithDetails = await Promise.all(chats.map(async (chat) => {
            const unreadCount = await Message.countDocuments({
                chat: chat._id,
                readBy: { $ne: userId },
                sender: { $ne: userId }
            });

            const lastMessageObj = await Message.findOne({ chat: chat._id })
                .sort({ createdAt: -1 })
                .select('content createdAt attachments');

            const participantsData = chat.participants.map((pid: any) => {
                return {
                    ...pid.toObject(),
                    isOnline: isUserOnline(pid._id.toString())
                };
            });

            return {
                ...chat.toObject(),
                unreadCount,
                lastMessage: lastMessageObj,
                participants: participantsData,
            };
        }));

        if (redisClient.isReady) {
            await redisClient.setEx(CACHE_KEY, 120, JSON.stringify(chatsWithDetails));
        }

        res.json(chatsWithDetails);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
