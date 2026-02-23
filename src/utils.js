/**
 * WebHarvest Pro - Utility Functions
 * أدوات مساعدة وذكاء اصطناعي
 */

import { CONFIG, ConfigManager } from './config.js';

// Price Calculator
const PriceCalculator = {
    calculate(purchasePrice, marketPrice, options = {}) {
        const margin = options.profitMargin || CONFIG.pricing.profitMargin;
        const minProfit = options.minProfit || CONFIG.pricing.minProfit;
        const rounding = options.rounding || CONFIG.pricing.rounding;

        // Calculate suggested selling price
        let sellingPrice = purchasePrice * (1 + margin / 100);
        
        // Apply minimum profit
        if (sellingPrice - purchasePrice < minProfit) {
            sellingPrice = purchasePrice + minProfit;
        }

        // Apply rounding
        if (rounding) {
            sellingPrice = Math.floor(sellingPrice) + rounding;
        }

        // Calculate actual profit and margin
        const profit = sellingPrice - purchasePrice;
        const actualMargin = (profit / purchasePrice) * 100;

        return {
            purchasePrice,
            marketPrice,
            suggestedPrice: parseFloat(sellingPrice.toFixed(2)),
            profit: parseFloat(profit.toFixed(2)),
            profitMargin: parseFloat(actualMargin.toFixed(2)),
            profitPercent: parseFloat(((profit / sellingPrice) * 100).toFixed(2))
        };
    },

    comparePrices(prices) {
        if (!prices || prices.length === 0) return null;

        const sorted = [...prices].sort((a, b) => a.price - b.price);
        
        return {
            lowest: sorted[0],
            highest: sorted[sorted.length - 1],
            average: prices.reduce((sum, p) => sum + p.price, 0) / prices.length,
            range: sorted[sorted.length - 1].price - sorted[0].price
        };
    }
};

// Barcode Scanner
const BarcodeScanner = {
    async scan(imageData) {
        // Would require QuaggaJS or similar library
        return {
            requiresLibrary: true,
            message: 'Barcode scanning requires QuaggaJS library'
        };
    },

    async scanFromCamera() {
        // Camera access for live scanning
        return {
            requiresPermission: true,
            message: 'Camera access required for barcode scanning'
        };
    }
};

// Duplicate Detector
const DuplicateDetector = {
    findDuplicates(products) {
        const duplicates = [];
        const seen = new Map();

        for (const product of products) {
            // Create fingerprint
            const fingerprint = this.createFingerprint(product);

            if (seen.has(fingerprint)) {
                duplicates.push({
                    original: seen.get(fingerprint),
                    duplicate: product,
                    fingerprint
                });
            } else {
                seen.set(fingerprint, product);
            }
        }

        return duplicates;
    },

    createFingerprint(product) {
        // Normalize name for comparison
        const name = (product.name || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Use SKU if available
        if (product.sku) {
            return `sku:${product.sku}`;
        }

        // Use source ID if available
        if (product.sourceId) {
            return `id:${product.sourceId}`;
        }

        // Use normalized name
        return `name:${name}`;
    },

    similarityScore(str1, str2) {
        // Levenshtein distance-based similarity
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();

        const matrix = Array(s2.length + 1).fill(null)
            .map(() => Array(s1.length + 1).fill(null));

        for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= s2.length; j++) {
            for (let i = 1; i <= s1.length; i++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }

        const distance = matrix[s2.length][s1.length];
        const maxLen = Math.max(s1.length, s2.length);
        
        return maxLen === 0 ? 1 : (1 - distance / maxLen);
    }
};

// Auto Category Detector
const CategoryDetector = {
    categories: {
        skincare: ['cream', 'lotion', 'serum', 'moisturizer', 'cleanser', 'toner', 'sunscreen', 'mask', 'بشرة', 'كريم', 'لوشن', 'سيروم'],
        hair: ['shampoo', 'conditioner', 'hair', 'scalp', 'shampoo', 'conditioner', 'شعر', 'شامبو', 'بلسم'],
        baby: ['baby', 'infant', 'toddler', 'diaper', 'أطفال', 'بيبي', 'حفاضات'],
        vitamins: ['vitamin', 'supplement', 'mineral', 'omega', 'zinc', 'vitamin', 'فيتامين', 'مكمل', 'أوميجا'],
        devices: ['blood pressure', 'glucose', 'thermometer', 'monitor', 'device', 'ضغط', 'سكر', 'حرارة', 'جهاز'],
        medicine: ['medicine', 'drug', 'pill', 'capsule', 'tablet', 'syrup', 'دواء', 'حبوب', 'كبسول', 'شراب']
    },

    detect(product) {
        const text = `${product.name} ${product.description} ${product.tags?.join(' ')}`.toLowerCase();

        const scores = {};
        
        for (const [category, keywords] of Object.entries(this.categories)) {
            scores[category] = keywords.reduce((score, keyword) => {
                const regex = new RegExp(keyword.toLowerCase(), 'gi');
                const matches = text.match(regex);
                return score + (matches ? matches.length : 0);
            }, 0);
        }

        // Find best match
        let bestCategory = 'Uncategorized';
        let bestScore = 0;

        for (const [category, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        return {
            category: bestCategory,
            confidence: bestScore > 0 ? bestScore / 10 : 0,
            scores
        };
    }
};

// Activity Logger
const ActivityLogger = {
    logs: [],

    log(action, details = {}) {
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            action,
            details,
            timestamp: new Date().toISOString()
        };

        this.logs.unshift(entry);
        
        // Keep last 1000 logs
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }

        this.save();
        return entry;
    },

    getLogs(filters = {}) {
        let logs = [...this.logs];

        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }

        if (filters.from) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.from));
        }

        if (filters.to) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.to));
        }

        if (filters.limit) {
            logs = logs.slice(0, filters.limit);
        }

        return logs;
    },

    save() {
        localStorage.setItem('webharvest_logs', JSON.stringify(this.logs));
    },

    load() {
        const saved = localStorage.getItem('webharvest_logs');
        if (saved) {
            this.logs = JSON.parse(saved);
        }
    },

    clear() {
        this.logs = [];
        localStorage.removeItem('webharvest_logs');
    }
};

// Initialize logger
ActivityLogger.load();

// Offline Storage
const OfflineStorage = {
    async save(key, data) {
        const stored = {
            data,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(`webharvest_offline_${key}`, JSON.stringify(stored));
    },

    async get(key) {
        const stored = localStorage.getItem(`webharvest_offline_${key}`);
        if (!stored) return null;

        const { data, timestamp } = JSON.parse(stored);
        return { data, timestamp };
    },

    async remove(key) {
        localStorage.removeItem(`webharvest_offline_${key}`);
    },

    async clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('webharvest_offline_'));
        keys.forEach(k => localStorage.removeItem(k));
    }
};

// Format Helpers
const Formatters = {
    currency(amount, currency = 'EGP') {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    date(dateString, locale = 'ar-EG') {
        return new Date(dateString).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    number(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    },

    percentage(value) {
        return `${value.toFixed(1)}%`;
    }
};

// Export all utilities
export {
    PriceCalculator,
    BarcodeScanner,
    DuplicateDetector,
    CategoryDetector,
    ActivityLogger,
    OfflineStorage,
    Formatters
};
