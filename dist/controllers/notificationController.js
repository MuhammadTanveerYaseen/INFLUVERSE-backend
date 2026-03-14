"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUserNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id || req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipAmount = (page - 1) * limit;
        const notifications = yield Notification_1.default.find({ recipient: userId })
            .populate('sender', 'username')
            .sort({ createdAt: -1 })
            .skip(skipAmount)
            .limit(limit);
        const total = yield Notification_1.default.countDocuments({ recipient: userId });
        const unreadCount = yield Notification_1.default.countDocuments({ recipient: userId, isRead: false });
        res.json({
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit)
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserNotifications = getUserNotifications;
// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const notification = yield Notification_1.default.findOne({
            _id: id,
            recipient: req.user._id || req.user.id
        });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        notification.isRead = true;
        const updated = yield notification.save();
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markNotificationRead = markNotificationRead;
// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Notification_1.default.updateMany({ recipient: req.user._id || req.user.id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markAllNotificationsRead = markAllNotificationsRead;
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const notification = yield Notification_1.default.findOne({
            _id: id,
            recipient: req.user._id || req.user.id
        });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        yield Notification_1.default.findByIdAndDelete(notification._id);
        res.json({ message: 'Notification deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteNotification = deleteNotification;
