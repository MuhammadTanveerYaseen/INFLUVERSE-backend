"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supportController_1 = require("../controllers/supportController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, supportController_1.createTicket);
router.get('/', authMiddleware_1.protect, supportController_1.getUserTickets);
router.get('/admin', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), supportController_1.getAllTickets);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), supportController_1.updateTicketStatus);
exports.default = router;
