/**
 * WebHarvest Pro - Product Manager Module
 * إدارة المنتجات والعمليات
 */

import { CONFIG, ConfigManager } from './config.js';
import { firebaseDB } from './firebase.js';
import { scraper } from './scraper.js';
import { imageManager } from './images.js';
import { translator } from './translate.js';
import { PriceCalculator, DuplicateDetector, CategoryDetector, ActivityLogger, OfflineStorage, Formatters } from './utils.js';

// Product Status Constants
const ProductStatus = {
    DRAFT: 'draft',           // مسودة
    PENDING: 'pending',       // في الانتظار
    APPROVED: 'approved',     // معتمد
    PUBLISHED: 'published',   // منشور
    ARCHIVED: 'archived'      // مؤرشف
};

// Product Manager Class
class ProductManager {
    constructor() {
        this.products = [];
        this.selectedProducts = new Set();
        this.filters = {
            search: '',
            category: '',
            status: '',
            minPrice: null,
            maxPrice: null,
            stockLow: false,
            sortBy: 'createdAt',
            sortDesc: true
        };
        this.listeners = [];
    }

    // Initialize
    async initialize() {
        await this.loadProducts();
        await this.loadFromExcel();
        return true;
    }

    // Load products from Firebase
    async loadProducts() {
        try {
            this.products = await firebaseDB.getAllProducts(this.filters);
            this.notifyListeners('products-loaded', this.products);
            return this.products;
        } catch (error) {
            console.error('خطأ في تحميل المنتجات:', error);
            // Try offline storage
            this.products = await OfflineStorage.get('products') || [];
            return this.products;
        }
    }

    // Load purchase prices from Excel
    async loadFromExcel() {
        const excelData = await this.parseExcelFile();
        if (excelData) {
            this.updatePurchasePrices(excelData);
        }
    }

    // Parse Excel file
    async parseExcelFile() {
        // This will be called when user uploads Excel
        return null;
    }

    // Update purchase prices from Excel data
    updatePurchasePrices(excelData) {
        for (const item of excelData) {
            const product = this.products.find(p => 
                p.barcode === item.barcode || 
                p.sku === item.sku ||
                p.name?.toLowerCase() === item.name?.toLowerCase()
            );
            
            if (product) {
                product.purchasePrice = item.purchasePrice;
                product.lastPriceUpdate = Date.now();
            }
        }
    }

    // Add new product
    async addProduct(productData) {
        // Calculate prices if not provided
        if (!productData.salePrice && productData.purchasePrice) {
            const pricing = PriceCalculator.calculate(
                productData.purchasePrice,
                productData.marketPrice || productData.purchasePrice * 1.5
            );
            productData.salePrice = pricing.recommendedPrice;
            productData.profit = pricing.profit;
            productData.profitMargin = pricing.profitMargin;
        }
        
        // Detect category if not provided
        if (!productData.category) {
            productData.category = CategoryDetector.detect(productData.name, productData.description);
        }
        
        // Generate SKU if not provided
        if (!productData.sku) {
            productData.sku = this.generateSKU(productData);
        }
        
        // Generate handle/slug
        if (!productData.handle) {
            productData.handle = this.slugify(productData.name);
        }
        
        // Set default values
        productData.status = productData.status || ProductStatus.DRAFT;
        productData.stock = productData.stock || 0;
        productData.views = 0;
        productData.sales = 0;
        
        // Check for duplicates
        const duplicateCheck = await DuplicateDetector.check(productData, this.products);
        if (duplicateCheck.isDuplicate) {
            productData.duplicateOf = duplicateCheck.matchId;
            productData.status = ProductStatus.PENDING;
        }
        
        // Save to Firebase
        const saved = await firebaseDB.addProduct(productData);
        this.products.unshift(saved);
        
        // Update offline storage
        await OfflineStorage.set('products', this.products);
        
        // Log activity
        ActivityLogger.log('product_add', { name: saved.name, id: saved.id });
        
        this.notifyListeners('product-added', saved);
        return saved;
    }

