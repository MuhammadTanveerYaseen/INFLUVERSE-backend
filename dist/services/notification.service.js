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
class NotificationService {
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
            // DB Notification
            yield this.createNotification(recipientId, 'New Offer Received', `You received an offer of $${price} from ${brandName}.`, 'offer', link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, 'New Offer Received on Influverse', emailService_1.emailTemplates.offerReceived(brandName, price, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOfferStatusUpdate(recipientId, email, senderId, creatorName, status, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const title = `Offer ${status === 'countered' ? 'Countered' : (status === 'accepted' ? 'Accepted' : 'Rejected')}`;
            // DB Notification
            yield this.createNotification(recipientId, title, `${creatorName} has ${status} your offer.`, 'offer', link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, title, emailService_1.emailTemplates.offerStatusUpdate(creatorName, status, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderCreated(recipientId, email, orderId, role, link) {
        return __awaiter(this, void 0, void 0, function* () {
            // DB Notification
            yield this.createNotification(recipientId, 'Order Started', `Order #${orderId} has been created.`, 'order', link);
            // Email
            (0, emailService_1.sendEmail)(email, `Order #${orderId} Started`, emailService_1.emailTemplates.orderCreated(orderId, role, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendContentDelivered(recipientId, email, senderId, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            // DB Notification
            yield this.createNotification(recipientId, 'Content Delivered', `Content for Order #${orderId} has been submitted for review.`, 'order', link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, 'Order Delivered - Review Needed', emailService_1.emailTemplates.contentDelivered(orderId, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderApproved(recipientId, email, senderId, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            // DB Notification
            yield this.createNotification(recipientId, 'Order Approved', `Your submission for Order #${orderId} has been approved!`, 'order', link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, 'Order Approved!', emailService_1.emailTemplates.orderApproved(orderId, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendRevisionRequested(recipientId, email, senderId, orderId, reason, link) {
        return __awaiter(this, void 0, void 0, function* () {
            // DB Notification
            yield this.createNotification(recipientId, 'Revision Requested', `Revision requested for Order #${orderId}: ${reason}`, 'order', link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, 'Revision Requested ✏️', emailService_1.emailTemplates.revisionRequested(orderId, reason, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendOrderCancelled(recipientId_1, email_1, senderId_1, orderId_1, reason_1, link_1) {
        return __awaiter(this, arguments, void 0, function* (recipientId, email, senderId, orderId, reason, link, isDispute = false) {
            const title = isDispute ? 'Order Disputed' : 'Order Cancelled';
            // DB Notification
            yield this.createNotification(recipientId, title, `${title} for Order #${orderId}. Reason: ${reason}`, 'order', // or 'system'
            link, senderId);
            // Email
            (0, emailService_1.sendEmail)(email, `${title} ❌`, emailService_1.emailTemplates.orderCancelled(orderId, reason, link)).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendPaymentRequired(recipientId, email, orderId, link) {
        return __awaiter(this, void 0, void 0, function* () {
            // DB Notification
            yield this.createNotification(recipientId, 'Payment Required', `Creator accepted! Please complete payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} to start the campaign.`, 'payment', link);
            // Email
            (0, emailService_1.sendEmail)(email, 'Action Required: Complete your Influverse Payment', `The creator has accepted your offer! To officially start the campaign and secure the timeframe, please complete the payment at: ${link}`).catch(err => console.error('Failed to send email:', err));
        });
    }
    static sendPaymentConfirmed(recipientId_1, email_1, orderId_1, link_1) {
        return __awaiter(this, arguments, void 0, function* (recipientId, email, orderId, link, isBrand = false) {
            const title = 'Payment Secured';
            const message = isBrand
                ? `Your payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} is successful. The creator has been notified.`
                : `Payment for order #${orderId.substring(orderId.length - 6).toUpperCase()} has been secured in escrow. You can now start the campaign!`;
            yield this.createNotification(recipientId, title, message, 'payment', link);
            if (isBrand) {
                (0, emailService_1.sendEmail)(email, `Payment successful — Order #${orderId}`, emailService_1.emailTemplates.paymentConfirmation(orderId, link)).catch(err => console.error('Failed to send email:', err));
            }
            else {
                // For creator, payment confirmation means the order is now created/active
                (0, emailService_1.sendEmail)(email, `Order #${orderId} created`, emailService_1.emailTemplates.orderCreated(orderId, 'creator', link)).catch(err => console.error('Failed to send email:', err));
            }
        });
    }
}
exports.NotificationService = NotificationService;
