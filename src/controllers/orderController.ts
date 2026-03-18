import { Request, Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Offer from '../models/Offer';
import Review from '../models/Review';
import PlatformSettings from '../models/PlatformSettings';
import Transaction from '../models/Transaction';
import { sendEmail, emailTemplates } from '../utils/emailService';
import { ChatService } from '../services/chat.service';
import { NotificationService } from '../services/notification.service';
import { OfferService } from '../services/offer.service';
import mongoose from 'mongoose';

export const getOrders = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user._id || req.user.id;
        const query = req.user.role === 'brand' ? { brand: userId } : { creator: userId };

        const orders = await Order.find(query)
            .populate('brand', 'username')
            .populate('creator', 'username')
            .populate('offer')
            .sort({ createdAt: -1 });

        console.log(`[OrderController] Found ${orders.length} orders for user. IDs: ${orders.map(o => `${o._id}(paid:${o.paid})`).join(', ')}`);
        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req: Request | any, res: Response) => {
    try {
        const orderId = (req.params.id as string).trim();
        console.log(`[OrderController] Fetching Order: "${orderId}"`);

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error(`[OrderController] Invalid Order ID format: ${orderId}`);
            return res.status(400).json({ message: 'Invalid Order ID format' });
        }

        const order: any = await Order.findById(orderId)
            .populate('brand', 'username')
            .populate('creator', 'username')
            .populate('offer');

        if (!order) {
            console.error(`[OrderController] Order NOT FOUND in DB for ID: ${orderId}`);
            return res.status(404).json({ message: 'Order reference not found' });
        }

        const userId = (req.user.id || req.user._id).toString();
        // Handle both populated and unpopulated cases safely
        const brandId = (order.brand._id || order.brand).toString();
        const creatorId = (order.creator._id || order.creator).toString();

        console.log(`[OrderController] Auth Check - User: ${userId}, Brand: ${brandId}, Creator: ${creatorId}`);

        // Security check
        if (brandId !== userId &&
            creatorId !== userId &&
            req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this campaign protocol' });
        }

        const formattedOrder: any = order.toObject();

        if (req.user.role === 'brand') {
            const review = await Review.findOne({ order: order._id, brand: userId });
            formattedOrder.hasReviewed = !!review;
        }

        res.json(formattedOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitDeliverable = async (req: Request | any, res: Response) => {
    try {
        const { files, notes } = req.body;
        const orderId = req.params.id as string;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const userId = (req.user._id || req.user.id).toString();
        if (order.creator.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const newDeliverable = {
            id: new mongoose.Types.ObjectId().toString(),
            files: Array.isArray(files) ? files : [],
            notes: notes || '',
            submittedAt: new Date()
        };

        order.deliverables.push(newDeliverable as any);
        order.status = 'delivered';
        const updatedOrder = await order.save();

        const brandUser = await User.findById(order.brand);
        if (brandUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            await NotificationService.sendContentDelivered(
                brandUser.id,
                brandUser.email,
                userId,
                order.id,
                `${frontendUrl}/dashboard/brand/orders/${order.id}`
            );
        }

        res.json(updatedOrder);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const reviewDeliverable = async (req: Request | any, res: Response) => {
    try {
        const { action, disputeReason, reason } = req.body;
        const orderId = req.params.id as string;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const userId = (req.user._id || req.user.id).toString();
        if (order.brand.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const displayReason = reason || disputeReason || "Please check the platform for details.";

        if (action === 'approve') {
            order.status = 'approved';
            order.completedAt = new Date();

            const settings = await PlatformSettings.findOne();
            const holdingPeriod = settings?.payoutHoldingPeriod || 7;

            const payoutDate = new Date();
            payoutDate.setDate(payoutDate.getDate() + holdingPeriod);
            order.payoutDueDate = payoutDate;

            await order.save();

            const creatorUser = await User.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendOrderApproved(
                    creatorUser.id,
                    creatorUser.email,
                    userId,
                    order.id,
                    `${frontendUrl}/dashboard/creator/orders/${order.id}`
                );
            }

            await Transaction.updateMany(
                {
                    user: order.creator,
                    type: 'earning',
                    description: { $regex: order.id, $options: 'i' },
                    status: 'pending'
                },
                { availableAt: payoutDate }
            );
        } else if (action === 'revision') {
            order.status = 'revision';
            await order.save();

            const creatorUser = await User.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendRevisionRequested(
                    creatorUser.id,
                    creatorUser.email,
                    userId,
                    order.id,
                    displayReason,
                    `${frontendUrl}/dashboard/creator/orders/${order.id}`
                );
            }

        } else if (action === 'dispute') {
            order.status = 'disputed';
            await order.save();

            const creatorUser = await User.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendOrderCancelled(
                    creatorUser.id,
                    creatorUser.email,
                    userId,
                    order.id,
                    displayReason,
                    `${frontendUrl}/dashboard/creator/orders/${order.id}`,
                    true
                );
            }
        }

        res.json(order);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createPackageOrder = async (req: Request | any, res: Response) => {
    try {
        let { creatorId, packageDetails, price } = req.body;
        const userId = req.user._id || req.user.id;

        // Ensure price is available and is a number
        if (price === undefined && packageDetails?.price !== undefined) {
            price = packageDetails.price;
        }

        const numericPrice = Number(price);

        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ 
                message: "A valid price is required to book a package.",
                receivedPrice: price 
            });
        }

        // 1. Find or Create Chat for Negotiation/Booking
        const chat = await ChatService.findOrCreateNegotiationChat([(userId as any).toString(), creatorId.toString()]);

        const offer = await OfferService.createOffer({
            brand: userId,
            creator: creatorId,
            sender: userId,
            price: numericPrice,
            deliverables: `Package Booking: ${packageDetails.name}\n${packageDetails.description || ''}`,
            status: 'pending',
            packageDetails: packageDetails,
            chat: chat._id
        });

        // 3. Add system message to chat
        await ChatService.addSystemMessage(
            chat._id,
            userId,
            "Package Booking Request Sent",
            offer._id
        );

        const creatorUser = await User.findById(creatorId);
        if (creatorUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            await NotificationService.sendOfferReceived(
                creatorUser.id,
                creatorUser.email,
                userId.toString(),
                req.user.username,
                numericPrice,
                `${frontendUrl}/dashboard/creator/offers`
            );
        }

        // Return the offer so frontend can redirect to chat
        res.status(201).json({ 
            message: "Booking offer sent to creator",
            offer: offer 
        });
    } catch (error: any) {
        console.error("[OrderController] createPackageOrder error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const cancelOrder = async (req: Request | any, res: Response) => {
    try {
        const orderId = req.params.id;
        const userId = req.user._id || req.user.id;
        const { reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.brand.toString() !== userId.toString() && order.creator.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        order.status = 'cancelled';
        await order.save();

        const userToNotify = order.brand.toString() === userId.toString() ? order.creator : order.brand;
        const recipientUser = await User.findById(userToNotify);

        if (recipientUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const roleStr = order.brand.toString() === userId.toString() ? 'creator' : 'brand';
            await NotificationService.sendOrderCancelled(
                recipientUser.id,
                recipientUser.email,
                userId.toString(),
                order.id,
                reason || "Order cancelled by other party",
                `${frontendUrl}/dashboard/${roleStr}/orders/${order.id}`
            );
        }

        res.json({ message: 'Order cancelled', order });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
