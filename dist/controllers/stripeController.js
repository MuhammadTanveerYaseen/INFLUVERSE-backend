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
exports.StripeController = void 0;
const stripe_1 = __importDefault(require("stripe"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const Order_1 = __importDefault(require("../models/Order"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});
exports.StripeController = {
    // 1. Create Connected Account
    createAccount: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const userId = req.user._id || req.user.id;
            let profile = yield CreatorProfile_1.default.findOne({ user: userId });
            if (!profile) {
                return res.status(404).json({ message: 'Creator profile not found' });
            }
            if (profile.stripeConnectId) {
                return res.status(400).json({ message: 'Stripe account already exists', stripe_account_id: profile.stripeConnectId });
            }
            const account = yield stripe.accounts.create({
                type: 'express',
                country: profile.country || 'CH',
                email: req.user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_profile: {
                    name: 'INFLUVERSE',
                },
                settings: {
                    payments: {
                        statement_descriptor: 'INFLUVERSE',
                    },
                },
            });
            profile.stripeConnectId = account.id;
            // The requirement says save payouts_enabled as boolean, defaulting to false
            profile.payoutsEnabled = false;
            yield profile.save();
            res.status(200).json({ stripe_account_id: account.id });
        }
        catch (error) {
            console.error('[Stripe] Create Account Error:', error);
            let message = error.message;
            if (((_b = (_a = error.raw) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('signed up for Connect')) || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('signed up for Connect'))) {
                message = "Stripe Connect is not enabled on your Stripe Dashboard. Please enable 'Connect' in your Stripe settings (https://dashboard.stripe.com/connect) to onboard creators.";
            }
            const statusCode = error.type === 'StripeInvalidRequestError' || ((_e = (_d = error.raw) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.includes('Connect')) ? 403 : 500;
            res.status(statusCode).json({ message });
        }
    }),
    // 2. Generate Onboarding Link
    generateOnboardingLink: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const userId = req.user._id || req.user.id;
            const profile = yield CreatorProfile_1.default.findOne({ user: userId });
            if (!profile || !profile.stripeConnectId) {
                return res.status(400).json({ message: 'No Stripe account found for this user. Create an account first.' });
            }
            const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
            const accountLink = yield stripe.accountLinks.create({
                account: profile.stripeConnectId,
                refresh_url: `${origin}/dashboard/creator/wallet?refresh=true`,
                return_url: `${origin}/dashboard/creator/wallet?success=true`,
                type: 'account_onboarding',
            });
            res.status(200).json({ url: accountLink.url });
        }
        catch (error) {
            console.error('[Stripe] Onboarding Link Error:', error);
            let message = error.message;
            if (((_b = (_a = error.raw) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('signed up for Connect')) || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('signed up for Connect'))) {
                message = "Stripe Connect is not enabled on your Stripe Dashboard. Please enable 'Connect' in your Stripe settings (https://dashboard.stripe.com/connect) to onboard creators.";
            }
            const statusCode = error.type === 'StripeInvalidRequestError' || ((_e = (_d = error.raw) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.includes('Connect')) ? 403 : 500;
            res.status(statusCode).json({ message });
        }
    }),
    // 3. Sync Account Status
    syncAccountStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user._id || req.user.id;
            const profile = yield CreatorProfile_1.default.findOne({ user: userId });
            if (!profile || !profile.stripeConnectId) {
                return res.status(400).json({ message: 'No Stripe account found' });
            }
            const account = yield stripe.accounts.retrieve(profile.stripeConnectId);
            profile.stripeOnboardingStatus = {
                detailsSubmitted: account.details_submitted,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled
            };
            yield profile.save();
            res.status(200).json({
                status: profile.stripeOnboardingStatus
            });
        }
        catch (error) {
            console.error('[Stripe] Sync Status Error:', error);
            res.status(500).json({ message: error.message });
        }
    }),
    // Webhook implementation handling events
    webhook: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        }
        catch (err) {
            console.error(`[Stripe Webhook] Verification Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        try {
            switch (event.type) {
                case 'account.updated': {
                    const account = event.data.object;
                    const profile = yield CreatorProfile_1.default.findOne({ stripeConnectId: account.id });
                    if (profile) {
                        profile.stripeOnboardingStatus = {
                            detailsSubmitted: account.details_submitted,
                            payoutsEnabled: account.payouts_enabled,
                            chargesEnabled: account.charges_enabled,
                        };
                        yield profile.save();
                        console.log(`[Stripe Webhook] Synced account ${account.id} status: payouts=${account.payouts_enabled}, charges=${account.charges_enabled}`);
                    }
                    break;
                }
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object;
                    // confirm payment
                    const orderId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.orderId;
                    if (orderId) {
                        const order = yield Order_1.default.findById(orderId);
                        if (order && !order.paid) {
                            order.status = 'active';
                            order.paid = true;
                            order.paymentIntentId = paymentIntent.id;
                            yield order.save();
                            console.log(`[Stripe Webhook] Marked order ${orderId} as paid`);
                            // Let the creator track their earnings
                            yield Transaction_1.default.create({
                                user: order.creator,
                                order: order._id,
                                type: 'earning',
                                amount: Math.round((order.price) * 100),
                                currency: 'eur',
                                status: 'pending',
                                description: `Earning from Order #${orderId}`,
                            });
                        }
                    }
                    break;
                }
                case 'payout.paid':
                case 'transfer.created': {
                    // Track payouts
                    const transfer = event.data.object;
                    if (transfer.destination || transfer.destination_payment) {
                        console.log(`[Stripe Webhook] Transfer/Payout successful`, transfer.id);
                        // You can mark the corresponding Transaction as 'completed' here if you linked it.
                        // Or just log it. Destination charges trigger transfers automatically.
                    }
                    break;
                }
                default:
                    console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
            }
            res.json({ received: true });
        }
        catch (err) {
            console.error(`[Stripe Webhook] Processing Error:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    })
};
