"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, reviewController_1.createReview); // Internal check in controller handles roles
router.get('/creator/:id', reviewController_1.getCreatorReviews);
router.get('/brand/:id', reviewController_1.getBrandReviews);
exports.default = router;
