"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/overview', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getDashboardOverview);
router.get('/users', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getUsers);
router.patch('/users/:id/status', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.manageUser); // Updated
router.patch('/users/:id/verify', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.toggleUserVerification); // New
router.get('/creators/verifications', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getPendingVerifications); // Updated
router.put('/creators/:id/review', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.verifyCreator); // Updated
router.patch('/creators/:id/featured', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.toggleCreatorFeatured); // New
router.get('/orders', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getOrders);
router.patch('/orders/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.manageOrder);
router.get('/finance', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getFinancialStats);
router.get('/reports', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getReports);
router.patch('/reports/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.resolveReport);
router.get('/chats/:reporterId/:reportedId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getChatLogs);
router.get('/payouts', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getPayouts);
router.post('/payouts/:id/release', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.releasePayout);
// Withdrawals
router.get('/withdrawals', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getWithdrawals);
router.patch('/withdrawals/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.processWithdrawal);
router.get('/settings', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.getPlatformSettings);
router.put('/settings', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), adminController_1.updatePlatformSettings);
exports.default = router;
