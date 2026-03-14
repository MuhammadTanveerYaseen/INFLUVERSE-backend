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
exports.emailTemplates = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create helper for consistent email styling
const wrapEmail = (title, content) => `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px; }
  .header { background-color: #7c3aed; color: #ffffff; padding: 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
  .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
  .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
  .btn { display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
  .info-box { background-color: #f3f4f6; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0; border-radius: 4px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Influverse. All rights reserved.</p>
      <p>This is an automated system email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
`;
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail', // Standard for basic projects using Gmail/Firebase accounts
    auth: {
        user: process.env.EMAIL_USER, // e.g. 'influverse-system@gmail.com'
        pass: process.env.EMAIL_PASS, // App Password
    },
});
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Influverse Team" <noreply@influverse.com>',
            to,
            subject,
            html,
        };
        const info = yield transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
    }
    catch (error) {
        console.error(`Error sending email: ${error}`);
    }
});
exports.sendEmail = sendEmail;
exports.emailTemplates = {
    offerReceived: (brandName, price, offerLink = '#') => wrapEmail('New Offer Received! 🎉', `
        <p>Hi there,</p>
        <p>Great news! You have received a new offer from <strong>${brandName}</strong>.</p>
        <div class="info-box">
            <p style="margin: 0; font-weight: bold;">Offer Value: $${price.toLocaleString()}</p>
        </div>
        <p>Review the details and respond to start the collaboration.</p>
        <center><a href="${offerLink}" class="btn" style="color: #ffffff;">View Offer</a></center>
        `),
    offerStatusUpdate: (name, status, link = '#') => {
        const isAccepted = status === 'accepted';
        const color = isAccepted ? '#10b981' : '#ef4444';
        const title = isAccepted ? 'Offer Accepted! 🚀' : `Offer ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        return wrapEmail(title, `
            <p>Hi,</p>
            <p>Your offer to <strong>${name}</strong> has been <strong style="color: ${color};">${status.toUpperCase()}</strong>.</p>
            ${isAccepted ? '<p>An order has been automatically created. You can now track progress.</p>' : '<p>Check your dashboard for more details or to submit a new offer.</p>'}
            <center><a href="${link}" class="btn" style="color: #ffffff;">Go to Dashboard</a></center>
            `);
    },
    orderCreated: (orderId, role, link = '#') => wrapEmail('Order Created 📦', `
        <p>A new order has been initialized.</p>
        <div class="info-box">
             <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
        </div>
        <p>The project is now active. Please check your dashboard for timelines and deliverables.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">View Order</a></center>
        `),
    contentDelivered: (orderId, link = '#') => wrapEmail('Content Delivered 📬', `
        <p>The creator has submitted deliverables for <strong>Order #${orderId}</strong>.</p>
        <p>Please review the submitted files and approve or request revisions within the next 48 hours.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">Review Content</a></center>
        `),
    orderApproved: (orderId, link = '#') => wrapEmail('Order Approved! ✅', `
        <p>Congratulations! <strong>Order #${orderId}</strong> has been marked as completed and approved.</p>
        <p>Your payment is being processed and will be released to your wallet shortly.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">View Details</a></center>
        `),
    verificationEmail: (verificationLink) => wrapEmail('Verify Your Email Address 📧', `
        <div class="content">
            <p>Welcome to Influverse! Only one step left to get started.</p>
            <p>Please click the button below to confirm your email:</p>
            <center><a href="${verificationLink}" class="btn" style="color: #ffffff;">Verify Email</a></center>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
        `),
    otpVerification: (otp) => wrapEmail('Verify Your Account with OTP 🔒', `
        <div class="content">
            <p>Welcome to Influverse! To complete your registration, please use the verification code below.</p>
            <div class="info-box" style="text-align: center;">
                <h2 style="margin: 0; letter-spacing: 5px; font-size: 32px; color: #7c3aed;">${otp}</h2>
                <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
            </div>
            <p>Enter this code on the verification screen to activate your account.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">If you didn't request this code, please ignore this email.</p>
        </div>
        `),
    revisionRequested: (orderId, reason, link = '#') => wrapEmail('Revision Requested ✏️', `
        <div class="content">
            <p>The brand has requested a revision for <strong>Order #${orderId}</strong>.</p>
            <div class="info-box">
                <p><strong>Note from Brand:</strong></p>
                <p><em>"${reason}"</em></p>
            </div>
            <p>Please review the feedback and submit updated deliverables as soon as possible.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">View Feedback</a></center>
        </div>
        `),
    orderCancelled: (orderId, reason = 'No reason provided', link = '#') => wrapEmail('Order Cancelled ❌', `
        <div class="content">
            <p><strong>Order #${orderId}</strong> has been cancelled.</p>
            <div class="info-box">
                <p><strong>Reason:</strong> ${reason}</p>
            </div>
            <p>If you believe this is an error or need assistance, please contact support.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">Contact Support</a></center>
        </div>
        `),
    offerModified: (brandName, newPrice, link = '#') => wrapEmail('Offer Modified 📝', `
        <div class="content">
            <p><strong>${brandName}</strong> has modified their offer.</p>
            <div class="info-box">
                 <p style="margin: 0; font-weight: bold;">New Offer Price: $${newPrice.toLocaleString()}</p>
            </div>
            <p>Please review the changes and accept or counter-offer.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">Review Offer</a></center>
        </div>
        `),
    passwordReset: (resetUrl) => wrapEmail('Password Reset Request 🔒', `
        <div class="content">
            <p>You requested a password reset. Please click the button below to set a new password.</p>
            <center><a href="${resetUrl}" class="btn" style="color: #ffffff;">Reset Password</a></center>
            <p style="margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        `)
};
