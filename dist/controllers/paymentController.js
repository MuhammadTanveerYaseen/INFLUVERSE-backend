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
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
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
        try {
            const { orderId } = req.body;
            if (!orderId)
                return res.status(400).json({ message: 'Order ID is required' });
            const order = yield Order_1.default.findById(orderId);
            if (!order) {
                console.error(`[PaymentController] Order not found: ${orderId}`);
                return res.status(404).json({ message: 'Order not found' });
            }
            const userId = (req.user.id || req.user._id).toString();
            const orderBrandId = order.brand.toString();
            console.log(`[PaymentController] Authorizing payment. User: ${userId}, Order Brand: ${orderBrandId}`);
            if (orderBrandId !== userId) {
                console.warn(`[PaymentController] Unauthorized payment attempt. User ${userId} tried to pay for order owned by ${orderBrandId}`);
                return res.status(403).json({ message: 'Not authorized' });
            }
            const amountToPay = order.totalAmount || order.price || 0;
            if (!amountToPay || isNaN(amountToPay)) {
                return res.status(400).json({ message: 'Invalid order amount' });
            }
            const paymentIntent = yield payment_service_1.PaymentService.createPaymentIntent(orderId, amountToPay);
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
            console.log(`Confirming Payment. Order: ${orderId}, Intent: ${paymentIntentId}`);
            const order = yield Order_1.default.findById(orderId);
            if (!order)
                return res.status(404).json({ message: 'Order not found' });
            const offer = yield Offer_1.default.findById(order.offer);
            const now = new Date();
            let newDeadline = new Date(now);
            if (offer && offer.durationDays) {
                newDeadline.setDate(now.getDate() + offer.durationDays);
            }
            else if (order.deadline) {
                if (new Date(order.deadline) < now) {
                    newDeadline.setDate(now.getDate() + 3);
                }
                else {
                    newDeadline = new Date(order.deadline);
                }
            }
            else {
                newDeadline.setDate(now.getDate() + 3);
            }
            order.status = 'active';
            order.paid = true;
            order.paymentIntentId = paymentIntentId;
            order.deadline = newDeadline;
            const updatedOrder = yield order.save();
            if (offer) {
                offer.status = 'accepted';
                yield offer.save();
            }
            const creatorEarningCents = Math.round(order.price * 100);
            yield Transaction_1.default.create({
                user: order.creator,
                type: 'earning',
                amount: creatorEarningCents,
                currency: 'usd',
                status: 'pending',
                description: `Earning from Order #${orderId}`,
            });
            res.json({ success: true, order: updatedOrder });
        }
        catch (error) {
            console.error("Confirmation Error:", error);
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
                currency: 'usd',
                status: status,
                description: description,
            });
            res.json({ success: true, message: hasStripe ? "Withdrawal processed via Stripe." : "Withdrawal request submitted for Admin review." });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }),
    // 6. Admin Release Payment
    releasePayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const settings = yield PlatformSettings_1.default.findOne();
            const holdingPeriod = (settings === null || settings === void 0 ? void 0 : settings.payoutHoldingPeriod) || 7;
            const payoutThresholdDate = new Date();
            payoutThresholdDate.setDate(payoutThresholdDate.getDate() - holdingPeriod);
            const result = yield Transaction_1.default.updateMany({
                status: 'pending',
                type: 'earning',
                createdAt: { $lte: payoutThresholdDate }
            }, { status: 'available' });
            res.json({ message: 'Payments released', count: result.modifiedCount });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    })
};
