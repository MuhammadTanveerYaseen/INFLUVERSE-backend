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
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedia = void 0;
const uploadMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // req.file is populated by multer-storage-cloudinary
        // it contains 'path' (the URL) and 'filename' (public_id)
        const fileData = req.file;
        console.log('Upload File Data:', fileData); // Debug log
        const responsePayload = {
            message: 'Upload successful',
            url: fileData.path || fileData.url || fileData.secure_url,
            public_id: fileData.filename,
            resource_type: fileData.mimetype.startsWith('video/') ? 'video' : 'image',
        };
        console.log('Upload Response:', responsePayload); // Debug log
        res.status(200).json(responsePayload);
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
});
exports.uploadMedia = uploadMedia;
