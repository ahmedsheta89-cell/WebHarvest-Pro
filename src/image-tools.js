/**
 * WebHarvest Pro - Image Tools
 * أدوات متقدمة للصور
 */

import { CONFIG, configManager } from './config.js';

// Cloudinary Image Manager
class ImageManager {
    constructor() {
        this.cloudName = '';
        this.uploadPreset = '';
        this.uploadQueue = [];
        this.uploadedImages = new Map();
    }

    // تهيئة Cloudinary
    init(cloudName, uploadPreset) {
        this.cloudName = cloudName;
        this.uploadPreset = uploadPreset;
    }

    // رفع صورة واحدة
    async uploadImage(imageUrl, options = {}) {
        if (!this.cloudName || !this.uploadPreset) {
            throw new Error('Cloudinary غير مُعد');
        }

        const formData = new FormData();
        formData.append('file', imageUrl);
        formData.append('upload_preset', this.uploadPreset);
        
        if (options.folder) {
            formData.append('folder', options.folder);
        }
        if (options.publicId) {
            formData.append('public_id', options.publicId);
        }

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('فشل رفع الصورة');
            }

            const data = await response.json();
            
            return {
                success: true,
                url: data.secure_url,
                publicId: data.public_id,
                width: data.width,
                height: data.height,
                format: data.format,
                bytes: data.bytes
            };
        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // رفع صور متعددة
    async uploadMultiple(images, options = {}) {
        const results = [];
        
        for (let i = 0; i < images.length; i++) {
            const result = await this.uploadImage(images[i], {
                ...options,
                publicId: options.publicIdPrefix ? `${options.publicIdPrefix}_${i + 1}` : undefined
            });
            
            results.push(result);
            
            // تأخير بين الرفع
            if (i < images.length - 1) {
                await this.delay(500);
            }
        }

        return results;
    }

    // إنشاء URL محسن
    getOptimizedUrl(publicId, options = {}) {
        const transformations = [];
        
        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.quality) transformations.push(`q_${options.quality}`);
        if (options.format) transformations.push(`f_${options.format}`);
        if (options.crop) transformations.push(`c_${options.crop}`);
        
        const transformStr = transformations.join(',');
        
        return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformStr}/${publicId}`;
    }

    // إزالة الخلفية (لو Cloudinary Pro)
    async removeBackground(publicId) {
        return this.getOptimizedUrl(publicId, {
            effect: 'background_removal'
        });
    }

    // تأخير
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// معالج الصور
class ImageProcessor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    // تحويل لـ Base64
    async toBase64(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    // تغيير الحجم
    async resize(imageUrl, width, height) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    // إنشاء Thumbnail
    async createThumbnail(imageUrl, size = 200) {
        return this.resize(imageUrl, size, size);
    }

    // استخراج الألوان السائدة
    async extractColors(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const colors = {};
                
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = Math.round(imageData.data[i] / 32) * 32;
                    const g = Math.round(imageData.data[i + 1] / 32) * 32;
                    const b = Math.round(imageData.data[i + 2] / 32) * 32;
                    const color = `rgb(${r},${g},${b})`;
                    colors[color] = (colors[color] || 0) + 1;
                }

                const sorted = Object.entries(colors)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([color]) => color);

                resolve(sorted);
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
}

// معرض الصور
class ImageGallery {
    constructor(container) {
        this.container = container;
        this.images = [];
        this.currentIndex = 0;
    }

    // إضافة صورة
    addImage(url, options = {}) {
        this.images.push({
            url: url,
            thumbnail: options.thumbnail || url,
            caption: options.caption || '',
            isMain: options.isMain || this.images.length === 0
        });
        this.render();
    }

    // تعيين الصورة الرئيسية
    setMain(index) {
        this.images.forEach((img, i) => {
            img.isMain = i === index;
        });
        this.render();
    }

    // حذف صورة
    remove(index) {
        const wasMain = this.images[index].isMain;
        this.images.splice(index, 1);
        if (wasMain && this.images.length > 0) {
            this.images[0].isMain = true;
        }
        this.render();
    }

    // عرض
    render() {
        if (!this.container) return;

        const mainImage = this.images.find(img => img.isMain) || this.images[0];
        
        this.container.innerHTML = `
            <div class="gallery-main">
                ${mainImage ? `<img src="${mainImage.url}" alt="Main product image">` : '<div class="no-image">لا توجد صور</div>'}
            </div>
            <div class="gallery-thumbnails">
                ${this.images.map((img, i) => `
                    <div class="thumbnail ${img.isMain ? 'active' : ''}" data-index="${i}">
                        <img src="${img.thumbnail}" alt="Product image ${i + 1}">
                        <button class="remove-btn" data-index="${i}">✕</button>
                    </div>
                `).join('')}
            </div>
        `;

        // ربط الأحداث
        this.container.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                if (!e.target.classList.contains('remove-btn')) {
                    this.setMain(parseInt(thumb.dataset.index));
                }
            });
        });

        this.container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(parseInt(btn.dataset.index));
            });
        });
    }

    // الحصول على البيانات
    getData() {
        return this.images;
    }

    // تحميل من بيانات
    loadData(images) {
        this.images = images;
        this.render();
    }
}

// Export
const imageManager = new ImageManager();
const imageProcessor = new ImageProcessor();

export { 
    ImageManager, 
    ImageProcessor, 
    ImageGallery,
    imageManager,
    imageProcessor
};
