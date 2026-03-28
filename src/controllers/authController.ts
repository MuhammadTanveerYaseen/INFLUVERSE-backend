import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates } from '../utils/emailService';
import BrandProfile from '../models/BrandProfile';
import CreatorProfile from '../models/CreatorProfile';

// Auth Controller
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[ForgotPassword] Request for: ${normalizedEmail}`);

    try {
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set to resetPasswordToken field
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (1 hour)
        const resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);

        await User.findByIdAndUpdate(user._id || user.id, { resetPasswordToken, resetPasswordExpire });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        try {
            console.log(`[ForgotPassword] Attempting to send email to: ${user.email}`);
            await sendEmail(
                user.email,
                'Password Reset Request',
                emailTemplates.passwordReset(resetUrl)
            );

            res.status(200).json({ message: 'Email sent' });
        } catch (error: any) {
            console.error(`[ForgotPassword] Failed to send email: ${error.message}`);
            await User.findByIdAndUpdate(user._id || user.id, { resetPasswordToken: null, resetPasswordExpire: null });
            return res.status(500).json({ 
                message: 'Email could not be sent',
                error: error.message 
            });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken as string)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        user.password = req.body.password; // Mongoose pre-save hook will hash it
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Optionally login user immediately or return success
        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
            // token: generateToken(...) // If you want to auto-login
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user._id;
    console.log(`[ChangePassword] Request for user: ${userId}`);

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password as string);

        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const generateToken = (id: string, role: string, username: string, email: string, status: string, isVerified: boolean, name?: string, rejectionReason?: string, profileImage?: string) => {
    return jwt.sign({ id, role, username, email, status, isVerified, name, rejectionReason, profileImage }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};


// @desc    Delete Account
// @route   DELETE /api/auth/delete-account
// @access  Private
export const deleteAccount = async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const role = (req as any).user.role;
    try {
        await User.findByIdAndDelete(userId);
        if (role === 'brand') {
            await BrandProfile.findOneAndDelete({ user: userId });
        } else if (role === 'creator') {
            await CreatorProfile.findOneAndDelete({ user: userId });
        }
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
        let profileImage = '';
        if (user.role === 'creator') {
            const profile = await CreatorProfile.findOne({ user: user._id });
            profileImage = profile?.profileImage || '';
        } else if (user.role === 'brand') {
            const profile = await BrandProfile.findOne({ user: user._id });
            profileImage = profile?.logo || '';
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
            token: generateToken((user.id || user._id).toString(), user.role, user.username, user.email, user.status, user.isVerified, user.name, user.rejectionReason || undefined, profileImage),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};