    // Scrape product from URL
    async scrapeProduct(url, options = {}) {
        try {
            this.notifyListeners('scrape-start', { url });
            
            // Scrape data
            const scrapedData = await scraper.scrape(url, options);
            
            if (!scrapedData) {
                throw new Error('فشل في استخراج البيانات');
            }
            
            // Translate if needed
            if (options.translate !== false && scrapedData.name) {
                const translated = await translator.translate(scrapedData.name, 'en', 'ar');
                scrapedData.nameAr = translated;
            }
            
            if (scrapedData.description) {
                const translatedDesc = await translator.translate(scrapedData.description, 'en', 'ar');
                scrapedData.descriptionAr = translatedDesc;
            }
            
            // Upload images to Cloudinary
            if (options.uploadImages !== false && scrapedData.images?.length > 0) {
                const uploadedImages = await imageManager.uploadBatch(scrapedData.images, {
                    folder: 'products'
                });
                scrapedData.images = uploadedImages;
                scrapedData.mainImage = uploadedImages[0];
            }
            
            // Add source URL
            scrapedData.sourceUrl = url;
            scrapedData.scrapedAt = Date.now();
            
            this.notifyListeners('scrape-complete', scrapedData);
            return scrapedData;
            
        } catch (error) {
            this.notifyListeners('scrape-error', { url, error: error.message });
            throw error;
        }
    }

    // Scrape multiple products
    async scrapeMultiple(urls, options = {}) {
        const results = {
            success: [],
            failed: [],
            duplicates: []
        };
        
        for (let i = 0; i < urls.length; i++) {
            try {
                this.notifyListeners('bulk-scrape-progress', { 
                    current: i + 1, 
                    total: urls.length,
                    url: urls[i]
                });
                
                const scrapedData = await this.scrapeProduct(urls[i], options);
                
                // Check duplicate
                const duplicateCheck = await DuplicateDetector.check(scrapedData, this.products);
                
                if (duplicateCheck.isDuplicate && options.skipDuplicates !== false) {
                    results.duplicates.push({
                        url: urls[i],
                        matchId: duplicateCheck.matchId,
                        similarity: duplicateCheck.similarity
                    });
                    continue;
                }
                
                // Add product
                const product = await this.addProduct(scrapedData);
                results.success.push(product);
                
                // Delay between requests
                if (i < urls.length - 1) {
                    await this.delay(CONFIG.scraping.delay);
                }
                
            } catch (error) {
                results.failed.push({
                    url: urls[i],
                    error: error.message
                });
            }
        }
        
        this.notifyListeners('bulk-scrape-complete', results);
        return results;
    }

