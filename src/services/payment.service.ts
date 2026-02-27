import Stripe from 'stripe';
import CreatorProfile from '../models/CreatorProfile';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export class PaymentService {
    // 1. Create Connect Account for Creator
    static async createConnectAccountLink(user: any) {
        let accountId = user.stripeConnectId;

        if (!accountId) {
            const profile = await CreatorProfile.findOne({ user: user._id || user.id });
            if (profile && profile.stripeConnectId) {
                accountId = profile.stripeConnectId;
            } else {
                try {
                    const account = await stripe.accounts.create({
                        type: 'express',
                        country: 'US',
                        email: user.email,
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true },
                        },
                    });
                    accountId = account.id;
                } catch (error: any) {
                    console.error("Stripe Account Create Error:", error);
                    if (error.raw && error.raw.message && error.raw.message.includes("signed up for Connect")) {
                        throw new Error("Stripe Connect is not enabled on your Stripe Dashboard. Please enable 'Connect' in your Stripe settings to onboard creators.");
                    }
                    throw error;
                }

                // Save ID
                if (profile) {
                    profile.stripeConnectId = accountId;
                    await profile.save();
                }
            }
        }

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.FRONTEND_URL}/dashboard/creator/wallet?refresh=true`,
            return_url: `${process.env.FRONTEND_URL}/dashboard/creator/wallet?success=true`,
            type: 'account_onboarding',
        });

        return accountLink.url;
    }

    // 2. Create Payment Intent for Brand (Pay for Order)
    static async createPaymentIntent(orderId: string, amount: number) {
        // amount in dollars, convert to cents
        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: { orderId },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return paymentIntent;
    }

    // 3. Process Payout to Creator (Withdraw)
    static async processPayout(userId: string, amount: number) {
        const profile = await CreatorProfile.findOne({ user: userId });
        if (!profile || !profile.stripeConnectId) {
            throw new Error('Creator has no connected Stripe account');
        }

        const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            destination: profile.stripeConnectId,
            description: 'Payout from Influverse',
        });

        return transfer;
    }

    // 4. Get Stripe Account Status
    static async getAccountStatus(stripeAccountId: string) {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        return {
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled
        };
    }
}
