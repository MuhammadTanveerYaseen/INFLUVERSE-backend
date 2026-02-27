import express from 'express';
import { downloadInvoice } from '../controllers/invoiceController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:orderId', protect, authorize('brand'), downloadInvoice);

export default router;
