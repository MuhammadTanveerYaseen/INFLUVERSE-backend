import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import Order from '../models/Order';
import Offer from '../models/Offer';
import Transaction from '../models/Transaction';
import CreatorProfile from '../models/CreatorProfile';
import PlatformSettings from '../models/PlatformSettings';
import User from '../models/User';

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const PaymentController = {
    // 1. Onboard Creator (Get Stripe Connect Link)
    onboardCreator: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            if (user.role !== 'creator') {
                return res.status(403).json({ message: 'Only creators can onboard for payouts' });
            }

            const url = await PaymentService.createConnectAccountLink(user);
            res.json({ url });
        } catch (error: any) {
            console.error('Onboard error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // 2. Get Wallet Status (Balance, Transactions, Connect Status)
    getWallet: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const userId = (user._id || user.id).toString();

            const profile = await CreatorProfile.findOne({ user: userId });
            const stripeId = profile?.stripeConnectId;
            let stripeStatus = { details_submitted: false, payouts_enabled: false };

            if (stripeId) {
                stripeStatus = await PaymentService.getAccountStatus(stripeId);
            }

            const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

            let pendingBalance = 0;
            let availableBalance = 0;

            transactions.forEach(tx => {
                if (tx.status === 'pending') pendingBalance += tx.amount;

                if (tx.type === 'earning' && tx.status === 'available') {
                    availableBalance += tx.amount;
                }
                if (tx.type === 'payout' && ['available', 'completed', 'processing'].includes(tx.status)) {
                    availableBalance += tx.amount;
                }
            });

            res.json({
                stripeConnected: !!stripeId,
                bankConnected: !!(profile?.bankDetails?.accountNumber),
                bankDetails: profile?.bankDetails,
                stripeStatus,
                balances: {
                    pending: pendingBalance / 100, // Convert to dollars
                    available: availableBalance / 100
                },
                transactions
            });

        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    // 3. Create Payment Intent (Brand pays for Order)
    createOrderPayment: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { orderId } = req.body;
            if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

            const order = await Order.findById(orderId);

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

            const paymentIntent = await PaymentService.createPaymentIntent(orderId, amountToPay);

            res.json({ clientSecret: paymentIntent.client_secret });
        } catch (error: any) {
            console.error("Payment Error:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // 4. Confirm Payment (Webhook or Manual Call)
    confirmPayment: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { paymentIntentId, orderId } = req.body;
            console.log(`Confirming Payment. Order: ${orderId}, Intent: ${paymentIntentId}`);

            const order = await Order.findById(orderId);
            if (!order) return res.status(404).json({ message: 'Order not found' });

            const offer = await Offer.findById(order.offer);

            const now = new Date();
            let newDeadline = new Date(now);

            if (offer && offer.durationDays) {
                newDeadline.setDate(now.getDate() + offer.durationDays);
            } else if (order.deadline) {
                if (new Date(order.deadline) < now) {
                    newDeadline.setDate(now.getDate() + 3);
                } else {
                    newDeadline = new Date(order.deadline);
                }
            } else {
                newDeadline.setDate(now.getDate() + 3);
            }

            order.status = 'active';
            order.paid = true;
            order.paymentIntentId = paymentIntentId;
            order.deadline = newDeadline;
            const updatedOrder = await order.save();

            if (offer) {
                offer.status = 'accepted';
                await offer.save();
            }

            const creatorEarningCents = Math.round(order.price * 100);

            await Transaction.create({
                user: order.creator,
                type: 'earning',
                amount: creatorEarningCents,
                currency: 'usd',
                status: 'pending',
                description: `Earning from Order #${orderId}`,
            });

            res.json({ success: true, order: updatedOrder });
        } catch (error: any) {
            console.error("Confirmation Error:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // 5. Withdraw Funds
    withdraw: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user;
            const userId = (user._id || user.id).toString();
            const { amount } = req.body;

            const transactions = await Transaction.find({ user: userId, status: 'available' });
            const availableCents = transactions.reduce((acc, tx) => acc + tx.amount, 0);
            const requestCents = Math.round(amount * 100);

            if (requestCents > availableCents) {
                return res.status(400).json({ message: 'Insufficient funds' });
            }

            const profile = await CreatorProfile.findOne({ user: userId });
            const hasStripe = !!profile?.stripeConnectId;
            const hasBank = !!(profile?.bankDetails?.accountNumber);

            if (!hasStripe && !hasBank) {
                return res.status(400).json({ message: 'No payout method connected. Please add bank details or connect Stripe.' });
            }

            let status = 'processing';
            let description = 'Withdrawal Request (Bank Transfer)';

            if (hasStripe) {
                await PaymentService.processPayout(userId, amount);
                status = 'completed';
                description = 'Withdrawal to Stripe';
            } else {
                description = `Withdrawal Request to Bank: ${profile?.bankDetails?.bankName} (Ending in ${profile?.bankDetails?.accountNumber?.slice(-4)})`;
            }

            await Transaction.create({
                user: userId,
                type: 'payout',
                amount: -requestCents,
                currency: 'usd',
                status: status,
                description: description,
            });

            res.json({ success: true, message: hasStripe ? "Withdrawal processed via Stripe." : "Withdrawal request submitted for Admin review." });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    // 6. Admin Release Payment
    releasePayment: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const settings = await PlatformSettings.findOne();
            const holdingPeriod = settings?.payoutHoldingPeriod || 7;

            const payoutThresholdDate = new Date();
            payoutThresholdDate.setDate(payoutThresholdDate.getDate() - holdingPeriod);

            const result = await Transaction.updateMany(
                {
                    status: 'pending',
                    type: 'earning',
                    createdAt: { $lte: payoutThresholdDate }
                },
                { status: 'available' }
            );

            res.json({ message: 'Payments released', count: result.modifiedCount });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
};
