import express from 'express';
import { getUsers, manageUser, getPendingVerifications, verifyCreator, getOrders, manageOrder, getFinancialStats, getDashboardOverview, getReports, resolveReport, getPayouts, releasePayout, getPlatformSettings, updatePlatformSettings, getWithdrawals, processWithdrawal, getChatLogs, toggleUserVerification } from '../controllers/adminController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/overview', protect, authorize('admin'), getDashboardOverview);
router.get('/users', protect, authorize('admin'), getUsers);
router.patch('/users/:id/status', protect, authorize('admin'), manageUser); // Updated
router.patch('/users/:id/verify', protect, authorize('admin'), toggleUserVerification); // New
router.get('/creators/verifications', protect, authorize('admin'), getPendingVerifications); // Updated
router.put('/creators/:id/review', protect, authorize('admin'), verifyCreator); // Updated

router.get('/orders', protect, authorize('admin'), getOrders);
router.patch('/orders/:id', protect, authorize('admin'), manageOrder);

router.get('/finance', protect, authorize('admin'), getFinancialStats);

router.get('/reports', protect, authorize('admin'), getReports);
router.patch('/reports/:id', protect, authorize('admin'), resolveReport);
router.get('/chats/:reporterId/:reportedId', protect, authorize('admin'), getChatLogs);

router.get('/payouts', protect, authorize('admin'), getPayouts);
router.post('/payouts/:id/release', protect, authorize('admin'), releasePayout);

// Withdrawals
router.get('/withdrawals', protect, authorize('admin'), getWithdrawals);
router.patch('/withdrawals/:id', protect, authorize('admin'), processWithdrawal);

router.get('/settings', protect, authorize('admin'), getPlatformSettings);
router.put('/settings', protect, authorize('admin'), updatePlatformSettings);

export default router;
