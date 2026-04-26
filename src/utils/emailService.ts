import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

type Lang = 'en' | 'de';

const wrapEmail = (title: string, content: string, ctaLabel?: string, ctaHref?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEEEF6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEEEF6;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="background-color:#ffffff;border-radius:20px 20px 0 0;padding:32px 40px 20px;border-bottom:1px solid #EBEBF0;">
              <a href="${process.env.FRONTEND_URL || 'https://influverse.ch'}" style="text-decoration:none;">
                <!-- Using Vercel URL for better reliability in various email clients -->
                <img src="https://influverse-frontend.vercel.app/horizontal-logo.svg" 
                     alt="INFLUVERSE" 
                     height="32" 
                     width="150"
                     style="display:block;height:32px;width:150px;border:0;outline:none;font-family:Arial,sans-serif;font-size:24px;font-weight:900;color:#0271e0;letter-spacing:-1px;image-rendering:-webkit-optimize-contrast;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:0 0 20px 20px;padding:40px 48px 48px;">

              <!-- Title -->
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#1a1a2e;text-align:center;letter-spacing:-0.3px;">${title}</h1>

              <!-- Content Block -->
              <div style="color:#5a5a7a;font-size:15px;line-height:1.7;text-align:center;">
                ${content}
              </div>

              ${ctaLabel && ctaHref ? `
              <!-- CTA Button -->
              <div style="text-align:center;margin-top:32px;">
                <a href="${ctaHref}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:50px;letter-spacing:0.2px;">${ctaLabel}</a>
              </div>` : ''}

              <!-- Footer -->
              <div style="margin-top:40px;padding-top:24px;border-top:1px solid #EBEBF0;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;color:#9090aa;">&copy; 2026 Influverse. All rights reserved.</p>
                <p style="margin:0;font-size:12px;color:#b0b0c8;">This is an automated system email. Please do not reply directly.</p>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false // Helps with some shared hosting providers
    }
});

import * as fs from 'fs';

