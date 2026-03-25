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
exports.getChatLogs = exports.processWithdrawal = exports.getWithdrawals = exports.updatePlatformSettings = exports.getPublicPlatformSettings = exports.getPlatformSettings = exports.releasePayout = exports.getPayouts = exports.resolveReport = exports.getReports = exports.getDashboardOverview = exports.getFinancialStats = exports.manageOrder = exports.getOrders = exports.toggleCreatorFeatured = exports.toggleUserVerification = exports.verifyCreator = exports.getPendingVerifications = exports.manageUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
const Order_1 = __importDefault(require("../models/Order"));
const Report_1 = __importDefault(require("../models/Report"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
// @desc    Get All Users (Admin)
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find().select('-password').lean(); // Use lean for faster processing
        const usersWithFeatured = yield Promise.all(users.map((u) => __awaiter(void 0, void 0, void 0, function* () {
            if (u.role === 'creator') {
                const profile = yield CreatorProfile_1.default.findOne({ user: u._id }).select('isFeatured');
                return Object.assign(Object.assign({}, u), { isFeatured: (profile === null || profile === void 0 ? void 0 : profile.isFeatured) || false });
            }
            return u;
        })));
        res.json(usersWithFeatured);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUsers = getUsers;
// @desc    Manage User (Ban/Unban)
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
const manageUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, reason } = req.body;
    try {
        const user = yield User_1.default.findById(req.params.id);
        if (user) {
            user.status = status;
            if (reason)
                user.rejectionReason = reason;
            const updatedUser = yield user.save();
            res.json({ message: `User status updated to ${status}`, user: { _id: updatedUser._id, username: updatedUser.username, status: updatedUser.status } });
        }
        else {
            res.status(404);
            throw new Error('User not found');
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.manageUser = manageUser;
// @desc    Get Pending Creator Verifications
// @route   GET /api/admin/verifications
// @access  Private (Admin)
const getPendingVerifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find({ role: 'creator', isVerified: false, status: 'pending' }).select('-password');
        const verifications = yield Promise.all(users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
            const profile = yield CreatorProfile_1.default.findOne({ user: user._id });
            return {
                user,
                profileData: profile
            };
        })));
        res.json(verifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPendingVerifications = getPendingVerifications;
// @desc    Approve/Reject Creator Profile Verification
// @route   PATCH /api/admin/verifications/:id
// @access  Private (Admin)
const verifyCreator = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, reason } = req.body; // 'approved' or 'rejected'
    const id = req.params.id;
    let profile = yield CreatorProfile_1.default.findById(id);
    if (!profile) {
        // Frontend often sends User ID, so we fallback to finding profile by user field
        profile = yield CreatorProfile_1.default.findOne({ user: id });
    }
    if (!profile) {
        res.status(404);
        throw new Error('Creator Profile not found');
    }
    const creatorUser = yield User_1.default.findById(profile.user);
    if (!creatorUser) {
        res.status(404);
        throw new Error('User not found');
    }
    if (status === 'approved') {
        creatorUser.status = 'active';
        creatorUser.isVerified = true; // Assigned default verified tick upon approval
        creatorUser.rejectionReason = undefined;
        profile.verified = true; // Sync profile verification
    }
    else if (status === 'rejected') {
        creatorUser.status = 'rejected';
        creatorUser.isVerified = false;
        if (reason)
            creatorUser.rejectionReason = reason;
        profile.verified = false;
    }
    yield creatorUser.save();
    const updatedProfile = yield profile.save();
    res.json({ message: `Creator profile ${status}`, profile: updatedProfile });
});
exports.verifyCreator = verifyCreator;
// @desc    Toggle User Verification (Verified Tick / Blue Tick)
// @route   PATCH /api/admin/users/:id/verify
// @access  Private (Admin)
const toggleUserVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        user.isVerified = !user.isVerified;
        yield user.save();
        // If creator, also update profile for consistency
        if (user.role === 'creator') {
            yield CreatorProfile_1.default.findOneAndUpdate({ user: user._id }, { verified: user.isVerified });
        }
        res.json({ message: `User verification set to ${user.isVerified}`, isVerified: user.isVerified });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleUserVerification = toggleUserVerification;
