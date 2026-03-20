import express from 'express';
import { authUser, forgotPassword, resetPassword, changePassword, deleteAccount } from '../controllers/authController';
import { verifyEmail, resendVerification, verifyOTP } from '../controllers/verificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.put('/change-password', protect, changePassword);
router.delete('/delete-account', protect, deleteAccount);

router.get('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOTP);
router.post('/resend-verification', protect, resendVerification);

export default router;
