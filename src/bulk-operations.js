/**
 * WebHarvest Pro - Bulk Operations
 * تعديل جماعي متقدم للمنتجات
 */

import { CONFIG, configManager } from './config.js';

// Bulk Editor
class BulkEditor {
    constructor() {
        this.selectedProducts = new Set();
        this.operations = [];
        this.history = [];
    }

    // اختيار منتج
    select(productId) {
        this.selectedProducts.add(productId);
    }

    // إلغاء اختيار
    deselect(productId) {
        this.selectedProducts.delete(productId);
    }

    // اختيار الكل
    selectAll(productIds) {
        productIds.forEach(id => this.selectedProducts.add(id));
    }

    // إلغاء اختيار الكل
    clearSelection() {
        this.selectedProducts.clear();
    }

    // الحصول على المحددات
    getSelected() {
        return Array.from(this.selectedProducts);
    }

    // تنفيذ عملية جماعية
    async executeBulk(operation, products, options = {}) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const selectedProducts = products.filter(p => this.selectedProducts.has(p.id));

        for (const product of selectedProducts) {
            try {
                await this.applyOperation(product, operation, options);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    productId: product.id,
                    error: error.message
                });
            }
        }

        // حفظ في السجل
        this.history.push({
            operation: operation,
            productCount: selectedProducts.length,
            results: results,
            timestamp: new Date().toISOString()
        });

        return results;
    }

    // تطبيق العملية
    async applyOperation(product, operation, options) {
        switch (operation) {
            case 'updatePrice':
                product.price = this.calculateNewPrice(product.price, options);
                break;
            case 'updateCategory':
                product.category = options.newCategory;
                break;
            case 'updateStock':
                product.stock = options.newStock;
                break;
            case 'updateStatus':
                product.status = options.newStatus;
                break;
            case 'addTag':
                product.tags = product.tags || [];
                product.tags.push(options.tag);
                break;
            case 'removeTag':
                product.tags = product.tags?.filter(t => t !== options.tag) || [];
                break;
            case 'updateMargin':
                product.price = product.purchasePrice * (1 + options.margin / 100);
                break;
            case 'applyDiscount':
                product.discountPrice = product.price * (1 - options.discountPercent / 100);
                product.hasDiscount = true;
                break;
            case 'removeDiscount':
                delete product.discountPrice;
                product.hasDiscount = false;
                break;
            case 'translate':
                // سيتم تنفيذها في ملف الترجمة
                break;
            case 'delete':
                // سيتم تنفيذها في Firebase
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        product.updatedAt = new Date().toISOString();
        return product;
    }

    // حساب السعر الجديد
    calculateNewPrice(currentPrice, options) {
        if (options.priceType === 'fixed') {
            return options.value;
        } else if (options.priceType === 'percent') {
            return currentPrice * (1 + options.value / 100);
        } else if (options.priceType === 'increase') {
            return currentPrice + options.value;
        }
        return currentPrice;
    }

    // العمليات المتاحة
    getAvailableOperations() {
        return [
            { id: 'updatePrice', name: 'تحديث السعر', icon: '💰' },
            { id: 'updateCategory', name: 'تغيير الفئة', icon: '📁' },
            { id: 'updateStock', name: 'تحديث المخزون', icon: '📦' },
            { id: 'updateStatus', name: 'تغيير الحالة', icon: '🔄' },
            { id: 'addTag', name: 'إضافة وسم', icon: '🏷️' },
            { id: 'removeTag', name: 'إزالة وسم', icon: '❌' },
            { id: 'updateMargin', name: 'تحديث هامش الربح', icon: '📊' },
            { id: 'applyDiscount', name: 'تطبيق خصم', icon: '🏷️' },
            { id: 'removeDiscount', name: 'إزالة خصم', icon: '↩️' },
            { id: 'translate', name: 'ترجمة', icon: '🌐' },
            { id: 'delete', name: 'حذف', icon: '🗑️', dangerous: true }
        ];
    }
}

// Bulk Import
class BulkImporter {
    constructor() {
        this.parsers = {
            csv: this.parseCSV.bind(this),
            json: this.parseJSON.bind(this),
            excel: this.parseExcel.bind(this)
        };
    }

    // استيراد من ملف
    async importFromFile(file, type) {
        const content = await this.readFile(file);
        const parser = this.parsers[type];
        
        if (!parser) {
            throw new Error(`نوع الملف غير مدعوم: ${type}`);
        }
        
        return parser(content);
    }

