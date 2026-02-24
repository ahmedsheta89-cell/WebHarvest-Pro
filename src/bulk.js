/**
 * WebHarvest Pro - Bulk Operations Module
 * عمليات جماعية على المنتجات
 */

import { productManager } from './products.js';
import { translator } from './translate.js';

// Bulk Operations Manager
class BulkOperations {
    constructor() {
        this.selectedProducts = new Set();
        this.operations = [];
    }

    // Select products
    selectProducts(productIds) {
        productIds.forEach(id => this.selectedProducts.add(id));
        return this.selectedProducts.size;
    }

    // Clear selection
    clearSelection() {
        this.selectedProducts.clear();
    }

    // Bulk update
    async bulkUpdate(updates) {
        const results = [];
        for (const id of this.selectedProducts) {
            try {
                const product = await productManager.getProduct(id);
                const updated = { ...product, ...updates };
                await productManager.updateProduct(id, updated);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        return results;
    }

    // Bulk delete
    async bulkDelete() {
        const results = [];
        for (const id of this.selectedProducts) {
            try {
                await productManager.deleteProduct(id);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        this.clearSelection();
        return results;
    }

    // Bulk translate
    async bulkTranslate(targetLang = 'ar') {
        const results = [];
        for (const id of this.selectedProducts) {
            try {
                const product = await productManager.getProduct(id);
                const translated = await translator.translateBatch([
                    product.name,
                    product.description
                ], 'en', targetLang);
                
                const updated = {
                    ...product,
                    nameAr: translated[0],
                    descriptionAr: translated[1]
                };
                
                await productManager.updateProduct(id, updated);
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        return results;
    }

    // Bulk price adjustment
    async bulkPriceAdjustment(adjustment) {
        const results = [];
        for (const id of this.selectedProducts) {
            try {
                const product = await productManager.getProduct(id);
                let newPrice = product.price;
                
                if (adjustment.type === 'percentage') {
                    newPrice = product.price * (1 + adjustment.value / 100);
                } else if (adjustment.type === 'fixed') {
                    newPrice = product.price + adjustment.value;
                }
                
                const updated = {
                    ...product,
                    price: Math.round(newPrice * 100) / 100
                };
                
                await productManager.updateProduct(id, updated);
                results.push({ id, success: true, oldPrice: product.price, newPrice: updated.price });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }
        return results;
    }

    // Get selection count
    getSelectionCount() {
        return this.selectedProducts.size;
    }

    // Check if product is selected
    isSelected(productId) {
        return this.selectedProducts.has(productId);
    }

    // Toggle selection
    toggleSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        return this.isSelected(productId);
    }
}

// Export singleton
const bulkOperations = new BulkOperations();
export { bulkOperations, BulkOperations };
