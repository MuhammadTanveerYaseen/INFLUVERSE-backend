import { Request, Response } from 'express';
import User from '../models/User';
import CreatorProfile from '../models/CreatorProfile';
import Order from '../models/Order';
import Offer from '../models/Offer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates, notifyAdmins } from '../utils/emailService';
import mongoose from 'mongoose';
import redisClient from '../config/redis';

import { generateToken } from './authController';

// @desc    Register a new Creator
// @route   POST /api/creators/register
// @access  Public
export const registerCreator = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const adminPanelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin/users`;

    // Check if user with this email already exists
    const existingByEmail = await User.findOne({ email: normalizedEmail });

    if (existingByEmail) {
        // If the user is already verified → genuine "already exists" error
        if (existingByEmail.isVerified) {
            return res.status(400).json({ message: 'An account with this email already exists. Please login.' });
        }

        // User exists but never verified OTP → refresh OTP so they can try again
        existingByEmail.otp = otp;
        existingByEmail.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        existingByEmail.password = password; // update password in case they changed it
        existingByEmail.verificationToken = crypto.randomBytes(20).toString('hex');
        existingByEmail.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await existingByEmail.save();

        await sendEmail(
            existingByEmail.email,
            'Verify your Influverse Account',
            emailTemplates.otpVerification(otp)
        );

        return res.status(200).json({
            _id: existingByEmail.id,
            username: existingByEmail.username,
            email: existingByEmail.email,
            role: existingByEmail.role,
            isVerified: existingByEmail.isVerified,
            requiresVerification: true,
            message: "A new verification code has been sent to your email"
        });
    }

    // Check if username is already taken by a verified user
    const existingByUsername = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingByUsername && existingByUsername.isVerified) {
        return res.status(400).json({ message: 'This username is already taken. Please choose another.' });
    }

    // If username is taken by an unverified user, delete that stale record first
    if (existingByUsername && !existingByUsername.isVerified) {
        await CreatorProfile.findOneAndDelete({ user: existingByUsername._id });
        await User.findByIdAndDelete(existingByUsername._id);
    }

    const user = await User.create({
        name: username,
        username,
        email: normalizedEmail,
        password,
        role: 'creator',
        status: 'pending',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        verificationToken: crypto.randomBytes(20).toString('hex'),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isVerified: false,
    });

    if (user) {
        await CreatorProfile.create({
            user: user._id,
            stats: { completedOrders: 0, engagementRate: 0, followerCount: 0, rating: 0, reviewCount: 0 },
            verified: false,
        });

        // Send OTP to user (fire-and-forget)
        sendEmail(
            user.email,
            'Verify your Influverse Account',
            emailTemplates.otpVerification(otp)
        ).catch(err => console.error('[CreatorReg] OTP email failed:', err));

        // Notify all admins (fire-and-forget)
        notifyAdmins(
            emailTemplates.adminNewUserSignup(user.username, user.email, 'creator', adminPanelUrl)
        ).catch(err => console.error('[CreatorReg] Admin notify failed:', err));

        res.status(200).json({
            _id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            requiresVerification: true,
            message: "Verification code sent to email"
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
};

// @desc    Get Creator Profile
// @route   GET /api/creators/profile
// @access  Private (Creator)
export const getCreatorProfile = async (req: Request | any, res: Response) => {
    const user = await User.findById(req.user._id || req.user.id);

    if (user && user.role === 'creator') {
        const profile = await CreatorProfile.findOne({ user: user.id });
        res.json({
            _id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            profileImage: profile?.profileImage || '',
            profileData: profile
        });
    } else {
        res.status(404);
        throw new Error('Creator not found');
    }
};

// @desc    Update Creator Profile
// @route   PUT /api/creators/profile
// @access  Private (Creator)
export const updateCreatorProfile = async (req: Request | any, res: Response) => {
    const user = await User.findById(req.user._id || req.user.id);

    if (user && user.role === 'creator') {
        if (req.body.username) user.username = req.body.username;
        if (req.body.email) user.email = req.body.email;
        if (req.body.name) user.name = req.body.name;
        if (req.body.password) {
            user.password = req.body.password;
        }

        if (req.body.submitForReview && (user.status === 'rejected' || user.status === 'active' || !user.status || user.status === 'pending')) {
            user.status = 'pending';
            user.rejectionReason = undefined;
        }

        const updatedUser = await user.save();

        const profilePayload = req.body.profileData || {};

        // Sanitize root fields
        const sanitizedData = { ...profilePayload };
        const forbiddenRootFields = ['_id', 'id', 'user', '__v', 'v', 'createdAt', 'updatedAt'];
        forbiddenRootFields.forEach(f => delete sanitizedData[f]);

        const updatedProfile = await CreatorProfile.findOneAndUpdate(
            { user: user.id },
            { $set: sanitizedData },
            { new: true, runValidators: true }
        );

        res.json({
            _id: updatedUser.id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            status: updatedUser.status, // Return current status
            profileImage: updatedProfile?.profileImage || '',
            token: generateToken(updatedUser.id, updatedUser.role, updatedUser.username, updatedUser.email, updatedUser.status, updatedUser.isVerified, updatedUser.name, updatedUser.rejectionReason, updatedProfile?.profileImage),
            profileData: updatedProfile
        });
    } else {
        res.status(404);
        throw new Error('Creator not found');
    }
};

// @desc    Get All Creators (Discovery)
// @route   GET /api/creators
// @access  Public
export const getCreators = async (req: Request, res: Response) => {
    try {
        const { category, country, featured } = req.query;
        
        const CACHE_KEY = `creators_${category || 'all'}_${country || 'all'}_${featured || 'false'}`;
        
        if (redisClient.isReady) {
            const cachedData = await redisClient.get(CACHE_KEY);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        let query: any = {};

        if (category && category !== 'all') {
            query.categories = { $in: [category] };
        }
        if (country) {
            query.country = new RegExp(country as string, 'i');
        }
        if (featured === 'true') {
            query.isFeatured = true;
        }

        const creatorsList = await CreatorProfile.find(query).populate('user', 'username email status isVerified');

        // Filter out orphans and unapproved creators
        const validCreators = creatorsList.filter(c => 
            c.user && (c.user as any).status === 'active'
        );

        if (redisClient.isReady) {
            await redisClient.setEx(CACHE_KEY, 300, JSON.stringify(validCreators));
        }

        res.json(validCreators);
    } catch (error: any) {
        console.error("Error in getCreators:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Creator by ID or Username (Public Profile)
// @route   GET /api/creators/:id
// @access  Public
export const getCreatorById = async (req: Request, res: Response) => {
    try {
        const idOrUsername = req.params.id as string;
        let profile = null;

        const isObjectId = mongoose.Types.ObjectId.isValid(idOrUsername);

        if (isObjectId) {
            profile = await CreatorProfile.findOne({ user: idOrUsername }).populate('user', 'username email status isVerified');
        } else {
            const user = await User.findOne({ username: new RegExp(`^${idOrUsername}$`, 'i') });

            if (user) {
                profile = await CreatorProfile.findOne({ user: user._id }).populate('user', 'username email status isVerified');
            }
        }

        if (profile && (profile.user as any).status === 'active') {
            res.json(profile);
        } else {
            res.status(404).json({ message: 'Creator profile not found or pending approval' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Creator Dashboard Stats
// @route   GET /api/creators/dashboard
// @access  Private (Creator)
export const getCreatorDashboardStats = async (req: Request | any, res: Response) => {
    try {
        const creatorId = req.user._id || req.user.id;
        const objectId = new mongoose.Types.ObjectId(creatorId);

        // 1. Basic Stats
        const [activeOrdersCount, pendingOffersCount, totalEarningsResult] = await Promise.all([
            Order.countDocuments({
                creator: creatorId,
                status: { $in: ['active', 'revision', 'delivered', 'disputed'] }
            }),
            Offer.countDocuments({
                creator: creatorId,
                status: 'pending'
            }),
            Order.aggregate([
                { $match: { creator: objectId, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$price' } } }
            ])
        ]);

        const totalEarnings = totalEarningsResult[0]?.total || 0;

        // 2. Earnings Trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const earningsTrend = await Order.aggregate([
            {
                $match: {
                    creator: objectId,
                    status: 'approved',
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    amount: { $sum: "$price" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Status Breakdown
        const statusBreakdown = await Order.aggregate([
            { $match: { creator: objectId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // 4. Upcoming Deadlines (Next 7 days)
        const now = new Date();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const upcomingDeadlines = await Order.find({
            creator: creatorId,
            status: { $in: ['active', 'revision'] },
            deadline: { $gte: now, $lte: nextWeek }
        })
            .select('deadline status brand')
            .populate('brand', 'username')
            .sort({ deadline: 1 })
            .limit(3);

        // 5. Recent Requests (Pending Offers)
        const recentRequests = await Offer.find({ creator: creatorId, status: 'pending' })
            .populate('brand', 'username email')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                activeOrders: activeOrdersCount,
                pendingOffers: pendingOffersCount,
                totalEarnings,
                profileViews: 124 // Mocking for now
            },
            charts: {
                earningsTrend,
                statusBreakdown
            },
            upcomingDeadlines,
            recentRequests
        });
    } catch (error: any) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

// @desc    Refresh Social Media Stats
// @route   POST /api/creators/social-stats
// @access  Private (Creator)
export const refreshSocialStats = async (req: Request | any, res: Response) => {
    try {
        const { platform, handle } = req.body;

        const { getInstagramFollowers, getTikTokFollowers, getYouTubeSubscribers, formatFollowerCount } = await import('../utils/socialMedia');

        let result: any = null;

        // Try API Fetch
        switch (platform.toLowerCase()) {
            case 'instagram':
                result = await getInstagramFollowers(handle);
                break;
            case 'tiktok':
                result = await getTikTokFollowers(handle);
                break;
            case 'youtube':
                result = await getYouTubeSubscribers(handle);
                break;
            default:
                break;
        }

        if (result && result.followers) {
            const formattedCount = formatFollowerCount(result.followers);
            res.json({ success: true, count: formattedCount, raw: result.followers, details: result, source: 'api' });
        } else {
            res.json({ success: false, message: 'Automatic sync unavailable. Please enter manually.', source: 'manual_fallback' });
        }

    } catch (error: any) {
        res.status(500).json({ success: false, message: "Sync service unavailable" });
    }
};