    // قراءة الملف
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // تحليل CSV
    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const product = {};
                headers.forEach((header, index) => {
                    product[header] = values[index];
                });
                products.push(this.normalizeProduct(product));
            }
        }
        
        return products;
    }

    // تحليل سطر CSV
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        return values;
    }

    // تحليل JSON
    parseJSON(content) {
        const data = JSON.parse(content);
        const products = Array.isArray(data) ? data : [data];
        return products.map(p => this.normalizeProduct(p));
    }

    // تحليل Excel
    async parseExcel(content) {
        // يتطلب مكتبة SheetJS
        if (typeof XLSX === 'undefined') {
            throw new Error('مكتبة SheetJS غير متوفرة');
        }
        
        const workbook = XLSX.read(content, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        return data.map(p => this.normalizeProduct(p));
    }

    // توحيد هيكل المنتج
    normalizeProduct(raw) {
        return {
            id: raw.id || Date.now().toString(),
            name: raw.name || raw['الاسم'] || raw['اسم المنتج'] || '',
            nameAr: raw.nameAr || raw['الاسم عربي'] || '',
            price: parseFloat(raw.price || raw['السعر'] || 0),
            purchasePrice: parseFloat(raw.purchasePrice || raw['سعر الشراء'] || 0),
            category: raw.category || raw['الفئة'] || '',
            stock: parseInt(raw.stock || raw['المخزون'] || 0),
            description: raw.description || raw['الوصف'] || '',
            descriptionAr: raw.descriptionAr || raw['الوصف عربي'] || '',
            images: raw.images ? raw.images.split('|') : [],
            barcode: raw.barcode || raw['الباركود'] || '',
            sku: raw.sku || raw['رمز المنتج'] || '',
            status: raw.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}

// Bulk Export
class BulkExporter {
    constructor() {
        this.formats = ['csv', 'json', 'excel', 'woocommerce', 'shopify'];
    }

    // تصدير المنتجات
    async export(products, format, options = {}) {
        switch (format) {
            case 'csv':
                return this.toCSV(products, options);
            case 'json':
                return this.toJSON(products, options);
            case 'excel':
                return this.toExcel(products, options);
            case 'woocommerce':
                return this.toWooCommerce(products, options);
            case 'shopify':
                return this.toShopify(products, options);
            default:
                throw new Error(`صيغة غير مدعومة: ${format}`);
        }
    }

    // تحويل إلى CSV
    toCSV(products, options) {
        const headers = options.headers || [
            'id', 'name', 'nameAr', 'price', 'purchasePrice', 
            'category', 'stock', 'barcode', 'sku', 'status'
        ];
        
        let csv = headers.join(',') + '\n';
        
        for (const product of products) {
            const row = headers.map(h => {
                const value = product[h] || '';
                // معالجة القيم التي تحتوي على فواصل
                if (String(value).includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csv += row.join(',') + '\n';
        }
        
        return csv;
    }

    // تحويل إلى JSON
    toJSON(products, options) {
        return JSON.stringify(products, null, options.pretty ? 2 : 0);
    }

    // تحويل إلى Excel
    async toExcel(products, options) {
        if (typeof XLSX === 'undefined') {
            throw new Error('مكتبة SheetJS غير متوفرة');
        }
        
        const worksheet = XLSX.utils.json_to_sheet(products);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        
        return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    }

    // تحويل إلى WooCommerce
    toWooCommerce(products, options) {
        return products.map(p => ({
            name: p.nameAr || p.name,
            type: 'simple',
            regular_price: p.price.toString(),
            description: p.descriptionAr || p.description,
            sku: p.sku || p.barcode,
            stock_quantity: p.stock,
            categories: [{ name: p.category }],
            images: p.images?.map(img => ({ src: img })) || [],
            meta_data: [
                { key: '_purchase_price', value: p.purchasePrice },
                { key: 'original_id', value: p.id }
            ]
        }));
    }

    // تحويل إلى Shopify
    toShopify(products, options) {
        return products.map(p => ({
            product: {
                title: p.nameAr || p.name,
                body_html: p.descriptionAr || p.description,
                vendor: 'Sale Zone Store',
                product_type: p.category,
                variants: [{
                    price: p.price.toString(),
                    sku: p.sku || p.barcode,
                    inventory_quantity: p.stock,
                    cost: p.purchasePrice.toString()
                }],
                images: p.images?.map((img, i) => ({
                    src: img,
                    position: i + 1
                })) || []
            }
        }));
    }

    // تحميل الملف
    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create instances
const bulkEditor = new BulkEditor();
const bulkImporter = new BulkImporter();
const bulkExporter = new BulkExporter();

// Export
export { 
    BulkEditor,
    BulkImporter,
    BulkExporter,
    bulkEditor,
    bulkImporter,
    bulkExporter
};
