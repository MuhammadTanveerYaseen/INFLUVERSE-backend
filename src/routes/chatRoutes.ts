import express from 'express';
import { startChat, sendMessage, getMessages, getUserChats } from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/start', protect, startChat);
router.get('/', protect, getUserChats);
router.post('/:chatId/messages', protect, sendMessage);
router.get('/:chatId/messages', protect, getMessages);

export default router;
