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
const wrapEmail = (title, content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; color: #000000; }
  .wrapper { padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; }
  .header { padding-bottom: 20px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
  .content { padding-bottom: 30px; line-height: 1.6; font-size: 16px; }
  .footer { padding-top: 30px; font-size: 13px; color: #888888; border-top: 1px solid #eeeeee; }
  .btn { display: inline-block; background-color: #000000; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
  .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; }
  p { margin-bottom: 16px; margin-top: 0; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 4px 0;">&copy; 2026 Influverse. All rights reserved.</p>
        <p style="margin: 0;">This is an automated system email. Please do not reply directly.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendEmail = (to, subjectOrTemplate, htmlStr) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // If the caller provided a subject string, but passed the template object as the third argument:
        // We prioritize the template's subject if available, or fallback to the caller's subject.
        const isObj3 = typeof htmlStr === 'object' && htmlStr !== null;
        const isObj2 = typeof subjectOrTemplate === 'object' && subjectOrTemplate !== null;
        const subject = isObj2 ? subjectOrTemplate.subject : (isObj3 ? htmlStr.subject : subjectOrTemplate);
        const html = isObj3 ? htmlStr.html : (isObj2 ? subjectOrTemplate.html : htmlStr);
        const mailOptions = {
            from: '"Influverse Team" <team@influverse.ch>',
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
    otpVerification: (otp, lang = 'en') => {
        const subject = lang === 'de' ? 'Verifiziere dein Influverse Konto' : 'Verify your Influverse account';
        const title = lang === 'de' ? 'Konto verifizieren' : 'Verify your account';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Gib den untenstehenden Code ein, um fortzufahren.</p><div class="otp-code">${otp}</div><p>Dieser Code läuft in 10 Minuten ab.</p>`
            : `<p>Hello,</p><p>Enter the code below to continue.</p><div class="otp-code">${otp}</div><p>This code expires in 10 minutes.</p>`;
        return { subject, html: wrapEmail(title, content) };
    },
    verificationEmail: (verificationLink, lang = 'en') => {
        const subject = lang === 'de' ? 'Verifiziere dein Influverse Konto' : 'Verify your Influverse account';
        const title = lang === 'de' ? 'Konto verifizieren' : 'Verify your account';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Klicke unten, um fortzufahren.</p><a href="${verificationLink}" class="btn" style="color:#ffffff;">Account verifizieren</a>`
            : `<p>Hello,</p><p>Click below to continue.</p><a href="${verificationLink}" class="btn" style="color:#ffffff;">Verify Account</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    passwordReset: (resetUrl, lang = 'en') => {
        const subject = lang === 'de' ? 'Passwort zurücksetzen' : 'Reset your password';
        const title = lang === 'de' ? 'Passwort zurücksetzen' : 'Password Reset';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast angefordert, dein Passwort zurückzusetzen.</p><a href="${resetUrl}" class="btn" style="color:#ffffff;">Passwort zurücksetzen</a><p>Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>`
            : `<p>Hello,</p><p>You requested to reset your password.</p><a href="${resetUrl}" class="btn" style="color:#ffffff;">Reset Password</a><p>If this wasn’t you, you can ignore this email.</p>`;
        return { subject, html: wrapEmail(title, content) };
    },
    welcomeCreator: (profileUrl, lang = 'en') => {
        const subject = lang === 'de' ? 'Willkommen bei Influverse!' : 'Welcome to Influverse!';
        const title = lang === 'de' ? 'Willkommen bei Influverse' : 'Welcome to Influverse';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Vervollständige dein Profil, um Angebote von Brands zu erhalten.</p><a href="${profileUrl}" class="btn" style="color:#ffffff;">Profil vervollständigen</a>`
            : `<p>Hello,</p><p>Complete your profile to start receiving offers from brands.</p><a href="${profileUrl}" class="btn" style="color:#ffffff;">Complete Profile</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    welcomeBrand: (creatorsUrl, lang = 'en') => {
        const subject = lang === 'de' ? 'Willkommen bei Influverse!' : 'Welcome to Influverse!';
        const title = lang === 'de' ? 'Willkommen bei Influverse' : 'Welcome to Influverse';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Willkommen bei Influverse.</p><p>Erstelle dein erstes Angebot, um mit Creators zusammenzuarbeiten.</p><a href="${creatorsUrl}" class="btn" style="color:#ffffff;">Creators entdecken</a>`
            : `<p>Hello,</p><p>Welcome to Influverse.</p><p>Create your first offer to start working with creators.</p><a href="${creatorsUrl}" class="btn" style="color:#ffffff;">Search Creators</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    offerReceived: (brandName, price, offerLink = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Neues Angebot von ${brandName}` : `New offer from ${brandName}`;
        const title = lang === 'de' ? 'Neues Angebot' : 'New Offer';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast ein neues Angebot von ${brandName} erhalten.</p><p>Angebotswert: ${price}</p><p>Sieh dir die Details an, um zu starten.</p><a href="${offerLink}" class="btn" style="color:#ffffff;">Angebot ansehen</a>`
            : `<p>Hello,</p><p>You received a new offer from ${brandName}.</p><p>Offer value: ${price}</p><p>Review the details to get started.</p><a href="${offerLink}" class="btn" style="color:#ffffff;">View Offer</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    offerStatusUpdate: (name, status, link = '#', lang = 'en') => {
        const isAccepted = status === 'accepted';
        let subject, title, content;
        if (isAccepted) {
            subject = lang === 'de' ? `Dein Angebot wurde angenommen` : `Your offer was accepted`;
            title = lang === 'de' ? 'Angebot angenommen' : 'Offer accepted';
            content = lang === 'de'
                ? `<p>Hallo,</p><p>Dein Angebot an ${name} wurde angenommen.</p><p>Die Bestellung wurde erstellt.</p><a href="${link}" class="btn" style="color:#ffffff;">Bestellung ansehen</a>`
                : `<p>Hello,</p><p>Your offer to ${name} was accepted.</p><p>The order has been created.</p><a href="${link}" class="btn" style="color:#ffffff;">View Order</a>`;
        }
        else {
            subject = lang === 'de' ? `Dein Angebot wurde abgelehnt` : `Your offer was declined`;
            title = lang === 'de' ? 'Angebot abgelehnt' : 'Offer declined';
            content = lang === 'de'
                ? `<p>Hallo,</p><p>Dein Angebot an ${name} wurde abgelehnt.</p><p>Du kannst jederzeit ein neues Angebot erstellen.</p><a href="${link}" class="btn" style="color:#ffffff;">Zum Dashboard</a>`
                : `<p>Hello,</p><p>Your offer to ${name} was declined.</p><p>You can create a new offer anytime.</p><a href="${link}" class="btn" style="color:#ffffff;">Go to Dashboard</a>`;
        }
        return { subject, html: wrapEmail(title, content) };
    },
    orderCreated: (orderId, role, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Bestellung #${orderId} erstellt` : `Order #${orderId} created`;
        const title = lang === 'de' ? 'Neue Bestellung' : 'New Order';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Deine Bestellung ist jetzt aktiv.</p><p>Bestellnummer: #${orderId}</p><a href="${link}" class="btn" style="color:#ffffff;">Bestellung ansehen</a>`
            : `<p>Hello,</p><p>Your order is now active.</p><p>Order ID: #${orderId}</p><a href="${link}" class="btn" style="color:#ffffff;">View Order</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    contentDelivered: (orderId, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Inhalt eingereicht — Bestellung #${orderId}` : `Content submitted — Order #${orderId}`;
        const title = lang === 'de' ? 'Inhalt geliefert' : 'Content delivered';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Der Inhalt für Bestellung #${orderId} wurde eingereicht.</p><p>Bitte prüfe ihn und bestätige oder fordere Änderungen an.</p><a href="${link}" class="btn" style="color:#ffffff;">Inhalt prüfen</a>`
            : `<p>Hello,</p><p>The content for Order #${orderId} was submitted.</p><p>Please review and approve or request changes.</p><a href="${link}" class="btn" style="color:#ffffff;">Review Content</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    orderApproved: (orderId, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Zahlung freigegeben — Bestellung #${orderId}` : `Payment released — Order #${orderId}`;
        const title = lang === 'de' ? 'Zahlung freigegeben' : 'Payment released';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Bestellung #${orderId} wurde bestätigt.</p><p>Deine Zahlung wird verarbeitet und ist in Kürze verfügbar.</p><a href="${link}" class="btn" style="color:#ffffff;">Zum Dashboard</a>`
            : `<p>Hello,</p><p>Order #${orderId} has been approved.</p><p>Your payment is being processed and will be available shortly.</p><a href="${link}" class="btn" style="color:#ffffff;">Go to Dashboard</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    revisionRequested: (orderId, reason, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Überarbeitung angefordert — Bestellung #${orderId}` : `Revision requested — Order #${orderId}`;
        const title = lang === 'de' ? 'Überarbeitung angefordert' : 'Revision requested';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Eine Überarbeitung für die Bestellung #${orderId} wurde angefordert.</p><p>Feedback: "${reason}"</p><p>Bitte prüfe das Feedback und aktualisiert deinen Inhalt.</p><a href="${link}" class="btn" style="color:#ffffff;">Feedback ansehen</a>`
            : `<p>Hello,</p><p>A revision was requested for Order #${orderId}.</p><p>Feedback: "${reason}"</p><p>Please review the feedback and update your content.</p><a href="${link}" class="btn" style="color:#ffffff;">View Feedback</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    newMessage: (name, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Neue Nachricht von ${name}` : `New message from ${name}`;
        const title = lang === 'de' ? 'Neue Nachricht' : 'New message';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast eine neue Nachricht von ${name} erhalten.</p><p>Öffne die Unterhaltung, um zu antworten.</p><a href="${link}" class="btn" style="color:#ffffff;">Chat öffnen</a>`
            : `<p>Hello,</p><p>You have a new message from ${name}.</p><p>Open the conversation to continue.</p><a href="${link}" class="btn" style="color:#ffffff;">Open Chat</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    paymentConfirmation: (orderId, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Zahlung erfolgreich — Bestellung #${orderId}` : `Payment successful — Order #${orderId}`;
        const title = lang === 'de' ? 'Zahlung bestätigt' : 'Payment confirmation';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Deine Zahlung für Bestellung #${orderId} war erfolgreich.</p><p>Das Projekt ist jetzt aktiv.</p><a href="${link}" class="btn" style="color:#ffffff;">Bestellung ansehen</a>`
            : `<p>Hello,</p><p>Your payment for Order #${orderId} was successful.</p><p>The project is now in progress.</p><a href="${link}" class="btn" style="color:#ffffff;">View Order</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    orderCancelled: (orderId, reason = 'No reason provided', link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Bestellung #${orderId} storniert` : `Order #${orderId} Cancelled`;
        const title = lang === 'de' ? 'Bestellung storniert' : 'Order Cancelled';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Bestellung #${orderId} wurde storniert.</p><p>Grund: ${reason}</p><p>Kontaktiere den Support bei Fragen.</p><a href="${link}" class="btn" style="color:#ffffff;">Zum Dashboard</a>`
            : `<p>Hello,</p><p>Order #${orderId} has been cancelled.</p><p>Reason: ${reason}</p><p>Contact support if you have questions.</p><a href="${link}" class="btn" style="color:#ffffff;">Go to Dashboard</a>`;
        return { subject, html: wrapEmail(title, content) };
    },
    offerModified: (brandName, newPrice, link = '#', lang = 'en') => {
        const subject = lang === 'de' ? `Angebot aktualisiert von ${brandName}` : `Offer modified by ${brandName}`;
        const title = lang === 'de' ? 'Angebot aktualisiert' : 'Offer Modified';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>${brandName} hat das Angebot aktualisiert.</p><p>Neuer Preis: ${newPrice}</p><a href="${link}" class="btn" style="color:#ffffff;">Angebot ansehen</a>`
            : `<p>Hello,</p><p>${brandName} has modified the offer.</p><p>New Price: ${newPrice}</p><a href="${link}" class="btn" style="color:#ffffff;">Review Offer</a>`;
        return { subject, html: wrapEmail(title, content) };
    }
};
