"use strict";
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
exports.cancelOrder = exports.createPackageOrder = exports.reviewDeliverable = exports.submitDeliverable = exports.getOrderById = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Review_1 = __importDefault(require("../models/Review"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const chat_service_1 = require("../services/chat.service");
const notification_service_1 = require("../services/notification.service");
const offer_service_1 = require("../services/offer.service");
const mongoose_1 = __importDefault(require("mongoose"));
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id || req.user.id;
        const query = req.user.role === 'brand' ? { brand: userId } : { creator: userId };
        const orders = yield Order_1.default.find(query)
            .populate('brand', 'username')
            .populate('creator', 'username')
            .populate('offer')
            .sort({ createdAt: -1 });
        console.log(`[OrderController] Found ${orders.length} orders for user. IDs: ${orders.map(o => `${o._id}(paid:${o.paid})`).join(', ')}`);
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOrders = getOrders;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.params.id.trim();
        console.log(`[OrderController] Fetching Order: "${orderId}"`);
        if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
            console.error(`[OrderController] Invalid Order ID format: ${orderId}`);
            return res.status(400).json({ message: 'Invalid Order ID format' });
        }
        const order = yield Order_1.default.findById(orderId)
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
        const formattedOrder = order.toObject();
        if (req.user.role === 'brand') {
            const review = yield Review_1.default.findOne({ order: order._id, brand: userId });
            formattedOrder.hasReviewed = !!review;
        }
        res.json(formattedOrder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOrderById = getOrderById;
const submitDeliverable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { files, notes } = req.body;
        const orderId = req.params.id;
        const order = yield Order_1.default.findById(orderId);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const userId = (req.user._id || req.user.id).toString();
        if (order.creator.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const newDeliverable = {
            id: new mongoose_1.default.Types.ObjectId().toString(),
            files: Array.isArray(files) ? files : [],
            notes: notes || '',
            submittedAt: new Date()
        };
        order.deliverables.push(newDeliverable);
        order.status = 'delivered';
        const updatedOrder = yield order.save();
        const brandUser = yield User_1.default.findById(order.brand);
        if (brandUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            yield notification_service_1.NotificationService.sendContentDelivered(brandUser.id, brandUser.email, userId, order.id, `${frontendUrl}/dashboard/brand/orders/${order.id}`);
        }
        res.json(updatedOrder);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.submitDeliverable = submitDeliverable;
const reviewDeliverable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { action, disputeReason, reason } = req.body;
        const orderId = req.params.id;
        const order = yield Order_1.default.findById(orderId);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const userId = (req.user._id || req.user.id).toString();
        if (order.brand.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const displayReason = reason || disputeReason || "Please check the platform for details.";
        if (action === 'approve') {
            order.status = 'approved';
            order.completedAt = new Date();
            const settings = yield PlatformSettings_1.default.findOne();
            const holdingPeriod = (settings === null || settings === void 0 ? void 0 : settings.payoutHoldingPeriod) || 7;
            const payoutDate = new Date();
            payoutDate.setDate(payoutDate.getDate() + holdingPeriod);
            order.payoutDueDate = payoutDate;
            yield order.save();
            const creatorUser = yield User_1.default.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendOrderApproved(creatorUser.id, creatorUser.email, userId, order.id, `${frontendUrl}/dashboard/creator/orders/${order.id}`);
            }
            yield Transaction_1.default.updateMany({
                user: order.creator,
                type: 'earning',
                description: { $regex: order.id, $options: 'i' },
                status: 'pending'
            }, { availableAt: payoutDate });
        }
        else if (action === 'revision') {
            order.status = 'revision';
            yield order.save();
            const creatorUser = yield User_1.default.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendRevisionRequested(creatorUser.id, creatorUser.email, userId, order.id, displayReason, `${frontendUrl}/dashboard/creator/orders/${order.id}`);
            }
        }
        else if (action === 'dispute') {
            order.status = 'disputed';
            yield order.save();
            const creatorUser = yield User_1.default.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendOrderCancelled(creatorUser.id, creatorUser.email, userId, order.id, displayReason, `${frontendUrl}/dashboard/creator/orders/${order.id}`, true);
            }
        }
        res.json(order);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.reviewDeliverable = reviewDeliverable;
const createPackageOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { creatorId, packageDetails, price } = req.body;
        const userId = req.user._id || req.user.id;
        // Ensure price is available and is a number
        if (price === undefined && (packageDetails === null || packageDetails === void 0 ? void 0 : packageDetails.price) !== undefined) {
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
        const chat = yield chat_service_1.ChatService.findOrCreateNegotiationChat([userId.toString(), creatorId.toString()]);
        const offer = yield offer_service_1.OfferService.createOffer({
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
        yield chat_service_1.ChatService.addSystemMessage(chat._id, userId, "Package Booking Request Sent", offer._id);
        const creatorUser = yield User_1.default.findById(creatorId);
        if (creatorUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            yield notification_service_1.NotificationService.sendOfferReceived(creatorUser.id, creatorUser.email, userId.toString(), req.user.username, numericPrice, `${frontendUrl}/dashboard/creator/offers`);
        }
        // Return the offer so frontend can redirect to chat
        res.status(201).json({
            message: "Booking offer sent to creator",
            offer: offer
        });
    }
    catch (error) {
        console.error("[OrderController] createPackageOrder error:", error);
        res.status(500).json({ message: error.message });
    }
});
exports.createPackageOrder = createPackageOrder;
const cancelOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.params.id;
        const userId = req.user._id || req.user.id;
        const { reason } = req.body;
        const order = yield Order_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.brand.toString() !== userId.toString() && order.creator.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        order.status = 'cancelled';
        yield order.save();
        const userToNotify = order.brand.toString() === userId.toString() ? order.creator : order.brand;
        const recipientUser = yield User_1.default.findById(userToNotify);
        if (recipientUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const roleStr = order.brand.toString() === userId.toString() ? 'creator' : 'brand';
            yield notification_service_1.NotificationService.sendOrderCancelled(recipientUser.id, recipientUser.email, userId.toString(), order.id, reason || "Order cancelled by other party", `${frontendUrl}/dashboard/${roleStr}/orders/${order.id}`);
        }
        res.json({ message: 'Order cancelled', order });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.cancelOrder = cancelOrder;
