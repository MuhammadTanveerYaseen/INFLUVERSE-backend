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
import BrandProfile from '../models/BrandProfile';
import redisClient from '../config/redis';
import { sendEmail, emailTemplates } from '../utils/emailService';


// @desc    Get All Users (Admin)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password').lean(); // Use lean for faster processing

        const usersWithProfile = await Promise.all(users.map(async (u: any) => {
            let profileImage = '';
            let isFeatured = false;

            if (u.role === 'creator') {
                const profile = await CreatorProfile.findOne({ user: u._id }).select('profileImage isFeatured');
                profileImage = profile?.profileImage || '';
                isFeatured = profile?.isFeatured || false;
            } else if (u.role === 'brand') {
                const profile = await BrandProfile.findOne({ user: u._id }).select('logo');
                profileImage = profile?.logo || '';
            }

            return { ...u, profileImage, isFeatured };
        }));

        res.json(usersWithProfile);
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
    const id = req.params.id as string;

    let profile = await CreatorProfile.findById(id);
    if (!profile) {
        // Frontend often sends User ID, so we fallback to finding profile by user field
        profile = await CreatorProfile.findOne({ user: id });
    }

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
        creatorUser.isVerified = true; // Assigned default verified tick upon approval
        creatorUser.rejectionReason = undefined;
        profile.verified = true; // Sync profile verification
    } else if (status === 'rejected') {
        creatorUser.status = 'rejected';
        creatorUser.isVerified = false;
        if (reason) creatorUser.rejectionReason = reason;
        profile.verified = false;
    }

    await creatorUser.save();
    const updatedProfile = await profile.save();

    // ── Send notification email to the creator ──────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || 'https://influverse.ch';
    try {
        if (status === 'approved') {
            const dashboardUrl = `${frontendUrl}/dashboard/creator`;
            const tmpl = emailTemplates.profileApproved(
                creatorUser.username,
                dashboardUrl,
                reason || undefined   // optional admin note for approvals
            );
            sendEmail(creatorUser.email, tmpl.subject, tmpl.html)
                .catch(err => console.error('[verifyCreator] Approval email failed:', err));
        } else if (status === 'rejected') {
            const profileUrl = `${frontendUrl}/dashboard/creator/profile`;
            const tmpl = emailTemplates.profileRejected(
                creatorUser.username,
                profileUrl,
                reason || 'Please review your profile and ensure all required fields are complete and accurate.'
            );
            sendEmail(creatorUser.email, tmpl.subject, tmpl.html)
                .catch(err => console.error('[verifyCreator] Rejection email failed:', err));
        }
    } catch (emailErr) {
        console.error('[verifyCreator] Email dispatch error:', emailErr);
    }

    if (redisClient.isReady) {
        const keys = await redisClient.keys('creators_*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }

    res.json({ message: `Creator profile ${status}`, profile: updatedProfile });
};

// @desc    Toggle User Verification (Verified Tick / Blue Tick)
// @route   PATCH /api/admin/users/:id/verify
// @access  Private (Admin)
export const toggleUserVerification = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        user.isVerified = !user.isVerified;
        await user.save();

        // If creator, also update profile for consistency
        if (user.role === 'creator') {
            await CreatorProfile.findOneAndUpdate(
                { user: user._id },
                { verified: user.isVerified }
            );

            if (redisClient.isReady) {
                const keys = await redisClient.keys('creators_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            }
        }

        res.json({ message: `User verification set to ${user.isVerified}`, isVerified: user.isVerified });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle Creator Featured Status
// @route   PATCH /api/admin/creators/:id/featured
// @access  Private (Admin)
export const toggleCreatorFeatured = async (req: Request, res: Response) => {
    try {
        const profile = await CreatorProfile.findById(req.params.id);
        if (!profile) {
            // Check if ID is user ID
            const profileByUser = await CreatorProfile.findOne({ user: req.params.id });
            if (!profileByUser) {
                res.status(404);
                throw new Error('Creator profile not found');
            }
            profileByUser.isFeatured = !profileByUser.isFeatured;
            await profileByUser.save();
            
            if (redisClient.isReady) {
                const keys = await redisClient.keys('creators_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            }
            
            return res.json({ message: `Featured status set to ${profileByUser.isFeatured}`, isFeatured: profileByUser.isFeatured });
        }

        profile.isFeatured = !profile.isFeatured;
        await profile.save();

        if (redisClient.isReady) {
            const keys = await redisClient.keys('creators_*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        }

        res.json({ message: `Featured status set to ${profile.isFeatured}`, isFeatured: profile.isFeatured });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
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

        const signups = await User.find()
            .select('username email role createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentSignups = await Promise.all(signups.map(async (u: any) => {
            let profileImage = '';
            if (u.role === 'creator') {
                const profile = await CreatorProfile.findOne({ user: u._id }).select('profileImage');
                profileImage = profile?.profileImage || '';
            } else if (u.role === 'brand') {
                const profile = await BrandProfile.findOne({ user: u._id }).select('logo');
                profileImage = profile?.logo || '';
            }
            return { ...u.toObject(), profileImage };
        }));

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
            .populate('reporter', 'username email role')
            .populate('reportedUser', 'username email role')
            .sort({ createdAt: -1 });

        // Add profile photo from CreatorProfile/BrandProfile for reportedUser
        const enhancedReports = await Promise.all(reports.map(async (report: any) => {
            const rObj = report.toObject();
            if (rObj.reportedUser) {
                let profileImage = '';
                if (rObj.reportedUser.role === 'creator') {
                    const profile = await CreatorProfile.findOne({ user: rObj.reportedUser._id }).select('profileImage');
                    profileImage = profile?.profileImage || '';
                } else if (rObj.reportedUser.role === 'brand') {
                    const profile = await BrandProfile.findOne({ user: rObj.reportedUser._id }).select('logo');
                    profileImage = profile?.logo || '';
                }
                rObj.reportedUser.profileImage = profileImage;
            }
            return rObj;
        }));

        res.json(enhancedReports);
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
