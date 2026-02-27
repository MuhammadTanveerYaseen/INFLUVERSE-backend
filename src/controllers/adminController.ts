import { Request, Response } from 'express';
import User from '../models/User';
import CreatorProfile from '../models/CreatorProfile';
import Order from '../models/Order';
import Offer from '../models/Offer';
import Report from '../models/Report';
import PlatformSettings from '../models/PlatformSettings';
import Transaction from '../models/Transaction';
import Chat from '../models/Chat';
import Message from '../models/Message';

// @desc    Get All Users (Admin)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manage User (Ban/Unban)
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
export const manageUser = async (req: Request, res: Response) => {
    const { status, reason } = req.body;
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.status = status;
            if (reason) user.rejectionReason = reason;

            const updatedUser = await user.save();
            res.json({ message: `User status updated to ${status}`, user: { _id: updatedUser._id, username: updatedUser.username, status: updatedUser.status } });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Pending Creator Verifications
// @route   GET /api/admin/verifications
// @access  Private (Admin)
export const getPendingVerifications = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ role: 'creator', isVerified: false, status: 'pending' }).select('-password');

        const verifications = await Promise.all(users.map(async (user) => {
            const profile = await CreatorProfile.findOne({ user: user._id });
            return {
                user,
                profileData: profile
            };
        }));
        res.json(verifications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve/Reject Creator Profile Verification
// @route   PATCH /api/admin/verifications/:id
// @access  Private (Admin)
export const verifyCreator = async (req: Request, res: Response) => {
    const { status, reason } = req.body; // 'approved' or 'rejected'
    const profileId = req.params.id as string;

    const profile = await CreatorProfile.findById(profileId);
    if (!profile) {
        res.status(404);
        throw new Error('Creator Profile not found');
    }

    const creatorUser = await User.findById(profile.user);
    if (!creatorUser) {
        res.status(404);
        throw new Error('User not found');
    }

    if (status === 'approved') {
        creatorUser.status = 'active';
        creatorUser.isVerified = true;
        creatorUser.rejectionReason = undefined;
        profile.verified = true;
    } else if (status === 'rejected') {
        creatorUser.status = 'rejected';
        creatorUser.isVerified = false;
        if (reason) creatorUser.rejectionReason = reason;
        profile.verified = false;
    }

    await creatorUser.save();
    const updatedProfile = await profile.save();

    res.json({ message: `Creator profile ${status}`, profile: updatedProfile });
};

// @desc    Get All Orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
export const getOrders = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find()
            .populate('brand', 'username email')
            .populate('creator', 'username email')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manage Order (Status/Dispute/Override)
// @route   PATCH /api/admin/orders/:id
// @access  Private (Admin)
export const manageOrder = async (req: Request, res: Response) => {
    const { status, disputeReason } = req.body;
    const orderId = req.params.id as string;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        order.status = status;

        if (status === 'approved') {
            if (!order.completedAt) order.completedAt = new Date();

            // Admin Override: Immediate Payout Release
            order.payoutReleased = true;
            order.payoutDueDate = new Date();

            // Update Transaction to Available Immediately
            await Transaction.updateMany({
                user: order.creator,
                type: 'earning',
                description: { $regex: order.id, $options: 'i' },
                status: 'pending'
            }, {
                status: 'available',
                availableAt: new Date()
            });
        } else if (status === 'cancelled') {
            await Transaction.updateMany({
                user: order.creator,
                type: 'earning',
                description: { $regex: order.id, $options: 'i' },
                status: 'pending'
            }, { status: 'failed' });
        }

        const updatedOrder = await order.save();
        res.json({ message: `Order status updated to ${updatedOrder.status}`, order: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Financial Stats
// @route   GET /api/admin/finance
// @access  Private (Admin)
export const getFinancialStats = async (req: Request, res: Response) => {
    try {
        const approvedOrders = await Order.find({ status: 'approved' });

        const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);
        const totalVolume = approvedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const activeOrders = await Order.find({ status: { $in: ['active', 'delivered', 'in-progress'] } });
        const totalPending = activeOrders.reduce((sum, o) => sum + (o.price || 0), 0);

        const settings = await PlatformSettings.findOne();

        const stats = {
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalVolume: Number(totalVolume.toFixed(2)),
            pendingPayouts: Number(totalPending.toFixed(2)),
            platformFeePercentage: settings?.platformFeePercentage || 15,
            payoutHoldingPeriod: settings?.payoutHoldingPeriod || 7
        };

        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Detailed Dashboard Stats
// @route   GET /api/admin/overview
// @access  Private (Admin)
export const getDashboardOverview = async (req: Request, res: Response) => {
    try {
        const [totalUsers, totalBrands, totalCreators, pendingVerifications, totalOrders, activeOrders, completedOrders] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'brand' }),
            User.countDocuments({ role: 'creator' }),
            User.countDocuments({ role: 'creator', isVerified: false, status: 'pending' }),
            Order.countDocuments(),
            Order.countDocuments({ status: { $in: ['active', 'delivered', 'in-progress'] } }),
            Order.countDocuments({ status: 'approved' })
        ]);

        const approvedOrdersList = await Order.find({ status: 'approved' });
        const totalRevenue = approvedOrdersList.reduce((sum, o) => sum + (o.platformFee || 0), 0);
        const totalEarnings = approvedOrdersList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const recentSignups = await User.find()
            .select('username email role createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentOrders = await Order.find()
            .populate('brand', 'username')
            .populate('creator', 'username')
            .sort({ createdAt: -1 })
            .limit(5);

        const [pendingWithdrawals, unresolvedReports] = await Promise.all([
            Transaction.countDocuments({ type: 'payout', status: 'processing' }),
            Report.countDocuments({ status: 'pending' })
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
export const getReports = async (req: Request, res: Response) => {
    try {
        const reports = await Report.find()
            .populate('reporter', 'username email')
            .populate('reportedUser', 'username email')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resolve Report
// @route   PATCH /api/admin/reports/:id
// @access  Private (Admin)
export const resolveReport = async (req: Request, res: Response) => {
    const { status } = req.body;
    try {
        const report = await Report.findById(req.params.id);

        if (report) {
            report.status = status;
            const updatedReport = await report.save();
            res.json({ message: `Report marked as ${status}`, report: updatedReport });
        } else {
            res.status(404);
            throw new Error('Report not found');
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Pending Payouts
// @route   GET /api/admin/payouts
// @access  Private (Admin)
export const getPayouts = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find({
            status: 'approved',
            payoutReleased: { $ne: true }
        })
            .populate('creator', 'username email')
            .sort({ payoutDueDate: 1 });

        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Release Payout for Order
// @route   POST /api/admin/payouts/:id/release
// @access  Private (Admin)
export const releasePayout = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id);

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

        await Transaction.updateMany({
            user: order.creator,
            type: 'earning',
            description: { $regex: order.id, $options: 'i' },
            status: 'pending'
        }, {
            status: 'available',
            availableAt: new Date()
        });

        order.payoutReleased = true;
        const updatedOrder = await order.save();

        res.json({ message: 'Payout released successfully', order: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Platform Settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
export const getPlatformSettings = async (req: Request, res: Response) => {
    try {
        let settings = await PlatformSettings.findOne();

        if (!settings) {
            settings = await PlatformSettings.create({
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Public Platform Settings (For broadcast/notices)
// @route   GET /api/settings/public
// @access  Public
export const getPublicPlatformSettings = async (req: Request, res: Response) => {
    try {
        let settings = await PlatformSettings.findOne();

        if (!settings) {
            res.json({ maintenanceMode: false, globalNotice: '', noticeActive: false });
            return;
        }

        res.json({
            maintenanceMode: settings.maintenanceMode,
            globalNotice: settings.globalNotice,
            noticeActive: settings.noticeActive
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Platform Settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
export const updatePlatformSettings = async (req: Request, res: Response) => {
    const { autoBanThreshold, bannedKeywords, maintenanceMode, globalNotice, noticeActive, platformFeePercentage, payoutHoldingPeriod } = req.body;
    try {
        let settings = await PlatformSettings.findOne();

        if (!settings) {
            settings = await PlatformSettings.create({
                autoBanThreshold: autoBanThreshold || 5,
                bannedKeywords: bannedKeywords || [],
                globalNotice: globalNotice || "",
                maintenanceMode: maintenanceMode || false,
                noticeActive: noticeActive || false,
                payoutHoldingPeriod: payoutHoldingPeriod || 7,
                platformFeePercentage: platformFeePercentage || 15,
            });
        } else {
            if (autoBanThreshold !== undefined) settings.autoBanThreshold = autoBanThreshold;
            if (bannedKeywords !== undefined) settings.bannedKeywords = bannedKeywords;
            if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
            if (globalNotice !== undefined) settings.globalNotice = globalNotice;
            if (noticeActive !== undefined) settings.noticeActive = noticeActive;
            if (platformFeePercentage !== undefined) settings.platformFeePercentage = platformFeePercentage;
            if (payoutHoldingPeriod !== undefined) settings.payoutHoldingPeriod = payoutHoldingPeriod;

            await settings.save();
        }

        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Manual Withdrawal Requests
// @route   GET /api/admin/withdrawals
// @access  Private (Admin)
export const getWithdrawals = async (req: Request, res: Response) => {
    try {
        const withdrawals = await Transaction.find({
            type: 'payout',
            status: 'processing'
        })
            .populate('user', 'username email')
            .sort({ createdAt: 1 });

        const enhancedWithdrawals = await Promise.all(withdrawals.map(async (tx: any) => {
            const profile = await CreatorProfile.findOne({ user: tx.user._id });
            const txObj = tx.toObject();
            return {
                ...txObj,
                bankDetails: profile?.bankDetails
            };
        }));

        res.json(enhancedWithdrawals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process Withdrawal (Approve/Reject)
// @route   PATCH /api/admin/withdrawals/:id
// @access  Private (Admin)
export const processWithdrawal = async (req: Request, res: Response) => {
    const { status, note } = req.body;
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.type !== 'payout') {
            return res.status(400).json({ message: 'Not a payout transaction' });
        }

        transaction.status = status;

        if (status === 'completed') {
            transaction.description = transaction.description + (note ? ` [Note: ${note}]` : "");
        } else if (status === 'failed' || status === 'rejected') {
            transaction.status = 'failed';
            transaction.description = `Withdrawal Rejected: ${note || 'Admin declined'}`;
        }

        const updatedTx = await transaction.save();

        res.json({ message: `Withdrawal ${status}`, transaction: updatedTx });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Chat Logs between Users (for Moderation)
// @route   GET /api/admin/chats/:reporterId/:reportedId
// @access  Private (Admin)
export const getChatLogs = async (req: Request, res: Response) => {
    try {
        const { reporterId, reportedId } = req.params;

        const chats = await Chat.find({
            participants: { $all: [reporterId, reportedId] }
        });

        if (!chats || chats.length === 0) {
            return res.status(404).json({ message: 'No chat history found between these users.' });
        }

        const chatIds = chats.map(c => c._id);

        const messages = await Message.find({ chat: { $in: chatIds } })
            .populate('sender', 'username email role')
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error("Chat Logs Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
