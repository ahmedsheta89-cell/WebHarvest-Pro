/**
 * WebHarvest Pro - Translation Module
 * ترجمة فورية باستخدام Google Translate API المجاني
 */

import { CONFIG, ConfigManager } from './config.js';

// Google Translate (Free - via MyMemory API)
class Translator {
    constructor() {
        this.cache = new Map();
        this.queue = [];
        this.processing = false;
    }

    // Translate single text
    async translate(text, sourceLang = 'en', targetLang = 'ar') {
        if (!text || text.trim() === '') {
            return { original: text, translated: '' };
        }

        // Check cache first
        const cacheKey = `${sourceLang}-${targetLang}-${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Use MyMemory Free API (limit: 1000 chars/request, 10000 chars/day)
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.responseStatus === 200) {
                const result = {
                    original: text,
                    translated: data.responseData.translatedText,
                    confidence: data.responseData.confidence || null
                };

                // Cache the result
                this.cache.set(cacheKey, result);
                return result;
            }

            // Fallback: try LibreTranslate
            return await this.translateWithLibre(text, sourceLang, targetLang);

        } catch (error) {
            console.error('Translation error:', error);
            return {
                original: text,
                translated: text,
                error: error.message
            };
        }
    }

    // LibreTranslate fallback
    async translateWithLibre(text, sourceLang = 'en', targetLang = 'ar') {
        try {
            const response = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang
                })
            });

            const data = await response.json();
            
            return {
                original: text,
                translated: data.translatedText || text
            };

        } catch (error) {
            return {
                original: text,
                translated: text,
                error: 'Translation service unavailable'
            };
        }
    }

    // Batch translate with rate limiting
    async translateBatch(texts, sourceLang = 'en', targetLang = 'ar', options = {}) {
        const results = [];
        const delay = options.delay || 300; // Rate limiting

        for (let i = 0; i < texts.length; i++) {
            const result = await this.translate(texts[i], sourceLang, targetLang);
            results.push(result);

            if (options.onProgress) {
                options.onProgress({
                    current: i + 1,
                    total: texts.length
                });
            }

            // Rate limiting delay
            if (i < texts.length - 1) {
                await this.delay(delay);
            }
        }

        return results;
    }

    // Translate product
    async translateProduct(product) {
        const translations = {};

        // Translate name
        if (product.name) {
            const nameResult = await this.translate(product.name);
            product.nameAr = nameResult.translated;
        }

        // Translate description
        if (product.description) {
            const descResult = await this.translate(product.description);
            product.descriptionAr = descResult.translated;
        }

        // Translate category
        if (product.category && product.category !== 'Uncategorized') {
            const catResult = await this.translate(product.category);
            product.categoryAr = catResult.translated;
        }

        return product;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()).slice(0, 10)
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Auto-detect language
const LanguageDetector = {
    async detect(text) {
        // Simple detection based on character ranges
        const arabicPattern = /[\u0600-\u06FF]/;
        const englishPattern = /^[a-zA-Z0-9\s\.,!?'"-]+$/;

        if (arabicPattern.test(text)) return 'ar';
        if (englishPattern.test(text)) return 'en';
        
        return 'unknown';
    }
};

// Category translation mapping
const CategoryTranslations = {
    'skincare': 'بشرة وعناية',
    'hair': 'شعر',
    'baby': 'أطفال',
    'vitamins': 'فيتامينات ومعادن',
    'devices': 'أجهزة طبية',
    'medicine': 'أدوية',
    'supplements': 'مكملات غذائية',
    'personal care': 'عناية شخصية',
    'beauty': 'جمال',
    'health': 'صحة'
};

// Translate category
function translateCategory(category) {
    const normalized = category.toLowerCase().trim();
    return CategoryTranslations[normalized] || category;
}

// Export instances
const translator = new Translator();
export { translator, LanguageDetector, translateCategory, CategoryTranslations };
