import dotenv from 'dotenv';
dotenv.config();

export const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://influverse-frontend.vercel.app",
    "https://influverse.ch",
    "https://www.influverse.ch",
    "https://influverse.de",
    "https://www.influverse.de",
    "https://influverse.at",
    "https://www.influverse.at"
];
