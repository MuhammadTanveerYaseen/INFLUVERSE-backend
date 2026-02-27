import { Request, Response } from 'express';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Order from '../models/Order';
import PlatformSettings from '../models/PlatformSettings';
import User from '../models/User';
import Offer from '../models/Offer';
import { emitToUser } from '../services/socket.service';

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

        res.status(201).json(populatedMessage);
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

        res.json(chatsWithDetails);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
