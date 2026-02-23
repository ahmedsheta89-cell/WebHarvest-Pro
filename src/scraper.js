/**
 * WebHarvest Pro - Smart Scraper Module
 * سكرابر ذكي يكتشف نوع الموقع ويسحب البيانات
 */

import { CONFIG, ConfigManager } from './config.js';

// Site Type Detection
const SiteDetector = {
    async detect(url) {
        const hostname = new URL(url).hostname.replace('www.', '');
        
        // Check known sites first
        const knownSite = CONFIG.websites.find(w => hostname.includes(w.url));
        if (knownSite) return knownSite.type;

        // Try to detect from response
        try {
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 'User-Agent': CONFIG.scraper.userAgent }
            });
            const html = await response.text();

            // Shopify detection
            if (html.includes('Shopify') || 
                html.includes('shopify') ||
                html.includes('cdn.shopify.com')) {
                return 'shopify';
            }

            // WooCommerce detection
            if (html.includes('woocommerce') || 
                html.includes('wc-') ||
                html.includes('wp-content')) {
                return 'woocommerce';
            }

            // React/SPA detection
            if (html.includes('__NEXT_DATA__') ||
                html.includes('react') ||
                html.includes('data-reactroot')) {
                return 'react';
            }

            // Magento detection
            if (html.includes('Magento') || html.includes('mage/')) {
                return 'magento';
            }

            return 'generic';
        } catch (error) {
            console.error('Detection error:', error);
            return 'generic';
        }
    }
};

// Shopify Scraper (JSON API)
const ShopifyScraper = {
    async getProducts(baseUrl, options = {}) {
        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                // Shopify JSON API
                const url = `${baseUrl}/products.json?limit=250&page=${page}`;
                const response = await fetch(url);
                const data = await response.json();

                if (!data.products || data.products.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const product of data.products) {
                    const processed = this.processProduct(product, baseUrl);
                    products.push(processed);
                }

                page++;
                
                // Rate limiting
                await this.delay(CONFIG.scraper.delay);

                if (products.length >= (options.maxProducts || CONFIG.scraper.maxProducts)) {
                    hasMore = false;
                }
            } catch (error) {
                console.error(`Shopify scrape error: ${error.message}`);
                hasMore = false;
            }
        }

        return products;
    },

    processProduct(product, baseUrl) {
        const images = product.images?.map(img => ({
            url: img.src,
            alt: img.alt || product.title,
            width: img.width,
            height: img.height
        })) || [];

        const variants = product.variants?.map(v => ({
            id: v.id,
            sku: v.sku,
            price: parseFloat(v.price),
            comparePrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
            available: v.available,
            title: v.title
        })) || [];

        return {
            id: `shopify_${product.id}`,
            sourceId: product.id.toString(),
            source: 'shopify',
            sourceUrl: `${baseUrl}/products/${product.handle}`,
            name: product.title,
            nameAr: null, // Will be translated
            description: product.body_html?.replace(/<[^>]*>/g, '') || '',
            descriptionAr: null,
            price: variants[0]?.price || 0,
            comparePrice: variants[0]?.comparePrice,
            images: images,
            variants: variants,
            category: product.product_type || 'Uncategorized',
            tags: product.tags?.split(', ') || [],
            vendor: product.vendor,
            handle: product.handle,
            scrapedAt: new Date().toISOString()
        };
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Generic/React SPA Scraper
const GenericScraper = {
    async getProducts(url, options = {}) {
        // This would use a proxy/server-side scraping
        // For now, return a message about server requirement
        return {
            requiresServer: true,
            message: 'هذا الموقع يحتاج scraping من السيرفر',
            url: url
        };
    },

    async scrapeWithPlaywright(url) {
        // This would be implemented server-side
        console.log('Playwright scraping for:', url);
        return [];
    }
};

// Main Scraper Class
class WebHarvestScraper {
    constructor() {
        this.progress = { current: 0, total: 0, status: 'idle' };
        this.abortController = null;
    }

    async scrape(url, options = {}) {
        this.progress = { current: 0, total: 0, status: 'running' };
        this.abortController = new AbortController();

        try {
            // Detect site type
            const siteType = await SiteDetector.detect(url);
            console.log(`Detected site type: ${siteType} for ${url}`);

            let products = [];

            switch (siteType) {
                case 'shopify':
                    products = await ShopifyScraper.getProducts(url, options);
                    break;
                case 'woocommerce':
                    // WooCommerce API implementation
                    products = await this.scrapeWooCommerce(url, options);
                    break;
                case 'react':
                case 'magento':
                case 'generic':
                    products = await GenericScraper.getProducts(url, options);
                    break;
                default:
                    throw new Error(`Unknown site type: ${siteType}`);
            }

            this.progress.status = 'completed';
            return {
                success: true,
                siteType,
                totalProducts: products.length,
                products
            };

        } catch (error) {
            this.progress.status = 'error';
            return {
                success: false,
                error: error.message
            };
        }
    }

    async scrapeWooCommerce(url, options = {}) {
        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                // Try public REST API
                const apiUrl = `${url}/wp-json/wc/v3/products?per_page=100&page=${page}`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    // API might be protected
                    return { requiresAuth: true, url };
                }

                const data = await response.json();
                
                if (!data.length) {
                    hasMore = false;
                    break;
                }

                for (const product of data) {
                    products.push(this.processWooProduct(product, url));
                }

                page++;
                await this.delay(CONFIG.scraper.delay);

            } catch (error) {
                console.error('WooCommerce scrape error:', error);
                hasMore = false;
            }
        }

        return products;
    }

    processWooProduct(product, baseUrl) {
        return {
            id: `woo_${product.id}`,
            sourceId: product.id.toString(),
            source: 'woocommerce',
            sourceUrl: product.permalink,
            name: product.name,
            nameAr: null,
            description: product.short_description?.replace(/<[^>]*>/g, '') || '',
            descriptionAr: null,
            price: parseFloat(product.price) || 0,
            comparePrice: product.regular_price ? parseFloat(product.regular_price) : null,
            images: product.images?.map(img => ({
                url: img.src,
                alt: img.alt || product.name,
                width: null,
                height: null
            })) || [],
            category: product.categories?.[0]?.name || 'Uncategorized',
            tags: product.tags?.map(t => t.name) || [],
            scrapedAt: new Date().toISOString()
        };
    }

    async scrapeMultiple(urls, options = {}) {
        const results = [];
        
        for (const url of urls) {
            const result = await this.scrape(url, options);
            results.push({ url, ...result });
        }

        return results;
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.progress.status = 'cancelled';
        }
    }

    getProgress() {
        return this.progress;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const scraper = new WebHarvestScraper();
export { scraper, SiteDetector, ShopifyScraper, GenericScraper };
