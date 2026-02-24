/**
 * WebHarvest Pro - Main Application
 */

import { CONFIG, configManager } from './config.js';

// Application State
const AppState = {
    products: [],
    currentProduct: null,
    settings: {},
    isLoading: false,
    currentPage: 'home'
};

// Main Application
class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 WebHarvest Pro starting...');
        
        // Load settings from configManager (it's already loaded)
        AppState.settings = configManager.config;
        
        // Load products
        this.loadProducts();
        
        // Setup UI
        this.setupEventListeners();
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

        // Price inputs
        ['purchasePrice', 'marketPrice'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calculateProfit());
        });

        // Modal close
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.addEventListener('click', (e) => this.closeModal(e));
    }

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById(`${pageName}Page`);
        if (page) page.classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        AppState.currentPage = pageName;

        if (pageName === 'products') this.renderProducts();
        if (pageName === 'reports') this.renderReports();
    }

    loadProducts() {
        try {
            const saved = localStorage.getItem('webharvest_products');
            AppState.products = saved ? JSON.parse(saved) : [];
        } catch (e) {
            AppState.products = [];
        }
    }

    saveProducts() {
        localStorage.setItem('webharvest_products', JSON.stringify(AppState.products));
        this.updateStats();
    }

    async scrapeProduct() {
        const url = document.getElementById('productUrl')?.value?.trim();
        if (!url) {
            this.showToast('أدخل رابط المنتج', 'warning');
            return;
        }

        try {
            this.showProgress('جاري السحب...');
            
            // Simple fetch for demo
            const product = {
                id: Date.now(),
                url: url,
                name: 'منتج جديد',
                description: 'وصف المنتج',
                price: 0,
                purchasePrice: 0,
                marketPrice: 0,
                category: 'other',
                stock: 1,
                images: [],
                createdAt: new Date().toISOString()
            };

            this.showProductPreview(product);
            this.showToast('تم سحب البيانات', 'success');
        } catch (error) {
            this.showToast(`خطأ: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    showProductPreview(product) {
        AppState.currentProduct = product;
        
        const preview = document.getElementById('productPreview');
        if (preview) preview.style.display = 'block';

        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDesc').value = product.description || '';
        document.getElementById('marketPrice').value = product.price || '';
        document.getElementById('purchasePrice').value = product.purchasePrice || '';
        
        this.calculateProfit();
    }

    calculateProfit() {
        const purchase = parseFloat(document.getElementById('purchasePrice')?.value) || 0;
        const market = parseFloat(document.getElementById('marketPrice')?.value) || 0;
        const profit = market - purchase;
        const margin = purchase > 0 ? ((profit / purchase) * 100).toFixed(1) : 0;

        const profitEl = document.getElementById('profitAmount');
        const marginEl = document.getElementById('profitMargin');
        const statusEl = document.getElementById('profitStatus');

        if (profitEl) profitEl.textContent = profit.toFixed(2) + ' ج';
        if (marginEl) marginEl.textContent = margin + '%';
        
        if (statusEl) {
            if (profit > 0) {
                statusEl.textContent = '✅ ربح';
                statusEl.className = 'profit-status positive';
            } else if (profit < 0) {
                statusEl.textContent = '❌ خسارة';
                statusEl.className = 'profit-status negative';
            } else {
                statusEl.textContent = '➖ تعادل';
                statusEl.className = 'profit-status neutral';
            }
        }
    }

    saveProduct() {
        if (!AppState.currentProduct) {
            AppState.currentProduct = { id: Date.now() };
        }

        AppState.currentProduct = {
            ...AppState.currentProduct,
            name: document.getElementById('productName')?.value || '',
            description: document.getElementById('productDesc')?.value || '',
            purchasePrice: parseFloat(document.getElementById('purchasePrice')?.value) || 0,
            marketPrice: parseFloat(document.getElementById('marketPrice')?.value) || 0,
            category: document.getElementById('productCategory')?.value || 'other',
            stock: parseInt(document.getElementById('productStock')?.value) || 1,
            updatedAt: new Date().toISOString()
        };

        // Check if new or update
        const existingIndex = AppState.products.findIndex(p => p.id === AppState.currentProduct.id);
        if (existingIndex >= 0) {
            AppState.products[existingIndex] = AppState.currentProduct;
        } else {
            AppState.products.push(AppState.currentProduct);
        }

        this.saveProducts();
        this.showToast('تم حفظ المنتج', 'success');
        this.clearForm();
    }

    clearForm() {
        document.getElementById('productUrl').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productDesc').value = '';
        document.getElementById('marketPrice').value = '';
        document.getElementById('purchasePrice').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productStock').value = '1';
        
        const preview = document.getElementById('productPreview');
        if (preview) preview.style.display = 'none';
        
        AppState.currentProduct = null;
        this.calculateProfit();
    }

    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (AppState.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد منتجات</td></tr>';
            return;
        }

        tbody.innerHTML = AppState.products.map(p => {
            const profit = p.marketPrice - p.purchasePrice;
            const margin = p.purchasePrice > 0 ? ((profit / p.purchasePrice) * 100).toFixed(0) : 0;
            
            return `
                <tr>
                    <td><input type="checkbox" data-id="${p.id}"></td>
                    <td>${p.name}</td>
                    <td>${p.purchasePrice.toFixed(2)} ج</td>
                    <td>${p.marketPrice.toFixed(2)} ج</td>
                    <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">${profit.toFixed(2)} ج</td>
                    <td>${margin}%</td>
                    <td>
                        <button onclick="app.editProduct(${p.id})" class="btn-sm">✏️</button>
                        <button onclick="app.deleteProduct(${p.id})" class="btn-sm danger">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
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

    editProduct(id) {
        const product = AppState.products.find(p => p.id === id);
        if (product) {
            AppState.currentProduct = product;
            this.showPage('scraper');
            this.showProductPreview(product);
        }
    }

    deleteProduct(id) {
        if (confirm('هل أنت متأكد؟')) {
            AppState.products = AppState.products.filter(p => p.id !== id);
            this.saveProducts();
            this.renderProducts();
            this.showToast('تم الحذف', 'success');
        }
    }

    renderReports() {
        const products = AppState.products;
        const total = products.length;
        const totalValue = products.reduce((s, p) => s + p.marketPrice, 0);
        const totalProfit = products.reduce((s, p) => s + (p.marketPrice - p.purchasePrice), 0);
        const avgMargin = total > 0 ? products.reduce((s, p) => {
            const m = p.purchasePrice > 0 ? ((p.marketPrice - p.purchasePrice) / p.purchasePrice) * 100 : 0;
            return s + m;
        }, 0) / total : 0;

        const summaryEl = document.getElementById('reportSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="stat"><span>المنتجات</span><strong>${total}</strong></div>
                <div class="stat"><span>القيمة</span><strong>${totalValue.toFixed(0)} ج</strong></div>
                <div class="stat"><span>الأرباح</span><strong>${totalProfit.toFixed(0)} ج</strong></div>
                <div class="stat"><span>الهامش</span><strong>${avgMargin.toFixed(0)}%</strong></div>
            `;
        }
    }

    exportProducts() {
        if (AppState.products.length === 0) {
            this.showToast('لا توجد منتجات', 'warning');
            return;
        }

        const csv = [
            ['الاسم', 'سعر الشراء', 'سعر البيع', 'الربح', 'التصنيف', 'المخزون'],
            ...AppState.products.map(p => [
                p.name,
                p.purchasePrice,
                p.marketPrice,
                (p.marketPrice - p.purchasePrice).toFixed(2),
                this.getCategoryName(p.category),
                p.stock
            ])
        ].map(r => r.join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('تم التصدير', 'success');
    }

    updateStats() {
        const totalEl = document.getElementById('totalProducts');
        const profitEl = document.getElementById('totalProfit');
        const stockEl = document.getElementById('lowStock');
        const marginEl = document.getElementById('avgMargin');

        if (totalEl) totalEl.textContent = AppState.products.length;

        const totalProfit = AppState.products.reduce((s, p) => s + (p.marketPrice - p.purchasePrice), 0);
        if (profitEl) profitEl.textContent = totalProfit.toFixed(0);

        const lowStock = AppState.products.filter(p => p.stock <= 5).length;
        if (stockEl) stockEl.textContent = lowStock;

        const avgMargin = AppState.products.length > 0 ?
            AppState.products.reduce((s, p) => {
                const m = p.purchasePrice > 0 ? ((p.marketPrice - p.purchasePrice) / p.purchasePrice) * 100 : 0;
                return s + m;
            }, 0) / AppState.products.length : 0;
        if (marginEl) marginEl.textContent = avgMargin.toFixed(0) + '%';
    }

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

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('#productsTableBody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = selectAll?.checked);
    }
}

// Initialize
const app = new App();
window.app = app;

export { app, AppState };
