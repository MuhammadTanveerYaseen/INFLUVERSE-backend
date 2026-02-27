import express from 'express';
import { getOrders, getOrderById, submitDeliverable, reviewDeliverable, createPackageOrder, cancelOrder } from '../controllers/orderController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.post('/package', protect, authorize('brand'), createPackageOrder);
router.post('/:id/cancel', protect, cancelOrder); // Added
router.put('/:id/deliver', protect, authorize('creator'), submitDeliverable);
router.put('/:id/review', protect, authorize('brand'), reviewDeliverable);

export default router;
