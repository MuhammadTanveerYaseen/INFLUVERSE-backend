"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const cloudinary_1 = require("../config/cloudinary");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Publicly accessible if needed, or protected
// We'll protect it for now to ensure only logged in users can upload
router.post('/', authMiddleware_1.protect, cloudinary_1.upload.single('file'), uploadController_1.uploadMedia);
exports.default = router;
