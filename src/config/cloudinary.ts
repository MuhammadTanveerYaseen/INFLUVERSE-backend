import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'influverse/misc';
        let resource_type = 'auto';

        if (file.mimetype.startsWith('image/')) {
            folder = 'influverse/images';
            resource_type = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'influverse/videos';
            resource_type = 'video';
        } else if (file.mimetype.startsWith('application/') || file.mimetype === 'text/plain') {
            resource_type = 'raw';
            folder = 'influverse/docs';
        }

        const uploadParams: any = {
            folder: folder,
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };

        // REMOVED allowed_formats to fix potential auto conflict. Let Cloudinary handle validation.
        // For raw files, we don't restrict format here to avoid 500 errors from Cloudinary/Multer mismatch
        // Cloudinary 'raw' handles arbitrary file extensions

        return uploadParams;
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

export { cloudinary, upload };
