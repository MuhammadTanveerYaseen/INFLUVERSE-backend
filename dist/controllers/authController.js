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
exports.authUser = exports.deleteAccount = exports.generateToken = exports.changePassword = exports.resetPassword = exports.forgotPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const emailService_1 = require("../utils/emailService");
const BrandProfile_1 = __importDefault(require("../models/BrandProfile"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
// Auth Controller
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[ForgotPassword] Request for: ${normalizedEmail}`);
    try {
        const user = yield User_1.default.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
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
            console.log(`[ForgotPassword] Attempting to send email to: ${user.email}`);
            (0, emailService_1.sendEmail)(user.email, 'Password Reset Request', emailService_1.emailTemplates.passwordReset(resetUrl)).catch(err => console.error(`[ForgotPassword] Failed to send email asynchronously: ${err.message}`));
            res.status(200).json({ message: 'Email sent' });
        }
        catch (error) {
            console.error(`[ForgotPassword] Failed to send email: ${error.message}`);
            yield User_1.default.findByIdAndUpdate(user._id || user.id, { resetPasswordToken: null, resetPasswordExpire: null });
            return res.status(500).json({
                message: 'Email could not be sent',
                error: error.message
            });
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
// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    console.log(`[ChangePassword] Request for user: ${userId}`);
    try {
        const user = yield User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }
        user.password = newPassword;
        yield user.save();
        res.status(200).json({ message: 'Password changed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.changePassword = changePassword;
const generateToken = (id, role, username, email, status, isVerified, name, rejectionReason, profileImage) => {
    return jsonwebtoken_1.default.sign({ id, role, username, email, status, isVerified, name, rejectionReason, profileImage }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
exports.generateToken = generateToken;
// @desc    Delete Account
// @route   DELETE /api/auth/delete-account
// @access  Private
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user._id;
    const role = req.user.role;
    try {
        yield User_1.default.findByIdAndDelete(userId);
        if (role === 'brand') {
            yield BrandProfile_1.default.findOneAndDelete({ user: userId });
        }
        else if (role === 'creator') {
            yield CreatorProfile_1.default.findOneAndDelete({ user: userId });
        }
        res.status(200).json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAccount = deleteAccount;
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = yield User_1.default.findOne({ email: normalizedEmail });
    if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
        let profileImage = '';
        if (user.role === 'creator') {
            const profile = yield CreatorProfile_1.default.findOne({ user: user._id });
            profileImage = (profile === null || profile === void 0 ? void 0 : profile.profileImage) || '';
        }
        else if (user.role === 'brand') {
            const profile = yield BrandProfile_1.default.findOne({ user: user._id });
            profileImage = (profile === null || profile === void 0 ? void 0 : profile.logo) || '';
        }
        res.json({
            _id: user._id || user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            rejectionReason: user.rejectionReason,
            profileImage,
            token: (0, exports.generateToken)((user.id || user._id).toString(), user.role, user.username, user.email, user.status, user.isVerified, user.name, user.rejectionReason || undefined, profileImage),
        });
    }
    else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});
exports.authUser = authUser;
