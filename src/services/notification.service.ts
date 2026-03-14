import { sendEmail, emailTemplates } from '../utils/emailService';
import Notification from '../models/Notification';
import { emitToUser } from './socket.service';

export class NotificationService {

    // Helper to create DB notification
    private static async createNotification(
        recipient: string,
        title: string,
        message: string,
        type: 'offer' | 'order' | 'message' | 'system' | 'payment',
        link?: string,
        sender?: string
    ) {
        try {
            const notification = await Notification.create({
                recipient,
                sender,
                type,
                title,
                message,
                link: link || '',
                isRead: false,
            });

            // Real-time Emit
            emitToUser(recipient.toString(), 'new_notification', notification);

        } catch (error) {
            console.error('Error creating in-app notification:', error);
        }
    }

    static async sendOfferReceived(recipientId: string, email: string, senderId: string, brandName: string, price: number, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'New Offer Received',
            `You received an offer of $${price} from ${brandName}.`,
            'offer',
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            'New Offer Received on Influverse',
            emailTemplates.offerReceived(brandName, price, link)
        );
    }

    static async sendOfferStatusUpdate(recipientId: string, email: string, senderId: string, creatorName: string, status: string, link: string) {
        const title = `Offer ${status === 'countered' ? 'Countered' : (status === 'accepted' ? 'Accepted' : 'Rejected')}`;
        // DB Notification
        await this.createNotification(
            recipientId,
            title,
            `${creatorName} has ${status} your offer.`,
            'offer',
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            title,
            emailTemplates.offerStatusUpdate(creatorName, status, link)
        );
    }

    static async sendOrderCreated(recipientId: string, email: string, orderId: string, role: string, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'Order Started',
            `Order #${orderId} has been created.`,
            'order',
            link
        );

        // Email
        await sendEmail(
            email,
            `Order #${orderId} Started`,
            emailTemplates.orderCreated(orderId, role, link)
        );
    }

    static async sendContentDelivered(recipientId: string, email: string, senderId: string, orderId: string, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'Content Delivered',
            `Content for Order #${orderId} has been submitted for review.`,
            'order',
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            'Order Delivered - Review Needed',
            emailTemplates.contentDelivered(orderId, link)
        );
    }

    static async sendOrderApproved(recipientId: string, email: string, senderId: string, orderId: string, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'Order Approved',
            `Your submission for Order #${orderId} has been approved!`,
            'order',
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            'Order Approved!',
            emailTemplates.orderApproved(orderId, link)
        );
    }

    static async sendRevisionRequested(recipientId: string, email: string, senderId: string, orderId: string, reason: string, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'Revision Requested',
            `Revision requested for Order #${orderId}: ${reason}`,
            'order',
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            'Revision Requested ✏️',
            emailTemplates.revisionRequested(orderId, reason, link)
        );
    }

    static async sendOrderCancelled(recipientId: string, email: string, senderId: string | undefined, orderId: string, reason: string, link: string, isDispute: boolean = false) {
        const title = isDispute ? 'Order Disputed' : 'Order Cancelled';

        // DB Notification
        await this.createNotification(
            recipientId,
            title,
            `${title} for Order #${orderId}. Reason: ${reason}`,
            'order', // or 'system'
            link,
            senderId
        );

        // Email
        await sendEmail(
            email,
            `${title} ❌`,
            emailTemplates.orderCancelled(orderId, reason, link)
        );
    }

    static async sendPaymentRequired(recipientId: string, email: string, orderId: string, link: string) {
        // DB Notification
        await this.createNotification(
            recipientId,
            'Payment Required',
            `Creator accepted! Please complete payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} to start the campaign.`,
            'payment',
            link
        );

        // Email
        await sendEmail(
            email,
            'Action Required: Complete your Influverse Payment',
            `The creator has accepted your offer! To officially start the campaign and secure the timeframe, please complete the payment at: ${link}`
        );
    }

    static async sendPaymentConfirmed(recipientId: string, email: string, orderId: string, link: string, isBrand: boolean = false) {
        const title = 'Payment Secured';
        const message = isBrand 
            ? `Your payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} is successful. The creator has been notified.`
            : `Payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} has been secured in escrow. You can now start the campaign!`;

        await this.createNotification(
            recipientId,
            title,
            message,
            'payment',
            link
        );

        await sendEmail(
            email,
            'Payment Confirmed - Order Active ✅',
            message + ` View details: ${link}`
        );
    }
}
