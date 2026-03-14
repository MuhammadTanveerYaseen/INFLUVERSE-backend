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
exports.deleteFromCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
/**
 * Deletes a file from Cloudinary based on its public ID.
 * @param publicId The public ID of the resource to delete.
 * @param resourceType The type of resource ('image', 'video', etc.). Defaults to 'image'.
 */
const deleteFromCloudinary = (publicId_1, ...args_1) => __awaiter(void 0, [publicId_1, ...args_1], void 0, function* (publicId, resourceType = 'image') {
    try {
        const result = yield cloudinary_1.v2.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    }
    catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
