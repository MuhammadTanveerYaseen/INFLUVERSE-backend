import { v2 as cloudinary } from 'cloudinary';

/**
 * Deletes a file from Cloudinary based on its public ID.
 * @param publicId The public ID of the resource to delete.
 * @param resourceType The type of resource ('image', 'video', etc.). Defaults to 'image'.
 */
export const deleteFromCloudinary = async (publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};
