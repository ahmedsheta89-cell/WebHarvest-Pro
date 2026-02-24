/**
 * WebHarvest Pro - Main Application
 * التطبيق الرئيسي
 */

import { CONFIG, ConfigManager, configManager } from './config.js';
import { universalScraper, scraperManager } from './scraper.js';
import { imageManager } from './images.js';
import { translator } from './translate.js';
import { analytics } from './reports.js';
import { qrScanner, barcodeGenerator } from './qr-scanner.js';
import { voiceSearch, voiceCommands } from './voice.js';
import { aiPriceAnalyzer, aiProductSuggestions } from './ai-suggestions.js';
import { bulkEditor, bulkImporter } from './bulk-operations.js';
import { productTemplates, quickFill } from './templates.js';

// Application State
const AppState = {
    products: [],
    currentProduct: null,
    settings: {},
    isLoading: false,
    currentPage: 'home'
};

// Main Application Class
class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 WebHarvest Pro starting...');
        
        // Load settings
        AppState.settings = ConfigManager.load();
        
        // Load products from localStorage
        this.loadProducts();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateStats();
        
        console.log('✅ WebHarvest Pro ready!');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        // Price calculation
        ['purchasePrice', 'marketPrice'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calculateProfit());
            }
        });
    }

    // Page Navigation
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show selected page
        const page = document.getElementById(`${pageName}Page`);
        if (page) {
            page.classList.add('active');
        }

        // Update nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageName) {
                link.classList.add('active');
            }
        });

        AppState.currentPage = pageName;

        // Update page content
        if (pageName === 'products') {
            this.renderProducts();
        } else if (pageName === 'reports') {
            this.renderReports();
        }
    }

    // Products Management
    loadProducts() {
        try {
            const saved = localStorage.getItem('webharvest_products');
            AppState.products = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading products:', e);
            AppState.products = [];
        }
    }

    saveProducts() {
        localStorage.setItem('webharvest_products', JSON.stringify(AppState.products));
        this.updateStats();
    }

    // Scraping
    async scrapeProduct() {
        const urlInput = document.getElementById('productUrl');
        const url = urlInput?.value?.trim();

        if (!url) {
            this.showToast('الرجاء إدخال رابط المنتج', 'warning');
            return;
        }

        try {
            this.showProgress('جاري سحب البيانات...');

            // Use universal scraper
            const product = await universalScraper.scrape(url);

            if (product) {
                this.showProductPreview(product);
                this.showToast('تم سحب البيانات بنجاح', 'success');
            } else {
                throw new Error('لم يتم العثور على بيانات');
            }
        } catch (error) {
            console.error('Scraping error:', error);
            this.showToast(`خطأ: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    showProductPreview(product) {
        AppState.currentProduct = product;

        // Show preview section
        const preview = document.getElementById('productPreview');
        if (preview) preview.style.display = 'block';

        // Fill form
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDesc').value = product.description || '';
        document.getElementById('marketPrice').value = product.price || '';
        document.getElementById('purchasePrice').value = '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productStock').value = 1;

        // Show images
        const imagesContainer = document.getElementById('productImages');
        if (imagesContainer && product.images?.length) {
            imagesContainer.innerHTML = `<img src="${product.images[0]}" alt="${product.name}">`;
        }

        // Get AI suggestions
        this.getAISuggestions(product);

        // Calculate profit
        this.calculateProfit();
    }

    async getAISuggestions(product) {
        const suggestionsDiv = document.getElementById('aiContent');
        if (!suggestionsDiv) return;

        try {
            const suggestions = aiProductSuggestions.generate(product);
            
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item">
                    <strong>التصنيف المقترح:</strong> ${suggestions.suggestedCategory?.ar || 'غير محدد'}
                </div>
                <div class="suggestion-item">
                    <strong>نطاق السعر:</strong> ${suggestions.priceRange?.min} - ${suggestions.priceRange?.max} جنيه
                </div>
                <div class="suggestion-item">
                    <strong>الهامش المقترح:</strong> ${suggestions.suggestedMargin}%
                </div>
            `;
        } catch (e) {
            suggestionsDiv.innerHTML = '<p>لا توجد اقتراحات</p>';
        }
    }

    calculateProfit() {
        const purchase = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
        const market = parseFloat(document.getElementById('marketPrice')?.value) || 0;
        const profit = market - purchase;
        const margin = purchase > 0 ? (profit / purchase) * 100 : 0;

        const profitEl = document.getElementById('profitValue');
        const marginEl = document.getElementById('marginValue');

        if (profitEl) profitEl.textContent = profit.toFixed(2);
        if (marginEl) marginEl.textContent = `(${margin.toFixed(1)}%)`;
    }

    async saveProduct() {
        const product = {
            id: Date.now().toString(),
            name: document.getElementById('productName')?.value || '',
            description: document.getElementById('productDesc')?.value || '',
            purchasePrice: parseFloat(document.getElementById('purchasePrice')?.value) || 0,
            marketPrice: parseFloat(document.getElementById('marketPrice')?.value) || 0,
            category: document.getElementById('productCategory')?.value || 'other',
            stock: parseInt(document.getElementById('productStock')?.value) || 1,
            images: AppState.currentProduct?.images || [],
            source: AppState.currentProduct?.source || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        AppState.products.push(product);
        this.saveProducts();

        this.showToast('تم حفظ المنتج بنجاح', 'success');
        this.clearProductForm();
    }

    saveAndNew() {
        this.saveProduct();
        document.getElementById('productUrl').value = '';
    }

    clearProductForm() {
        const preview = document.getElementById('productPreview');
        if (preview) preview.style.display = 'none';
        
        document.getElementById('productUrl').value = '';
        AppState.currentProduct = null;
    }

    // Products Table
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (AppState.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                        <p>لا توجد منتجات</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.products.map(p => `
            <tr>
                <td><input type="checkbox" data-id="${p.id}"></td>
                <td>
                    <div class="product-cell">
                        <strong>${p.name}</strong>
                        ${p.images[0] ? `<img src="${p.images[0]}" alt="${p.name}" class="product-thumb">` : ''}
                    </div>
                </td>
                <td>${this.getCategoryName(p.category)}</td>
                <td>${p.purchasePrice} ج</td>
                <td>${p.marketPrice} ج</td>
                <td class="${p.marketPrice > p.purchasePrice ? 'text-success' : 'text-danger'}">
                    ${p.marketPrice - p.purchasePrice} ج
                </td>
                <td>
                    <span class="badge ${p.stock <= 5 ? 'badge-warning' : 'badge-success'}">
                        ${p.stock}
                    </span>
                </td>
                <td>
                    <button onclick="app.editProduct('${p.id}')" class="btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button onclick="app.deleteProduct('${p.id}')" class="btn-sm btn-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getCategoryName(cat) {
        const categories = {
            'skincare': 'العناية بالبشرة',
            'hair': 'العناية بالشعر',
            'health': 'الصحة',
            'makeup': 'مستحضرات التجميل',
            'perfume': 'العطور',
            'other': 'أخرى'
        };
        return categories[cat] || cat;
    }

    filterProducts() {
        // Implement filtering logic
        this.renderProducts();
    }

    editProduct(id) {
        const product = AppState.products.find(p => p.id === id);
        if (product) {
            AppState.currentProduct = product;
            this.showPage('scraper');
            this.showProductPreview(product);
        }
    }

    deleteProduct(id) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            AppState.products = AppState.products.filter(p => p.id !== id);
            this.saveProducts();
            this.renderProducts();
            this.showToast('تم حذف المنتج', 'success');
        }
    }

    // Reports
    renderReports() {
        const report = analytics.generateReport(AppState.products);

        // Summary
        const summaryEl = document.getElementById('reportSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="report-stat">
                    <span>إجمالي المنتجات</span>
                    <strong>${report.summary.totalProducts}</strong>
                </div>
                <div class="report-stat">
                    <span>إجمالي القيمة</span>
                    <strong>${report.summary.totalValue.toFixed(2)} ج</strong>
                </div>
                <div class="report-stat">
                    <span>إجمالي الأرباح</span>
                    <strong>${report.summary.totalProfit.toFixed(2)} ج</strong>
                </div>
                <div class="report-stat">
                    <span>متوسط الهامش</span>
                    <strong>${report.summary.avgMargin.toFixed(1)}%</strong>
                </div>
            `;
        }

        // Category Breakdown
        const catEl = document.getElementById('categoryBreakdown');
        if (catEl) {
            const breakdown = Object.entries(report.categoryBreakdown)
                .map(([cat, data]) => `
                    <div class="category-item">
                        <span>${this.getCategoryName(cat)}</span>
                        <span>${data.count} منتج</span>
                        <span>${data.profit.toFixed(2)} ج ربح</span>
                    </div>
                `).join('');
            catEl.innerHTML = breakdown || '<p>لا توجد بيانات</p>';
        }

        // Profit Analysis
        const profitEl = document.getElementById('profitAnalysis');
        if (profitEl) {
            const topProducts = report.topProducts.slice(0, 5)
                .map(p => `
                    <div class="profit-item">
                        <span>${p.name}</span>
                        <span class="profit-value">${p.profit.toFixed(2)} ج</span>
                    </div>
                `).join('');
            profitEl.innerHTML = topProducts || '<p>لا توجد بيانات</p>';
        }

        // Margin Distribution
        const marginEl = document.getElementById('marginDistribution');
        if (marginEl) {
            const distribution = report.marginDistribution
                .map(r => `
                    <div class="margin-bar">
                        <span>${r.label}</span>
                        <div class="bar">
                            <div class="bar-fill" style="width: ${(r.count / AppState.products.length * 100) || 0}%"></div>
                        </div>
                        <span>${r.count}</span>
                    </div>
                `).join('');
            marginEl.innerHTML = distribution || '<p>لا توجد بيانات</p>';
        }
    }

    // QR Scanner
    async startQRScanner() {
        this.showModal(`
            <div class="modal-header">
                <h3>QR Scanner</h3>
                <button onclick="app.closeModal()" class="btn-close">×</button>
            </div>
            <div class="modal-body">
                <video id="qr-video" width="100%" autoplay></video>
                <div id="qr-result" style="margin-top: 15px;"></div>
            </div>
        `);

        try {
            await qrScanner.start('qr-video', (result) => {
                document.getElementById('qr-result').innerHTML = `
                    <p>النتيجة: ${result}</p>
                    <button onclick="app.searchByBarcode('${result}')" class="btn primary">بحث عن المنتج</button>
                `;
            });
        } catch (e) {
            document.getElementById('qr-result').innerHTML = `<p class="error">خطأ: ${e.message}</p>`;
        }
    }

    // Voice Search
    async startVoiceSearch() {
        this.showModal(`
            <div class="modal-header">
                <h3>بحث صوتي</h3>
                <button onclick="app.closeModal()" class="btn-close">×</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div id="voice-status">
                    <div class="mic-icon">🎤</div>
                    <p>اضغط للبدء</p>
                </div>
                <button id="voice-btn" onclick="app.toggleVoice()" class="btn primary">بدء التسجيل</button>
                <div id="voice-result" style="margin-top: 15px;"></div>
            </div>
        `);
    }

    async toggleVoice() {
        const btn = document.getElementById('voice-btn');
        const status = document.getElementById('voice-status');

        if (voiceSearch.isListening) {
            voiceSearch.stop();
            btn.textContent = 'بدء التسجيل';
            status.innerHTML = '<div class="mic-icon">🎤</div><p>اضغط للبدء</p>';
        } else {
            try {
                await voiceSearch.start((result) => {
                    document.getElementById('voice-result').innerHTML = `
                        <p>النتيجة: ${result}</p>
                    `;
                    document.getElementById('searchProducts').value = result;
                    this.filterProducts();
                });
                btn.textContent = 'إيقاف';
                status.innerHTML = '<div class="mic-icon recording">🔴</div><p>جاري الاستماع...</p>';
            } catch (e) {
                status.innerHTML = `<p class="error">خطأ: ${e.message}</p>`;
            }
        }
    }

    // Bulk Edit
    showBulkEdit() {
        this.showModal(`
            <div class="modal-header">
                <h3>تعديل جماعي</h3>
                <button onclick="app.closeModal()" class="btn-close">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>العملية</label>
                    <select id="bulkOperation" class="input">
                        <option value="increase">زيادة الأسعار</option>
                        <option value="decrease">تخفيض الأسعار</option>
                        <option value="category">تغيير التصنيف</option>
                        <option value="delete">حذف المحدد</option>
                    </select>
                </div>
                <div class="form-group" id="bulkValueGroup">
                    <label>القيمة</label>
                    <input type="number" id="bulkValue" class="input" placeholder="أدخل القيمة">
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="app.closeModal()" class="btn">إلغاء</button>
                <button onclick="app.executeBulkEdit()" class="btn primary">تنفيذ</button>
            </div>
        `);
    }

    executeBulkEdit() {
        const operation = document.getElementById('bulkOperation').value;
        const value = parseFloat(document.getElementById('bulkValue').value) || 0;

        const selected = AppState.products.filter(p => {
            const checkbox = document.querySelector(`input[data-id="${p.id}"]`);
            return checkbox?.checked;
        });

        if (selected.length === 0) {
            this.showToast('الرجاء تحديد منتجات', 'warning');
            return;
        }

        switch (operation) {
            case 'increase':
                selected.forEach(p => {
                    p.marketPrice *= (1 + value / 100);
                });
                break;
            case 'decrease':
                selected.forEach(p => {
                    p.marketPrice *= (1 - value / 100);
                });
                break;
            case 'category':
                selected.forEach(p => {
                    p.category = document.getElementById('productCategory').value;
                });
                break;
            case 'delete':
                AppState.products = AppState.products.filter(p => !selected.includes(p));
                break;
        }

        this.saveProducts();
        this.renderProducts();
        this.closeModal();
        this.showToast(`تم تنفيذ العملية على ${selected.length} منتج`, 'success');
    }

    // Export
    async exportProducts() {
        if (AppState.products.length === 0) {
            this.showToast('لا توجد منتجات للتصدير', 'warning');
            return;
        }

        const data = AppState.products.map(p => ({
            'الاسم': p.name,
            'الوصف': p.description,
            'سعر الشراء': p.purchasePrice,
            'سعر البيع': p.marketPrice,
            'الربح': p.marketPrice - p.purchasePrice,
            'التصنيف': this.getCategoryName(p.category),
            'المخزون': p.stock
        }));

        // Create CSV
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('تم تصدير المنتجات', 'success');
    }

    // Stats
    updateStats() {
        const totalEl = document.getElementById('totalProducts');
        const profitEl = document.getElementById('totalProfit');
        const stockEl = document.getElementById('lowStock');
        const marginEl = document.getElementById('avgMargin');

        if (totalEl) totalEl.textContent = AppState.products.length;

        const totalProfit = AppState.products.reduce((sum, p) => 
            sum + (p.marketPrice - p.purchasePrice), 0);
        if (profitEl) profitEl.textContent = totalProfit.toFixed(0);

        const lowStock = AppState.products.filter(p => p.stock <= 5).length;
        if (stockEl) stockEl.textContent = lowStock;

        const avgMargin = AppState.products.length > 0 ? 
            AppState.products.reduce((sum, p) => {
                const margin = p.purchasePrice > 0 ? 
                    ((p.marketPrice - p.purchasePrice) / p.purchasePrice) * 100 : 0;
                return sum + margin;
            }, 0) / AppState.products.length : 0;
        if (marginEl) marginEl.textContent = avgMargin.toFixed(0) + '%';
    }

    // Progress
    showProgress(text) {
        const progress = document.getElementById('scrapeProgress');
        const progressText = document.getElementById('progressText');
        if (progress) {
            progress.style.display = 'block';
            if (progressText) progressText.textContent = text;
        }
        AppState.isLoading = true;
    }

    hideProgress() {
        const progress = document.getElementById('scrapeProgress');
        if (progress) progress.style.display = 'none';
        AppState.isLoading = false;
    }

    // Modal
    showModal(content) {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('modalContent');
        if (overlay && modal) {
            modal.innerHTML = content;
            overlay.classList.add('active');
        }
    }

    closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    // Toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Select All
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('#productsTableBody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = selectAll?.checked);
    }
}

// Initialize app
const app = new App();
window.app = app;

// Export
export { app, AppState };
