import { Request, Response } from 'express';
import mongoose from 'mongoose';
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

        const otherParticipantId = chat.participants.find(p => p.toString() !== userId);
        const [settings, otherUser, senderUser, lastMessageInChat] = await Promise.all([
            PlatformSettings.findOne(),
            otherParticipantId ? User.findById(otherParticipantId) : Promise.resolve(null),
            User.findById(userId),
            Message.findOne({ chat: chatId }).sort({ createdAt: -1 })
        ]);

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
        const populatedMessage = await message.populate('sender', 'username profilePhoto');

        // Deduplicate participants to avoid sending multiple socket events to the same user
        const uniqueParticipants = Array.from(new Set(chat.participants.map(p => p.toString())));

        uniqueParticipants.forEach((participantId: string) => {
            emitToUser(participantId, 'chat_message', {
                chatId,
                message: populatedMessage
            });
            emitToUser(participantId, 'refresh_chats', {});
        });

        if (shouldSendEmail && otherParticipantId) {
            // FIRE AND FORGET: Do not await email sending to avoid blocking the chat UI
            (async () => {
                try {
                    const recipientUser = await User.findById(otherParticipantId);
                    const senderUser = await User.findById(userId);
                    if (recipientUser && senderUser) {
                        const { sendEmail, emailTemplates } = require('../utils/emailService');
                        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const link = `${frontendUrl}/dashboard/${recipientUser.role}/messages/${chatId}`;
                        const template = emailTemplates.newMessage(senderUser.username, link, recipientUser.preferredLanguage || 'de');
                        await sendEmail(
                            recipientUser.email,
                            template.subject,
                            template.html
                        );
                    }
                } catch (err) {
                    console.error('[Chat] Background email send failed:', err);
                }
            })();
        }

        if (redisClient.isReady) {
            uniqueParticipants.forEach((participantId: string) => {
                redisClient.del(`chats_${participantId}`);
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



// @desc    Get Single Chat Details
export const getChatDetails = async (req: Request | any, res: Response) => {
    try {
        const { chatId } = req.params;
        const { isUserOnline } = await import('../services/socket.service');
        const userId = (req.user._id || req.user.id).toString();

        const chat = await Chat.findById(chatId)
            .populate('participants', 'username profilePhoto role')
            .populate('order', 'status')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .lean();

        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const isParticipant = chat.participants.some(p => p._id.toString() === userId);
        if (!isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

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
                ...pid,
                isOnline: isUserOnline(pid._id.toString())
            };
        });

        const messages = await Message.find({ chat: chat._id })
            .populate('sender', 'username profilePhoto')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .sort({ createdAt: 1 })
            .lean();

        // Background: Mark as read
        const unreadIds = messages
            .filter(msg => !msg.readBy.some((r: any) => r.toString() === userId) && msg.sender?._id?.toString() !== userId && msg.sender !== userId)
            .map(msg => msg._id);
        if (unreadIds.length > 0) {
            Message.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } }).catch(() => {});
            if (redisClient.isReady) redisClient.del(`chats_${userId}`).catch(() => {});
        }

        res.json({
            ...chat,
            unreadCount,
            lastMessage: lastMessageObj,
            participants: participantsData,
            messages // Include messages in the details response
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

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
            .populate('sender', 'username profilePhoto')
            .populate('offer', 'status price deliverables brand creator sender paid order')
            .sort({ createdAt: 1 })
            .lean();

        // Calculate unread IDs to mark as read
        const unreadIds = messages
            .filter(msg => !msg.readBy.some((r: any) => r.toString() === userId) && msg.sender?._id?.toString() !== userId && msg.sender !== userId)
            .map(msg => msg._id);

        if (unreadIds.length > 0) {
            // FIRE AND FORGET: Mark messages as read in the background
            Message.updateMany(
                { _id: { $in: unreadIds } },
                { $addToSet: { readBy: userId } }
            ).catch(err => console.error('[Chat] Background mark as read failed:', err));

            if (redisClient.isReady) {
                redisClient.del(`chats_${userId}`).catch(() => {});
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
            .populate('participants', 'username profilePhoto')
            .populate('order', 'status')
            .sort({ updatedAt: -1 })
            .lean();

        const chatIds = chats.map(c => c._id);

        // Fetch unread counts in one query
        const unreadCounts = await Message.aggregate([
            { $match: { chat: { $in: chatIds }, readBy: { $ne: new mongoose.Types.ObjectId(userId) }, sender: { $ne: new mongoose.Types.ObjectId(userId) } } },
            { $group: { _id: '$chat', count: { $sum: 1 } } }
        ]);
        const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));

        // Fetch last messages in one query
        const lastMessages = await Message.aggregate([
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
            const chatIdStr = (chat as any)._id.toString();
            const participantsData = (chat as any).participants.map((pid: any) => {
                return {
                    ...pid,
                    isOnline: isUserOnline(pid._id.toString())
                };
            });

            return {
                ...chat,
                unreadCount: unreadMap[chatIdStr] || 0,
                lastMessage: lastMsgMap[chatIdStr] || null,
                participants: participantsData,
            };
        });

        if (redisClient.isReady) {
            await redisClient.setEx(CACHE_KEY, 120, JSON.stringify(chatsWithDetails));
        }

        res.json(chatsWithDetails);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
