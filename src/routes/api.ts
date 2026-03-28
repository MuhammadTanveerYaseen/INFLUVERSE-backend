import express from 'express';
import authRoutes from './authRoutes';
import brandRoutes from './brandRoutes';
import creatorRoutes from './creatorRoutes';
import adminRoutes from './adminRoutes';
import offerRoutes from './offerRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import invoiceRoutes from './invoiceRoutes';
import chatRoutes from './chatRoutes';
import uploadRoutes from './uploadRoutes';

const router = express.Router();

import { getPublicPlatformSettings } from '../controllers/adminController';
router.get('/settings/public', getPublicPlatformSettings);

router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API Service is running' });
});

import { getActionsCount } from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';
router.get('/dashboard/actions/count', protect, getActionsCount);

router.use('/auth', authRoutes);
router.use('/brands', brandRoutes);
router.use('/creators', creatorRoutes);
router.use('/admin', adminRoutes);
router.use('/offers', offerRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);

import stripeRoutes from './stripeRoutes';
router.use('/stripe', stripeRoutes);

import notificationRoutes from './notificationRoutes';
router.use('/notifications', notificationRoutes);

import reportRoutes from './reportRoutes';
router.use('/reports', reportRoutes);

import reviewRoutes from './reviewRoutes';
router.use('/reviews', reviewRoutes);

import categoryRoutes from './categoryRoutes';
router.use('/categories', categoryRoutes);


import crmRoutes from './crmRoutes';
router.use('/crm', crmRoutes);

import supportRoutes from './supportRoutes';
router.use('/support', supportRoutes);

export default router;
