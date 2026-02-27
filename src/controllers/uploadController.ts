import { Request, Response } from 'express';

export const uploadMedia = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // req.file is populated by multer-storage-cloudinary
        // it contains 'path' (the URL) and 'filename' (public_id)
        const fileData = req.file as any;

        console.log('Upload File Data:', fileData); // Debug log

        const responsePayload = {
            message: 'Upload successful',
            url: fileData.path || fileData.url || (fileData as any).secure_url,
            public_id: fileData.filename,
            resource_type: fileData.mimetype.startsWith('video/') ? 'video' : 'image',
        };

        console.log('Upload Response:', responsePayload); // Debug log

        res.status(200).json(responsePayload);
    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
