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
exports.verifyOTP = exports.resendVerification = exports.verifyEmail = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// @desc    Verify user email
// @route   GET /api/auth/verify-email
// @access  Public
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ message: "Invalid verification link" });
        }
        const user = yield User_1.default.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: "Verification token is invalid or has expired" });
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        yield user.save();
        res.json({ message: "Email Verified Successfully! You can now login." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.verifyEmail = verifyEmail;
// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.user._id || req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: "User is already verified" });
        }
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        yield user.save();
        // Send email
        const verificationLink = `${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        const template = emailService_1.emailTemplates.verificationEmail(verificationLink, user.preferredLanguage || 'de');
        yield (0, emailService_1.sendEmail)(user.email, template.subject, template.html);
        res.json({ message: "Verification email sent successfully" });
    }
    catch (error) {
        console.error("Error resending verification:", error);
        res.status(500).json({ message: "Server error sending verification email" });
    }
});
exports.resendVerification = resendVerification;
// @desc    Verify Email OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    try {
        // Find user with matching OTP that hasn't expired
        const user = yield User_1.default.findOne({
            email,
            otp,
            otpExpires: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        // Verify user and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        yield user.save();
        // Generate Token
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            role: user.role,
            username: user.username,
            email: user.email,
            status: user.status,
            isVerified: true
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: token,
            message: "Email verified successfully"
        });
    }
    catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ message: error.message });
    }
});
exports.verifyOTP = verifyOTP;
