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
const notification_service_1 = require("../services/notification.service");
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
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOrders = getOrders;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.params.id;
        const order = yield Order_1.default.findById(orderId)
            .populate('brand', 'username')
            .populate('creator', 'username')
            .populate('offer');
        if (!order) {
            console.error(`[OrderController] Order not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Order not found' });
        }
        const userId = (req.user.id || req.user._id).toString();
        const brandId = order.brand._id.toString();
        const creatorId = order.creator._id.toString();
        // Security check
        if (brandId !== userId &&
            creatorId !== userId &&
            req.user.role !== 'admin') {
            console.warn(`[OrderController] Unauthorized access attempt. User ${userId} (role: ${req.user.role}) tried to access order owned by Brand ${brandId} and Creator ${creatorId}`);
            return res.status(403).json({ message: 'Not authorized' });
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
        const { creatorId, packageDetails, price } = req.body;
        const userId = req.user._id || req.user.id;
        const settings = yield PlatformSettings_1.default.findOne();
        const feePercentage = (settings === null || settings === void 0 ? void 0 : settings.platformFeePercentage) || 15;
        const platformFee = Number((price * (feePercentage / 100)).toFixed(2));
        const totalAmount = Number((price + platformFee).toFixed(2));
        const order = yield Order_1.default.create({
            brand: userId,
            creator: creatorId,
            price: price,
            platformFee,
            totalAmount,
            status: 'active',
            paid: false,
            packageDetails
        });
        const creatorUser = yield User_1.default.findById(creatorId);
        if (creatorUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            yield notification_service_1.NotificationService.sendOrderCreated(creatorUser.id, creatorUser.email, order.id, 'creator', `${frontendUrl}/dashboard/creator/orders/${order.id}`);
        }
        res.status(201).json(order);
    }
    catch (error) {
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
