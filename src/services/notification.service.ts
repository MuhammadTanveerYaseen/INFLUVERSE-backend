import { sendEmail, emailTemplates } from '../utils/emailService';
import Notification from '../models/Notification';
import { emitToUser } from './socket.service';
import User from '../models/User';
import mongoose from 'mongoose';

export class NotificationService {

    // Helper to fetch user language
    private static async getUserLanguage(userId: string): Promise<'en' | 'de'> {
        try {
            const user = await User.findById(userId).select('preferredLanguage');
            return (user as any)?.preferredLanguage || 'de';
        } catch (error) {
            console.error('[NotificationService] Error fetching user language:', error);
            return 'de';
        }
    }

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
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Neues Angebot erhalten' : 'New Offer Received',
            lang === 'de' ? `Du hast ein Angebot über €${price} von ${brandName} erhalten.` : `You received an offer of €${price} from ${brandName}.`,
            'offer',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.offerReceived(brandName, price, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendOfferStatusUpdate(recipientId: string, email: string, senderId: string, creatorName: string, status: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);
        
        let dbTitle, dbMsg;
        if (status === 'accepted') {
            dbTitle = lang === 'de' ? 'Angebot angenommen' : 'Offer Accepted';
            dbMsg = lang === 'de' ? `${creatorName} hat dein Angebot angenommen.` : `${creatorName} has accepted your offer.`;
        } else if (status === 'rejected') {
            dbTitle = lang === 'de' ? 'Angebot abgelehnt' : 'Offer Declined';
            dbMsg = lang === 'de' ? `${creatorName} hat dein Angebot abgelehnt.` : `${creatorName} has declined your offer.`;
        } else {
            dbTitle = lang === 'de' ? 'Angebot aktualisiert' : 'Offer Updated';
            dbMsg = lang === 'de' ? `${creatorName} hat ein Gegenangebot gesendet.` : `${creatorName} has countered your offer.`;
        }

        // DB Notification
        await this.createNotification(
            recipientId,
            dbTitle,
            dbMsg,
            'offer',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.offerStatusUpdate(creatorName, status, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendOrderCreated(recipientId: string, email: string, orderId: string, role: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Bestellung gestartet' : 'Order Started',
            lang === 'de' ? `Bestellung #${orderId} wurde erstellt.` : `Order #${orderId} has been created.`,
            'order',
            link
        );

        // Email
        const template = emailTemplates.orderCreated(orderId, role, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendContentDelivered(recipientId: string, email: string, senderId: string, orderId: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Inhalt geliefert' : 'Content Delivered',
            lang === 'de' ? `Inhalt für Bestellung #${orderId} wurde zur Prüfung eingereicht.` : `Content for Order #${orderId} has been submitted for review.`,
            'order',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.contentDelivered(orderId, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendOrderApproved(recipientId: string, email: string, senderId: string, orderId: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Bestellung genehmigt' : 'Order Approved',
            lang === 'de' ? `Deine Einreichung für Bestellung #${orderId} wurde genehmigt!` : `Your submission for Order #${orderId} has been approved!`,
            'order',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.orderApproved(orderId, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendRevisionRequested(recipientId: string, email: string, senderId: string, orderId: string, reason: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Überarbeitung angefordert' : 'Revision Requested',
            lang === 'de' ? `Überarbeitung für Bestellung #${orderId} angefordert: ${reason}` : `Revision requested for Order #${orderId}: ${reason}`,
            'order',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.revisionRequested(orderId, reason, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendOrderCancelled(recipientId: string, email: string, senderId: string | undefined, orderId: string, reason: string, link: string, isDispute: boolean = false) {
        const lang = await this.getUserLanguage(recipientId);
        
        const dbTitle = isDispute 
            ? (lang === 'de' ? 'Bestellung angefochten' : 'Order Disputed')
            : (lang === 'de' ? 'Bestellung storniert' : 'Order Cancelled');

        const dbMessage = lang === 'de'
            ? `${dbTitle} für Bestellung #${orderId}. Grund: ${reason}`
            : `${dbTitle} for Order #${orderId}. Reason: ${reason}`;

        // DB Notification
        await this.createNotification(
            recipientId,
            dbTitle,
            dbMessage,
            'order',
            link,
            senderId
        );

        // Email
        const template = emailTemplates.orderCancelled(orderId, reason, link, lang);
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendPaymentRequired(recipientId: string, email: string, orderId: string, link: string) {
        const lang = await this.getUserLanguage(recipientId);

        // DB Notification
        await this.createNotification(
            recipientId,
            lang === 'de' ? 'Zahlung erforderlich' : 'Payment Required',
            lang === 'de' 
                ? `Creator hat angenommen! Bitte schließe die Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} ab, um die Kampagne zu starten.`
                : `Creator accepted! Please complete payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} to start the campaign.`,
            'payment',
            link
        );

        // Email
        const template = emailTemplates.paymentRequired(orderId.substring(orderId.length - 6).toUpperCase(), link, lang);
        
        sendEmail(
            email,
            template.subject,
            template.html
        ).catch(err => console.error('Failed to send email:', err));
    }

    static async sendPaymentConfirmed(recipientId: string, email: string, orderId: string, link: string, isBrand: boolean = false) {
        const lang = await this.getUserLanguage(recipientId);
        const title = lang === 'de' ? 'Zahlung gesichert' : 'Payment Secured';
        
        const message = isBrand 
            ? (lang === 'de' 
                ? `Deine Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} war erfolgreich. Der Creator wurde benachrichtigt.`
                : `Your payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} is successful. The creator has been notified.`)
            : (lang === 'de'
                ? `Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} wurde im Escrow gesichert. Du kannst jetzt mit der Kampagne starten!`
                : `Payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} has been secured in escrow. You can now start the campaign!`);

        await this.createNotification(
            recipientId,
            title,
            message,
            'payment',
            link
        );

        if (isBrand) {
            const template = emailTemplates.paymentConfirmation(orderId, link, lang);
            sendEmail(
                email,
                template.subject,
                template.html
            ).catch(err => console.error('Failed to send email:', err));
        } else {
            // For creator, payment confirmation means the order is now created/active
            const template = emailTemplates.orderCreated(orderId, 'creator', link, lang);
            sendEmail(
                email,
                template.subject,
                template.html
            ).catch(err => console.error('Failed to send email:', err));
        }
    }
}
