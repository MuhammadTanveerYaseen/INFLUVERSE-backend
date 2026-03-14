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
const createOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { creatorId, price, deliverables, deadline, usageRights, chatId } = req.body;
        const brandId = (req.user._id || req.user.id).toString();
        let targetCreatorId = creatorId;
        if (!targetCreatorId && chatId) {
            const existingChat = yield chat_service_1.ChatService.getChatById(chatId);
            if (existingChat) {
                // Find the participant that is NOT the sender (brand)
                const otherParticipant = existingChat.participants.find((p) => {
                    const savedId = p._id || p;
                    return savedId.toString() !== brandId;
                });
                if (otherParticipant) {
                    const participantId = otherParticipant._id || otherParticipant;
                    targetCreatorId = participantId.toString();
                }
            }
        }
        if (!targetCreatorId) {
            return res.status(400).json({ message: "Creator ID is required. Could not infer from chat." });
        }
        if (targetCreatorId === brandId)
            return res.status(400).json({ message: "You cannot make an offer to yourself" });
        const creatorUser = yield User_1.default.findById(targetCreatorId);
        // 1. Find or Create Chat
        let chat;
        if (chatId) {
            chat = yield chat_service_1.ChatService.getChatById(chatId);
        }
        if (!chat) {
            chat = yield chat_service_1.ChatService.findOrCreateNegotiationChat([brandId, targetCreatorId]);
        }
        // 2. Create Offer
        const start = new Date();
        const end = new Date(deadline);
        let diffDays = 3; // Default
        if (!isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            if (diffTime > 0) {
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (days > 0)
                    diffDays = days;
            }
        }
        const offer = yield offer_service_1.OfferService.createOffer({
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
        yield chat_service_1.ChatService.addSystemMessage(chat._id, brandId, "Offer Created", offer._id);
        const brandUser = req.user;
        if (creatorUser) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            yield notification_service_1.NotificationService.sendOfferReceived(creatorUser.id, creatorUser.email, brandId, brandUser.username, Number(price), `${frontendUrl}/dashboard/creator/offers`);
        }
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
        // Authorization Check
        if (offer.creator.toString() !== userId) {
            console.warn(`[OfferController] Unauthorized response attempt. User ${userId} tried to respond to offer intended for Creator ${offer.creator}`);
            return res.status(403).json({ message: 'Not authorized' });
        }
        // Update Status via Service
        const updatedOffer = yield offer_service_1.OfferService.updateOfferStatus(req.params.id, status, status === 'countered' ? { price: Number(counterPrice), message: counterMessage } : undefined);
        // Use the updated status for logic
        if (status === 'accepted') {
            const order = yield order_service_1.OrderService.createFromOffer(updatedOffer);
            // Notify Brand of Order Creation
            const brandUser = yield User_1.default.findById(updatedOffer.brand);
            const creatorUser = req.user;
            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendOfferStatusUpdate(brandUser.id, brandUser.email, userId, creatorUser.username, 'accepted', `${frontendUrl}/dashboard/brand/orders`);
                yield notification_service_1.NotificationService.sendOrderCreated(brandUser.id, brandUser.email, order._id.toString(), 'brand', `${frontendUrl}/dashboard/brand/orders/${order._id}`);
            }
            return res.json({ message: 'Offer accepted, Order created', orderId: order._id });
        }
        else {
            // Notify Brand of Rejection/Counter
            const brandUser = yield User_1.default.findById(offer.brand);
            const creatorUser = req.user;
            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendOfferStatusUpdate(brandUser.id, brandUser.email, userId, creatorUser.username, status, `${frontendUrl}/dashboard/brand/offers`);
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