// @desc    Toggle Creator Featured Status
// @route   PATCH /api/admin/creators/:id/featured
// @access  Private (Admin)
const toggleCreatorFeatured = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const profile = yield CreatorProfile_1.default.findById(req.params.id);
        if (!profile) {
            // Check if ID is user ID
            const profileByUser = yield CreatorProfile_1.default.findOne({ user: req.params.id });
            if (!profileByUser) {
                res.status(404);
                throw new Error('Creator profile not found');
            }
            profileByUser.isFeatured = !profileByUser.isFeatured;
            yield profileByUser.save();
            return res.json({ message: `Featured status set to ${profileByUser.isFeatured}`, isFeatured: profileByUser.isFeatured });
        }
        profile.isFeatured = !profile.isFeatured;
        yield profile.save();
        res.json({ message: `Featured status set to ${profile.isFeatured}`, isFeatured: profile.isFeatured });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleCreatorFeatured = toggleCreatorFeatured;
// @desc    Get All Orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find()
            .populate('brand', 'username email')
            .populate('creator', 'username email')
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOrders = getOrders;
// @desc    Manage Order (Status/Dispute/Override)
// @route   PATCH /api/admin/orders/:id
// @access  Private (Admin)
const manageOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, disputeReason } = req.body;
    const orderId = req.params.id;
    try {
        const order = yield Order_1.default.findById(orderId);
        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }
        order.status = status;
        if (status === 'approved') {
            if (!order.completedAt)
                order.completedAt = new Date();
            // Admin Override: Immediate Payout Release
            order.payoutReleased = true;
            order.payoutDueDate = new Date();
            // Update Transaction to Available Immediately
            yield Transaction_1.default.updateMany({
                user: order.creator,
                type: 'earning',
                description: { $regex: order.id, $options: 'i' },
                status: 'pending'
            }, {
                status: 'available',
                availableAt: new Date()
            });
        }
        else if (status === 'cancelled') {
            yield Transaction_1.default.updateMany({
                user: order.creator,
                type: 'earning',
                description: { $regex: order.id, $options: 'i' },
                status: 'pending'
            }, { status: 'failed' });
        }
        const updatedOrder = yield order.save();
        res.json({ message: `Order status updated to ${updatedOrder.status}`, order: updatedOrder });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.manageOrder = manageOrder;
