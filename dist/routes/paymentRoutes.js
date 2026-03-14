"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Creator Wallet & Onboarding
router.get('/wallet', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), paymentController_1.PaymentController.getWallet);
router.post('/onboard', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), paymentController_1.PaymentController.onboardCreator);
router.post('/withdraw', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), paymentController_1.PaymentController.withdraw);
// Brand Payments
router.post('/create-intent', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), paymentController_1.PaymentController.createOrderPayment);
router.post('/confirm', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), paymentController_1.PaymentController.confirmPayment); // Should ideally be webhook or secure callback
// Admin
router.post('/release', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), paymentController_1.PaymentController.releasePayment);
exports.default = router;
