"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripeController_1 = require("../controllers/stripeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/create-account', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), stripeController_1.StripeController.createAccount);
router.post('/onboarding-link', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), stripeController_1.StripeController.generateOnboardingLink);
router.get('/sync-status', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), stripeController_1.StripeController.syncAccountStatus);
exports.default = router;
