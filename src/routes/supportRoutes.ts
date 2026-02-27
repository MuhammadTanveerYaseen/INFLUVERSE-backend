import express from 'express';
import { createTicket, getUserTickets, getAllTickets, updateTicketStatus } from '../controllers/supportController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createTicket);
router.get('/', protect, getUserTickets);

router.get('/admin', protect, authorize('admin'), getAllTickets);
router.put('/:id', protect, authorize('admin'), updateTicketStatus);

export default router;
