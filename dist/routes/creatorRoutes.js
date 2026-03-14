"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const creatorController_1 = require("../controllers/creatorController");
const creatorValidator_1 = require("../validators/creatorValidator");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/register', creatorController_1.registerCreator);
router.get('/profile', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), creatorController_1.getCreatorProfile);
router.put('/profile', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), creatorValidator_1.validateCreatorProfile, creatorController_1.updateCreatorProfile);
router.get('/dashboard', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), creatorController_1.getCreatorDashboardStats);
router.post('/social-stats', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('creator'), creatorController_1.refreshSocialStats);
router.get('/', creatorController_1.getCreators); // Public discovery: /api/creators/
router.get('/:id', creatorController_1.getCreatorById); // Public profile: /api/creators/:id
exports.default = router;
