"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const brandController_1 = require("../controllers/brandController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/register', brandController_1.registerBrand);
router.get('/profile', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), brandController_1.getBrandProfile);
router.put('/profile', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), brandController_1.updateBrandProfile);
router.get('/dashboard', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('brand'), brandController_1.getBrandDashboardStats);
exports.default = router;
