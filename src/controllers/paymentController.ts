import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import Order from '../models/Order';
import Offer from '../models/Offer';
import Transaction from '../models/Transaction';
import CreatorProfile from '../models/CreatorProfile';
import PlatformSettings from '../models/PlatformSettings';
import User from '../models/User';
import mongoose from 'mongoose';
import { NotificationService } from '../services/notification.service';

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
            const orderId = (req.body.orderId as string)?.trim();
            console.log(`[PaymentController] Payment Intent Request for Order: "${orderId}"`);
            
            if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ message: 'Invalid Order ID signature' });
            }

            const order = await Order.findById(orderId);

            if (!order) {
                console.error(`[PaymentController] Order NOT FOUND in DB: ${orderId}`);
                return res.status(404).json({ message: 'Payment target order not found' });
            }

            const userId = (req.user.id || req.user._id).toString();
            const orderBrandId = (order.brand as any)._id?.toString() || order.brand.toString();

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
            const paymentIntent = await PaymentService.createPaymentIntent(orderId, amountToPay, creatorId, platformFee);

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
            console.log(`[PaymentController] Confirming Payment for Order: ${orderId}, PI: ${paymentIntentId}`);
            require('fs').appendFileSync('payment_trace.log', `${new Date().toISOString()} - Confirming ${orderId}\n`);

            if (!orderId) {
                console.error("[PaymentController] Order ID missing in confirmation request");
                return res.status(400).json({ message: "Order ID missing" });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                console.error(`[PaymentController] Order ${orderId} NOT FOUND during confirmation`);
                return res.status(404).json({ message: 'Order not found' });
            }

            console.log(`[PaymentController] Current Order Status: ${order.status}, Paid: ${order.paid}`);

            const offer = await Offer.findById(order.offer);
            if (!offer) {
                console.warn(`[PaymentController] No offer found for order ${orderId}`);
            }

            console.log(`[PaymentController] Updating order ${orderId} to active/paid.`);

            order.status = 'active';
            order.paid = true;
            order.paymentIntentId = paymentIntentId;
            const updatedOrder = await order.save();

            console.log(`[PaymentController] Order ${orderId} updated successfully.`);

            if (offer) {
                offer.status = 'accepted';
                offer.paid = true;
                await offer.save();
                console.log(`[PaymentController] Offer ${offer._id} status synced to accepted and paid.`);
            }

            const creatorEarningCents = Math.round(order.price * 100);

            console.log(`[PaymentController] Creating transaction for creator ${order.creator}. Amount: ${creatorEarningCents}`);

            await Transaction.create({
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
            const creatorUser = await User.findById(order.creator);
            if (creatorUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendPaymentConfirmed(
                    creatorUser.id,
                    creatorUser.email,
                    order.id,
                    `${frontendUrl}/dashboard/creator/orders/${order.id}`,
                    false
                );
            }

            // Notify Brand
            const brandUser = await User.findById(order.brand);
            if (brandUser) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                await NotificationService.sendPaymentConfirmed(
                    brandUser.id,
                    brandUser.email,
                    order.id,
                    `${frontendUrl}/dashboard/brand/orders/${order.id}`,
                    true
                );
            }

            res.json({ success: true, order: updatedOrder });
        } catch (error: any) {
            console.error("[PaymentController] Confirmation CRITICAL Error:", error);
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
                // Verify the dashboard capabilities are actually active
                const stripeStatus = await PaymentService.getAccountStatus(profile.stripeConnectId as string);
                if (!stripeStatus.payouts_enabled || !stripeStatus.details_submitted) {
                    return res.status(400).json({ message: 'Withdrawals are locked! Your Stripe account is missing critical verification steps. Click "Complete Setup" in your wallet first.' });
                }
                
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
                currency: 'eur',
                status: status,
                description: description,
            });

            res.json({ success: true, message: hasStripe ? "Withdrawal processed via Stripe." : "Withdrawal request submitted for Admin review." });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    // 6. Admin Release Payment (or Automatic Cron Call)
    releasePayment: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const now = new Date();

            // Only release payments where the 7-day post-approval timer (availableAt) has passed
            const result = await Transaction.updateMany(
                {
                    status: 'pending',
                    type: 'earning',
                    availableAt: { $lte: now }
                },
                { status: 'available' }
            );

            res.json({ message: 'Payments released', count: result.modifiedCount });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
};
