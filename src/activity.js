/**
 * WebHarvest Pro - Activity Log Module
 * سجل كامل لكل العمليات
 */

import { CONFIG, ConfigManager } from './config.js';

// Activity Types
const ActivityTypes = {
    PRODUCT_CREATE: { id: 'product_create', icon: '✅', label: 'إضافة منتج' },
    PRODUCT_UPDATE: { id: 'product_update', icon: '✏️', label: 'تعديل منتج' },
    PRODUCT_DELETE: { id: 'product_delete', icon: '🗑️', label: 'حذف منتج' },
    PRODUCT_SCRAPE: { id: 'product_scrape', icon: '🕷️', label: 'سحب منتج' },
    PRODUCT_TRANSLATE: { id: 'product_translate', icon: '🌐', label: 'ترجمة منتج' },
    
    IMAGE_UPLOAD: { id: 'image_upload', icon: '🖼️', label: 'رفع صورة' },
    IMAGE_REMOVE_BG: { id: 'image_remove_bg', icon: '✂️', label: 'إزالة خلفية' },
    
    BULK_UPDATE: { id: 'bulk_update', icon: '📦', label: 'تعديل جماعي' },
    BULK_DELETE: { id: 'bulk_delete', icon: '📦🗑️', label: 'حذف جماعي' },
    BULK_EXPORT: { id: 'bulk_export', icon: '📤', label: 'تصدير' },
    BULK_IMPORT: { id: 'bulk_import', icon: '📥', label: 'استيراد' },
    
    SYNC_START: { id: 'sync_start', icon: '🔄', label: 'بدء مزامنة' },
    SYNC_COMPLETE: { id: 'sync_complete', icon: '✅', label: 'مزامنة مكتملة' },
    
    ERROR: { id: 'error', icon: '❌', label: 'خطأ' },
    WARNING: { id: 'warning', icon: '⚠️', label: 'تحذير' },
    
    LOGIN: { id: 'login', icon: '🔐', label: 'تسجيل دخول' },
    LOGOUT: { id: 'logout', icon: '🚪', label: 'تسجيل خروج' },
    
    SETTINGS_CHANGE: { id: 'settings_change', icon: '⚙️', label: 'تغيير إعدادات' }
};

// Activity Logger Class
class ActivityLogger {
    constructor() {
        this.activities = [];
        this.maxActivities = 1000;
        this.storageKey = 'webharvest_activities';
        
        this.load();
    }

    // Log an activity
    log(type, details = {}) {
        const activity = {
            id: this.generateId(),
            type: type.id || type,
            icon: type.icon || '📋',
            label: type.label || type,
            details: details,
            timestamp: new Date().toISOString(),
            user: details.user || 'system'
        };

        this.activities.unshift(activity);

        // Keep only max activities
        if (this.activities.length > this.maxActivities) {
            this.activities = this.activities.slice(0, this.maxActivities);
        }

        this.save();
        this.emit('activity', activity);

        return activity;
    }

    // Generate unique ID
    generateId() {
        return 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get all activities
    getAll(limit = 100) {
        return this.activities.slice(0, limit);
    }

    // Get activities by type
    getByType(typeId, limit = 50) {
        return this.activities
            .filter(a => a.type === typeId)
            .slice(0, limit);
    }

    // Get activities by date range
    getByDateRange(startDate, endDate) {
        return this.activities.filter(a => {
            const date = new Date(a.timestamp);
            return date >= startDate && date <= endDate;
        });
    }

    // Get activities for a product
    getProductActivities(productId) {
        return this.activities.filter(a => 
            a.details.productId === productId || 
            a.details.productIds?.includes(productId)
        );
    }

    // Get errors
    getErrors(limit = 50) {
        return this.getByType('error', limit);
    }

    // Get recent activity summary
    getSummary(hours = 24) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);

        const recent = this.activities.filter(a => new Date(a.timestamp) >= cutoff);

        const summary = {
            total: recent.length,
            byType: {},
            errors: 0,
            warnings: 0,
            productsCreated: 0,
            productsUpdated: 0,
            productsDeleted: 0,
            imagesUploaded: 0,
            exports: 0
        };

        recent.forEach(a => {
            // Count by type
            if (!summary.byType[a.type]) {
                summary.byType[a.type] = 0;
            }
            summary.byType[a.type]++;

            // Specific counts
            switch (a.type) {
                case 'error':
                    summary.errors++;
                    break;
                case 'warning':
                    summary.warnings++;
                    break;
                case 'product_create':
                    summary.productsCreated++;
                    break;
                case 'product_update':
                    summary.productsUpdated++;
                    break;
                case 'product_delete':
                    summary.productsDeleted++;
                    break;
                case 'image_upload':
                    summary.imagesUploaded++;
                    break;
                case 'bulk_export':
                    summary.exports++;
                    break;
            }
        });

        return summary;
    }

    // Clear all activities
    clear() {
        this.activities = [];
        this.save();
        this.emit('cleared');
    }

    // Clear activities older than days
    clearOlderThan(days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        this.activities = this.activities.filter(a => 
            new Date(a.timestamp) >= cutoff
        );

        this.save();
        this.emit('cleared-old');
    }

    // Export activities
    export() {
        return {
            exportedAt: new Date().toISOString(),
            count: this.activities.length,
            activities: this.activities
        };
    }

    // Import activities
    import(data) {
        if (data.activities && Array.isArray(data.activities)) {
            this.activities = [...data.activities, ...this.activities];
            this.save();
        }
    }

    // Persistence
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.activities));
        } catch (e) {
            console.error('Failed to save activities:', e);
        }
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.activities = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load activities:', e);
            this.activities = [];
        }
    }

    // Events
    eventListeners = {};

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
    }

    // Format for display
    formatActivity(activity) {
        return {
            ...activity,
            formattedTime: this.formatTime(activity.timestamp),
            formattedDetails: this.formatDetails(activity.details)
        };
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than a minute
        if (diff < 60000) {
            return 'الآن';
        }

        // Less than an hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `منذ ${minutes} دقيقة`;
        }

        // Less than a day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `منذ ${hours} ساعة`;
        }

        // Format as date
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDetails(details) {
        if (!details) return '';

        const parts = [];

        if (details.productName) {
            parts.push(`المنتج: ${details.productName}`);
        }

        if (details.count) {
            parts.push(`العدد: ${details.count}`);
        }

        if (details.error) {
            parts.push(`الخطأ: ${details.error}`);
        }

        return parts.join(' | ');
    }
}

// Create singleton instance
const activityLogger = new ActivityLogger();

// Export
export { activityLogger, ActivityLogger, ActivityTypes };
