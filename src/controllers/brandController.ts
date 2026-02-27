import { Request, Response } from 'express';
import User from '../models/User';
import BrandProfile from '../models/BrandProfile';
import Order from '../models/Order';
import Offer from '../models/Offer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates } from '../utils/emailService';
import mongoose from 'mongoose';

const generateToken = (id: string, role: string, username: string, email: string, status: string, isVerified: boolean, rejectionReason?: string) => {
    return jwt.sign({ id, role, username, email, status, isVerified, rejectionReason }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register a new Brand
// @route   POST /api/brands/register
// @access  Public
export const registerBrand = async (req: Request, res: Response) => {
    let { username, email, password, companyName } = req.body;

    if (!username && companyName) {
        username = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
        username,
        email,
        password,
        role: 'brand',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
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

        // Send Verification Email with OTP
        await sendEmail(
            user.email,
            'Verify your Influverse Account',
            emailTemplates.otpVerification(otp)
        );

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
            username: user.username,
            email: user.email,
            role: user.role,
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
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            token: generateToken(updatedUser._id.toString(), updatedUser.role, updatedUser.username, updatedUser.email, updatedUser.status, updatedUser.isVerified, updatedUser.rejectionReason),
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
