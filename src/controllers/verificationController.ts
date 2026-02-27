import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import { sendEmail, emailTemplates } from '../utils/emailService';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

// @desc    Verify user email
// @route   GET /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ message: "Invalid verification link" });
        }

        const user = await User.findOne({
            verificationToken: token as string,
            verificationTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: "Verification token is invalid or has expired" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.json({ message: "Email Verified Successfully! You can now login." });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "User is already verified" });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();

        // Send email
        const verificationLink = `${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        await sendEmail(
            user.email,
            'Verify Your Email Address',
            emailTemplates.verificationEmail(verificationLink)
        );

        res.json({ message: "Verification email sent successfully" });
    } catch (error: any) {
        console.error("Error resending verification:", error);
        res.status(500).json({ message: "Server error sending verification email" });
    }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    try {
        // Find user with matching OTP that hasn't expired
        const user = await User.findOne({
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
        await user.save();

        // Generate Token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                username: user.username,
                email: user.email,
                status: user.status,
                isVerified: true
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: token,
            message: "Email verified successfully"
        });

    } catch (error: any) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ message: error.message });
    }
};
