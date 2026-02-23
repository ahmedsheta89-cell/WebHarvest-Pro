WebHarvest Pro - Bulk Operations Module
عمليات جماعية على المنتجات

import { productManager } from './products.js';
import { translator } from './translate.js';
import { imageManager } from './images.js';
import { removeBg } from './removebg.js';
import { pdfGenerator } from './pdf.js';
import { Formatters } from './utils.js';

// Bulk Operations Handler
class BulkOperations {
    constructor() {
        this.operations = new Map();
        this.history = [];
        this.maxHistory = 50;
    }

    // ==================== Translation ====================

    async bulkTranslate(productIds, options = {}) {
        const operation = this.startOperation('ترجمة جماعية', productIds.length);
        const results = { success: 0, failed: 0, errors: [] };

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product) {
                    results.failed++;
                    continue;
                }

                // Translate name and description
                const translations = {};

                if (product.name && !product.nameAr) {
                    translations.nameAr = await translator.translate(product.name, 'en', 'ar');
                }

                if (product.description && !product.descriptionAr) {
                    translations.descriptionAr = await translator.translate(product.description, 'en', 'ar');
                }

                if (Object.keys(translations).length > 0) {
                    await productManager.updateProduct(id, translations);
                    results.success++;
                }

                operation.progress++;
                this.updateProgress(operation);

                // Rate limiting
                await this.delay(300);
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    // ==================== Image Processing ====================

    async bulkUploadImages(productIds, options = {}) {
        const operation = this.startOperation('رفع صور جماعي', productIds.length);
        const results = { success: 0, failed: 0, errors: [], uploaded: [] };

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product || !product.images?.length) {
                    results.failed++;
                    continue;
                }

                const uploadedUrls = [];
                for (const imageUrl of product.images) {
                    if (imageUrl.includes('cloudinary.com')) {
                        uploadedUrls.push(imageUrl);
                        continue;
                    }

                    const result = await imageManager.uploadImage(imageUrl, {
                        folder: `products/${id}`,
                        transformation: options.transformation
                    });

                    if (result.success) {
                        uploadedUrls.push(result.url);
                    }
                }

                if (uploadedUrls.length > 0) {
                    await productManager.updateProduct(id, { images: uploadedUrls });
                    results.success++;
                    results.uploaded.push(...uploadedUrls);
                }

                operation.progress++;
                this.updateProgress(operation);

                await this.delay(500);
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    async bulkRemoveBackground(productIds, options = {}) {
        const operation = this.startOperation('إزالة خلفية جماعية', productIds.length);
        const results = { success: 0, failed: 0, errors: [], processed: 0 };

        // Check if remove.bg is available
        if (!removeBg.isEnabled()) {
            return { 
                error: 'Remove.bg API غير مُفعل',
                requiresSetup: true 
            };
        }

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product || !product.images?.length) {
                    results.failed++;
                    continue;
                }

                const processedImages = [];
                for (const imageUrl of product.images.slice(0, 1)) { // Process first image only
                    const result = await removeBg.removeBackgroundFromUrl(imageUrl, options);
                    if (result.success) {
                        processedImages.push(result.url);
                        results.processed++;
                    }
                }

                if (processedImages.length > 0) {
                    await productManager.updateProduct(id, { 
                        images: [...processedImages, ...product.images.slice(1)] 
                    });
                    results.success++;
                }

                operation.progress++;
                this.updateProgress(operation);

                await this.delay(1000); // Slower for remove.bg
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    // ==================== Price Updates ====================

    async bulkUpdatePrices(productIds, options = {}) {
        const operation = this.startOperation('تحديث أسعار جماعي', productIds.length);
        const results = { success: 0, failed: 0, errors: [], updated: [] };

        const { profitMargin, minProfit, discount } = options;

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product) {
                    results.failed++;
                    continue;
                }

                const updates = {};

                // Apply discount
                if (discount && product.salePrice) {
                    updates.salePrice = Math.round(product.salePrice * (1 - discount / 100));
                }

                // Recalculate profit
                if (product.purchasePrice && (product.salePrice || updates.salePrice)) {
                    const salePrice = updates.salePrice || product.salePrice;
                    updates.profit = salePrice - product.purchasePrice;
                    updates.profitMargin = Math.round((updates.profit / product.purchasePrice) * 100);
                }

                if (Object.keys(updates).length > 0) {
                    await productManager.updateProduct(id, updates);
                    results.success++;
                    results.updated.push({ id, ...updates });
                }

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    async bulkApplyProfitMargin(productIds, margin, options = {}) {
        const operation = this.startOperation('تطبيق هامش ربح جماعي', productIds.length);
        const results = { success: 0, failed: 0, errors: [] };

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product || !product.purchasePrice) {
                    results.failed++;
                    continue;
                }

                const salePrice = Math.round(product.purchasePrice * (1 + margin / 100));
                const profit = salePrice - product.purchasePrice;

                await productManager.updateProduct(id, {
                    salePrice,
                    profit,
                    profitMargin: margin
                });

                results.success++;

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    // ==================== Category Management ====================

