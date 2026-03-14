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
exports.authUser = exports.resetPassword = exports.forgotPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const emailService_1 = require("../utils/emailService");
// Auth Controller
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            // Security: Don't reveal if user exists
            return res.status(200).json({ message: 'Email sent' });
        }
        // Generate Token
        const resetToken = crypto_1.default.randomBytes(20).toString('hex');
        // Hash and set to resetPasswordToken field
        const resetPasswordToken = crypto_1.default
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        // Set expire (1 hour)
        const resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
        yield User_1.default.findByIdAndUpdate(user._id || user.id, { resetPasswordToken, resetPasswordExpire });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        try {
            yield (0, emailService_1.sendEmail)(user.email, 'Password Reset Request', emailService_1.emailTemplates.passwordReset(resetUrl));
            res.status(200).json({ message: 'Email sent' });
        }
        catch (error) {
            console.error(error);
            yield User_1.default.findByIdAndUpdate(user._id || user.id, { resetPasswordToken: null, resetPasswordExpire: null });
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.forgotPassword = forgotPassword;
// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get hashed token
        const resetPasswordToken = crypto_1.default
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');
        const user = yield User_1.default.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }
        user.password = req.body.password; // Mongoose pre-save hook will hash it
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        yield user.save();
        // Optionally login user immediately or return success
        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
            // token: generateToken(...) // If you want to auto-login
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resetPassword = resetPassword;
const generateToken = (id, role, username, email, status, isVerified, rejectionReason) => {
    return jsonwebtoken_1.default.sign({ id, role, username, email, status, isVerified, rejectionReason }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield User_1.default.findOne({ email });
    if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
        res.json({
            _id: user._id || user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            rejectionReason: user.rejectionReason,
            token: generateToken((user.id || user._id).toString(), user.role, user.username, user.email, user.status, user.isVerified, user.rejectionReason || undefined),
        });
    }
    else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});
exports.authUser = authUser;
