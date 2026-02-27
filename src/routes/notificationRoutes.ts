import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from '../controllers/notificationController';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getUserNotifications);
router.put('/:id/read', markNotificationRead);
router.put('/read-all', markAllNotificationsRead);
router.delete('/:id', deleteNotification);

export default router;
