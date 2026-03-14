"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(categoryController_1.getCategories) // Public
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.createCategory); // Admin Only
router.route('/:id')
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.updateCategory) // Admin Only
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.deleteCategory); // Admin Only
exports.default = router;
