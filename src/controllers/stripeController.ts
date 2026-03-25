import { Request, Response } from 'express';
import Stripe from 'stripe';
import CreatorProfile from '../models/CreatorProfile';
import Order from '../models/Order';
import Transaction from '../models/Transaction';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2024-12-18.acacia' as any,
});

export const StripeController = {
    // 1. Create Connected Account
    createAccount: async (req: Request | any, res: Response) => {
        try {
            const userId = req.user._id || req.user.id;
            let profile = await CreatorProfile.findOne({ user: userId });

            if (!profile) {
                return res.status(404).json({ message: 'Creator profile not found' });
            }

            if (profile.stripeConnectId) {
                return res.status(400).json({ message: 'Stripe account already exists', stripe_account_id: profile.stripeConnectId });
            }

            const account = await stripe.accounts.create({
                type: 'express',
                country: profile.country || 'US',
                email: req.user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            profile.stripeConnectId = account.id;
            // The requirement says save payouts_enabled as boolean, defaulting to false
            (profile as any).payoutsEnabled = false; 
            await profile.save();

            res.status(200).json({ stripe_account_id: account.id });
        } catch (error: any) {
            console.error('[Stripe] Create Account Error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // 2. Generate Onboarding Link
    generateOnboardingLink: async (req: Request | any, res: Response) => {
        try {
            const userId = req.user._id || req.user.id;
            const profile = await CreatorProfile.findOne({ user: userId });

            if (!profile || !profile.stripeConnectId) {
                return res.status(400).json({ message: 'No Stripe account found for this user. Create an account first.' });
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            const accountLink = await stripe.accountLinks.create({
                account: profile.stripeConnectId,
                refresh_url: `${frontendUrl}/dashboard/creator/wallet?refresh=true`,
                return_url: `${frontendUrl}/dashboard/creator/wallet?success=true`,
                type: 'account_onboarding',
            });

            res.status(200).json({ url: accountLink.url });
        } catch (error: any) {
            console.error('[Stripe] Onboarding Link Error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Webhook implementation handling events
    webhook: async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'] as string;
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body, 
                sig, 
                process.env.STRIPE_WEBHOOK_SECRET as string
            );
        } catch (err: any) {
            console.error(`[Stripe Webhook] Verification Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        try {
            switch (event.type) {
                case 'account.updated': {
                    const account = event.data.object as Stripe.Account;
                    const profile = await CreatorProfile.findOne({ stripeConnectId: account.id });
                    if (profile) {
                        const isEnabled = account.charges_enabled && account.payouts_enabled;
                        (profile as any).payoutsEnabled = isEnabled;
                        await profile.save();
                        console.log(`[Stripe Webhook] Updated account ${account.id} payoutsEnabled: ${isEnabled}`);
                    }
                    break;
                }
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    // confirm payment
                    const orderId = paymentIntent.metadata?.orderId;
                    if (orderId) {
                        const order = await Order.findById(orderId);
                        if (order && !order.paid) {
                            order.status = 'active';
                            order.paid = true;
                            order.paymentIntentId = paymentIntent.id;
                            await order.save();
                            console.log(`[Stripe Webhook] Marked order ${orderId} as paid`);
                            
                            // Let the creator track their earnings
                            await Transaction.create({
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
                    const transfer = event.data.object as Stripe.Transfer | Stripe.Payout;
                    if (transfer.destination || (transfer as any).destination_payment) {
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
        } catch (err) {
            console.error(`[Stripe Webhook] Processing Error:`, err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
