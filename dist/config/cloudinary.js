"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.cloudinary = exports.storage = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
exports.storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: (req, file) => __awaiter(void 0, void 0, void 0, function* () {
        let folder = 'influverse/misc';
        let resource_type = 'auto';
        if (file.mimetype.startsWith('image/')) {
            folder = 'influverse/images';
            resource_type = 'image';
        }
        else if (file.mimetype.startsWith('video/')) {
            folder = 'influverse/videos';
            resource_type = 'video';
        }
        else if (file.mimetype.startsWith('application/') || file.mimetype === 'text/plain') {
            resource_type = 'raw';
            folder = 'influverse/docs';
        }
        const uploadParams = {
            folder: folder,
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
        // REMOVED allowed_formats to fix potential auto conflict. Let Cloudinary handle validation.
        // For raw files, we don't restrict format here to avoid 500 errors from Cloudinary/Multer mismatch
        // Cloudinary 'raw' handles arbitrary file extensions
        return uploadParams;
    }),
});
const upload = (0, multer_1.default)({
    storage: exports.storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
});
exports.upload = upload;
