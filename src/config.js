/**
 * WebHarvest Pro - Configuration Module
 * إعدادات Firebase + Cloudinary + السكرابر
 */

const CONFIG = {
    // Firebase Configuration
    firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        databaseURL: ""
    },

    // Cloudinary Configuration
    cloudinary: {
        cloudName: "",
        apiKey: "",
        uploadPreset: "",
        folder: "webharvest-products"
    },

    // Scraper Settings
    scraper: {
        timeout: 30000,
        retries: 3,
        delay: 1000,
        maxProducts: 500,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        concurrency: 5
    },

    // Image Settings
    images: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        format: "webp",
        removeBackground: false,
        preferredSource: "first" // first, largest, best
    },

    // Price Rules
    pricing: {
        profitMargin: 20, // percentage
        minProfit: 5, // minimum profit
        rounding: 0.99, // price ending (e.g., 99.99)
        currency: "EGP",
        exchangeRate: 1
    },

    // Categories
    categories: [
        { id: "skincare", name: "بشرة وعناية", icon: "🧴" },
        { id: "hair", name: "شعر", icon: "💇" },
        { id: "baby", name: "أطفال", icon: "👶" },
        { id: "vitamins", name: "فيتامينات ومعادن", icon: "💊" },
        { id: "devices", name: "أجهزة طبية", icon: "🏥" },
        { id: "medicine", name: "أدوية", icon: "💉" }
    ],

    // Reference Websites
    websites: [
        { url: "alolastores.com", name: "Alola Stores", type: "shopify" },
        { url: "infinityclinicpharma.com", name: "Infinity Clinic Pharma", type: "shopify" },
        { url: "alabdellatif-tarshouby.com", name: "Al-Abdellatif Tarshouby", type: "react" },
        { url: "sallypharmacies.com", name: "Sally Pharmacies", type: "react" }
    ],

    // Export Templates
    export: {
        excel: true,
        wooCommerce: true,
        shopify: true,
        googleSheets: true,
        json: true,
        saleZone: true
    },

    // Translation
    translation: {
        sourceLang: "en",
        targetLang: "ar",
        provider: "google" // google, libre
    },

    // Store Info
    store: {
        name: "Sale Zone Store",
        url: "https://sale-zone.github.io/store/",
        currency: "EGP",
        language: "ar"
    },

    // Alerts
    alerts: {
        lowStock: 10,
        priceChange: 5, // percentage
        newProducts: true,
        errors: true
    },

    // Sync Settings
    sync: {
        autoSync: false,
        interval: 60, // minutes
        lastSync: null
    }
};

// Get/Set Configuration
const ConfigManager = {
    get(key) {
        const keys = key.split('.');
        let value = CONFIG;
        for (const k of keys) {
            value = value?.[k];
        }
        return value;
    },

    set(key, value) {
        const keys = key.split('.');
        let obj = CONFIG;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save();
    },

    save() {
        localStorage.setItem('webharvest_config', JSON.stringify(CONFIG));
    },

    load() {
        const saved = localStorage.getItem('webharvest_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(CONFIG, parsed);
        }
        return CONFIG;
    },

    reset() {
        localStorage.removeItem('webharvest_config');
        location.reload();
    },

    validate() {
        const errors = [];
        if (!CONFIG.firebase.projectId) errors.push('Firebase Project ID مطلوب');
        if (!CONFIG.cloudinary.cloudName) errors.push('Cloudinary Cloud Name مطلوب');
        return errors;
    }
};

// Initialize on load
ConfigManager.load();

export { CONFIG, ConfigManager };
