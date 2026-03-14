"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, orderController_1.getOrders);
router.get('/:id', authMiddleware_1.protect, orderController_1.getOrderById);
router.post('/package', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), orderController_1.createPackageOrder);
router.post('/:id/cancel', authMiddleware_1.protect, orderController_1.cancelOrder); // Added
router.put('/:id/deliver', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), orderController_1.submitDeliverable);
router.put('/:id/review', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), orderController_1.reviewDeliverable);
exports.default = router;
