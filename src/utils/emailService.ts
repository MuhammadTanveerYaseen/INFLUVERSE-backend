import nodemailer from 'nodemailer';

// Create helper for consistent email styling
const wrapEmail = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  .wrapper { background-color: #f8fafc; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
  .header { background-color: #ffffff; padding: 40px 30px; text-align: center; border-bottom: 1px solid #f1f5f9; }
  .header img { height: 32px; margin-bottom: 20px; }
  .header h1 { margin: 0; color: #0271e0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
  .content { padding: 40px 30px; color: #334155; line-height: 1.7; font-size: 16px; }
  .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #f1f5f9; }
  .btn { display: inline-block; background-color: #0271e0; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 99px; font-weight: 700; margin-top: 24px; letter-spacing: 0.025em; transition: all 0.3s ease; }
  .info-box { background-color: #f0f7ff; padding: 20px; border-left: 5px solid #0271e0; margin: 24px 0; border-radius: 8px; color: #1e3a8a; }
  .otp-code { font-size: 42px; font-weight: 900; color: #0271e0; letter-spacing: 10px; margin: 20px 0; font-family: 'Courier New', Courier, monospace; }
  p { margin-bottom: 16px; }
  strong { color: #0f172a; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <!-- Using high-quality logo mark -->
        <img src="https://api.influverse.tech/public/logo-mark.png" alt="Influverse" style="display: block; margin: 0 auto 15px; width: 48px; height: 48px;">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p style="font-weight: 700; color: #0271e0; margin-bottom: 4px;">INFLUVERSE</p>
        <p>&copy; ${new Date().getFullYear()} Influverse. All rights reserved.</p>
        <p>This is an automated system email. Please do not reply directly.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const transporter = nodemailer.createTransport({
    service: 'gmail', // Standard for basic projects using Gmail/Firebase accounts
    auth: {
        user: process.env.EMAIL_USER, // e.g. 'influverse-system@gmail.com'
        pass: process.env.EMAIL_PASS, // App Password
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Influverse Team" <noreply@influverse.com>',
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
        console.error(`Error sending email: ${error}`);
    }
};

export const emailTemplates = {
    offerReceived: (brandName: string, price: number, offerLink: string = '#') => wrapEmail(
        'New Offer Received! 🎉',
        `
        <p>Hi there,</p>
        <p>Great news! You have received a new offer from <strong>${brandName}</strong>.</p>
        <div class="info-box">
            <p style="margin: 0; font-weight: bold;">Offer Value: $${price.toLocaleString()}</p>
        </div>
        <p>Review the details and respond to start the collaboration.</p>
        <center><a href="${offerLink}" class="btn" style="color: #ffffff;">View Offer</a></center>
        `
    ),

    offerStatusUpdate: (name: string, status: string, link: string = '#') => {
        const isAccepted = status === 'accepted';
        const color = isAccepted ? '#10b981' : '#ef4444';
        const title = isAccepted ? 'Offer Accepted! 🚀' : `Offer ${status.charAt(0).toUpperCase() + status.slice(1)}`;

        return wrapEmail(
            title,
            `
            <p>Hi,</p>
            <p>Your offer to <strong>${name}</strong> has been <strong style="color: ${color};">${status.toUpperCase()}</strong>.</p>
            ${isAccepted ? '<p>An order has been automatically created. You can now track progress.</p>' : '<p>Check your dashboard for more details or to submit a new offer.</p>'}
            <center><a href="${link}" class="btn" style="color: #ffffff;">Go to Dashboard</a></center>
            `
        );
    },

    orderCreated: (orderId: string, role: string, link: string = '#') => wrapEmail(
        'Order Created 📦',
        `
        <p>A new order has been initialized.</p>
        <div class="info-box">
             <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
        </div>
        <p>The project is now active. Please check your dashboard for timelines and deliverables.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">View Order</a></center>
        `
    ),

    contentDelivered: (orderId: string, link: string = '#') => wrapEmail(
        'Content Delivered 📬',
        `
        <p>The creator has submitted deliverables for <strong>Order #${orderId}</strong>.</p>
        <p>Please review the submitted files and approve or request revisions within the next 48 hours.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">Review Content</a></center>
        `
    ),

    orderApproved: (orderId: string, link: string = '#') => wrapEmail(
        'Order Approved! ✅',
        `
        <p>Congratulations! <strong>Order #${orderId}</strong> has been marked as completed and approved.</p>
        <p>Your payment is being processed and will be released to your wallet shortly.</p>
        <center><a href="${link}" class="btn" style="color: #ffffff;">View Details</a></center>
        `
    ),

    verificationEmail: (verificationLink: string) => wrapEmail(
        'Verify Your Email Address 📧',
        `
        <div class="content">
            <p>Welcome to Influverse! Only one step left to get started.</p>
            <p>Please click the button below to confirm your email:</p>
            <center><a href="${verificationLink}" class="btn" style="color: #ffffff;">Verify Email</a></center>
            <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
        `
    ),

    otpVerification: (otp: string) => wrapEmail(
        'Verify Your Account with OTP 🔒',
        `
        <div class="content" style="text-align: center;">
            <p>Welcome to Influverse! To complete your registration, please use the verification code below.</p>
            <div class="otp-code">${otp}</div>
            <p style="margin-top: 10px; font-size: 14px; color: #64748b;">This code will expire in 10 minutes.</p>
            <p>Enter this code on the verification screen to activate your account.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">If you didn't request this code, please ignore this email.</p>
        </div>
        `
    ),

    revisionRequested: (orderId: string, reason: string, link: string = '#') => wrapEmail(
        'Revision Requested ✏️',
        `
        <div class="content">
            <p>The brand has requested a revision for <strong>Order #${orderId}</strong>.</p>
            <div class="info-box">
                <p><strong>Note from Brand:</strong></p>
                <p><em>"${reason}"</em></p>
            </div>
            <p>Please review the feedback and submit updated deliverables as soon as possible.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">View Feedback</a></center>
        </div>
        `
    ),

    orderCancelled: (orderId: string, reason: string = 'No reason provided', link: string = '#') => wrapEmail(
        'Order Cancelled ❌',
        `
        <div class="content">
            <p><strong>Order #${orderId}</strong> has been cancelled.</p>
            <div class="info-box">
                <p><strong>Reason:</strong> ${reason}</p>
            </div>
            <p>If you believe this is an error or need assistance, please contact support.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">Contact Support</a></center>
        </div>
        `
    ),

    offerModified: (brandName: string, newPrice: number, link: string = '#') => wrapEmail(
        'Offer Modified 📝',
        `
        <div class="content">
            <p><strong>${brandName}</strong> has modified their offer.</p>
            <div class="info-box">
                 <p style="margin: 0; font-weight: bold;">New Offer Price: $${newPrice.toLocaleString()}</p>
            </div>
            <p>Please review the changes and accept or counter-offer.</p>
            <center><a href="${link}" class="btn" style="color: #ffffff;">Review Offer</a></center>
        </div>
        `
    ),

    passwordReset: (resetUrl: string) => wrapEmail(
        'Password Reset Request 🔒',
        `
        <div class="content">
            <p>You requested a password reset. Please click the button below to set a new password.</p>
            <center><a href="${resetUrl}" class="btn" style="color: #ffffff;">Reset Password</a></center>
            <p style="margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        `
    )
};