// @desc    Get Financial Stats
// @route   GET /api/admin/finance
// @access  Private (Admin)
const getFinancialStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const approvedOrders = yield Order_1.default.find({ status: 'approved' });
        const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);
        const totalVolume = approvedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const activeOrders = yield Order_1.default.find({ status: { $in: ['active', 'delivered', 'in-progress'] } });
        const totalPending = activeOrders.reduce((sum, o) => sum + (o.price || 0), 0);
        const settings = yield PlatformSettings_1.default.findOne();
        const stats = {
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalVolume: Number(totalVolume.toFixed(2)),
            pendingPayouts: Number(totalPending.toFixed(2)),
            platformFeePercentage: (settings === null || settings === void 0 ? void 0 : settings.platformFeePercentage) || 15,
            payoutHoldingPeriod: (settings === null || settings === void 0 ? void 0 : settings.payoutHoldingPeriod) || 7
        };
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFinancialStats = getFinancialStats;
// @desc    Get Detailed Dashboard Stats
// @route   GET /api/admin/overview
// @access  Private (Admin)
const getDashboardOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalUsers, totalBrands, totalCreators, pendingVerifications, totalOrders, activeOrders, completedOrders] = yield Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ role: 'brand' }),
            User_1.default.countDocuments({ role: 'creator' }),
            User_1.default.countDocuments({ role: 'creator', isVerified: false, status: 'pending' }),
            Order_1.default.countDocuments(),
            Order_1.default.countDocuments({ status: { $in: ['active', 'delivered', 'in-progress'] } }),
            Order_1.default.countDocuments({ status: 'approved' })
        ]);
        const approvedOrdersList = yield Order_1.default.find({ status: 'approved' });
        const totalRevenue = approvedOrdersList.reduce((sum, o) => sum + (o.platformFee || 0), 0);
        const totalEarnings = approvedOrdersList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const recentSignups = yield User_1.default.find()
            .select('username email role createdAt')
            .sort({ createdAt: -1 })
            .limit(5);
        const recentOrders = yield Order_1.default.find()
            .populate('brand', 'username')
            .populate('creator', 'username')
            .sort({ createdAt: -1 })
            .limit(5);
        const [pendingWithdrawals, unresolvedReports] = yield Promise.all([
            Transaction_1.default.countDocuments({ type: 'payout', status: 'processing' }),
            Report_1.default.countDocuments({ status: 'pending' })
        ]);
        res.json({
            stats: {
                totalUsers,
                totalBrands,
                totalCreators,
                pendingVerifications,
                totalOrders,
                activeOrders,
                completedOrders,
                totalRevenue: Number(totalRevenue.toFixed(2)),
                totalVolume: Number(totalEarnings.toFixed(2)),
                pendingWithdrawals,
                unresolvedReports
            },
            charts: {
                userGrowth: [],
                revenueTrend: []
            },
            activities: {
                recentSignups,
                recentOrders
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getDashboardOverview = getDashboardOverview;
// @desc    Get All Reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reports = yield Report_1.default.find()
            .populate('reporter', 'username email')
            .populate('reportedUser', 'username email')
            .sort({ createdAt: -1 });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReports = getReports;
// @desc    Resolve Report
// @route   PATCH /api/admin/reports/:id
// @access  Private (Admin)
const resolveReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.body;
    try {
        const report = yield Report_1.default.findById(req.params.id);
        if (report) {
            report.status = status;
            const updatedReport = yield report.save();
            res.json({ message: `Report marked as ${status}`, report: updatedReport });
        }
        else {
            res.status(404);
            throw new Error('Report not found');
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resolveReport = resolveReport;
// @desc    Get Pending Payouts
// @route   GET /api/admin/payouts
// @access  Private (Admin)
const getPayouts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find({
            status: 'approved',
            payoutReleased: { $ne: true }
        })
            .populate('creator', 'username email')
            .sort({ payoutDueDate: 1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPayouts = getPayouts;
// @desc    Release Payout for Order
// @route   POST /api/admin/payouts/:id/release
// @access  Private (Admin)
const releasePayout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }
        if (order.status !== 'approved') {
            res.status(400);
            throw new Error('Order is not approved yet');
        }
        if (order.payoutReleased) {
            res.status(400);
            throw new Error('Payout already released');
        }
        yield Transaction_1.default.updateMany({
            user: order.creator,
            type: 'earning',
            description: { $regex: order.id, $options: 'i' },
            status: 'pending'
        }, {
            status: 'available',
            availableAt: new Date()
        });
        order.payoutReleased = true;
        const updatedOrder = yield order.save();
        res.json({ message: 'Payout released successfully', order: updatedOrder });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.releasePayout = releasePayout;
// @desc    Get Platform Settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getPlatformSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield PlatformSettings_1.default.findOne();
        if (!settings) {
            settings = yield PlatformSettings_1.default.create({
                autoBanThreshold: 5,
                bannedKeywords: [],
                globalNotice: "",
                maintenanceMode: false,
                noticeActive: false,
                payoutHoldingPeriod: 7,
                platformFeePercentage: 15,
            });
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPlatformSettings = getPlatformSettings;
// @desc    Get Public Platform Settings (For broadcast/notices)
// @route   GET /api/settings/public
// @access  Public
const getPublicPlatformSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield PlatformSettings_1.default.findOne();
        if (!settings) {
            res.json({ maintenanceMode: false, globalNotice: '', noticeActive: false });
            return;
        }
        res.json({
            maintenanceMode: settings.maintenanceMode,
            globalNotice: settings.globalNotice,
            noticeActive: settings.noticeActive
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPublicPlatformSettings = getPublicPlatformSettings;
// @desc    Update Platform Settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updatePlatformSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { autoBanThreshold, bannedKeywords, maintenanceMode, globalNotice, noticeActive, platformFeePercentage, payoutHoldingPeriod } = req.body;
    try {
        let settings = yield PlatformSettings_1.default.findOne();
        if (!settings) {
            settings = yield PlatformSettings_1.default.create({
                autoBanThreshold: autoBanThreshold || 5,
                bannedKeywords: bannedKeywords || [],
                globalNotice: globalNotice || "",
                maintenanceMode: maintenanceMode || false,
                noticeActive: noticeActive || false,
                payoutHoldingPeriod: payoutHoldingPeriod || 7,
                platformFeePercentage: platformFeePercentage || 15,
            });
        }
        else {
            if (autoBanThreshold !== undefined)
                settings.autoBanThreshold = autoBanThreshold;
            if (bannedKeywords !== undefined)
                settings.bannedKeywords = bannedKeywords;
            if (maintenanceMode !== undefined)
                settings.maintenanceMode = maintenanceMode;
            if (globalNotice !== undefined)
                settings.globalNotice = globalNotice;
            if (noticeActive !== undefined)
                settings.noticeActive = noticeActive;
            if (platformFeePercentage !== undefined)
                settings.platformFeePercentage = platformFeePercentage;
            if (payoutHoldingPeriod !== undefined)
                settings.payoutHoldingPeriod = payoutHoldingPeriod;
            yield settings.save();
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updatePlatformSettings = updatePlatformSettings;
// @desc    Get Manual Withdrawal Requests
// @route   GET /api/admin/withdrawals
// @access  Private (Admin)
const getWithdrawals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const withdrawals = yield Transaction_1.default.find({
            type: 'payout',
            status: 'processing'
        })
            .populate('user', 'username email')
            .sort({ createdAt: 1 });
        const enhancedWithdrawals = yield Promise.all(withdrawals.map((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const profile = yield CreatorProfile_1.default.findOne({ user: tx.user._id });
            const txObj = tx.toObject();
            return Object.assign(Object.assign({}, txObj), { bankDetails: profile === null || profile === void 0 ? void 0 : profile.bankDetails });
        })));
        res.json(enhancedWithdrawals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getWithdrawals = getWithdrawals;
// @desc    Process Withdrawal (Approve/Reject)
// @route   PATCH /api/admin/withdrawals/:id
// @access  Private (Admin)
const processWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, note } = req.body;
    try {
        const transaction = yield Transaction_1.default.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        if (transaction.type !== 'payout') {
            return res.status(400).json({ message: 'Not a payout transaction' });
        }
        transaction.status = status;
        if (status === 'completed') {
            transaction.description = transaction.description + (note ? ` [Note: ${note}]` : "");
        }
        else if (status === 'failed' || status === 'rejected') {
            transaction.status = 'failed';
            transaction.description = `Withdrawal Rejected: ${note || 'Admin declined'}`;
        }
        const updatedTx = yield transaction.save();
        res.json({ message: `Withdrawal ${status}`, transaction: updatedTx });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.processWithdrawal = processWithdrawal;
// @desc    Get Chat Logs between Users (for Moderation)
// @route   GET /api/admin/chats/:reporterId/:reportedId
// @access  Private (Admin)
const getChatLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reporterId, reportedId } = req.params;
        const chats = yield Chat_1.default.find({
            participants: { $all: [reporterId, reportedId] }
        });
        if (!chats || chats.length === 0) {
            return res.status(404).json({ message: 'No chat history found between these users.' });
        }
        const chatIds = chats.map(c => c._id);
        const messages = yield Message_1.default.find({ chat: { $in: chatIds } })
            .populate('sender', 'username email role')
            .sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        console.error("Chat Logs Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getChatLogs = getChatLogs;