    async bulkAssignCategory(productIds, category, options = {}) {
        const operation = this.startOperation('تعيين فئة جماعي', productIds.length);
        const results = { success: 0, failed: 0 };

        for (const id of productIds) {
            try {
                await productManager.updateProduct(id, { category, categoryAr: options.categoryAr });
                results.success++;

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    async bulkAutoCategories(productIds, options = {}) {
        const operation = this.startOperation('تصنيف تلقائي جماعي', productIds.length);
        const results = { success: 0, failed: 0, suggestions: [] };

        for (const id of productIds) {
            try {
                const product = await productManager.getProduct(id);
                if (!product) {
                    results.failed++;
                    continue;
                }

                // Auto-detect category from name/description
                const text = `${product.name} ${product.description}`.toLowerCase();
                let detectedCategory = null;

                const categoryKeywords = {
                    skincare: ['cream', 'lotion', 'serum', 'moisturizer', 'بشرة', 'كريم', 'لوشن', 'سيروم'],
                    hair: ['shampoo', 'conditioner', 'hair', 'شعر', 'شامبو'],
                    makeup: ['lipstick', 'mascara', 'foundation', 'مكياج', 'روج', 'كحل'],
                    perfumes: ['perfume', 'fragrance', 'عطر', 'بارفان'],
                    supplements: ['vitamin', 'supplement', 'فيتامين', 'مكمل'],
                    electronics: ['phone', 'laptop', 'charger', 'هاتف', 'لابتوب', 'شاحن']
                };

                for (const [cat, keywords] of Object.entries(categoryKeywords)) {
                    if (keywords.some(kw => text.includes(kw))) {
                        detectedCategory = cat;
                        break;
                    }
                }

                if (detectedCategory) {
                    await productManager.updateProduct(id, { category: detectedCategory });
                    results.success++;
                    results.suggestions.push({ id, category: detectedCategory });
                }

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    // ==================== Stock Management ====================

    async bulkUpdateStock(productIds, stockUpdates, options = {}) {
        const operation = this.startOperation('تحديث مخزون جماعي', productIds.length);
        const results = { success: 0, failed: 0 };

        for (const id of productIds) {
            try {
                const stock = stockUpdates[id] ?? options.defaultStock ?? 0;
                await productManager.updateProduct(id, { stock });
                results.success++;

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    async bulkSetOutOfStock(productIds) {
        return this.bulkUpdateStock(productIds, {}, { defaultStock: 0 });
    }

    async bulkSetInStock(productIds, quantity = 10) {
        return this.bulkUpdateStock(productIds, {}, { defaultStock: quantity });
    }

    // ==================== Status Management ====================

    async bulkUpdateStatus(productIds, status, options = {}) {
        const operation = this.startOperation('تحديث حالة جماعي', productIds.length);
        const results = { success: 0, failed: 0 };

        for (const id of productIds) {
            try {
                await productManager.updateProduct(id, { status });
                results.success++;

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    async bulkPublish(productIds) {
        return this.bulkUpdateStatus(productIds, 'published');
    }

    async bulkDraft(productIds) {
        return this.bulkUpdateStatus(productIds, 'draft');
    }

    async bulkArchive(productIds) {
        return this.bulkUpdateStatus(productIds, 'archived');
    }

    // ==================== Delete Operations ====================

    async bulkDelete(productIds, options = {}) {
        const operation = this.startOperation('حذف جماعي', productIds.length);
        const results = { success: 0, failed: 0, deleted: [] };

        // Save to history before deletion
        const productsToDelete = [];
        for (const id of productIds) {
            const product = await productManager.getProduct(id);
            if (product) {
                productsToDelete.push(product);
            }
        }

        this.saveToHistory({
            type: 'bulk-delete',
            products: productsToDelete,
            timestamp: Date.now()
        });

        for (const id of productIds) {
            try {
                await productManager.deleteProduct(id);
                results.success++;
                results.deleted.push(id);

                operation.progress++;
                this.updateProgress(operation);
            } catch (error) {
                results.failed++;
            }
        }

        this.completeOperation(operation, results);
        return results;
    }

    // ==================== Export Operations ====================

    async bulkExport(productIds, format, options = {}) {
        const products = [];
        for (const id of productIds) {
            const product = await productManager.getProduct(id);
            if (product) products.push(product);
        }

        return { products, format, count: products.length };
    }

    // ==================== Progress Management ====================

    startOperation(name, total) {
        const operation = {
            id: Date.now(),
            name,
            total,
            progress: 0,
            status: 'running',
            startTime: Date.now()
        };

        this.operations.set(operation.id, operation);
        this.emitEvent('operation:start', operation);
        return operation;
    }

    updateProgress(operation) {
        const progress = Math.round((operation.progress / operation.total) * 100);
        this.emitEvent('operation:progress', { ...operation, progressPercent: progress });
    }

    completeOperation(operation, results) {
        operation.status = 'completed';
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;
        operation.results = results;

        this.operations.delete(operation.id);
        this.emitEvent('operation:complete', operation);
    }

    // ==================== History Management ====================

    saveToHistory(record) {
        this.history.unshift(record);
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }
        localStorage.setItem('bulk-operations-history', JSON.stringify(this.history));
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('bulk-operations-history');
            if (saved) {
                this.history = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }

    getHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('bulk-operations-history');
    }

    // ==================== Helpers ====================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    emitEvent(event, data) {
        window.dispatchEvent(new CustomEvent(`bulk-operations:${event}`, { detail: data }));
    }

    // ==================== Batch Processing ====================

    async processBatch(items, processor, options = {}) {
        const { batchSize = 10, delayBetweenBatches = 1000 } = options;
        const results = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => processor(item).catch(e => ({ error: e })))
            );
            results.push(...batchResults);

            if (i + batchSize < items.length) {
                await this.delay(delayBetweenBatches);
            }
        }

        return results;
    }
}

// Export singleton
const bulkOperations = new BulkOperations();
export { bulkOperations, BulkOperations };