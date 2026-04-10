import { Request, Response } from 'express';
import User from '../models/User';
import BrandProfile from '../models/BrandProfile';
import Order from '../models/Order';
import Offer from '../models/Offer';
import CreatorProfile from '../models/CreatorProfile';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates, notifyAdmins } from '../utils/emailService';
import mongoose from 'mongoose';

import { generateToken } from './authController';

// @desc    Register a new Brand
// @route   POST /api/brands/register
// @access  Public
export const registerBrand = async (req: Request, res: Response) => {
    let { username, email, password, companyName } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!username && companyName) {
        username = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const adminPanelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin/users`;

    // Check if a user with this email already exists
    const existingByEmail = await User.findOne({ email: normalizedEmail });

    if (existingByEmail) {
        // If already verified → genuine duplicate
        if (existingByEmail.isVerified) {
            return res.status(400).json({ message: 'An account with this email already exists. Please login.' });
        }

        // Unverified → refresh OTP and resend
        existingByEmail.otp = otp;
        existingByEmail.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        existingByEmail.password = password;
        existingByEmail.verificationToken = crypto.randomBytes(20).toString('hex');
        existingByEmail.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await existingByEmail.save();

        await sendEmail(
            existingByEmail.email,
            'Verify your Influverse Account',
            emailTemplates.otpVerification(otp)
        );

        return res.status(200).json({
            _id: existingByEmail._id,
            username: existingByEmail.username,
            email: existingByEmail.email,
            role: existingByEmail.role,
            requiresVerification: true,
            message: "A new verification code has been sent to your email"
        });
    }

    // Check if username is taken by a verified user
    const existingByUsername = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingByUsername && existingByUsername.isVerified) {
        return res.status(400).json({ message: 'This username is already taken. Please choose another.' });
    }

    // Clean up stale unverified account with same username
    if (existingByUsername && !existingByUsername.isVerified) {
        await BrandProfile.findOneAndDelete({ user: existingByUsername._id });
        await User.findByIdAndDelete(existingByUsername._id);
    }

    const user = await User.create({
        name: username,
        username,
        email: normalizedEmail,
        password,
        role: 'brand',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        verificationToken: crypto.randomBytes(20).toString('hex'),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
        isVerified: false,
    });

    if (user) {
        // Create Brand Profile
        await BrandProfile.create({
            user: user._id,
            companyName: companyName || username,
        });

        // Send OTP to user (fire-and-forget)
        sendEmail(
            user.email,
            'Verify your Influverse Account',
            emailTemplates.otpVerification(otp)
        ).catch(err => console.error('[BrandReg] OTP email failed:', err));

        // Notify all admins (fire-and-forget)
        notifyAdmins(
            emailTemplates.adminNewUserSignup(user.username, user.email, 'brand', adminPanelUrl)
        ).catch(err => console.error('[BrandReg] Admin notify failed:', err));

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            requiresVerification: true,
            message: "Verification code sent to email"
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
};

// @desc    Get Brand Profile
// @route   GET /api/brands/profile
// @access  Private (Brand)
export const getBrandProfile = async (req: Request | any, res: Response) => {
    const user = await User.findById(req.user._id || req.user.id);

    if (user && user.role === 'brand') {
        const profile = await BrandProfile.findOne({ user: user._id });
        res.json({
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            profileImage: profile?.logo || '',
            profileData: profile
        });
    } else {
        res.status(404);
        throw new Error('Brand not found');
    }
};

// @desc    Update Brand Profile
// @route   PUT /api/brands/profile
// @access  Private (Brand)
export const updateBrandProfile = async (req: Request | any, res: Response) => {
    const user = await User.findById(req.user._id || req.user.id);

    if (user && user.role === 'brand') {
        if (req.body.username) user.username = req.body.username;
        if (req.body.email) user.email = req.body.email;
        if (req.body.name) user.name = req.body.name;
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        let profile = await BrandProfile.findOne({ user: user._id });

        const profilePayload = req.body.profileData || {};
        const sanitizedData = { ...profilePayload };
        const forbiddenRootFields = ['_id', 'id', 'user', '__v', 'v', 'createdAt', 'updatedAt'];
        forbiddenRootFields.forEach(f => delete sanitizedData[f]);

        let updatedProfile;
        if (profile) {
            updatedProfile = await BrandProfile.findOneAndUpdate(
                { user: user._id },
                { $set: sanitizedData },
                { new: true }
            );
        } else {
            updatedProfile = await BrandProfile.create({
                user: user._id,
                ...sanitizedData,
            });
        }

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            profileImage: updatedProfile?.logo || '',
            token: generateToken(updatedUser._id.toString(), updatedUser.role, updatedUser.username, updatedUser.email, updatedUser.status, updatedUser.isVerified, updatedUser.name, updatedUser.rejectionReason, updatedProfile?.logo),
            profileData: updatedProfile
        });
    } else {
        res.status(404);
        throw new Error('Brand not found');
    }
};

export const getBrandDashboardStats = async (req: Request | any, res: Response) => {
    try {
        const brandId = req.user._id || req.user.id;
        const objectIdStr = brandId.toString();

        // 1. Core Counts
        const activeCampaigns = await Order.countDocuments({
            brand: brandId,
            status: { $in: ['active', 'revision', 'delivered', 'disputed'] }
        });

        const pendingOffers = await Offer.countDocuments({
            brand: brandId,
            status: 'pending'
        });

        const totalSpentResult = await Order.aggregate([
            { $match: { brand: new mongoose.Types.ObjectId(objectIdStr), status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalSpent = totalSpentResult[0]?.total || 0;

        // 2. Spending Trend (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const spendingTrend = await Order.aggregate([
            {
                $match: {
                    brand: new mongoose.Types.ObjectId(objectIdStr),
                    status: 'approved',
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Status Breakdown
        const statusBreakdown = await Order.aggregate([
            { $match: { brand: new mongoose.Types.ObjectId(objectIdStr) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // 4. Top Creators
        const topCreators = await Order.aggregate([
            { $match: { brand: new mongoose.Types.ObjectId(objectIdStr), status: 'approved' } },
            {
                $group: {
                    _id: "$creator",
                    totalEarned: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalEarned: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    username: "$userDetails.username",
                    profilePhoto: "$userDetails.profilePhoto",
                    totalEarned: 1,
                    orderCount: 1
                }
            }
        ]);

        // 5. Upcoming Deadlines (Next 7 days)
        const now = new Date();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const upcomingDeadlines = await Order.find({
            brand: brandId,
            status: { $in: ['active', 'revision'] },
            deadline: { $gte: now, $lte: nextWeek }
        })
            .select('deadline status creator')
            .populate('creator', 'username');

        // 6. Recent Orders
        const recentOrders = await Order.find({ brand: brandId })
            .populate('creator', 'username email _id status')
            .sort({ createdAt: -1 })
            .limit(5);

        // 7. Get Brand Rating
        const brandProfile = await BrandProfile.findOne({ user: brandId });

        res.json({
            stats: {
                activeCampaigns,
                pendingOffers,
                totalSpent,
                orderCount: await Order.countDocuments({ brand: brandId }),
                rating: brandProfile?.rating || 0,
                reviewCount: brandProfile?.reviewCount || 0
            },
            charts: {
                spendingTrend,
                statusBreakdown
            },
            topCreators,
            upcomingDeadlines,
            recentOrders
        });
    } catch (error: any) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

// @desc    Toggle favorite on a creator
// @route   POST /api/brands/favorites/:creatorId
// @access  Private (Brand)
export const toggleFavoriteCreator = async (req: Request | any, res: Response) => {
    try {
        const brandId = req.user._id || req.user.id;
        const creatorId = req.params.creatorId;

        console.log(`[ToggleFavorite] brandId: ${brandId}, creatorId: ${creatorId}`);

        let profile = await BrandProfile.findOne({ user: brandId });
        if (!profile) {
            profile = await BrandProfile.create({
                user: brandId,
                companyName: req.user.username || 'My Company',
                savedCreators: []
            });
        }

        if (!profile.savedCreators) {
            profile.savedCreators = [];
        }

        const creatorIdObj = new mongoose.Types.ObjectId(creatorId);
        const creatorIndex = profile.savedCreators.findIndex(id => id && id.toString() === creatorId);
        let isFavorited = false;

        if (creatorIndex !== -1) {
            // Remove from favorites
            profile.savedCreators.splice(creatorIndex, 1);
            isFavorited = false;
        } else {
            // Add to favorites
            profile.savedCreators.push(creatorIdObj);
            isFavorited = true;
        }

        // Mark as modified if Mongoose doesn't detect it automatically (though it usually does for arrays)
        profile.markModified('savedCreators');
        await profile.save();

        res.json({ 
            message: isFavorited ? 'Creator favorited' : 'Creator unfavorited', 
            isFavorited, 
            // Serialize ObjectIds to plain strings so frontend can reliably compare
            savedCreators: profile.savedCreators.map(id => id.toString()) 
        });
    } catch (error: any) {
        console.error("Favorite Creator Error:", error);
        res.status(500).json({ message: "Failed to toggle favorite creator" });
    }
};

// @desc    Get favorite creators
// @route   GET /api/brands/favorites
// @access  Private (Brand)
export const getFavoriteCreators = async (req: Request | any, res: Response) => {
    try {
        const brandId = req.user._id || req.user.id;
        
        const profile = await BrandProfile.findOne({ user: brandId });

        if (!profile) {
            // Instead of 404, just return empty list as they haven't saved anything and profile is lazy-created
            return res.json([]);
        }

        const savedCreatorIds = profile.savedCreators || [];
        
        if (savedCreatorIds.length === 0) {
            return res.json([]);
        }
        
        // Find all their profiles, populate the user field
        const creators = await CreatorProfile.find({
            user: { $in: savedCreatorIds }
        }).populate('user', 'username email isVerified status');

        // Filter out any creators where populating the user failed (e.g. user was deleted)
        const validCreators = creators.filter(c => c.user);

        res.json(validCreators);
    } catch (error: any) {
        console.error("Get Favorite Creators Error:", error);
        res.status(500).json({ message: "Failed to fetch favorite creators" });
    }
};

