import { Request, Response } from 'express';
import User from '../models/User';
import { OfferService } from '../services/offer.service';
import { ChatService } from '../services/chat.service';
import { OrderService } from '../services/order.service';
import { NotificationService } from '../services/notification.service';

export const createOffer = async (req: Request | any, res: Response) => {
    try {
        const { creatorId, price, deliverables, deadline, usageRights, chatId } = req.body;
        const brandId = (req.user._id || req.user.id).toString();

        let targetCreatorId = creatorId;

        if (!targetCreatorId && chatId) {
            const existingChat = await ChatService.getChatById(chatId);
            if (existingChat) {
                // Find the participant that is NOT the sender (brand)
                const otherParticipant = existingChat.participants.find((p: any) => {
                    const savedId = p._id || p;
                    return savedId.toString() !== brandId;
                });

                if (otherParticipant) {
                    const participantId = (otherParticipant as any)._id || otherParticipant;
                    targetCreatorId = participantId.toString();
                }
            }
        }

        if (!targetCreatorId) {
            return res.status(400).json({ message: "Creator ID is required. Could not infer from chat." });
        }

        if (targetCreatorId === brandId) return res.status(400).json({ message: "You cannot make an offer to yourself" });

        const creatorUser = await User.findById(targetCreatorId);

        // 1. Find or Create Chat
        let chat;
        if (chatId) {
            chat = await ChatService.getChatById(chatId);
        }

        if (!chat) {
            chat = await ChatService.findOrCreateNegotiationChat([brandId, targetCreatorId]);
        }

        // 2. Create Offer
        const start = new Date();
        const end = new Date(deadline);
        let diffDays = 3; // Default

        if (!isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            if (diffTime > 0) {
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (days > 0) diffDays = days;
            }
        }

        const offer = await OfferService.createOffer({
            brand: brandId,
            creator: targetCreatorId,
            price: Number(price),
            deliverables,
            deadline,
            durationDays: diffDays,
            usageRights,
            chat: chat._id
        });

        // 3. Create System Message for Offer
        await ChatService.addSystemMessage(
            chat._id,
            brandId,
            "Offer Created",
            offer._id
        );

        const brandUser = req.user;

        if (creatorUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            await NotificationService.sendOfferReceived(
                creatorUser.id,
                creatorUser.email,
                brandId,
                brandUser.username,
                Number(price),
                `${frontendUrl}/dashboard/creator/offers`
            );
        }

        res.status(201).json(offer);
    } catch (error: any) {
        console.error("Create Offer Error:", error);
        res.status(400).json({ message: error.message });
    }
};

export const getOffers = async (req: Request | any, res: Response) => {
    try {
        const userId = (req.user._id || req.user.id).toString();
        const query = req.user.role === 'brand' ? { brand: userId } : { creator: userId };
        const offers = await OfferService.getOffers(query);
        res.json(offers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const respondToOffer = async (req: Request | any, res: Response) => {
    try {
        const { status, counterPrice, counterMessage } = req.body; // status: accepted, rejected, countered
        const userId = (req.user._id || req.user.id).toString();

        const offer = await OfferService.getOfferById(req.params.id);

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        // Authorization Check
        if (offer.creator.toString() !== userId) {
            console.warn(`[OfferController] Unauthorized response attempt. User ${userId} tried to respond to offer intended for Creator ${offer.creator}`);
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update Status via Service
        const updatedOffer = await OfferService.updateOfferStatus(req.params.id, status,
            status === 'countered' ? { price: Number(counterPrice), message: counterMessage } : undefined
        );

        // Use the updated status for logic
        if (status === 'accepted') {
            const order = await OrderService.createFromOffer(updatedOffer);

            // Notify Brand of Order Creation
            const brandUser = await User.findById(updatedOffer.brand);
            const creatorUser = req.user;

            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendOfferStatusUpdate(
                    brandUser.id,
                    brandUser.email,
                    userId,
                    creatorUser.username,
                    'accepted',
                    `${frontendUrl}/dashboard/brand/orders`
                );
                await NotificationService.sendOrderCreated(
                    brandUser.id,
                    brandUser.email,
                    order._id.toString(),
                    'brand',
                    `${frontendUrl}/dashboard/brand/orders/${order._id}`
                );
            }

            return res.json({ message: 'Offer accepted, Order created', orderId: order._id });
        } else {
            // Notify Brand of Rejection/Counter
            const brandUser = await User.findById(offer.brand);
            const creatorUser = req.user;
            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendOfferStatusUpdate(
                    brandUser.id,
                    brandUser.email,
                    userId,
                    creatorUser.username,
                    status,
                    `${frontendUrl}/dashboard/brand/offers`
                );
            }
        }

        // Return updated offer
        res.json(await OfferService.getOfferById(req.params.id));
    } catch (error: any) {
        console.error("Respond to Offer Error:", error);
        res.status(400).json({ message: error.message });
    }
};
