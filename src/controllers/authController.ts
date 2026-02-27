import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates } from '../utils/emailService';

// Auth Controller
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Security: Don't reveal if user exists
            return res.status(200).json({ message: 'Email sent' });
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
            await sendEmail(
                user.email,
                'Password Reset Request',
                emailTemplates.passwordReset(resetUrl)
            );

            res.status(200).json({ message: 'Email sent' });
        } catch (error) {
            console.error(error);
            await User.findByIdAndUpdate(user._id || user.id, { resetPasswordToken: null, resetPasswordExpire: null });
            return res.status(500).json({ message: 'Email could not be sent' });
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

const generateToken = (id: string, role: string, username: string, email: string, status: string, isVerified: boolean, rejectionReason?: string) => {
    return jwt.sign({ id, role, username, email, status, isVerified, rejectionReason }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
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
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};
