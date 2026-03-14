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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env from the root of api-service
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const emailService_1 = require("../utils/emailService");
function runTicket() {
    return __awaiter(this, void 0, void 0, function* () {
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
                yield (0, emailService_1.sendEmail)(email, 'Influverse Email Test', `
                <html>
                    <body style="font-family: sans-serif; padding: 20px;">
                        <h1 style="color: #7c3aed;">Email System Operational 🚀</h1>
                        <p>This is a test email sent from your local Influverse development environment.</p>
                        <p>Time: ${new Date().toLocaleString()}</p>
                        <p>Status: <strong>Configured Successfully</strong></p>
                    </body>
                </html>
                `);
            }
            console.log("-----------------------------------------");
            console.log("Test emails sent!");
        }
        catch (error) {
            console.error("Failed to send:", error);
        }
    });
}
runTicket();
