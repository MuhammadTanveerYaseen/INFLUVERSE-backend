"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const verificationController_1 = require("../controllers/verificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/login', authController_1.authUser);
router.get('/verify-email', verificationController_1.verifyEmail);
router.post('/verify-otp', verificationController_1.verifyOTP);
router.post('/resend-verification', authMiddleware_1.protect, verificationController_1.resendVerification);
exports.default = router;