export const sendEmail = async (
    to: string, 
    subjectOrTemplate: string | { subject: string, html: string }, 
    htmlStr?: string | { subject: string, html: string }
) => {
    try {
        const isObj3 = typeof htmlStr === 'object' && htmlStr !== null;
        const isObj2 = typeof subjectOrTemplate === 'object' && subjectOrTemplate !== null;

        const subject = isObj2 ? (subjectOrTemplate as any).subject : (isObj3 ? (htmlStr as any).subject : subjectOrTemplate);
        const html = isObj3 ? (htmlStr as any).html : (isObj2 ? (subjectOrTemplate as any).html : htmlStr);

        fs.appendFileSync('email_trace.log', `\n[${new Date().toISOString()}] Attempting to send to: ${to} | Subject: ${subject}`);

        const mailOptions = {
            from: `"Influverse" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };
        const info = await transporter.sendMail(mailOptions);
        
        fs.appendFileSync('email_trace.log', `\n[${new Date().toISOString()}] SUCCESS! Message ID: ${info.messageId} | Target: ${to}`);
        console.log(`[EmailService] Success! Message ID: ${info.messageId}`);
    } catch (error: any) {
        fs.appendFileSync('email_trace.log', `\n[${new Date().toISOString()}] CRITICAL ERROR sending to ${to}: ${error.message} \n ${error.stack}`);
        console.error(`[EmailService] CRITICAL Error sending email: ${error}`);
        throw error;
    }
};

export const notifyAdmins = async (template: { subject: string, html: string }) => {
    try {
        console.log('[EmailService] Notifying admins...');
        
        // Use mongoose.model to avoid direct circular dependency with User model
        const User = mongoose.model('User');
        const admins = await User.find({ role: 'admin' }).select('email');
        
        const adminEmails = admins.map(admin => admin.email);
        
        // Also include ADMIN_EMAIL from env if set and not already in the list
        const envAdmin = process.env.ADMIN_EMAIL;
        if (envAdmin && !adminEmails.includes(envAdmin)) {
            adminEmails.push(envAdmin);
        }

        if (adminEmails.length === 0) {
            console.warn('[EmailService] No admin emails found (DB or ENV). Notification skipped.');
            return;
        }

        console.log(`[EmailService] Sending notification to ${adminEmails.length} admin(s): ${adminEmails.join(', ')}`);
        
        await Promise.all(adminEmails.map(email => 
            sendEmail(email, template).catch(err => 
                console.error(`[EmailService] Failed to notify admin ${email}:`, err)
            )
        ));
    } catch (error) {
        console.error('[EmailService] CRITICAL: notifyAdmins failed:', error);
        
        // Fallback to environment admin if MongoDB query failed
        const envAdmin = process.env.ADMIN_EMAIL;
        if (envAdmin) {
            console.log(`[EmailService] Attempting fallback notification to ${envAdmin}`);
            await sendEmail(envAdmin, template).catch(err => 
                console.error(`[EmailService] Fallback notification failed:`, err)
            );
        }
    }
};

export const emailTemplates = {
    otpVerification: (otp: string, lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Verifiziere dein Influverse Konto' : 'Verify your Influverse account';
        const title = lang === 'de' ? 'Konto verifizieren' : 'Verify your account';
        const content = lang === 'de'
            ? `<p style="margin:0 0 8px;">Gib den untenstehenden Code ein, um fortzufahren.</p>
               <p style="font-size:44px;font-weight:700;letter-spacing:12px;color:#1a1a2e;margin:28px 0 20px;">${otp}</p>
               <p style="margin:0;font-size:14px;color:#9090aa;">Dieser Code läuft in 10 Minuten ab.</p>`
            : `<p style="margin:0 0 8px;">Enter the code below to continue.</p>
               <p style="font-size:44px;font-weight:700;letter-spacing:12px;color:#1a1a2e;margin:28px 0 20px;">${otp}</p>
               <p style="margin:0;font-size:14px;color:#9090aa;">This code will expire in 10 minutes.</p>`;
        return { subject, html: wrapEmail(title, content) };
    },

    verificationEmail: (verificationLink: string, lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Verifiziere dein Influverse Konto' : 'Verify your Influverse account';
        const title = lang === 'de' ? 'Konto verifizieren' : 'Verify your account';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Klicke unten, um dein Konto zu verifizieren und loszulegen.</p>`
            : `<p>Hello,</p><p>Click below to verify your account and get started.</p>`;
        const cta = lang === 'de' ? 'Account verifizieren' : 'Verify Account';
        return { subject, html: wrapEmail(title, content, cta, verificationLink) };
    },

    passwordReset: (resetUrl: string, lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Passwort zurücksetzen' : 'Reset your password';
        const title = lang === 'de' ? 'Passwort zurücksetzen' : 'Reset your password';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button, um fortzufahren.</p><p style="font-size:13px;color:#9090aa;">Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>`
            : `<p>Hello,</p><p>You requested to reset your password. Click the button below to continue.</p><p style="font-size:13px;color:#9090aa;">If this wasn't you, you can safely ignore this email.</p>`;
        const cta = lang === 'de' ? 'Passwort zurücksetzen' : 'Reset Password';
        return { subject, html: wrapEmail(title, content, cta, resetUrl) };
    },

    welcomeCreator: (profileUrl: string, lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Willkommen bei Influverse!' : 'Welcome to Influverse!';
        const title = lang === 'de' ? 'Willkommen bei Influverse' : 'Welcome to Influverse';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Vervollständige dein Profil, um Angebote von Brands zu erhalten und deine Creator-Karriere zu starten.</p>`
            : `<p>Hello,</p><p>Complete your profile to start receiving offers from brands and grow your creator career.</p>`;
        const cta = lang === 'de' ? 'Profil vervollständigen' : 'Complete Your Profile';
        return { subject, html: wrapEmail(title, content, cta, profileUrl) };
    },

    welcomeBrand: (creatorsUrl: string, lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Willkommen bei Influverse für Brands!' : 'Welcome to Influverse for Brands!';
        const title = lang === 'de' ? 'Willkommen bei Influverse' : 'Welcome to Influverse';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Willkommen bei Influverse. Erstelle dein erstes Angebot, um mit Creators zusammenzuarbeiten und deine Kampagnen zu skalieren.</p>`
            : `<p>Hello,</p><p>Welcome to Influverse. Create your first offer to start working with creators and scale your campaigns.</p>`;
        const cta = lang === 'de' ? 'Creators entdecken' : 'Search Creators';
        return { subject, html: wrapEmail(title, content, cta, creatorsUrl) };
    },

    offerReceived: (brandName: string, price: number, offerLink: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Neues Angebot von ${brandName}` : `New offer from ${brandName}`;
        const title = lang === 'de' ? 'Neues Angebot erhalten' : 'New Offer Received';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast ein neues Angebot von <strong>${brandName}</strong> erhalten.</p><p style="font-size:22px;font-weight:700;color:#1a1a2e;">Angebotswert: €${price}</p><p>Sieh dir die Details an, um zu entscheiden.</p>`
            : `<p>Hello,</p><p>You received a new offer from <strong>${brandName}</strong>.</p><p style="font-size:22px;font-weight:700;color:#1a1a2e;">Offer value: €${price}</p><p>Review the details to accept or decline.</p>`;
        const cta = lang === 'de' ? 'Angebot ansehen' : 'View Offer';
        return { subject, html: wrapEmail(title, content, cta, offerLink) };
    },

    offerStatusUpdate: (name: string, status: string, link: string = '#', lang: Lang = 'en') => {
        const isAccepted = status === 'accepted';
        let subject, title, content, cta;
        if (isAccepted) {
            subject = lang === 'de' ? `Dein Angebot wurde angenommen` : `Your offer was accepted`;
            title = lang === 'de' ? 'Angebot angenommen ✓' : 'Offer Accepted ✓';
            content = lang === 'de'
                ? `<p>Hallo,</p><p>Dein Angebot an <strong>${name}</strong> wurde angenommen. Die Bestellung wurde erstellt und ist jetzt aktiv.</p>`
                : `<p>Hello,</p><p>Your offer to <strong>${name}</strong> was accepted. The order has been created and is now active.</p>`;
            cta = lang === 'de' ? 'Bestellung ansehen' : 'View Order';
        } else {
            subject = lang === 'de' ? `Dein Angebot wurde abgelehnt` : `Your offer was declined`;
            title = lang === 'de' ? 'Angebot abgelehnt' : 'Offer Declined';
            content = lang === 'de'
                ? `<p>Hallo,</p><p>Dein Angebot an <strong>${name}</strong> wurde abgelehnt. Du kannst jederzeit ein neues Angebot erstellen.</p>`
                : `<p>Hello,</p><p>Your offer to <strong>${name}</strong> was declined. You can create a new offer anytime.</p>`;
            cta = lang === 'de' ? 'Zum Dashboard' : 'Go to Dashboard';
        }
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    orderCreated: (orderId: string, role: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Bestellung #${orderId} erstellt` : `Order #${orderId} created`;
        const title = lang === 'de' ? 'Neue Bestellung' : 'New Order Created';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Deine Bestellung ist jetzt aktiv.</p><p style="font-size:14px;background:#F5F5FA;display:inline-block;padding:8px 20px;border-radius:8px;color:#1a1a2e;font-weight:600;">Bestellung #${orderId}</p>`
            : `<p>Hello,</p><p>Your order is now active and in progress.</p><p style="font-size:14px;background:#F5F5FA;display:inline-block;padding:8px 20px;border-radius:8px;color:#1a1a2e;font-weight:600;">Order #${orderId}</p>`;
        const cta = lang === 'de' ? 'Bestellung ansehen' : 'View Order';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    contentDelivered: (orderId: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Inhalt eingereicht — Bestellung #${orderId}` : `Content submitted — Order #${orderId}`;
        const title = lang === 'de' ? 'Inhalt geliefert 📦' : 'Content Delivered 📦';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Der Inhalt für Bestellung <strong>#${orderId}</strong> wurde eingereicht. Bitte prüfe ihn und bestätige oder fordere Änderungen an.</p>`
            : `<p>Hello,</p><p>The content for Order <strong>#${orderId}</strong> has been submitted. Please review and approve or request changes.</p>`;
        const cta = lang === 'de' ? 'Inhalt prüfen' : 'Review Content';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    orderApproved: (orderId: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Zahlung freigegeben — Bestellung #${orderId}` : `Payment released — Order #${orderId}`;
        const title = lang === 'de' ? 'Zahlung freigegeben 🎉' : 'Payment Released 🎉';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Bestellung <strong>#${orderId}</strong> wurde bestätigt. Deine Zahlung wird verarbeitet und ist in Kürze verfügbar.</p>`
            : `<p>Hello,</p><p>Order <strong>#${orderId}</strong> has been approved. Your payment is being processed and will be available shortly.</p>`;
        const cta = lang === 'de' ? 'Zum Dashboard' : 'Go to Dashboard';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    revisionRequested: (orderId: string, reason: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Überarbeitung angefordert — Bestellung #${orderId}` : `Revision requested — Order #${orderId}`;
        const title = lang === 'de' ? 'Überarbeitung angefordert' : 'Revision Requested';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Eine Überarbeitung für die Bestellung <strong>#${orderId}</strong> wurde angefordert.</p><blockquote style="border-left:3px solid #2563eb;padding-left:16px;margin:16px 0;color:#5a5a7a;font-style:italic;">"${reason}"</blockquote><p>Bitte prüfe das Feedback und aktualisiere deinen Inhalt.</p>`
            : `<p>Hello,</p><p>A revision was requested for Order <strong>#${orderId}</strong>.</p><blockquote style="border-left:3px solid #2563eb;padding-left:16px;margin:16px 0;color:#5a5a7a;font-style:italic;">"${reason}"</blockquote><p>Please review the feedback and update your content.</p>`;
        const cta = lang === 'de' ? 'Feedback ansehen' : 'View Feedback';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    newMessage: (name: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Neue Nachricht von ${name}` : `New message from ${name}`;
        const title = lang === 'de' ? 'Neue Nachricht 💬' : 'New Message 💬';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Du hast eine neue Nachricht von <strong>${name}</strong> erhalten. Öffne die Unterhaltung, um zu antworten.</p>`
            : `<p>Hello,</p><p>You have a new message from <strong>${name}</strong>. Open the conversation to reply.</p>`;
        const cta = lang === 'de' ? 'Chat öffnen' : 'Open Chat';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    paymentRequired: (orderId: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? 'Aktion erforderlich: Schließe deine Influverse-Zahlung ab' : 'Action Required: Complete your Influverse Payment';
        const title = lang === 'de' ? 'Zahlung erforderlich 💳' : 'Payment Required 💳';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Der Creator hat dein Angebot angenommen! Um die Kampagne für Bestellung <strong>#${orderId}</strong> offiziell zu starten und den Zeitraum zu sichern, schließe bitte die Zahlung ab.</p>`
            : `<p>Hello,</p><p>The creator has accepted your offer! To officially start the campaign for Order <strong>#${orderId}</strong> and secure the timeframe, please complete the payment.</p>`;
        const cta = lang === 'de' ? 'Jetzt bezahlen' : 'Pay Now';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    paymentConfirmation: (orderId: string, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Zahlung erfolgreich — Bestellung #${orderId}` : `Payment successful — Order #${orderId}`;
        const title = lang === 'de' ? 'Zahlung bestätigt ✓' : 'Payment Confirmed ✓';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Deine Zahlung für Bestellung <strong>#${orderId}</strong> war erfolgreich. Das Projekt ist jetzt aktiv.</p>`
            : `<p>Hello,</p><p>Your payment for Order <strong>#${orderId}</strong> was successful. The project is now in progress.</p>`;
        const cta = lang === 'de' ? 'Bestellung ansehen' : 'View Order';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    orderCancelled: (orderId: string, reason: string = 'No reason provided', link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Bestellung #${orderId} storniert` : `Order #${orderId} Cancelled`;
        const title = lang === 'de' ? 'Bestellung storniert' : 'Order Cancelled';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p>Bestellung <strong>#${orderId}</strong> wurde storniert.</p><blockquote style="border-left:3px solid #ef4444;padding-left:16px;margin:16px 0;color:#5a5a7a;font-style:italic;">Grund: ${reason}</blockquote><p>Kontaktiere den Support bei Fragen.</p>`
            : `<p>Hello,</p><p>Order <strong>#${orderId}</strong> has been cancelled.</p><blockquote style="border-left:3px solid #ef4444;padding-left:16px;margin:16px 0;color:#5a5a7a;font-style:italic;">Reason: ${reason}</blockquote><p>Contact support if you have questions.</p>`;
        const cta = lang === 'de' ? 'Zum Dashboard' : 'Go to Dashboard';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    offerModified: (brandName: string, newPrice: number, link: string = '#', lang: Lang = 'en') => {
        const subject = lang === 'de' ? `Angebot aktualisiert von ${brandName}` : `Offer modified by ${brandName}`;
        const title = lang === 'de' ? 'Angebot aktualisiert' : 'Offer Updated';
        const content = lang === 'de'
            ? `<p>Hallo,</p><p><strong>${brandName}</strong> hat das Angebot aktualisiert.</p><p style="font-size:22px;font-weight:700;color:#1a1a2e;">Neuer Preis: €${newPrice}</p><p>Überprüfe das Angebot und reagiere entsprechend.</p>`
            : `<p>Hello,</p><p><strong>${brandName}</strong> has modified the offer.</p><p style="font-size:22px;font-weight:700;color:#1a1a2e;">New Price: €${newPrice}</p><p>Please review the updated offer and respond.</p>`;
        const cta = lang === 'de' ? 'Angebot ansehen' : 'Review Offer';
        return { subject, html: wrapEmail(title, content, cta, link) };
    },

    adminNewUserSignup: (username: string, email: string, role: 'creator' | 'brand', adminPanelUrl: string) => {
        const roleLabel = role === 'creator' ? 'Creator' : 'Brand';
        const subject = `[Admin] New ${roleLabel} joined Influverse — ${username}`;
        const title = `New ${roleLabel} Signed Up`;
        const content = `
            <p>A new <strong>${roleLabel}</strong> account has just been created on Influverse.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;text-align:left;">
                <tr style="background:#F5F5FA;">
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;border-radius:8px 0 0 0;">Username</td>
                    <td style="padding:10px 16px;color:#5a5a7a;border-radius:0 8px 0 0;">${username}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;">Email</td>
                    <td style="padding:10px 16px;color:#5a5a7a;">${email}</td>
                </tr>
                <tr style="background:#F5F5FA;">
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;border-radius:0 0 0 8px;">Role</td>
                    <td style="padding:10px 16px;color:#5a5a7a;border-radius:0 0 8px 0;">${roleLabel}</td>
                </tr>
            </table>
            <p style="font-size:13px;color:#9090aa;">This account is pending OTP verification. You can review it in the admin panel.</p>`;
        return { subject, html: wrapEmail(title, content, 'Open Admin Panel', adminPanelUrl) };
    },

    adminNewOffer: (senderUsername: string, targetUsername: string, price: number, adminPanelUrl: string) => {
        const subject = `[Admin] New Offer — ${senderUsername} → ${targetUsername} (€${price})`;
        const title = 'New Offer Created';
        const content = `
            <p>A new offer has been submitted on the platform.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;text-align:left;">
                <tr style="background:#F5F5FA;">
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;border-radius:8px 0 0 0;">From</td>
                    <td style="padding:10px 16px;color:#5a5a7a;border-radius:0 8px 0 0;">${senderUsername}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;">To</td>
                    <td style="padding:10px 16px;color:#5a5a7a;">${targetUsername}</td>
                </tr>
                <tr style="background:#F5F5FA;">
                    <td style="padding:10px 16px;font-weight:600;color:#1a1a2e;border-radius:0 0 0 8px;">Offer Value</td>
                    <td style="padding:10px 16px;font-weight:700;font-size:18px;color:#2563eb;border-radius:0 0 8px 0;">€${price}</td>
                </tr>
            </table>`;
        return { subject, html: wrapEmail(title, content, 'Open Admin Panel', adminPanelUrl) };
    }
};
