/**
 * WebHarvest Pro - Configuration Module
 * إعدادات قابلة للتعديل من الواجهة
 */

// Default Configuration
const DEFAULT_CONFIG = {
    // Firebase Configuration
    firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    },

    // Cloudinary Configuration
    cloudinary: {
        cloudName: "",
        uploadPreset: ""
    },

    // Pricing Settings
    pricing: {
        profitMargin: 25,
        minProfit: 10,
        currency: "EGP",
        exchangeRate: 1
    },

    // Scraping Settings
    scraping: {
        delay: 1000,
        timeout: 30000,
        retries: 3,
        concurrency: 5
    },

    // Categories
    categories: {
        'skincare': { ar: 'العناية بالبشرة', icon: '🧴' },
        'hair': { ar: 'العناية بالشعر', icon: '💇' },
        'health': { ar: 'صحة', icon: '💊' },
        'makeup': { ar: 'مكياج', icon: '💄' },
        'perfume': { ar: 'عطور', icon: '🌸' },
        'personal-care': { ar: 'عناية شخصية', icon: '🧼' },
        'baby': { ar: 'أطفال', icon: '👶' },
        'men': { ar: 'رجالي', icon: '👔' },
        'electronics': { ar: 'إلكترونيات', icon: '📱' },
        'fashion': { ar: 'ملابس', icon: '👗' },
        'home': { ar: 'منزل', icon: '🏠' },
        'sports': { ar: 'رياضة', icon: '⚽' },
        'books': { ar: 'كتب', icon: '📚' },
        'toys': { ar: 'ألعاب', icon: '🎮' },
        'food': { ar: 'طعام', icon: '🍔' },
        'automotive': { ar: 'سيارات', icon: '🚗' }
    },

    // UI Settings
    ui: {
        theme: 'dark',
        language: 'ar',
        rtl: true,
        animations: true
    }
};

// Config Manager - للتحكم من الواجهة
class ConfigManager {
    constructor() {
        this.storageKey = 'webharvest_config';
        this.config = this.load();
    }

    // Load config from localStorage
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
        return { ...DEFAULT_CONFIG };
    }

    // Save config to localStorage
    save(config) {
        try {
            this.config = { ...this.config, ...config };
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (e) {
            console.error('Error saving config:', e);
            return false;
        }
    }

    // Get specific setting
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        for (const key of keys) {
            value = value?.[key];
        }
        return value;
    }

    // Set specific setting
    set(path, value) {
        const keys = path.split('.');
        let obj = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save(this.config);
    }

    // Reset to defaults
    reset() {
        this.config = { ...DEFAULT_CONFIG };
        localStorage.removeItem(this.storageKey);
        return this.config;
    }

    // Export config
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    // Import config
    import(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            this.save(config);
            return true;
        } catch (e) {
            console.error('Error importing config:', e);
            return false;
        }
    }

    // Validate config
    validate() {
        const errors = [];
        const firebase = this.config.firebase;
        const cloudinary = this.config.cloudinary;

        if (!firebase.projectId) {
            errors.push({ field: 'firebase.projectId', message: 'Firebase Project ID مطلوب' });
        }
        if (!cloudinary.cloudName) {
            errors.push({ field: 'cloudinary.cloudName', message: 'Cloudinary Cloud Name مطلوب' });
        }
        if (!cloudinary.uploadPreset) {
            errors.push({ field: 'cloudinary.uploadPreset', message: 'Cloudinary Upload Preset مطلوب' });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Check if configured
    isConfigured() {
        return this.config.firebase.projectId && 
               this.config.cloudinary.cloudName && 
               this.config.cloudinary.uploadPreset;
    }
}

// Create singleton
const configManager = new ConfigManager();
const CONFIG = configManager.config;

// Initialize on load
if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
    window.configManager = configManager;
    window.CONFIG = CONFIG;
}

export { CONFIG, DEFAULT_CONFIG, ConfigManager, configManager };
