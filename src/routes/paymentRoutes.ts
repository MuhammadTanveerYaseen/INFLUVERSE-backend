
import express from 'express';
import { PaymentController } from '../controllers/paymentController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Creator Wallet & Onboarding
router.get('/wallet', protect, authorize('creator'), PaymentController.getWallet);
router.post('/onboard', protect, authorize('creator'), PaymentController.onboardCreator);
router.post('/withdraw', protect, authorize('creator'), PaymentController.withdraw);

// Brand Payments
router.post('/create-intent', protect, authorize('brand'), PaymentController.createOrderPayment);
router.post('/confirm', protect, authorize('brand'), PaymentController.confirmPayment); // Should ideally be webhook or secure callback

// Admin
router.post('/release', protect, authorize('admin'), PaymentController.releasePayment);

export default router;
