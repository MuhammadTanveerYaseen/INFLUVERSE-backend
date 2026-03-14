"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect); // All routes are protected
router.get('/', notificationController_1.getUserNotifications);
router.put('/:id/read', notificationController_1.markNotificationRead);
router.put('/read-all', notificationController_1.markAllNotificationsRead);
router.delete('/:id', notificationController_1.deleteNotification);
exports.default = router;
