import express from 'express';
import { startChat, sendMessage, getMessages, getUserChats, clearChat, deleteChat, toggleBlockUser, checkBlockStatus, getChatDetails } from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/start', protect, startChat);
router.get('/', protect, getUserChats);
router.post('/block', protect, toggleBlockUser);
router.get('/block/:targetUserId', protect, checkBlockStatus);
router.get('/:chatId', protect, getChatDetails);
router.delete('/:chatId', protect, deleteChat);
router.delete('/:chatId/messages', protect, clearChat);
router.post('/:chatId/messages', protect, sendMessage);
router.get('/:chatId/messages', protect, getMessages);

export default router;
