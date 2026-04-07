"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.refreshSocialStats = exports.getCreatorDashboardStats = exports.getCreatorById = exports.getCreators = exports.updateCreatorProfile = exports.getCreatorProfile = exports.registerCreator = void 0;
const User_1 = __importDefault(require("../models/User"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const Order_1 = __importDefault(require("../models/Order"));
const Offer_1 = __importDefault(require("../models/Offer"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = __importDefault(require("../config/redis"));
const authController_1 = require("./authController");
// @desc    Register a new Creator
// @route   POST /api/creators/register
// @access  Public
const registerCreator = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    const userExists = yield User_1.default.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // The user schema triggers a pre hook for bcrypt hashing so we don't strictly need it, but we can do it explicitly.
    const user = yield User_1.default.create({
        name: username,
        username,
        email,
        password, // Handled by pre('save') hook in Mongoose model if present.
        role: 'creator',
        status: 'pending',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        verificationToken: crypto_1.default.randomBytes(20).toString('hex'),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isVerified: false,
    });
    if (user) {
        yield CreatorProfile_1.default.create({
            user: user._id,
            stats: { completedOrders: 0, engagementRate: 0, followerCount: 0, rating: 0, reviewCount: 0 },
            verified: false,
        });
        // Send OTP Email
        yield (0, emailService_1.sendEmail)(user.email, 'Verify your Influverse Account', emailService_1.emailTemplates.otpVerification(otp));
        res.status(200).json({
            _id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            requiresVerification: true,
            message: "Verification code sent to email"
        });
    }
    else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
exports.registerCreator = registerCreator;
// @desc    Get Creator Profile
// @route   GET /api/creators/profile
// @access  Private (Creator)
const getCreatorProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findById(req.user._id || req.user.id);
    if (user && user.role === 'creator') {
        const profile = yield CreatorProfile_1.default.findOne({ user: user.id });
        res.json({
            _id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            profileImage: (profile === null || profile === void 0 ? void 0 : profile.profileImage) || '',
            profileData: profile
        });
    }
    else {
        res.status(404);
        throw new Error('Creator not found');
    }
});
exports.getCreatorProfile = getCreatorProfile;
// @desc    Update Creator Profile
// @route   PUT /api/creators/profile
// @access  Private (Creator)
const updateCreatorProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.default.findById(req.user._id || req.user.id);
    if (user && user.role === 'creator') {
        if (req.body.username)
            user.username = req.body.username;
        if (req.body.email)
            user.email = req.body.email;
        if (req.body.name)
            user.name = req.body.name;
        if (req.body.password) {
            user.password = req.body.password;
        }
        if (req.body.submitForReview && (user.status === 'rejected' || user.status === 'active' || !user.status || user.status === 'pending')) {
            user.status = 'pending';
            user.rejectionReason = undefined;
        }
        const updatedUser = yield user.save();
        const profilePayload = req.body.profileData || {};
        // Sanitize root fields
        const sanitizedData = Object.assign({}, profilePayload);
        const forbiddenRootFields = ['_id', 'id', 'user', '__v', 'v', 'createdAt', 'updatedAt'];
        forbiddenRootFields.forEach(f => delete sanitizedData[f]);
        const updatedProfile = yield CreatorProfile_1.default.findOneAndUpdate({ user: user.id }, { $set: sanitizedData }, { new: true, runValidators: true });
        res.json({
            _id: updatedUser.id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            status: updatedUser.status, // Return current status
            profileImage: (updatedProfile === null || updatedProfile === void 0 ? void 0 : updatedProfile.profileImage) || '',
            token: (0, authController_1.generateToken)(updatedUser.id, updatedUser.role, updatedUser.username, updatedUser.email, updatedUser.status, updatedUser.isVerified, updatedUser.name, updatedUser.rejectionReason, updatedProfile === null || updatedProfile === void 0 ? void 0 : updatedProfile.profileImage),
            profileData: updatedProfile
        });
    }
    else {
        res.status(404);
        throw new Error('Creator not found');
    }
});
exports.updateCreatorProfile = updateCreatorProfile;
// @desc    Get All Creators (Discovery)
// @route   GET /api/creators
// @access  Public
const getCreators = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, country, featured } = req.query;
        const CACHE_KEY = `creators_${category || 'all'}_${country || 'all'}_${featured || 'false'}`;
        if (redis_1.default.isReady) {
            const cachedData = yield redis_1.default.get(CACHE_KEY);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }
        let query = {};
        if (category && category !== 'all') {
            query.categories = { $in: [category] };
        }
        if (country) {
            query.country = new RegExp(country, 'i');
        }
        if (featured === 'true') {
            query.isFeatured = true;
        }
        const creatorsList = yield CreatorProfile_1.default.find(query).populate('user', 'username email status isVerified');
        // Filter out orphans and unapproved creators
        const validCreators = creatorsList.filter(c => c.user && c.user.status === 'active');
        if (redis_1.default.isReady) {
            yield redis_1.default.setEx(CACHE_KEY, 300, JSON.stringify(validCreators));
        }
        res.json(validCreators);
    }
    catch (error) {
        console.error("Error in getCreators:", error);
        res.status(500).json({ message: error.message });
    }
});
exports.getCreators = getCreators;
// @desc    Get Creator by ID or Username (Public Profile)
// @route   GET /api/creators/:id
// @access  Public
const getCreatorById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const idOrUsername = req.params.id;
        let profile = null;
        const isObjectId = mongoose_1.default.Types.ObjectId.isValid(idOrUsername);
        if (isObjectId) {
            profile = yield CreatorProfile_1.default.findOne({ user: idOrUsername }).populate('user', 'username email status isVerified');
        }
        else {
            const user = yield User_1.default.findOne({ username: new RegExp(`^${idOrUsername}$`, 'i') });
            if (user) {
                profile = yield CreatorProfile_1.default.findOne({ user: user._id }).populate('user', 'username email status isVerified');
            }
        }
        if (profile && profile.user.status === 'active') {
            res.json(profile);
        }
        else {
            res.status(404).json({ message: 'Creator profile not found or pending approval' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCreatorById = getCreatorById;
// @desc    Get Creator Dashboard Stats
// @route   GET /api/creators/dashboard
// @access  Private (Creator)
const getCreatorDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const creatorId = req.user._id || req.user.id;
        const objectId = new mongoose_1.default.Types.ObjectId(creatorId);
        // 1. Basic Stats
        const [activeOrdersCount, pendingOffersCount, totalEarningsResult] = yield Promise.all([
            Order_1.default.countDocuments({
                creator: creatorId,
                status: { $in: ['active', 'revision', 'delivered', 'disputed'] }
            }),
            Offer_1.default.countDocuments({
                creator: creatorId,
                status: 'pending'
            }),
            Order_1.default.aggregate([
                { $match: { creator: objectId, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$price' } } }
            ])
        ]);
        const totalEarnings = ((_a = totalEarningsResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // 2. Earnings Trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const earningsTrend = yield Order_1.default.aggregate([
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
        const statusBreakdown = yield Order_1.default.aggregate([
            { $match: { creator: objectId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        // 4. Upcoming Deadlines (Next 7 days)
        const now = new Date();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const upcomingDeadlines = yield Order_1.default.find({
            creator: creatorId,
            status: { $in: ['active', 'revision'] },
            deadline: { $gte: now, $lte: nextWeek }
        })
            .select('deadline status brand')
            .populate('brand', 'username')
            .sort({ deadline: 1 })
            .limit(3);
        // 5. Recent Requests (Pending Offers)
        const recentRequests = yield Offer_1.default.find({ creator: creatorId, status: 'pending' })
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
    }
    catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
});
exports.getCreatorDashboardStats = getCreatorDashboardStats;
// @desc    Refresh Social Media Stats
// @route   POST /api/creators/social-stats
// @access  Private (Creator)
const refreshSocialStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { platform, handle } = req.body;
        const { getInstagramFollowers, getTikTokFollowers, getYouTubeSubscribers, formatFollowerCount } = yield Promise.resolve().then(() => __importStar(require('../utils/socialMedia')));
        let result = null;
        // Try API Fetch
        switch (platform.toLowerCase()) {
            case 'instagram':
                result = yield getInstagramFollowers(handle);
                break;
            case 'tiktok':
                result = yield getTikTokFollowers(handle);
                break;
            case 'youtube':
                result = yield getYouTubeSubscribers(handle);
                break;
            default:
                break;
        }
        if (result && result.followers) {
            const formattedCount = formatFollowerCount(result.followers);
            res.json({ success: true, count: formattedCount, raw: result.followers, details: result, source: 'api' });
        }
        else {
            res.json({ success: false, message: 'Automatic sync unavailable. Please enter manually.', source: 'manual_fallback' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Sync service unavailable" });
    }
});
exports.refreshSocialStats = refreshSocialStats;
