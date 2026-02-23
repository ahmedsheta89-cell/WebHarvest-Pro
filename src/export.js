/**
 * WebHarvest Pro - Export Module
 * تصدير المنتجات بصيغ متعددة
 */

import { CONFIG, ConfigManager } from './config.js';

// Excel Export (using SheetJS)
const ExcelExporter = {
    async export(products, options = {}) {
        // Load SheetJS dynamically
        if (typeof XLSX === 'undefined') {
            await this.loadSheetJS();
        }

        const data = products.map(p => ({
            'الاسم (EN)': p.name || '',
            'الاسم (AR)': p.nameAr || '',
            'الوصف (EN)': p.description || '',
            'الوصف (AR)': p.descriptionAr || '',
            'السعر': p.price || 0,
            'سعر المقارنة': p.comparePrice || '',
            'سعر الشراء': p.purchasePrice || '',
            'هامش الربح': p.profitMargin || '',
            'الربح': p.profit || '',
            'القسم': p.categoryAr || p.category || '',
            'الوسوم': (p.tags || []).join(', '),
            'الصور': (p.images || []).map(i => i.url).join('\n'),
            'SKU': p.sku || p.sourceId || '',
            'المصدر': p.source || '',
            'رابط المصدر': p.sourceUrl || '',
            'الحالة': p.status || 'active',
            'الكمية': p.quantity || 0,
            'تاريخ الإضافة': p.addedAt || p.scrapedAt || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

        // Add header styling
        const colWidths = [
            { wch: 30 }, // Name EN
            { wch: 30 }, // Name AR
            { wch: 50 }, // Desc EN
            { wch: 50 }, // Desc AR
            { wch: 12 }, // Price
            { wch: 12 }, // Compare Price
            { wch: 12 }, // Purchase Price
            { wch: 10 }, // Profit Margin
            { wch: 10 }, // Profit
            { wch: 20 }, // Category
            { wch: 30 }, // Tags
            { wch: 50 }, // Images
            { wch: 15 }, // SKU
            { wch: 15 }, // Source
            { wch: 40 }, // Source URL
            { wch: 10 }, // Status
            { wch: 10 }, // Quantity
            { wch: 20 }  // Date
        ];
        worksheet['!cols'] = colWidths;

        // Generate file
        const filename = options.filename || `products_${this.getDateString()}.xlsx`;
        XLSX.writeFile(workbook, filename);

        return {
            success: true,
            filename,
            count: products.length
        };
    },

    async loadSheetJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
};

// WooCommerce CSV Export
const WooCommerceExporter = {
    export(products, options = {}) {
        const headers = [
            'ID', 'Type', 'SKU', 'Name', 'Published', 'Short description', 
            'Description', 'Categories', 'Tags', 'Images', 'Regular price', 
            'Sale price', 'Stock status', 'Stock'
        ];

        const rows = products.map((p, index) => [
            index + 1,
            'simple',
            p.sku || p.sourceId || '',
            p.nameAr || p.name,
            1,
            (p.descriptionAr || p.description || '').substring(0, 200),
            p.descriptionAr || p.description || '',
            p.categoryAr || p.category || '',
            (p.tags || []).join(', '),
            (p.images || []).map(i => i.url).join(', '),
            p.comparePrice || p.price,
            p.price,
            'instock',
            p.quantity || 100
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        this.download(csv, options.filename || 'woocommerce_products.csv', 'text/csv');

        return { success: true, count: products.length };
    },

    download(content, filename, type) {
        const blob = new Blob(['\ufeff' + content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Shopify CSV Export
const ShopifyExporter = {
    export(products, options = {}) {
        const headers = [
            'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 
            'Type', 'Tags', 'Published', 'Option1 Name', 'Option1 Value',
            'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker',
            'Variant Inventory Qty', 'Variant Price', 'Variant Compare At Price',
            'Image Src', 'Image Position', 'Status'
        ];

        const rows = products.map(p => [
            p.handle || this.slugify(p.name),
            p.nameAr || p.name,
            `<p>${p.descriptionAr || p.description || ''}</p>`,
            p.vendor || 'Sale Zone',
            p.categoryAr || p.category || '',
            p.categoryAr || p.category || '',
            (p.tags || []).join(', '),
            'TRUE',
            'Title',
            'Default Title',
            p.sku || p.sourceId || '',
            '',
            'shopify',
            p.quantity || 100,
            p.price,
            p.comparePrice || '',
            (p.images[0] || {}).url || '',
            1,
            'active'
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        this.download(csv, options.filename || 'shopify_products.csv', 'text/csv');

        return { success: true, count: products.length };
    },

    slugify(text) {
        return (text || 'product')
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    download(content, filename, type) {
        const blob = new Blob(['\ufeff' + content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// JSON Export
const JSONExporter = {
    export(products, options = {}) {
        const json = JSON.stringify(products, null, 2);
        const filename = options.filename || `products_${this.getDateString()}.json`;

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        return { success: true, filename, count: products.length };
    },

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
};

// Google Sheets Export
const GoogleSheetsExporter = {
    async export(products, options = {}) {
        // This would require Google Sheets API setup
        return {
            requiresAuth: true,
            message: 'Google Sheets export requires OAuth setup',
            alternative: 'Use Excel export and import manually to Google Sheets'
        };
    }
};

// Sale Zone Store Export
const SaleZoneExporter = {
    export(products, options = {}) {
        // Generate products.json for the store
        const storeProducts = products.map(p => ({
            id: p.id,
            name: p.nameAr || p.name,
            nameEn: p.name,
            description: p.descriptionAr || p.description,
            descriptionEn: p.description,
            price: p.price,
            oldPrice: p.comparePrice,
            category: p.categoryAr || p.category,
            categoryEn: p.category,
            image: (p.images[0] || {}).url || '',
            images: p.images.map(i => i.url),
            tags: p.tags || [],
            sku: p.sku || p.sourceId,
            inStock: true,
            featured: false
        }));

        const filename = options.filename || 'products.json';
        const json = JSON.stringify(storeProducts, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        return { success: true, filename, count: products.length };
    }
};

// Main Export Manager
const ExportManager = {
    async export(format, products, options = {}) {
        const exporters = {
            'excel': ExcelExporter,
            'woocommerce': WooCommerceExporter,
            'shopify': ShopifyExporter,
            'json': JSONExporter,
            'googlesheets': GoogleSheetsExporter,
            'salezone': SaleZoneExporter
        };

        const exporter = exporters[format.toLowerCase()];
        
        if (!exporter) {
            throw new Error(`Unknown export format: ${format}`);
        }

        return await exporter.export(products, options);
    },

    getAvailableFormats() {
        return [
            { id: 'excel', name: 'Excel', icon: '📊', extension: '.xlsx' },
            { id: 'woocommerce', name: 'WooCommerce CSV', icon: '🛒', extension: '.csv' },
            { id: 'shopify', name: 'Shopify CSV', icon: '🏪', extension: '.csv' },
            { id: 'json', name: 'JSON', icon: '📄', extension: '.json' },
            { id: 'googlesheets', name: 'Google Sheets', icon: '📈', extension: '' },
            { id: 'salezone', name: 'Sale Zone', icon: '🛍️', extension: '.json' }
        ];
    }
};

export { 
    ExcelExporter, 
    WooCommerceExporter, 
    ShopifyExporter, 
    JSONExporter, 
    GoogleSheetsExporter,
    SaleZoneExporter,
    ExportManager 
};
