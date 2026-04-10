import { Request, Response } from 'express';
import User from '../models/User';
import { OfferService } from '../services/offer.service';
import { ChatService } from '../services/chat.service';
import { OrderService } from '../services/order.service';
import { NotificationService } from '../services/notification.service';
import { sendEmail, emailTemplates, notifyAdmins } from '../utils/emailService';
import mongoose from 'mongoose';

export const createOffer = async (req: Request | any, res: Response) => {
    try {
        const { creatorId, targetId, price, deliverables, usageRights, chatId } = req.body;
        const senderId = (req.user._id || req.user.id).toString();
        const role = req.user.role;

        let finalTargetId = targetId || creatorId;

        if (!finalTargetId && chatId) {
            const existingChat = await ChatService.getChatById(chatId);
            if (existingChat) {
                // Find the participant that is NOT the sender
                const otherParticipant = existingChat.participants.find((p: any) => {
                    const savedId = p._id || p;
                    return savedId.toString() !== senderId;
                });

                if (otherParticipant) {
                    const participantId = (otherParticipant as any)._id || otherParticipant;
                    finalTargetId = participantId.toString();
                }
            }
        }

        if (!finalTargetId) {
            return res.status(400).json({ message: "Target user ID is required. Could not infer from chat." });
        }

        if (finalTargetId === senderId) return res.status(400).json({ message: "You cannot make an offer to yourself" });

        const targetUser = await User.findById(finalTargetId);
        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        let brandId, creatorIdLocal;
        if (role === 'brand') {
            brandId = senderId;
            creatorIdLocal = finalTargetId;
        } else {
            creatorIdLocal = senderId;
            brandId = finalTargetId;
        }

        // 1. Find or Create Chat
        let chat;
        if (chatId) {
            chat = await ChatService.getChatById(chatId);
        }

        if (!chat) {
            chat = await ChatService.findOrCreateNegotiationChat([brandId, creatorIdLocal]);
        }

        const offer = await OfferService.createOffer({
            brand: brandId,
            creator: creatorIdLocal,
            sender: senderId,
            price: Number(price),
            deliverables,
            usageRights,
            chat: chat._id
        });

        // 3. Create System Message for Offer
        await ChatService.addSystemMessage(
            chat._id,
            senderId,
            "Offer Created",
            offer._id
        );

        const senderUser = req.user;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        const targetDashboardUrl = targetUser.role === 'brand' 
            ? `${frontendUrl}/dashboard/brand/offers` 
            : `${frontendUrl}/dashboard/creator/offers`;

        NotificationService.sendOfferReceived(
            targetUser.id,
            targetUser.email,
            senderId,
            senderUser.username,
            Number(price),
            targetDashboardUrl
        ).catch(err => console.error(err));

        // Notify all admins about the new offer (fire-and-forget)
        const adminPanelUrl = `${frontendUrl}/dashboard/admin`;
        notifyAdmins(
            emailTemplates.adminNewOffer(senderUser.username, targetUser.username, Number(price), adminPanelUrl)
        ).catch(err => console.error('[OfferCtrl] Admin notify failed:', err));

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

        const recipientId = offer.sender 
            ? (offer.sender.toString() === offer.brand.toString() ? offer.creator : offer.brand) 
            : offer.creator;

        // Authorization Check
        if (recipientId.toString() !== userId) {
            console.warn(`[OfferController] Unauthorized response attempt. User ${userId} tried to respond to offer intended for ${recipientId}`);
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update Status via Service
        const updatedOffer = await OfferService.updateOfferStatus(req.params.id, status,
            status === 'countered' ? { price: Number(counterPrice), message: counterMessage } : undefined
        );

        const originalSenderId = offer.sender ? offer.sender.toString() : offer.brand.toString();
        const originalSenderUser = await User.findById(originalSenderId);
        const responderUser = req.user;

        // Use the updated status for logic
        if (status === 'accepted') {
            // Check if order already exists to prevent duplicates and handle manual repairs
            const Order = mongoose.model('Order');
            const existingOrder = await Order.findOne({ offer: updatedOffer._id });
            
            let order;
            if (existingOrder) {
                console.log(`[OfferController] Offer ${req.params.id} already has an order: ${existingOrder._id}`);
                order = existingOrder;
            } else {
                console.log(`[OfferController] Offer ${req.params.id} accepted. Creating order...`);
                order = await OrderService.createFromOffer(updatedOffer);
                console.log(`[OfferController] Order created: ${order._id}`);
            }
            
            // Link the created order to the offer
            updatedOffer.order = order._id as any;
            await updatedOffer.save();

            if (originalSenderUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const dashboardRole = originalSenderUser.role === 'brand' ? 'brand' : 'creator';
                
                NotificationService.sendOfferStatusUpdate(
                    originalSenderUser.id,
                    originalSenderUser.email,
                    userId,
                    responderUser.username,
                    'accepted',
                    `${frontendUrl}/dashboard/brand/orders`
                ).catch(err => console.error(err));

                // Add a specific payment notification for brands
                if (originalSenderUser.role === 'brand') {
                    NotificationService.sendPaymentRequired(
                        originalSenderUser.id,
                        originalSenderUser.email,
                        order._id.toString(),
                        `${frontendUrl}/dashboard/brand/checkout/${order._id}`
                    ).catch(err => console.error(err));
                }
            }

            return res.json({ message: 'Offer accepted, Order created', orderId: order._id });
        } else {
            // Notify original sender of Rejection/Counter
            if (originalSenderUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const dashboardRole = originalSenderUser.role === 'brand' ? 'brand' : 'creator';
                
                NotificationService.sendOfferStatusUpdate(
                    originalSenderUser.id,
                    originalSenderUser.email,
                    userId,
                    responderUser.username,
                    status,
                    `${frontendUrl}/dashboard/${dashboardRole}/offers`
                ).catch(err => console.error(err));
            }
        }

        // Return updated offer
        res.json(await OfferService.getOfferById(req.params.id));
    } catch (error: any) {
        console.error("Respond to Offer Error:", error);
        res.status(400).json({ message: error.message });
    }
};
