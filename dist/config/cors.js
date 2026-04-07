"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.allowedOrigins = [
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
