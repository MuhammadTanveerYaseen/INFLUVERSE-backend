"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/start', authMiddleware_1.protect, chatController_1.startChat);
router.get('/', authMiddleware_1.protect, chatController_1.getUserChats);
router.post('/:chatId/messages', authMiddleware_1.protect, chatController_1.sendMessage);
router.get('/:chatId/messages', authMiddleware_1.protect, chatController_1.getMessages);
exports.default = router;
