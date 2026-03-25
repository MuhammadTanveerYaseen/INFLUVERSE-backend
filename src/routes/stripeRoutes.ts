import express from 'express';
import { StripeController } from '../controllers/stripeController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create-account', protect, authorize('creator'), StripeController.createAccount);
router.post('/onboarding-link', protect, authorize('creator'), StripeController.generateOnboardingLink);

export default router;
