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
exports.PaymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
class PaymentService {
    // 1. Create Connect Account for Creator
    static createConnectAccountLink(user, origin) {
        return __awaiter(this, void 0, void 0, function* () {
            let accountId = user.stripeConnectId;
            const baseOrigin = origin || process.env.FRONTEND_URL || 'http://localhost:3000';
            if (!accountId) {
                const profile = yield CreatorProfile_1.default.findOne({ user: user._id || user.id });
                if (profile && profile.stripeConnectId) {
                    accountId = profile.stripeConnectId;
                }
                else {
                    try {
                        const account = yield stripe.accounts.create({
                            type: 'express',
                            country: 'CH',
                            email: user.email,
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
                        accountId = account.id;
                    }
                    catch (error) {
                        console.error("Stripe Account Create Error:", error);
                        if (error.raw && error.raw.message && error.raw.message.includes("signed up for Connect")) {
                            throw new Error("Stripe Connect is not enabled on your Stripe Dashboard. Please enable 'Connect' in your Stripe settings to onboard creators.");
                        }
                        throw error;
                    }
                    // Save ID
                    if (profile) {
                        profile.stripeConnectId = accountId;
                        yield profile.save();
                    }
                }
            }
            const accountLink = yield stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${baseOrigin}/dashboard/creator/wallet?refresh=true`,
                return_url: `${baseOrigin}/dashboard/creator/wallet?success=true`,
                type: 'account_onboarding',
            });
            return accountLink.url;
        });
    }
    // 2. Create Payment Intent for Brand (Pay for Order) with Destination Charge
    static createPaymentIntent(orderId, amount, creatorId, platformFee) {
        return __awaiter(this, void 0, void 0, function* () {
            // amount in eur, convert to cents
            const amountInCents = Math.round(amount * 100);
            const applicationFeeInCents = Math.round(platformFee * 100);
            const profile = yield CreatorProfile_1.default.findOne({ user: creatorId });
            if (!profile)
                throw new Error('Creator profile not found.');
            let connectId = profile.stripeConnectId;
            if (!connectId) {
                try {
                    const creatorUser = yield require('../models/User').default.findById(creatorId);
                    const account = yield stripe.accounts.create({
                        type: 'express',
                        country: profile.country || 'CH',
                        email: (creatorUser === null || creatorUser === void 0 ? void 0 : creatorUser.email) || '',
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
                    connectId = account.id;
                    profile.stripeConnectId = connectId;
                    profile.payoutsEnabled = false;
                    yield profile.save();
                    console.log(`[Stripe] Auto-created Connect account ${connectId} for creator ${creatorId}`);
                }
                catch (error) {
                    // If it fails because Connect is not enabled, we LOG it but don't block the payment
                    // since the current implementation doesn't yet use destination charges.
                    console.warn(`[Stripe] Could not auto-create Connect account: ${error.message}. Proceeding with platform payment.`);
                }
            }
            const paymentIntentOptions = {
                amount: amountInCents,
                currency: 'eur',
                metadata: { orderId },
                automatic_payment_methods: {
                    enabled: true,
                }
            };
            // If we have a connectId AND Connect is actually enabled for the platform, 
            // we could add destination/fee here. For now, we keep it simple to avoid breaking checkout.
            const paymentIntent = yield stripe.paymentIntents.create(paymentIntentOptions);
            return paymentIntent;
        });
    }
    // 3. Process Payout to Creator (Withdraw)
    static processPayout(userId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const profile = yield CreatorProfile_1.default.findOne({ user: userId });
            if (!profile || !profile.stripeConnectId) {
                throw new Error('Creator has no connected Stripe account');
            }
            const transfer = yield stripe.transfers.create({
                amount: Math.round(amount * 100),
                currency: 'eur',
                destination: profile.stripeConnectId,
                description: 'Payout from Influverse',
            });
            return transfer;
        });
    }
    // 4. Get Stripe Account Status
    static getAccountStatus(stripeAccountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield stripe.accounts.retrieve(stripeAccountId);
            return {
                details_submitted: account.details_submitted,
                payouts_enabled: account.payouts_enabled,
                charges_enabled: account.charges_enabled
            };
        });
    }
}
exports.PaymentService = PaymentService;
