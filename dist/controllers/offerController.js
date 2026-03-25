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
exports.respondToOffer = exports.getOffers = exports.createOffer = void 0;
const User_1 = __importDefault(require("../models/User"));
const offer_service_1 = require("../services/offer.service");
const chat_service_1 = require("../services/chat.service");
const order_service_1 = require("../services/order.service");
const notification_service_1 = require("../services/notification.service");
const mongoose_1 = __importDefault(require("mongoose"));
const createOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { creatorId, targetId, price, deliverables, usageRights, chatId } = req.body;
        const senderId = (req.user._id || req.user.id).toString();
        const role = req.user.role;
        let finalTargetId = targetId || creatorId;
        if (!finalTargetId && chatId) {
            const existingChat = yield chat_service_1.ChatService.getChatById(chatId);
            if (existingChat) {
                // Find the participant that is NOT the sender
                const otherParticipant = existingChat.participants.find((p) => {
                    const savedId = p._id || p;
                    return savedId.toString() !== senderId;
                });
                if (otherParticipant) {
                    const participantId = otherParticipant._id || otherParticipant;
                    finalTargetId = participantId.toString();
                }
            }
        }
        if (!finalTargetId) {
            return res.status(400).json({ message: "Target user ID is required. Could not infer from chat." });
        }
        if (finalTargetId === senderId)
            return res.status(400).json({ message: "You cannot make an offer to yourself" });
        const targetUser = yield User_1.default.findById(finalTargetId);
        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }
        let brandId, creatorIdLocal;
        if (role === 'brand') {
            brandId = senderId;
            creatorIdLocal = finalTargetId;
        }
        else {
            creatorIdLocal = senderId;
            brandId = finalTargetId;
        }
        // 1. Find or Create Chat
        let chat;
        if (chatId) {
            chat = yield chat_service_1.ChatService.getChatById(chatId);
        }
        if (!chat) {
            chat = yield chat_service_1.ChatService.findOrCreateNegotiationChat([brandId, creatorIdLocal]);
        }
        const offer = yield offer_service_1.OfferService.createOffer({
            brand: brandId,
            creator: creatorIdLocal,
            sender: senderId,
            price: Number(price),
            deliverables,
            usageRights,
            chat: chat._id
        });
        // 3. Create System Message for Offer
        yield chat_service_1.ChatService.addSystemMessage(chat._id, senderId, "Offer Created", offer._id);
        const senderUser = req.user;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const targetDashboardUrl = targetUser.role === 'brand'
            ? `${frontendUrl}/dashboard/brand/offers`
            : `${frontendUrl}/dashboard/creator/offers`;
        yield notification_service_1.NotificationService.sendOfferReceived(targetUser.id, targetUser.email, senderId, senderUser.username, Number(price), targetDashboardUrl);
        res.status(201).json(offer);
    }
    catch (error) {
        console.error("Create Offer Error:", error);
        res.status(400).json({ message: error.message });
    }
});
exports.createOffer = createOffer;
const getOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = (req.user._id || req.user.id).toString();
        const query = req.user.role === 'brand' ? { brand: userId } : { creator: userId };
        const offers = yield offer_service_1.OfferService.getOffers(query);
        res.json(offers);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOffers = getOffers;
const respondToOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, counterPrice, counterMessage } = req.body; // status: accepted, rejected, countered
        const userId = (req.user._id || req.user.id).toString();
        const offer = yield offer_service_1.OfferService.getOfferById(req.params.id);
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
        const updatedOffer = yield offer_service_1.OfferService.updateOfferStatus(req.params.id, status, status === 'countered' ? { price: Number(counterPrice), message: counterMessage } : undefined);
        const originalSenderId = offer.sender ? offer.sender.toString() : offer.brand.toString();
        const originalSenderUser = yield User_1.default.findById(originalSenderId);
        const responderUser = req.user;
        // Use the updated status for logic
        if (status === 'accepted') {
            // Check if order already exists to prevent duplicates and handle manual repairs
            const Order = mongoose_1.default.model('Order');
            const existingOrder = yield Order.findOne({ offer: updatedOffer._id });
            let order;
            if (existingOrder) {
                console.log(`[OfferController] Offer ${req.params.id} already has an order: ${existingOrder._id}`);
                order = existingOrder;
            }
            else {
                console.log(`[OfferController] Offer ${req.params.id} accepted. Creating order...`);
                order = yield order_service_1.OrderService.createFromOffer(updatedOffer);
                console.log(`[OfferController] Order created: ${order._id}`);
            }
            // Link the created order to the offer
            updatedOffer.order = order._id;
            yield updatedOffer.save();
            if (originalSenderUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const dashboardRole = originalSenderUser.role === 'brand' ? 'brand' : 'creator';
                yield notification_service_1.NotificationService.sendOfferStatusUpdate(originalSenderUser.id, originalSenderUser.email, userId, responderUser.username, 'accepted', `${frontendUrl}/dashboard/brand/orders`);
                // Add a specific payment notification for brands
                if (originalSenderUser.role === 'brand') {
                    yield notification_service_1.NotificationService.sendPaymentRequired(originalSenderUser.id, originalSenderUser.email, order._id.toString(), `${frontendUrl}/dashboard/brand/checkout/${order._id}`);
                }
            }
            return res.json({ message: 'Offer accepted, Order created', orderId: order._id });
        }
        else {
            // Notify original sender of Rejection/Counter
            if (originalSenderUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const dashboardRole = originalSenderUser.role === 'brand' ? 'brand' : 'creator';
                yield notification_service_1.NotificationService.sendOfferStatusUpdate(originalSenderUser.id, originalSenderUser.email, userId, responderUser.username, status, `${frontendUrl}/dashboard/${dashboardRole}/offers`);
            }
        }
        // Return updated offer
        res.json(yield offer_service_1.OfferService.getOfferById(req.params.id));
    }
    catch (error) {
        console.error("Respond to Offer Error:", error);
        res.status(400).json({ message: error.message });
    }
});
exports.respondToOffer = respondToOffer;
