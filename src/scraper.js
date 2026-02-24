/**
 * WebHarvest Pro - Universal Smart Scraper
 * سكرابر ذكي يدعم أي موقع من الواجهة
 */

import { CONFIG, configManager } from './config.js';

// Universal Site Scraper
class UniversalScraper {
    constructor() {
        this.selectors = {};
        this.patterns = {};
    }

    // تعريف أنماط السكرابنج
    definePatterns(siteType, patterns) {
        this.patterns[siteType] = patterns;
    }

    // كشف نوع الموقع تلقائياً
    async detectSiteType(url) {
        const patterns = {
            shopify: [
                '/products/',
                'shopify',
                'cdn.shopify.com',
                'myshopify.com'
            ],
            woocommerce: [
                '/product/',
                'woocommerce',
                '/shop/',
                'add-to-cart'
            ],
            magento: [
                '/catalog/',
                'magento',
                'mage/'
            ],
            custom: []
        };

        const hostname = new URL(url).hostname;
        
        for (const [type, indicators] of Object.entries(patterns)) {
            for (const indicator of indicators) {
                if (url.includes(indicator) || hostname.includes(indicator)) {
                    return type;
                }
            }
        }
        
        return 'custom';
    }

    // استخراج البيانات من أي موقع
    async scrape(url, customSelectors = null) {
        const siteType = await this.detectSiteType(url);
        const selectors = customSelectors || this.getDefaultSelectors(siteType);
        
        // هذا سيعمل من السيرفر
        return {
            requiresServer: true,
            url: url,
            siteType: siteType,
            selectors: selectors,
            message: 'سيتم السكرابنج من السيرفر'
        };
    }

    // المحددات الافتراضية لكل نوع موقع
    getDefaultSelectors(siteType) {
        const defaults = {
            shopify: {
                name: ['h1.product-title', '.product-single__title', 'h1[class*="title"]'],
                price: ['.price', '.product-price', '[class*="price"]'],
                description: ['.product-description', '.rte', '[class*="description"]'],
                images: ['.product-photos img', '.product-single__photo img', '[class*="product"] img'],
                availability: ['.product-instock', '.availability', '[class*="stock"]']
            },
            woocommerce: {
                name: ['.product-title', '.woocommerce-product-title', 'h1'],
                price: ['.price', '.woocommerce-Price-amount', '[class*="price"]'],
                description: ['.woocommerce-product-details__short-description', '.description'],
                images: ['.woocommerce-product-gallery img', '.product-image img'],
                availability: ['.stock', '.availability']
            },
            magento: {
                name: ['.product-name', '.page-title', 'h1'],
                price: ['.price-box', '.price', '[class*="price"]'],
                description: ['.product-description', '.description'],
                images: ['.product-image img', '.gallery-image']
            },
            custom: {
                name: ['h1', 'h2.product-name', '[itemprop="name"]'],
                price: ['[itemprop="price"]', '.price', '[class*="price"]'],
                description: ['[itemprop="description"]', '.description', '#description'],
                images: ['img.product-image', '[itemprop="image"]', 'img[class*="product"]'],
                availability: ['[itemprop="availability"]', '.stock', '[class*="availability"]']
            }
        };

        return defaults[siteType] || defaults.custom;
    }
}

// Scraper Manager - للتحكم من الواجهة
class ScraperManager {
    constructor() {
        this.scraper = new UniversalScraper();
        this.queue = [];
        this.results = [];
        this.processing = false;
    }

    // إضافة موقع للسكرابنج
    addToQueue(url, selectors = null, options = {}) {
        const task = {
            id: Date.now(),
            url: url,
            selectors: selectors,
            options: options,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.queue.push(task);
        return task.id;
    }

    // إضافة قائمة مواقع
    addBulkUrls(urls, selectors = null) {
        const ids = [];
        for (const url of urls) {
            ids.push(this.addToQueue(url, selectors));
        }
        return ids;
    }

    // بدء المعالجة
    async processQueue(onProgress = null) {
        if (this.processing) return;
        this.processing = true;

        const results = [];
        
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            task.status = 'processing';
            
            if (onProgress) onProgress(task);

            try {
                const result = await this.scraper.scrape(task.url, task.selectors);
                task.status = 'completed';
                task.result = result;
                results.push(result);
            } catch (error) {
                task.status = 'failed';
                task.error = error.message;
            }

            this.results.push(task);
            
            // تأخير بين الطلبات
            await this.delay(CONFIG.scraping?.delay || 1000);
        }

        this.processing = false;
        return results;
    }

    // إلغاء المعالجة
    cancel() {
        this.queue = [];
        this.processing = false;
    }

    // الحصول على النتائج
    getResults() {
        return this.results;
    }

    // مسح النتائج
    clearResults() {
        this.results = [];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Browser-based Scraper (يعمل مباشرة في المتصفح)
class BrowserScraper {
    constructor() {
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
    }

    // جلب صفحة عبر CORS proxy
    async fetchPage(url) {
        try {
            const proxyUrl = `${this.corsProxy}${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            return this.parseHTML(html);
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // تحويل HTML إلى DOM
    parseHTML(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    // استخراج البيانات باستخدام المحددات
    extractData(doc, selectors) {
        const data = {};

        for (const [key, selectorList] of Object.entries(selectors)) {
            const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
            
            for (const selector of selectors) {
                const element = doc.querySelector(selector);
                if (element) {
                    if (key === 'images') {
                        data[key] = this.extractImages(doc, selectors);
                    } else if (key === 'price') {
                        data[key] = this.extractPrice(element);
                    } else {
                        data[key] = element.textContent?.trim() || '';
                    }
                    break;
                }
            }
        }

        return data;
    }

    // استخراج الصور
    extractImages(doc, selectors) {
        const images = [];
        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => {
                const src = el.src || el.dataset.src || el.href;
                if (src && !images.includes(src)) {
                    images.push(this.resolveUrl(src));
                }
            });
        }
        return images;
    }

    // استخراج السعر
    extractPrice(element) {
        const text = element.textContent || element.value || '';
        const match = text.match(/[\d,]+\.?\d*/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    }

    // تحويل الرابط النسبي إلى مطلق
    resolveUrl(url, baseUrl = '') {
        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    }

    // السكرابنج الرئيسي
    async scrape(url, selectors = null) {
        const doc = await this.fetchPage(url);
        const siteType = await new UniversalScraper().detectSiteType(url);
        const finalSelectors = selectors || new UniversalScraper().getDefaultSelectors(siteType);
        
        const data = this.extractData(doc, finalSelectors);
        
        return {
            success: true,
            url: url,
            siteType: siteType,
            ...data,
            scrapedAt: new Date().toISOString()
        };
    }
}

// Create instances
const universalScraper = new UniversalScraper();
const scraperManager = new ScraperManager();
const browserScraper = new BrowserScraper();

// Export
export { 
    UniversalScraper, 
    ScraperManager, 
    BrowserScraper,
    universalScraper,
    scraperManager,
    browserScraper
};
