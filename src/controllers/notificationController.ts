import { Request, Response } from 'express';
import Notification from '../models/Notification';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user._id || req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const skipAmount = (page - 1) * limit;

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'username')
            .sort({ createdAt: -1 })
            .skip(skipAmount)
            .limit(limit);

        const total = await Notification.countDocuments({ recipient: userId });
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.json({
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req: Request | any, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id || req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        const updated = await notification.save();

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req: Request | any, res: Response) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id || req.user.id, isRead: false },
            { isRead: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req: Request | any, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id || req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await Notification.findByIdAndDelete(notification._id);

        res.json({ message: 'Notification deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
