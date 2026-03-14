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
exports.getBrandDashboardStats = exports.updateBrandProfile = exports.getBrandProfile = exports.registerBrand = void 0;
const User_1 = __importDefault(require("../models/User"));
const BrandProfile_1 = __importDefault(require("../models/BrandProfile"));
const Order_1 = __importDefault(require("../models/Order"));
const Offer_1 = __importDefault(require("../models/Offer"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const mongoose_1 = __importDefault(require("mongoose"));
const generateToken = (id, role, username, email, status, isVerified, rejectionReason) => {
    return jsonwebtoken_1.default.sign({ id, role, username, email, status, isVerified, rejectionReason }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
// @desc    Register a new Brand
// @route   POST /api/brands/register
// @access  Public
const registerBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { username, email, password, companyName } = req.body;
    if (!username && companyName) {
        username = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
    }
    const userExists = yield User_1.default.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = yield User_1.default.create({
        username,
        email,
        password,
        role: 'brand',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        verificationToken: crypto_1.default.randomBytes(20).toString('hex'),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
        isVerified: false,
    });
    if (user) {
        // Create Brand Profile
        yield BrandProfile_1.default.create({
            user: user._id,
            companyName: companyName || username,
        });
        // Send Verification Email with OTP
        yield (0, emailService_1.sendEmail)(user.email, 'Verify your Influverse Account', emailService_1.emailTemplates.otpVerification(otp));
        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            requiresVerification: true,
            message: "Verification code sent to email"
        });
    }
    else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
exports.registerBrand = registerBrand;
// @desc    Get Brand Profile
// @route   GET /api/brands/profile
// @access  Private (Brand)
const getBrandProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findById(req.user._id || req.user.id);
    if (user && user.role === 'brand') {
        const profile = yield BrandProfile_1.default.findOne({ user: user._id });
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profileData: profile
        });
    }
    else {
        res.status(404);
        throw new Error('Brand not found');
    }
});
exports.getBrandProfile = getBrandProfile;
// @desc    Update Brand Profile
// @route   PUT /api/brands/profile
// @access  Private (Brand)
const updateBrandProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findById(req.user._id || req.user.id);
    if (user && user.role === 'brand') {
        if (req.body.username)
            user.username = req.body.username;
        if (req.body.email)
            user.email = req.body.email;
        if (req.body.password) {
            user.password = req.body.password;
        }
        const updatedUser = yield user.save();
        let profile = yield BrandProfile_1.default.findOne({ user: user._id });
        const profilePayload = req.body.profileData || {};
        const sanitizedData = Object.assign({}, profilePayload);
        const forbiddenRootFields = ['_id', 'id', 'user', '__v', 'v', 'createdAt', 'updatedAt'];
        forbiddenRootFields.forEach(f => delete sanitizedData[f]);
        let updatedProfile;
        if (profile) {
            updatedProfile = yield BrandProfile_1.default.findOneAndUpdate({ user: user._id }, { $set: sanitizedData }, { new: true });
        }
        else {
            updatedProfile = yield BrandProfile_1.default.create(Object.assign({ user: user._id }, sanitizedData));
        }
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            token: generateToken(updatedUser._id.toString(), updatedUser.role, updatedUser.username, updatedUser.email, updatedUser.status, updatedUser.isVerified, updatedUser.rejectionReason),
            profileData: updatedProfile
        });
    }
    else {
        res.status(404);
        throw new Error('Brand not found');
    }
});
exports.updateBrandProfile = updateBrandProfile;
const getBrandDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const brandId = req.user._id || req.user.id;
        const objectIdStr = brandId.toString();
        // 1. Core Counts
        const activeCampaigns = yield Order_1.default.countDocuments({
            brand: brandId,
            status: { $in: ['active', 'revision', 'delivered', 'disputed'] }
        });
        const pendingOffers = yield Offer_1.default.countDocuments({
            brand: brandId,
            status: 'pending'
        });
        const totalSpentResult = yield Order_1.default.aggregate([
            { $match: { brand: new mongoose_1.default.Types.ObjectId(objectIdStr), status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalSpent = ((_a = totalSpentResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // 2. Spending Trend (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const spendingTrend = yield Order_1.default.aggregate([
            {
                $match: {
                    brand: new mongoose_1.default.Types.ObjectId(objectIdStr),
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
        const statusBreakdown = yield Order_1.default.aggregate([
            { $match: { brand: new mongoose_1.default.Types.ObjectId(objectIdStr) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        // 4. Top Creators
        const topCreators = yield Order_1.default.aggregate([
            { $match: { brand: new mongoose_1.default.Types.ObjectId(objectIdStr), status: 'approved' } },
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
        const upcomingDeadlines = yield Order_1.default.find({
            brand: brandId,
            status: { $in: ['active', 'revision'] },
            deadline: { $gte: now, $lte: nextWeek }
        })
            .select('deadline status creator')
            .populate('creator', 'username');
        // 6. Recent Orders
        const recentOrders = yield Order_1.default.find({ brand: brandId })
            .populate('creator', 'username email _id status')
            .sort({ createdAt: -1 })
            .limit(5);
        // 7. Get Brand Rating
        const brandProfile = yield BrandProfile_1.default.findOne({ user: brandId });
        res.json({
            stats: {
                activeCampaigns,
                pendingOffers,
                totalSpent,
                orderCount: yield Order_1.default.countDocuments({ brand: brandId }),
                rating: (brandProfile === null || brandProfile === void 0 ? void 0 : brandProfile.rating) || 0,
                reviewCount: (brandProfile === null || brandProfile === void 0 ? void 0 : brandProfile.reviewCount) || 0
            },
            charts: {
                spendingTrend,
                statusBreakdown
            },
            topCreators,
            upcomingDeadlines,
            recentOrders
        });
    }
    catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
});
exports.getBrandDashboardStats = getBrandDashboardStats;
