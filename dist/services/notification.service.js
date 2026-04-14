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
exports.NotificationService = void 0;
const emailService_1 = require("../utils/emailService");
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_service_1 = require("./socket.service");
const User_1 = __importDefault(require("../models/User"));
class NotificationService {
    // Helper to fetch user language
    static getUserLanguage(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield User_1.default.findById(userId).select('preferredLanguage');
                return (user === null || user === void 0 ? void 0 : user.preferredLanguage) || 'de';
            }
            catch (error) {
                console.error('[NotificationService] Error fetching user language:', error);
                return 'de';
            }
        });
    }
    // Helper to create DB notification
    static createNotification(recipient, title, message, type, link, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const notification = yield Notification_1.default.create({
                    recipient,
                    sender,
                    type,
                    title,
                    message,
                    link: link || '',
                    isRead: false,
                });
                // Real-time Emit
                (0, socket_service_1.emitToUser)(recipient.toString(), 'new_notification', notification);
            }
            catch (error) {
                console.error('Error creating in-app notification:', error);
            }
        });
    }
    static sendOfferReceived(recipientId, email, senderId, brandName, price, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Neues Angebot erhalten' : 'New Offer Received', lang === 'de' ? `Du hast ein Angebot über €${price} von ${brandName} erhalten.` : `You received an offer of €${price} from ${brandName}.`, 'offer', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.offerReceived(brandName, price, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOfferStatusUpdate(recipientId, email, senderId, creatorName, status, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            let dbTitle, dbMsg;
            if (status === 'accepted') {
                dbTitle = lang === 'de' ? 'Angebot angenommen' : 'Offer Accepted';
                dbMsg = lang === 'de' ? `${creatorName} hat dein Angebot angenommen.` : `${creatorName} has accepted your offer.`;
            }
            else if (status === 'rejected') {
                dbTitle = lang === 'de' ? 'Angebot abgelehnt' : 'Offer Declined';
                dbMsg = lang === 'de' ? `${creatorName} hat dein Angebot abgelehnt.` : `${creatorName} has declined your offer.`;
            }
            else {
                dbTitle = lang === 'de' ? 'Angebot aktualisiert' : 'Offer Updated';
                dbMsg = lang === 'de' ? `${creatorName} hat ein Gegenangebot gesendet.` : `${creatorName} has countered your offer.`;
            }
            // DB Notification
            yield this.createNotification(recipientId, dbTitle, dbMsg, 'offer', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.offerStatusUpdate(creatorName, status, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderCreated(recipientId, email, orderId, role, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Bestellung gestartet' : 'Order Started', lang === 'de' ? `Bestellung #${orderId} wurde erstellt.` : `Order #${orderId} has been created.`, 'order', link);
            // Email
            const template = emailService_1.emailTemplates.orderCreated(orderId, role, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendContentDelivered(recipientId, email, senderId, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Inhalt geliefert' : 'Content Delivered', lang === 'de' ? `Inhalt für Bestellung #${orderId} wurde zur Prüfung eingereicht.` : `Content for Order #${orderId} has been submitted for review.`, 'order', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.contentDelivered(orderId, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderApproved(recipientId, email, senderId, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Bestellung genehmigt' : 'Order Approved', lang === 'de' ? `Deine Einreichung für Bestellung #${orderId} wurde genehmigt!` : `Your submission for Order #${orderId} has been approved!`, 'order', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.orderApproved(orderId, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendRevisionRequested(recipientId, email, senderId, orderId, reason, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Überarbeitung angefordert' : 'Revision Requested', lang === 'de' ? `Überarbeitung für Bestellung #${orderId} angefordert: ${reason}` : `Revision requested for Order #${orderId}: ${reason}`, 'order', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.revisionRequested(orderId, reason, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderCancelled(recipientId_1, email_1, senderId_1, orderId_1, reason_1, link_1) {
        return __awaiter(this, arguments, void 0, function* (recipientId, email, senderId, orderId, reason, link, isDispute = false) {
            const lang = yield this.getUserLanguage(recipientId);
            const dbTitle = isDispute
                ? (lang === 'de' ? 'Bestellung angefochten' : 'Order Disputed')
                : (lang === 'de' ? 'Bestellung storniert' : 'Order Cancelled');
            const dbMessage = lang === 'de'
                ? `${dbTitle} für Bestellung #${orderId}. Grund: ${reason}`
                : `${dbTitle} for Order #${orderId}. Reason: ${reason}`;
            // DB Notification
            yield this.createNotification(recipientId, dbTitle, dbMessage, 'order', link, senderId);
            // Email
            const template = emailService_1.emailTemplates.orderCancelled(orderId, reason, link, lang);
            (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendPaymentRequired(recipientId, email, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const lang = yield this.getUserLanguage(recipientId);
            // DB Notification
            yield this.createNotification(recipientId, lang === 'de' ? 'Zahlung erforderlich' : 'Payment Required', lang === 'de'
                ? `Creator hat angenommen! Bitte schließe die Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} ab, um die Kampagne zu starten.`
                : `Creator accepted! Please complete payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} to start the campaign.`, 'payment', link);
            // Email
            const subject = lang === 'de' ? 'Aktion erforderlich: Schließe deine Influverse-Zahlung ab' : 'Action Required: Complete your Influverse Payment';
            const content = lang === 'de'
                ? `Der Creator hat dein Angebot angenommen! Um die Kampagne offiziell zu starten und den Zeitraum zu sichern, schließe bitte die Zahlung ab unter: ${link}`
                : `The creator has accepted your offer! To officially start the campaign and secure the timeframe, please complete the payment at: ${link}`;
            (0, emailService_1.sendEmail)(email, subject, content).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendPaymentConfirmed(recipientId_1, email_1, orderId_1, link_1) {
        return __awaiter(this, arguments, void 0, function* (recipientId, email, orderId, link, isBrand = false) {
            const lang = yield this.getUserLanguage(recipientId);
            const title = lang === 'de' ? 'Zahlung gesichert' : 'Payment Secured';
            const message = isBrand
                ? (lang === 'de'
                    ? `Deine Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} war erfolgreich. Der Creator wurde benachrichtigt.`
                    : `Your payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} is successful. The creator has been notified.`)
                : (lang === 'de'
                    ? `Zahlung für Bestellung #${orderId.substring(orderId.length - 6).toUpperCase()} wurde im Escrow gesichert. Du kannst jetzt mit der Kampagne starten!`
                    : `Payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} has been secured in escrow. You can now start the campaign!`);
            yield this.createNotification(recipientId, title, message, 'payment', link);
            if (isBrand) {
                const template = emailService_1.emailTemplates.paymentConfirmation(orderId, link, lang);
                (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
            }
            else {
                // For creator, payment confirmation means the order is now created/active
                const template = emailService_1.emailTemplates.orderCreated(orderId, 'creator', link, lang);
                (0, emailService_1.sendEmail)(email, template.subject, template.html).catch(err => console.error('Failed to send email:', err));
            }
        });
    }
}
exports.NotificationService = NotificationService;