    // Update product
    async updateProduct(productId, updates) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) throw new Error('المنتج غير موجود');
        
        // Recalculate prices if needed
        if (updates.purchasePrice || updates.marketPrice) {
            const product = this.products[index];
            const purchasePrice = updates.purchasePrice || product.purchasePrice;
            const marketPrice = updates.marketPrice || product.marketPrice;
            
            const pricing = PriceCalculator.calculate(purchasePrice, marketPrice);
            updates.salePrice = pricing.recommendedPrice;
            updates.profit = pricing.profit;
            updates.profitMargin = pricing.profitMargin;
        }
        
        // Save to Firebase
        const updated = await firebaseDB.updateProduct(productId, updates);
        this.products[index] = { ...this.products[index], ...updated };
        
        // Update offline storage
        await OfflineStorage.set('products', this.products);
        
        ActivityLogger.log('product_update', { id: productId, changes: updates });
        this.notifyListeners('product-updated', this.products[index]);
        
        return this.products[index];
    }

    // Delete product
    async deleteProduct(productId) {
        await firebaseDB.deleteProduct(productId);
        this.products = this.products.filter(p => p.id !== productId);
        this.selectedProducts.delete(productId);
        
        await OfflineStorage.set('products', this.products);
        ActivityLogger.log('product_delete', { id: productId });
        
        this.notifyListeners('product-deleted', productId);
        return true;
    }

    // Bulk operations
    async bulkUpdate(productIds, updates) {
        const updateList = productIds.map(id => ({ id, data: updates }));
        await firebaseDB.bulkUpdateProducts(updateList);
        
        // Update local cache
        for (const id of productIds) {
            const index = this.products.findIndex(p => p.id === id);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], ...updates };
            }
        }
        
        await OfflineStorage.set('products', this.products);
        ActivityLogger.log('bulk_update', { count: productIds.length });
        
        this.notifyListeners('bulk-updated', productIds);
        return true;
    }

    async bulkDelete(productIds) {
        await firebaseDB.bulkDeleteProducts(productIds);
        
        this.products = this.products.filter(p => !productIds.includes(p.id));
        productIds.forEach(id => this.selectedProducts.delete(id));
        
        await OfflineStorage.set('products', this.products);
        ActivityLogger.log('bulk_delete', { count: productIds.length });
        
        this.notifyListeners('bulk-deleted', productIds);
        return true;
    }

    async bulkPublish(productIds) {
        return this.bulkUpdate(productIds, { 
            status: ProductStatus.PUBLISHED,
            publishedAt: Date.now()
        });
    }

    async bulkArchive(productIds) {
        return this.bulkUpdate(productIds, { status: ProductStatus.ARCHIVED });
    }

    // Selection
    toggleSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        this.notifyListeners('selection-changed', [...this.selectedProducts]);
    }

    selectAll() {
        this.products.forEach(p => this.selectedProducts.add(p.id));
        this.notifyListeners('selection-changed', [...this.selectedProducts]);
    }

    clearSelection() {
        this.selectedProducts.clear();
        this.notifyListeners('selection-changed', []);
    }

    getSelectedProducts() {
        return this.products.filter(p => this.selectedProducts.has(p.id));
    }

    // Filtering and Sorting
    setFilter(key, value) {
        this.filters[key] = value;
        this.applyFilters();
    }

    clearFilters() {
        this.filters = {
            search: '',
            category: '',
            status: '',
            minPrice: null,
            maxPrice: null,
            stockLow: false,
            sortBy: 'createdAt',
            sortDesc: true
        };
        this.applyFilters();
    }

    applyFilters() {
        this.loadProducts();
    }

    getFilteredProducts() {
        let filtered = [...this.products];
        
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(search) ||
                p.nameAr?.includes(search) ||
                p.barcode?.includes(search) ||
                p.sku?.toLowerCase().includes(search)
            );
        }
        
        if (this.filters.category) {
            filtered = filtered.filter(p => p.category === this.filters.category);
        }
        
        if (this.filters.status) {
            filtered = filtered.filter(p => p.status === this.filters.status);
        }
        
        if (this.filters.minPrice) {
            filtered = filtered.filter(p => p.salePrice >= this.filters.minPrice);
        }
        
        if (this.filters.maxPrice) {
            filtered = filtered.filter(p => p.salePrice <= this.filters.maxPrice);
        }
        
        if (this.filters.stockLow) {
            filtered = filtered.filter(p => p.stock <= CONFIG.inventory.lowStockThreshold);
        }
        
        // Sort
        filtered.sort((a, b) => {
            let aVal = a[this.filters.sortBy];
            let bVal = b[this.filters.sortBy];
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (this.filters.sortDesc) {
                return aVal > bVal ? -1 : 1;
            }
            return aVal > bVal ? 1 : -1;
        });
        
        return filtered;
    }

    // Categories
    getCategories() {
        const categories = new Set();
        this.products.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        return [...categories].sort();
    }

    // Statistics
    getStats() {
        const products = this.products;
        
        return {
            total: products.length,
            byStatus: {
                draft: products.filter(p => p.status === ProductStatus.DRAFT).length,
                pending: products.filter(p => p.status === ProductStatus.PENDING).length,
                approved: products.filter(p => p.status === ProductStatus.APPROVED).length,
                published: products.filter(p => p.status === ProductStatus.PUBLISHED).length,
                archived: products.filter(p => p.status === ProductStatus.ARCHIVED).length
            },
            byCategory: this.getCategories().map(cat => ({
                name: cat,
                count: products.filter(p => p.category === cat).length
            })),
            stock: {
                inStock: products.filter(p => p.stock > 0).length,
                lowStock: products.filter(p => p.stock > 0 && p.stock <= CONFIG.inventory.lowStockThreshold).length,
                outOfStock: products.filter(p => !p.stock || p.stock === 0).length
            },
            pricing: {
                totalValue: products.reduce((sum, p) => sum + (p.salePrice * (p.stock || 0)), 0),
                totalCost: products.reduce((sum, p) => sum + (p.purchasePrice * (p.stock || 0)), 0),
                potentialProfit: products.reduce((sum, p) => sum + ((p.salePrice - p.purchasePrice) * (p.stock || 0)), 0)
            },
            duplicates: products.filter(p => p.duplicateOf).length
        };
    }

    // Version History
    async getVersionHistory(productId) {
        return firebaseDB.getVersionHistory(productId);
    }

    async restoreVersion(productId, versionId) {
        return firebaseDB.restoreVersion(productId, versionId);
    }

    // Helpers
    generateSKU(product) {
        const prefix = product.category?.substring(0, 3).toUpperCase() || 'PRD';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Event Listeners
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    off(event, callback) {
        this.listeners = this.listeners.filter(l => 
            l.event !== event || l.callback !== callback
        );
    }

    notifyListeners(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent(`product-manager:${event}`, { detail: data }));
    }
}

// Export singleton
const productManager = new ProductManager();
export { productManager, ProductStatus };
