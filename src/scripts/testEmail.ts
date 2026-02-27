import dotenv from 'dotenv';
import path from 'path';

// Load env from the root of api-service
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { sendEmail } from '../utils/emailService';

async function runTicket() {
    console.log("-----------------------------------------");
    console.log("Testing Email configuration...");
    console.log(`From: ${process.env.EMAIL_USER}`);

    // Recipients
    const recipients = ['muhammadtanveer0135@gmail.com', 'lobo.stevan@gmail.com'];
    console.log(`To: ${recipients.join(', ')}`);

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-email')) {
        console.error("ERROR: .env file does not contain valid credentials yet.");
        console.error("Please update EMAIL_USER and EMAIL_PASS in api-service/.env");
        return;
    }

    try {
        for (const email of recipients) {
            console.log(`Sending to ${email}...`);
            await sendEmail(
                email,
                'Influverse Email Test',
                `
                <html>
                    <body style="font-family: sans-serif; padding: 20px;">
                        <h1 style="color: #7c3aed;">Email System Operational 🚀</h1>
                        <p>This is a test email sent from your local Influverse development environment.</p>
                        <p>Time: ${new Date().toLocaleString()}</p>
                        <p>Status: <strong>Configured Successfully</strong></p>
                    </body>
                </html>
                `
            );
        }
        console.log("-----------------------------------------");
        console.log("Test emails sent!");
    } catch (error) {
        console.error("Failed to send:", error);
    }
}

runTicket();
