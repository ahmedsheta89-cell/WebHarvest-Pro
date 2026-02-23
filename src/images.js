/**
 * WebHarvest Pro - Image Management Module
 * رفع وتحسين الصور على Cloudinary
 */

import { CONFIG, ConfigManager } from './config.js';

// Cloudinary Image Uploader
class ImageManager {
    constructor() {
        this.uploadQueue = [];
        this.uploadedUrls = new Map();
    }

    // Upload single image to Cloudinary
    async uploadImage(imageUrl, options = {}) {
        const cloudName = CONFIG.cloudinary.cloudName;
        const uploadPreset = CONFIG.cloudinary.uploadPreset;
        const folder = options.folder || CONFIG.cloudinary.folder;

        if (!cloudName) {
            throw new Error('Cloudinary Cloud Name غير مُعد');
        }

        try {
            const formData = new FormData();
            formData.append('file', imageUrl);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', folder);
            
            // Image transformations
            if (CONFIG.images.maxWidth || CONFIG.images.maxHeight) {
                formData.append('transformation', JSON.stringify({
                    width: CONFIG.images.maxWidth,
                    height: CONFIG.images.maxHeight,
                    crop: 'limit',
                    quality: CONFIG.images.quality,
                    format: CONFIG.images.format
                }));
            }

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                url: data.secure_url,
                publicId: data.public_id,
                width: data.width,
                height: data.height,
                format: data.format,
                size: data.bytes
            };

        } catch (error) {
            console.error('Image upload error:', error);
            return {
                success: false,
                error: error.message,
                originalUrl: imageUrl
            };
        }
    }

    // Upload multiple images
    async uploadImages(images, options = {}) {
        const results = [];
        const concurrency = options.concurrency || 3;

        for (let i = 0; i < images.length; i += concurrency) {
            const batch = images.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map(img => this.uploadImage(img.url || img, options))
            );
            results.push(...batchResults);

            // Update progress if callback provided
            if (options.onProgress) {
                options.onProgress({
                    current: Math.min(i + concurrency, images.length),
                    total: images.length
                });
            }
        }

        return results;
    }

    // Get optimized URL
    getOptimizedUrl(publicId, options = {}) {
        const cloudName = CONFIG.cloudinary.cloudName;
        const transformations = [];

        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.quality) transformations.push(`q_${options.quality}`);
        if (options.format) transformations.push(`f_${options.format}`);

        const transformStr = transformations.join(',');
        const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;

        if (transformStr) {
            return `${baseUrl}/${transformStr}/${publicId}`;
        }
        return `${baseUrl}/${publicId}`;
    }

    // Remove background (requires Cloudinary AI addon)
    async removeBackground(imageUrl) {
        const cloudName = CONFIG.cloudinary.cloudName;
        const uploadPreset = CONFIG.cloudinary.uploadPreset;

        try {
            const formData = new FormData();
            formData.append('file', imageUrl);
            formData.append('upload_preset', uploadPreset);
            formData.append('background_removal', 'ai_remove_bg');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            const data = await response.json();

            return {
                success: true,
                url: data.secure_url,
                publicId: data.public_id
            };

        } catch (error) {
            // Background removal might not be available
            console.warn('Background removal not available:', error);
            return {
                success: false,
                error: 'Background removal requires Cloudinary AI addon'
            };
        }
    }

    // Pick best image from array
    pickBestImage(images) {
        if (!images || images.length === 0) return null;
        if (images.length === 1) return images[0];

        // Score each image
        const scored = images.map(img => {
            let score = 0;
            
            // Prefer larger images
            if (img.width && img.height) {
                score += (img.width * img.height) / 100000;
            }

            // Prefer images with alt text
            if (img.alt && img.alt.length > 0) {
                score += 10;
            }

            // Prefer certain formats
            if (img.url) {
                if (img.url.includes('.webp')) score += 5;
                if (img.url.includes('.jpg') || img.url.includes('.jpeg')) score += 3;
                if (img.url.includes('.png')) score += 2;
            }

            return { ...img, score };
        });

        // Sort by score and return best
        scored.sort((a, b) => b.score - a.score);
        return scored[0];
    }

    // Delete image from Cloudinary
    async deleteImage(publicId) {
        // This requires API secret which should be done server-side
        console.log('Delete requires server-side implementation:', publicId);
        return { requiresServer: true };
    }

    // Generate thumbnails
    generateThumbnails(publicId, sizes = [150, 300, 600]) {
        return sizes.map(size => ({
            size,
            url: this.getOptimizedUrl(publicId, {
                width: size,
                height: size,
                crop: 'fill',
                quality: 'auto',
                format: 'webp'
            })
        }));
    }
}

// Google Vision API (for product recognition)
const VisionAPI = {
    async analyzeImage(imageUrl) {
        // Would require API key setup
        return {
            requiresApiKey: true,
            message: 'Google Vision API requires setup'
        };
    },

    async detectText(imageUrl) {
        // OCR functionality
        return {
            requiresApiKey: true,
            message: 'Google Vision OCR requires setup'
        };
    }
};

// Export instances
const imageManager = new ImageManager();
export { imageManager, VisionAPI };
