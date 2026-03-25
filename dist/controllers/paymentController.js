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
exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const Order_1 = __importDefault(require("../models/Order"));
const Offer_1 = __importDefault(require("../models/Offer"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const notification_service_1 = require("../services/notification.service");
exports.PaymentController = {
    // 1. Onboard Creator (Get Stripe Connect Link)
    onboardCreator: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const user = req.user;
            if (user.role !== 'creator') {
                return res.status(403).json({ message: 'Only creators can onboard for payouts' });
            }
            const url = yield payment_service_1.PaymentService.createConnectAccountLink(user);
            res.json({ url });
        }
        catch (error) {
            console.error('Onboard error:', error);
            res.status(500).json({ message: error.message });
        }
    }),
    // 2. Get Wallet Status (Balance, Transactions, Connect Status)
    getWallet: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const user = req.user;
            const userId = (user._id || user.id).toString();
            const profile = yield CreatorProfile_1.default.findOne({ user: userId });
            const stripeId = profile === null || profile === void 0 ? void 0 : profile.stripeConnectId;
            let stripeStatus = { details_submitted: false, payouts_enabled: false };
            if (stripeId) {
                stripeStatus = yield payment_service_1.PaymentService.getAccountStatus(stripeId);
            }
            const transactions = yield Transaction_1.default.find({ user: userId }).sort({ createdAt: -1 });
            let pendingBalance = 0;
            let availableBalance = 0;
            transactions.forEach(tx => {
                if (tx.status === 'pending')
                    pendingBalance += tx.amount;
                if (tx.type === 'earning' && tx.status === 'available') {
                    availableBalance += tx.amount;
                }
                if (tx.type === 'payout' && ['available', 'completed', 'processing'].includes(tx.status)) {
                    availableBalance += tx.amount;
                }
            });
            res.json({
                stripeConnected: !!stripeId,
                bankConnected: !!((_a = profile === null || profile === void 0 ? void 0 : profile.bankDetails) === null || _a === void 0 ? void 0 : _a.accountNumber),
                bankDetails: profile === null || profile === void 0 ? void 0 : profile.bankDetails,
                stripeStatus,
                balances: {
                    pending: pendingBalance / 100, // Convert to dollars
                    available: availableBalance / 100
                },
                transactions
            });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }),
    // 3. Create Payment Intent (Brand pays for Order)
    createOrderPayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const orderId = (_a = req.body.orderId) === null || _a === void 0 ? void 0 : _a.trim();
            console.log(`[PaymentController] Payment Intent Request for Order: "${orderId}"`);
            if (!orderId)
                return res.status(400).json({ message: 'Order ID is required' });
            if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ message: 'Invalid Order ID signature' });
            }
            const order = yield Order_1.default.findById(orderId);
            if (!order) {
                console.error(`[PaymentController] Order NOT FOUND in DB: ${orderId}`);
                return res.status(404).json({ message: 'Payment target order not found' });
            }
            const userId = (req.user.id || req.user._id).toString();
            const orderBrandId = ((_b = order.brand._id) === null || _b === void 0 ? void 0 : _b.toString()) || order.brand.toString();
            console.log(`[PaymentController] Authorizing payment. Requester: ${userId}, Order Owner: ${orderBrandId}`);
            if (orderBrandId !== userId) {
                return res.status(403).json({ message: 'Authorization protocol mismatch for payment' });
            }
            const amountToPay = order.totalAmount || order.price || 0;
            if (!amountToPay || isNaN(amountToPay)) {
                return res.status(400).json({ message: 'Invalid order amount' });
            }
            const creatorId = order.creator.toString();
            const platformFee = order.platformFee || 0;
            const paymentIntent = yield payment_service_1.PaymentService.createPaymentIntent(orderId, amountToPay, creatorId, platformFee);
            res.json({ clientSecret: paymentIntent.client_secret });
        }
        catch (error) {
            console.error("Payment Error:", error);
            res.status(500).json({ message: error.message });
        }
    }),
    // 4. Confirm Payment (Webhook or Manual Call)
    confirmPayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { paymentIntentId, orderId } = req.body;
            console.log(`[PaymentController] Confirming Payment for Order: ${orderId}, PI: ${paymentIntentId}`);
            require('fs').appendFileSync('payment_trace.log', `${new Date().toISOString()} - Confirming ${orderId}\n`);
            if (!orderId) {
                console.error("[PaymentController] Order ID missing in confirmation request");
                return res.status(400).json({ message: "Order ID missing" });
            }
            const order = yield Order_1.default.findById(orderId);
            if (!order) {
                console.error(`[PaymentController] Order ${orderId} NOT FOUND during confirmation`);
                return res.status(404).json({ message: 'Order not found' });
            }
            console.log(`[PaymentController] Current Order Status: ${order.status}, Paid: ${order.paid}`);
            const offer = yield Offer_1.default.findById(order.offer);
            if (!offer) {
                console.warn(`[PaymentController] No offer found for order ${orderId}`);
            }
            console.log(`[PaymentController] Updating order ${orderId} to active/paid.`);
            order.status = 'active';
            order.paid = true;
            order.paymentIntentId = paymentIntentId;
            const updatedOrder = yield order.save();
            console.log(`[PaymentController] Order ${orderId} updated successfully.`);
            if (offer) {
                offer.status = 'accepted';
                offer.paid = true;
                yield offer.save();
                console.log(`[PaymentController] Offer ${offer._id} status synced to accepted and paid.`);
            }
            const creatorEarningCents = Math.round(order.price * 100);
            console.log(`[PaymentController] Creating transaction for creator ${order.creator}. Amount: ${creatorEarningCents}`);
            yield Transaction_1.default.create({
                user: order.creator,
                order: order._id,
                type: 'earning',
                amount: creatorEarningCents,
                currency: 'eur',
                status: 'pending',
                description: `Earning from Order #${orderId}`,
            });
            console.log("[PaymentController] Transaction created. Sending notifications...");
            // Notify Creator
            const creatorUser = yield User_1.default.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendPaymentConfirmed(creatorUser.id, creatorUser.email, order.id, `${frontendUrl}/dashboard/creator/orders/${order.id}`, false);
            }
            // Notify Brand
            const brandUser = yield User_1.default.findById(order.brand);
            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                yield notification_service_1.NotificationService.sendPaymentConfirmed(brandUser.id, brandUser.email, order.id, `${frontendUrl}/dashboard/brand/orders/${order.id}`, true);
            }
            res.json({ success: true, order: updatedOrder });
        }
        catch (error) {
            console.error("[PaymentController] Confirmation CRITICAL Error:", error);
            res.status(500).json({ message: error.message });
        }
    }),
    // 5. Withdraw Funds
    withdraw: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const user = req.user;
            const userId = (user._id || user.id).toString();
            const { amount } = req.body;
            const transactions = yield Transaction_1.default.find({ user: userId, status: 'available' });
            const availableCents = transactions.reduce((acc, tx) => acc + tx.amount, 0);
            const requestCents = Math.round(amount * 100);
            if (requestCents > availableCents) {
                return res.status(400).json({ message: 'Insufficient funds' });
            }
            const profile = yield CreatorProfile_1.default.findOne({ user: userId });
            const hasStripe = !!(profile === null || profile === void 0 ? void 0 : profile.stripeConnectId);
            const hasBank = !!((_a = profile === null || profile === void 0 ? void 0 : profile.bankDetails) === null || _a === void 0 ? void 0 : _a.accountNumber);
            if (!hasStripe && !hasBank) {
                return res.status(400).json({ message: 'No payout method connected. Please add bank details or connect Stripe.' });
            }
            let status = 'processing';
            let description = 'Withdrawal Request (Bank Transfer)';
            if (hasStripe) {
                // Verify the dashboard capabilities are actually active
                const stripeStatus = yield payment_service_1.PaymentService.getAccountStatus(profile.stripeConnectId);
                if (!stripeStatus.payouts_enabled || !stripeStatus.details_submitted) {
                    return res.status(400).json({ message: 'Withdrawals are locked! Your Stripe account is missing critical verification steps. Click "Complete Setup" in your wallet first.' });
                }
                yield payment_service_1.PaymentService.processPayout(userId, amount);
                status = 'completed';
                description = 'Withdrawal to Stripe';
            }
            else {
                description = `Withdrawal Request to Bank: ${(_b = profile === null || profile === void 0 ? void 0 : profile.bankDetails) === null || _b === void 0 ? void 0 : _b.bankName} (Ending in ${(_d = (_c = profile === null || profile === void 0 ? void 0 : profile.bankDetails) === null || _c === void 0 ? void 0 : _c.accountNumber) === null || _d === void 0 ? void 0 : _d.slice(-4)})`;
            }
            yield Transaction_1.default.create({
                user: userId,
                type: 'payout',
                amount: -requestCents,
                currency: 'eur',
                status: status,
                description: description,
            });
            res.json({ success: true, message: hasStripe ? "Withdrawal processed via Stripe." : "Withdrawal request submitted for Admin review." });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }),
    // 6. Admin Release Payment (or Automatic Cron Call)
    releasePayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const now = new Date();
            // Only release payments where the 7-day post-approval timer (availableAt) has passed
            const result = yield Transaction_1.default.updateMany({
                status: 'pending',
                type: 'earning',
                availableAt: { $lte: now }
            }, { status: 'available' });
            res.json({ message: 'Payments released', count: result.modifiedCount });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    })
};
