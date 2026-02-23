/**
 * WebHarvest Pro - Sync & Integration Module
 *     // Get Excel data
    getExcelData() {
        return this.excelData;
    }

    // Match product with Excel data
    matchWithExcel(product) {
        if (!this.excelData || this.excelData.length === 0) return null;

        // Try matching by barcode
        if (product.barcode) {
            const match = this.excelData.find(row => row.barcode === product.barcode);
            if (match) return match;
        }

        // Try matching by SKU
        if (product.sku) {
            const match = this.excelData.find(row => 
                row.sku && row.sku.toLowerCase() === product.sku.toLowerCase()
            );
            if (match) return match;
        }

        // Try fuzzy matching by name
        const productName = (product.name || '').toLowerCase();
        const match = this.excelData.find(row => {
            const rowName = (row.name || row.productName || '').toLowerCase();
            return productName.includes(rowName) || rowName.includes(productName);
        });

        return match || null;
    }

    // Sync all products with Excel
    async syncAllWithExcel(options = {}) {
        const products = await productManager.getAllProducts();
        const results = { matched: 0, updated: 0, unmatched: [] };

        for (const product of products) {
            const match = this.matchWithExcel(product);
            if (match) {
                results.matched++;
                if (match.purchasePrice && product.purchasePrice !== match.purchasePrice) {
                    await productManager.updateProduct(product.id, {
                        purchasePrice: match.purchasePrice
                    });
                    results.updated++;
                }
            } else {
                results.unmatched.push({
                    id: product.id,
                    name: product.nameAr || product.name
                });
            }
        }

        return results;
    }

    // Sync progress
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }

    emitProgress(progress) {
        this.progressCallbacks.forEach(cb => cb(progress));
    }
}

// Export singleton
const syncManager = new SyncManager();
export { syncManager, SyncManager };
