"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const offerController_1 = require("../controllers/offerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), offerController_1.createOffer);
router.get('/', authMiddleware_1.protect, offerController_1.getOffers);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), offerController_1.respondToOffer);
exports.default = router;
