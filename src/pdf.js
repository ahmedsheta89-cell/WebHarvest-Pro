/**
 * WebHarvest Pro - PDF Generator Module
 * إنشاء تقارير وكاتالوجات PDF
 */

import { CONFIG, ConfigManager } from './config.js';

// PDF Generator using jsPDF
class PDFGenerator {
    constructor() {
        this.doc = null;
        this.pageWidth = 210;
        this.pageHeight = 297;
        this.margin = 15;
        this.currentY = this.margin;
    }

    // Initialize jsPDF
    async init() {
        if (this.doc) return;
        
        // Load jsPDF from CDN
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        this.doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Generate Product Catalog
    async generateCatalog(products, options = {}) {
        await this.init();
        this.doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        this.currentY = this.margin;

        // Header
        this.addHeader(options.title || 'كاتالوج المنتجات');

        // Products
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Check if need new page
            if (this.currentY > this.pageHeight - 60) {
                this.doc.addPage();
                this.currentY = this.margin;
            }

            this.addProductCard(product, i + 1);
        }

        // Footer on all pages
        const totalPages = this.doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);
            this.addFooter(i, totalPages);
        }

        return this.doc;
    }

    addHeader(title) {
        // Background
        this.doc.setFillColor(99, 102, 241);
        this.doc.rect(0, 0, this.pageWidth, 40, 'F');

        // Title
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(24);
        this.doc.text(title, this.pageWidth / 2, 25, { align: 'center' });

        // Date
        this.doc.setFontSize(10);
        const date = new Date().toLocaleDateString('ar-EG');
        this.doc.text(date, this.pageWidth - this.margin, 35, { align: 'right' });

        this.currentY = 50;
    }

    addProductCard(product, index) {
        const cardHeight = 50;
        const cardWidth = this.pageWidth - (this.margin * 2);

        // Card background
        this.doc.setFillColor(249, 250, 251);
        this.doc.roundedRect(this.margin, this.currentY, cardWidth, cardHeight, 3, 3, 'F');

        // Index number
        this.doc.setFillColor(99, 102, 241);
        this.doc.circle(this.margin + 8, this.currentY + 10, 5, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(10);
        this.doc.text(String(index), this.margin + 8, this.currentY + 12, { align: 'center' });

        // Product name
        this.doc.setTextColor(17, 24, 39);
        this.doc.setFontSize(14);
        const name = product.nameAr || product.name || 'منتج بدون اسم';
        this.doc.text(name.substring(0, 40), this.margin + 20, this.currentY + 12);

        // Price
        this.doc.setTextColor(16, 185, 129);
        this.doc.setFontSize(12);
        const price = product.salePrice || product.marketPrice || 0;
        this.doc.text(`${price} جنيه`, this.pageWidth - this.margin - 5, this.currentY + 12, { align: 'right' });

        // Description (truncated)
        this.doc.setTextColor(107, 114, 128);
        this.doc.setFontSize(9);
        const desc = (product.descriptionAr || product.description || '').substring(0, 100);
        if (desc) {
            this.doc.text(desc, this.margin + 5, this.currentY + 25, {
                maxWidth: cardWidth - 10
            });
        }

        // Barcode/SKU
        if (product.barcode || product.sku) {
            this.doc.setFontSize(8);
            this.doc.text(`الباركود: ${product.barcode || product.sku}`, this.margin + 5, this.currentY + 42);
        }

        // Profit badge
        if (product.profit && product.profit > 0) {
            this.doc.setFillColor(16, 185, 129);
            this.doc.roundedRect(this.pageWidth - this.margin - 35, this.currentY + 35, 30, 10, 2, 2, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(8);
            this.doc.text(`ربح ${product.profit}%`, this.pageWidth - this.margin - 20, this.currentY + 42, { align: 'center' });
        }

        this.currentY += cardHeight + 5;
    }

    addFooter(pageNum, totalPages) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(156, 163, 175);
        this.doc.text(
            `صفحة ${pageNum} من ${totalPages}`,
            this.pageWidth / 2,
            this.pageHeight - 10,
            { align: 'center' }
        );
    }

    // Generate Price List
    async generatePriceList(products, options = {}) {
        await this.init();
        this.doc = new window.jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Header
        this.doc.setFillColor(99, 102, 241);
        this.doc.rect(0, 0, 297, 25, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(18);
        this.doc.text('قائمة الأسعار', 148.5, 15, { align: 'center' });

        // Table header
        let y = 35;
        this.doc.setFillColor(243, 244, 246);
        this.doc.rect(10, y, 277, 10, 'F');
        this.doc.setTextColor(55, 65, 81);
        this.doc.setFontSize(10);
        
        const headers = ['#', 'المنتج', 'سعر الشراء', 'سعر السوق', 'سعر البيع', 'الربح'];
        const colWidths = [15, 100, 40, 40, 40, 42];
        let x = 10;
        
        headers.forEach((header, i) => {
            this.doc.text(header, x + colWidths[i]/2, y + 7, { align: 'center' });
            x += colWidths[i];
        });

        // Table rows
        y += 15;
        products.forEach((product, index) => {
            if (y > 200) {
                this.doc.addPage();
                y = 20;
            }

            this.doc.setTextColor(17, 24, 39);
            this.doc.setFontSize(9);
            
            x = 10;
            const row = [
                String(index + 1),
                (product.nameAr || product.name || '').substring(0, 50),
                String(product.purchasePrice || '-'),
                String(product.marketPrice || '-'),
                String(product.salePrice || '-'),
                product.profit ? `${product.profit} جنيه` : '-'
            ];

            row.forEach((cell, i) => {
                this.doc.text(cell, x + colWidths[i]/2, y, { align: 'center' });
                x += colWidths[i];
            });

            y += 8;
        });

        return this.doc;
    }

    // Generate Inventory Report
    async generateInventoryReport(products, options = {}) {
        await this.init();
        this.doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Stats
        const totalProducts = products.length;
        const inStock = products.filter(p => p.stock > 0).length;
        const outOfStock = products.filter(p => !p.stock || p.stock === 0).length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock < 5).length;
        const totalValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);

        // Header
        this.doc.setFillColor(99, 102, 241);
        this.doc.rect(0, 0, this.pageWidth, 50, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(20);
        this.doc.text('تقرير المخزون', this.pageWidth / 2, 25, { align: 'center' });
        this.doc.setFontSize(10);
        this.doc.text(new Date().toLocaleDateString('ar-EG'), this.pageWidth / 2, 40, { align: 'center' });

        // Stats cards
        let y = 60;
        const cardWidth = 42;
        const cardHeight = 30;
        const cards = [
            { label: 'إجمالي المنتجات', value: totalProducts, color: [99, 102, 241] },
            { label: 'متوفر', value: inStock, color: [16, 185, 129] },
            { label: 'نفذ', value: outOfStock, color: [239, 68, 68] },
            { label: 'منخفض', value: lowStock, color: [245, 158, 11] },
            { label: 'القيمة', value: `${totalValue} ج`, color: [139, 92, 246] }
        ];

        let x = 15;
        cards.forEach(card => {
            this.doc.setFillColor(...card.color);
            this.doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(14);
            this.doc.text(String(card.value), x + cardWidth/2, y + 12, { align: 'center' });
            this.doc.setFontSize(7);
            this.doc.text(card.label, x + cardWidth/2, y + 22, { align: 'center' });
            x += cardWidth + 5;
        });

        // Out of stock list
        y = 100;
        this.doc.setTextColor(17, 24, 39);
        this.doc.setFontSize(14);
        this.doc.text('المنتجات النافذة من المخزون', this.margin, y);

        y += 10;
        const outOfStockProducts = products.filter(p => !p.stock || p.stock === 0);
        
        if (outOfStockProducts.length === 0) {
            this.doc.setTextColor(16, 185, 129);
            this.doc.setFontSize(10);
            this.doc.text('✓ جميع المنتجات متوفرة', this.margin, y);
        } else {
            this.doc.setFontSize(9);
            outOfStockProducts.slice(0, 20).forEach((product, i) => {
                if (y > 270) {
                    this.doc.addPage();
                    y = 20;
                }
                this.doc.setTextColor(107, 114, 128);
                this.doc.text(`${i + 1}. ${product.nameAr || product.name}`, this.margin, y);
                y += 6;
            });

            if (outOfStockProducts.length > 20) {
                this.doc.setTextColor(156, 163, 175);
                this.doc.text(`... و ${outOfStockProducts.length - 20} منتج آخر`, this.margin, y);
            }
        }

        return this.doc;
    }

    // Download PDF
    download(filename = 'report.pdf') {
        if (this.doc) {
            this.doc.save(filename);
        }
    }

    // Get blob for upload
    getBlob() {
        if (this.doc) {
            return this.doc.output('blob');
        }
        return null;
    }

    // Get data URL for preview
    getDataURL() {
        if (this.doc) {
            return this.doc.output('dataurlstring');
        }
        return null;
    }
}

// Export singleton
const pdfGenerator = new PDFGenerator();
export { pdfGenerator, PDFGenerator };
