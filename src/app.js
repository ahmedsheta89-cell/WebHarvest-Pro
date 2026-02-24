/**
 * WebHarvest Pro - Main Application
 * التطبيق الرئيسي مع كل الميزات
 */

import { CONFIG, configManager } from './config.js';
import { browserScraper, scraperManager } from './scraper.js';
import { imageManager } from './images.js';
import { translator } from './translate.js';
import { firebaseDB } from './firebase.js';
import { productManager } from './products.js';
import { ExportManager } from './export.js';
import { qrScanner, barcodeGenerator, qrHistory } from './qr-scanner.js';
import { voiceSearch, voiceCommands, voiceHistory } from './voice.js';
import { aiPriceAnalyzer, aiProductSuggestions } from './ai-suggestions.js';
import { bulkEditor, bulkImporter, bulkExporter } from './bulk-operations.js';
import { productTemplates, quickFill } from './templates.js';
import { analytics } from './reports.js';
import { ActivityLogger } from './utils.js';

// Application State
const AppState = {
    products: [],
    selectedProducts: new Set(),
    currentView: 'dashboard',
    isLoading: false,
    searchQuery: '',
    filters: {
        category: null,
        status: null,
        priceRange: null
    },
    settings: {
        theme: 'dark',
        language: 'ar',
        rtl: true
    },
    user: null
};

// Main Application Class
class App {
    constructor() {
        this.state = AppState;
        this.logger = new ActivityLogger();
        this.init();
    }

    async init() {
        console.log('🚀 Initializing WebHarvest Pro...');
        
        // تحميل الإعدادات
        this.loadSettings();
        
        // تهيئة Firebase
        if (configManager.isConfigured()) {
            await this.initFirebase();
        }
        
        // تهيئة الأحداث
        this.setupEventListeners();
        
        // تحميل المنتجات
        await this.loadProducts();
        
        // تهيئة الواجهة
        this.initUI();
        
        console.log('✅ WebHarvest Pro initialized');
    }

    loadSettings() {
        this.state.settings = {
            theme: CONFIG.ui?.theme || 'dark',
            language: CONFIG.ui?.language || 'ar',
            rtl: CONFIG.ui?.rtl !== false
        };
        
        this.applyTheme(this.state.settings.theme);
    }

    applyTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);
        document.documentElement.setAttribute('data-theme', theme);
    }

    async initFirebase() {
        try {
            await firebaseDB.init();
            this.state.user = firebaseDB.getCurrentUser();
            this.logger.log('firebase_init', 'تم الاتصال بـ Firebase');
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-view]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(el.dataset.view);
            });
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
            });
        }

        // Voice Search Button
        const voiceBtn = document.getElementById('voiceSearchBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceSearch());
        }

        // QR Scanner Button
        const qrBtn = document.getElementById('qrScannerBtn');
        if (qrBtn) {
            qrBtn.addEventListener('click', () => this.openQRScanner());
        }

        // Add Product
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddProductModal());
        }

        // Import
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openImportModal());
        }

        // Export
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.openExportModal());
        }

        // Settings
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Bulk Actions
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.openBulkActionsModal());
        }

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleKeyboard(e) {
        // Ctrl/Cmd + K - Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        
        // Ctrl/Cmd + N - New Product
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openAddProductModal();
        }
        
        // Escape - Close Modal
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
    }

    navigateTo(view) {
        this.state.currentView = view;
        
        // Update navigation
        document.querySelectorAll('[data-view]').forEach(el => {
            el.classList.toggle('active', el.dataset.view === view);
        });
        
        // Show view
        document.querySelectorAll('.view').forEach(el => {
            el.classList.toggle('hidden', el.id !== `${view}View`);
        });
        
        // Load view data
        this.loadViewData(view);
    }

    async loadViewData(view) {
        switch (view) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'products':
                await this.loadProducts();
                break;
            case 'scraper':
                this.loadScraperView();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettingsView();
                break;
        }
    }

    async loadProducts() {
        this.state.isLoading = true;
        this.renderLoading();
        
        try {
            if (configManager.isConfigured()) {
                this.state.products = await firebaseDB.getAllProducts();
            } else {
                // Load from localStorage
                const saved = localStorage.getItem('webharvest_products');
                this.state.products = saved ? JSON.parse(saved) : [];
            }
            
            this.renderProducts();
            this.logger.log('products_loaded', `تم تحميل ${this.state.products.length} منتج`);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('فشل تحميل المنتجات');
        }
        
        this.state.isLoading = false;
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        let products = [...this.state.products];
        
        // Apply filters
        if (this.state.filters.category) {
            products = products.filter(p => p.category === this.state.filters.category);
        }
        
        if (this.state.filters.status) {
            products = products.filter(p => p.status === this.state.filters.status);
        }
        
        // Apply search
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            products = products.filter(p => 
                p.name?.toLowerCase().includes(query) ||
                p.nameAr?.toLowerCase().includes(query) ||
                p.barcode?.includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }
        
        // Render
        if (products.length === 0) {
            container.innerHTML = this.getEmptyState();
        } else {
            container.innerHTML = products.map(p => this.renderProductCard(p)).join('');
        }
        
        // Update count
        const countEl = document.getElementById('productsCount');
        if (countEl) {
            countEl.textContent = products.length;
        }
    }

    renderProductCard(product) {
        const isSelected = this.state.selectedProducts.has(product.id);
        const analysis = aiPriceAnalyzer.analyzePrice(
            product.purchasePrice || 0,
            product.price || 0,
            product.category
        );
        
        return `
            <div class="product-card ${isSelected ? 'selected' : ''}" data-id="${product.id}">
                <div class="product-checkbox">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="app.toggleProductSelection('${product.id}')">
                </div>
                <div class="product-image">
                    ${product.images?.[0] 
                        ? `<img src="${product.images[0]}" alt="${product.name}">` 
                        : '<div class="no-image">📦</div>'}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.nameAr || product.name}</h3>
                    <p class="product-category">${CONFIG.categories?.[product.category]?.ar || product.category}</p>
                    <div class="product-prices">
                        <span class="purchase-price">شراء: ${product.purchasePrice || 0} ${CONFIG.pricing?.currency || 'EGP'}</span>
                        <span class="sale-price">بيع: ${product.price || 0} ${CONFIG.pricing?.currency || 'EGP'}</span>
                    </div>
                    <div class="product-profit ${analysis.current.margin < 15 ? 'low-margin' : ''}">
                        ربح: ${analysis.current.profit.toFixed(0)} (${analysis.current.margin.toFixed(1)}%)
                    </div>
                    <div class="product-stock ${product.stock < 5 ? 'low-stock' : ''}">
                        المخزون: ${product.stock || 0}
                    </div>
                </div>
                <div class="product-actions">
                    <button onclick="app.editProduct('${product.id}')" title="تعديل">✏️</button>
                    <button onclick="app.duplicateProduct('${product.id}')" title="نسخ">📋</button>
                    <button onclick="app.deleteProduct('${product.id}')" title="حذف">🗑️</button>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>لا توجد منتجات</h3>
                <p>ابدأ بإضافة منتجات جديدة</p>
                <button onclick="app.openAddProductModal()" class="btn-primary">
                    إضافة منتج جديد
                </button>
            </div>
        `;
    }

    // === Product Actions ===

    toggleProductSelection(productId) {
        if (this.state.selectedProducts.has(productId)) {
            this.state.selectedProducts.delete(productId);
        } else {
            this.state.selectedProducts.add(productId);
        }
        this.renderProducts();
        this.updateBulkActionsState();
    }

    selectAllProducts() {
        this.state.products.forEach(p => this.state.selectedProducts.add(p.id));
        this.renderProducts();
        this.updateBulkActionsState();
    }

    clearSelection() {
        this.state.selectedProducts.clear();
        this.renderProducts();
        this.updateBulkActionsState();
    }

    updateBulkActionsState() {
        const count = this.state.selectedProducts.size;
        const bulkBtn = document.getElementById('bulkActionsBtn');
        if (bulkBtn) {
            bulkBtn.textContent = `إجراءات جماعية (${count})`;
            bulkBtn.disabled = count === 0;
        }
    }

    async addProduct(productData) {
        try {
            // AI suggestions
            const suggestions = aiProductSuggestions.suggestKeywords(
                productData.name,
                productData.description
            );
            
            const priceAnalysis = aiPriceAnalyzer.analyzePrice(
                productData.purchasePrice,
                productData.price,
                productData.category
            );
            
            const product = {
                ...productData,
                keywords: suggestions.keywords,
                priceAnalysis: priceAnalysis,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (configManager.isConfigured()) {
                await firebaseDB.addProduct(product);
            } else {
                this.state.products.push(product);
                this.saveProductsLocal();
            }
            
            this.logger.log('product_added', `تم إضافة: ${product.name}`);
            this.renderProducts();
            this.closeAllModals();
            
            return product;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async editProduct(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;
        
        this.openAddProductModal(product);
    }

    async updateProduct(productId, updates) {
        try {
            const product = {
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            if (configManager.isConfigured()) {
                await firebaseDB.updateProduct(productId, product);
            } else {
                const index = this.state.products.findIndex(p => p.id === productId);
                if (index !== -1) {
                    this.state.products[index] = { ...this.state.products[index], ...product };
                    this.saveProductsLocal();
                }
            }
            
            this.logger.log('product_updated', `تم تحديث: ${product.name}`);
            this.renderProducts();
            this.closeAllModals();
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        
        try {
            if (configManager.isConfigured()) {
                await firebaseDB.deleteProduct(productId);
            } else {
                this.state.products = this.state.products.filter(p => p.id !== productId);
                this.saveProductsLocal();
            }
            
            this.logger.log('product_deleted', `تم حذف منتج`);
            this.renderProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    async duplicateProduct(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;
        
        const duplicate = {
            ...product,
            id: Date.now().toString(),
            name: `${product.name} (نسخة)`,
            nameAr: product.nameAr ? `${product.nameAr} (نسخة)` : '',
            createdAt: new Date().toISOString()
        };
        
        await this.addProduct(duplicate);
    }

    saveProductsLocal() {
        localStorage.setItem('webharvest_products', JSON.stringify(this.state.products));
    }

    // === Search ===

    searchProducts(query) {
        this.state.searchQuery = query;
        this.renderProducts();
    }

    toggleVoiceSearch() {
        if (!voiceSearch.isListening) {
            voiceSearch.start({
                language: 'ar-EG',
                onResult: (data) => {
                    if (data.final) {
                        document.getElementById('searchInput').value = data.final;
                        this.searchProducts(data.final);
                    }
                },
                onError: (error) => {
                    this.showError(error.message);
                }
            });
        } else {
            voiceSearch.stop();
        }
    }

    // === QR Scanner ===

    openQRScanner() {
        const modal = document.getElementById('qrScannerModal');
        if (modal) {
            modal.classList.add('active');
            this.startQRScanner();
        }
    }

    async startQRScanner() {
        const video = document.getElementById('qrVideo');
        const canvas = document.getElementById('qrCanvas');
        
        if (!video || !canvas) return;
        
        await qrScanner.init(video, canvas);
        qrScanner.startScan({
            onResult: (data) => {
                // البحث عن المنتج بالباركود
                const product = this.state.products.find(p => p.barcode === data.text);
                if (product) {
                    this.editProduct(product.id);
                } else {
                    document.getElementById('barcodeInput').value = data.text;
                    this.openAddProductModal({ barcode: data.text });
                }
                qrScanner.stopScan();
                this.closeAllModals();
            },
            onError: (error) => {
                this.showError(error.message);
            }
        });
    }

    // === Modals ===

    openAddProductModal(product = null) {
        const modal = document.getElementById('addProductModal');
        if (!modal) return;
        
        const isEdit = !!product;
        const templates = productTemplates.getAllTemplates();
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
                    <button onclick="app.closeAllModals()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <!-- Templates -->
                        <div class="form-group" ${isEdit ? 'style="display:none"' : ''}>
                            <label>اختيار قالب</label>
                            <select id="templateSelect" onchange="app.applyTemplate(this.value)">
                                <option value="">بدون قالب</option>
                                ${templates.map(t => `
                                    <option value="${t.id}">${t.nameAr} (${CONFIG.categories?.[t.category]?.ar || t.category})</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <!-- Basic Info -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>اسم المنتج (إنجليزي)</label>
                                <input type="text" name="name" value="${product?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>اسم المنتج (عربي)</label>
                                <input type="text" name="nameAr" value="${product?.nameAr || ''}">
                            </div>
                        </div>
                        
                        <!-- Category -->
                        <div class="form-group">
                            <label>الفئة</label>
                            <select name="category" required>
                                <option value="">اختر الفئة</option>
                                ${Object.entries(CONFIG.categories || {}).map(([key, val]) => `
                                    <option value="${key}" ${product?.category === key ? 'selected' : ''}>
                                        ${val.icon} ${val.ar}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <!-- Pricing -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>سعر الشراء</label>
                                <input type="number" name="purchasePrice" value="${product?.purchasePrice || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>سعر البيع</label>
                                <input type="number" name="price" value="${product?.price || ''}" required>
                            </div>
                        </div>
                        
                        <!-- AI Suggestion -->
                        <div id="priceSuggestion" class="ai-suggestion" style="display:none">
                            <!-- سيتم ملؤها تلقائياً -->
                        </div>
                        
                        <!-- Stock & Barcode -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>المخزون</label>
                                <input type="number" name="stock" value="${product?.stock || 0}">
                            </div>
                            <div class="form-group">
                                <label>الباركود</label>
                                <input type="text" name="barcode" value="${product?.barcode || ''}">
                            </div>
                            <div class="form-group">
                                <label>SKU</label>
                                <input type="text" name="sku" value="${product?.sku || ''}">
                            </div>
                        </div>
                        
                        <!-- Description -->
                        <div class="form-group">
                            <label>الوصف</label>
                            <textarea name="description" rows="3">${product?.description || ''}</textarea>
                        </div>
                        
                        <!-- Images -->
                        <div class="form-group">
                            <label>الصور</label>
                            <input type="file" name="images" multiple accept="image/*">
                            <div class="image-preview" id="imagePreview">
                                ${(product?.images || []).map(img => `
                                    <img src="${img}" onclick="app.removeImage(this)">
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- URL Scraper -->
                        <div class="form-group">
                            <label>رابط المنتج (لسحب البيانات)</label>
                            <div class="input-group">
                                <input type="url" id="scrapeUrl" placeholder="الصق رابط المنتج من أي موقع">
                                <button type="button" onclick="app.scrapeProductUrl()" class="btn-secondary">
                                    سحب البيانات
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="app.closeAllModals()" class="btn-secondary">
                        إلغاء
                    </button>
                    <button type="button" onclick="app.saveProduct('${product?.id || ''}')" class="btn-primary">
                        ${isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Auto-suggest on price change
        const purchaseInput = modal.querySelector('[name="purchasePrice"]');
        const priceInput = modal.querySelector('[name="price"]');
        
        const updateSuggestion = () => {
            const purchase = parseFloat(purchaseInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const category = modal.querySelector('[name="category"]').value;
            
            if (purchase > 0 && price > 0) {
                const analysis = aiPriceAnalyzer.analyzePrice(purchase, price, category);
                const suggestionEl = document.getElementById('priceSuggestion');
                
                suggestionEl.style.display = 'block';
                suggestionEl.innerHTML = `
                    <div class="suggestion-content">
                        <span class="suggestion-icon">💡</span>
                        <div>
                            <strong>اقتراح AI:</strong> ${analysis.suggestions[0]?.reason || ''}
                            <br>
                            <small>الربح: ${analysis.current.profit.toFixed(0)} | الهامش: ${analysis.current.margin.toFixed(1)}%</small>
                        </div>
                    </div>
                `;
            }
        };
        
        purchaseInput?.addEventListener('input', updateSuggestion);
        priceInput?.addEventListener('input', updateSuggestion);
    }

    applyTemplate(templateId) {
        if (!templateId) return;
        
        const template = productTemplates.getTemplate(templateId);
        if (!template) return;
        
        const form = document.getElementById('productForm');
        if (!form) return;
        
        // Apply template defaults
        form.querySelector('[name="category"]').value = template.category;
    }

    async scrapeProductUrl() {
        const urlInput = document.getElementById('scrapeUrl');
        if (!urlInput || !urlInput.value) return;
        
        try {
            this.showLoading('جاري سحب البيانات...');
            
            const result = await browserScraper.scrape(urlInput.value);
            
            if (result.success) {
                const form = document.getElementById('productForm');
                
                if (result.name) form.querySelector('[name="name"]').value = result.name;
                if (result.price) form.querySelector('[name="price"]').value = result.price;
                if (result.description) form.querySelector('[name="description"]').value = result.description;
                
                // Translate if needed
                if (result.name && this.state.settings.language === 'ar') {
                    const translated = await translator.translate(result.name, 'en', 'ar');
                    form.querySelector('[name="nameAr"]').value = translated;
                }
            }
            
            this.hideLoading();
        } catch (error) {
            this.showError('فشل سحب البيانات');
            console.error(error);
        }
    }

    async saveProduct(productId = '') {
        const form = document.getElementById('productForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const productData = {
            name: formData.get('name'),
            nameAr: formData.get('nameAr'),
            category: formData.get('category'),
            purchasePrice: parseFloat(formData.get('purchasePrice')) || 0,
            price: parseFloat(formData.get('price')) || 0,
            stock: parseInt(formData.get('stock')) || 0,
            barcode: formData.get('barcode'),
            sku: formData.get('sku'),
            description: formData.get('description'),
            status: 'active'
        };
        
        try {
            if (productId) {
                await this.updateProduct(productId, productData);
            } else {
                await this.addProduct(productData);
            }
        } catch (error) {
            this.showError('فشل حفظ المنتج');
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>⚙️ الإعدادات</h2>
                    <button onclick="app.closeAllModals()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="tab-btn active" data-tab="firebase">🔥 Firebase</button>
                        <button class="tab-btn" data-tab="cloudinary">☁️ Cloudinary</button>
                        <button class="tab-btn" data-tab="pricing">💰 التسعير</button>
                        <button class="tab-btn" data-tab="ui">🎨 الواجهة</button>
                        <button class="tab-btn" data-tab="import">📥 استيراد/تصدير</button>
                    </div>
                    
                    <div class="tab-content active" id="tab-firebase">
                        <h3>إعدادات Firebase</h3>
                        <p class="hint">احصل على البيانات من <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a></p>
                        
                        <div class="form-group">
                            <label>API Key</label>
                            <input type="text" id="firebase_apiKey" value="${CONFIG.firebase?.apiKey || ''}">
                        </div>
                        <div class="form-group">
                            <label>Auth Domain</label>
                            <input type="text" id="firebase_authDomain" value="${CONFIG.firebase?.authDomain || ''}">
                        </div>
                        <div class="form-group">
                            <label>Project ID</label>
                            <input type="text" id="firebase_projectId" value="${CONFIG.firebase?.projectId || ''}">
                        </div>
                        <div class="form-group">
                            <label>Storage Bucket</label>
                            <input type="text" id="firebase_storageBucket" value="${CONFIG.firebase?.storageBucket || ''}">
                        </div>
                        <div class="form-group">
                            <label>Messaging Sender ID</label>
                            <input type="text" id="firebase_messagingSenderId" value="${CONFIG.firebase?.messagingSenderId || ''}">
                        </div>
                        <div class="form-group">
                            <label>App ID</label>
                            <input type="text" id="firebase_appId" value="${CONFIG.firebase?.appId || ''}">
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-cloudinary">
                        <h3>إعدادات Cloudinary</h3>
                        <p class="hint">احصل على البيانات من <a href="https://cloudinary.com/console" target="_blank">Cloudinary Console</a></p>
                        
                        <div class="form-group">
                            <label>Cloud Name</label>
                            <input type="text" id="cloudinary_cloudName" value="${CONFIG.cloudinary?.cloudName || ''}">
                        </div>
                        <div class="form-group">
                            <label>Upload Preset</label>
                            <input type="text" id="cloudinary_uploadPreset" value="${CONFIG.cloudinary?.uploadPreset || ''}">
                            <small>أنشئ upload preset من Settings > Upload في Cloudinary</small>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-pricing">
                        <h3>إعدادات التسعير</h3>
                        
                        <div class="form-group">
                            <label>هامش الربح الافتراضي (%)</label>
                            <input type="number" id="pricing_profitMargin" value="${CONFIG.pricing?.profitMargin || 25}">
                        </div>
                        <div class="form-group">
                            <label>أقل ربح مقبول</label>
                            <input type="number" id="pricing_minProfit" value="${CONFIG.pricing?.minProfit || 10}">
                        </div>
                        <div class="form-group">
                            <label>العملة</label>
                            <select id="pricing_currency">
                                <option value="EGP" ${CONFIG.pricing?.currency === 'EGP' ? 'selected' : ''}>جنيه مصري (EGP)</option>
                                <option value="SAR" ${CONFIG.pricing?.currency === 'SAR' ? 'selected' : ''}>ريال سعودي (SAR)</option>
                                <option value="AED" ${CONFIG.pricing?.currency === 'AED' ? 'selected' : ''}>درهم إماراتي (AED)</option>
                                <option value="USD" ${CONFIG.pricing?.currency === 'USD' ? 'selected' : ''}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-ui">
                        <h3>إعدادات الواجهة</h3>
                        
                        <div class="form-group">
                            <label>المظهر</label>
                            <select id="ui_theme" onchange="app.applyTheme(this.value)">
                                <option value="dark" ${CONFIG.ui?.theme === 'dark' ? 'selected' : ''}>داكن 🌙</option>
                                <option value="light" ${CONFIG.ui?.theme === 'light' ? 'selected' : ''}>فاتح ☀️</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>اللغة</label>
                            <select id="ui_language">
                                <option value="ar" ${CONFIG.ui?.language === 'ar' ? 'selected' : ''}>العربية</option>
                                <option value="en" ${CONFIG.ui?.language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-import">
                        <h3>استيراد/تصدير الإعدادات</h3>
                        
                        <div class="form-group">
                            <label>تصدير الإعدادات</label>
                            <button onclick="app.exportSettings()" class="btn-secondary">
                                📤 تصدير الإعدادات
                            </button>
                        </div>
                        <div class="form-group">
                            <label>استيراد الإعدادات</label>
                            <input type="file" id="importSettingsFile" accept=".json">
                            <button onclick="app.importSettings()" class="btn-secondary">
                                📥 استيراد الإعدادات
                            </button>
                        </div>
                        <div class="form-group">
                            <button onclick="app.resetSettings()" class="btn-danger">
                                🗑️ إعادة تعيين الإعدادات
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="app.closeAllModals()" class="btn-secondary">
                        إلغاء
                    </button>
                    <button type="button" onclick="app.saveSettings()" class="btn-primary">
                        💾 حفظ الإعدادات
                    </button>
                </div>
            </div>
        `;
        
        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
        
        modal.classList.add('active');
    }

    saveSettings() {
        const settings = {
            firebase: {
                apiKey: document.getElementById('firebase_apiKey')?.value || '',
                authDomain: document.getElementById('firebase_authDomain')?.value || '',
                projectId: document.getElementById('firebase_projectId')?.value || '',
                storageBucket: document.getElementById('firebase_storageBucket')?.value || '',
                messagingSenderId: document.getElementById('firebase_messagingSenderId')?.value || '',
                appId: document.getElementById('firebase_appId')?.value || ''
            },
            cloudinary: {
                cloudName: document.getElementById('cloudinary_cloudName')?.value || '',
                uploadPreset: document.getElementById('cloudinary_uploadPreset')?.value || ''
            },
            pricing: {
                profitMargin: parseInt(document.getElementById('pricing_profitMargin')?.value) || 25,
                minProfit: parseInt(document.getElementById('pricing_minProfit')?.value) || 10,
                currency: document.getElementById('pricing_currency')?.value || 'EGP'
            },
            ui: {
                theme: document.getElementById('ui_theme')?.value || 'dark',
                language: document.getElementById('ui_language')?.value || 'ar'
            }
        };
        
        configManager.save(settings);
        this.showSuccess('تم حفظ الإعدادات');
        this.closeAllModals();
        
        // Re-init Firebase if configured
        if (configManager.isConfigured()) {
            this.initFirebase();
        }
    }

    exportSettings() {
        const json = configManager.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'webharvest-settings.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importSettings() {
        const file = document.getElementById('importSettingsFile')?.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (configManager.import(e.target.result)) {
                this.showSuccess('تم استيراد الإعدادات');
                location.reload();
            } else {
                this.showError('فشل استيراد الإعدادات');
            }
        };
        reader.readAsText(file);
    }

    resetSettings() {
        if (confirm('هل أنت متأكد من إعادة تعيين كل الإعدادات؟')) {
            configManager.reset();
            location.reload();
        }
    }

    openBulkActionsModal() {
        const selectedCount = this.state.selectedProducts.size;
        if (selectedCount === 0) return;
        
        const modal = document.getElementById('bulkActionsModal');
        if (!modal) return;
        
        const operations = bulkEditor.getAvailableOperations();
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>إجراءات جماعية (${selectedCount} منتج)</h2>
                    <button onclick="app.closeAllModals()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bulk-operations">
                        ${operations.map(op => `
                            <button class="bulk-op-btn ${op.dangerous ? 'dangerous' : ''}" 
                                    onclick="app.executeBulkAction('${op.id}')">
                                <span class="op-icon">${op.icon}</span>
                                <span class="op-name">${op.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    async executeBulkAction(operation) {
        const selected = this.state.selectedProducts;
        const products = this.state.products.filter(p => selected.has(p.id));
        
        if (!confirm(`هل أنت متأكد من تنفيذ هذه العملية على ${products.length} منتج؟`)) {
            return;
        }
        
        let options = {};
        
        // Get operation-specific options
        switch (operation) {
            case 'updatePrice':
                const priceType = prompt('نوع التغيير:\n1 - نسبة مئوية\n2 - مبلغ ثابت\n3 - سعر محدد');
                const value = parseFloat(prompt('القيمة:'));
                options = { priceType: ['percent', 'fixed', 'fixed'][parseInt(priceType) - 1], value };
                break;
            case 'updateCategory':
                options.newCategory = prompt('الفئة الجديدة:');
                break;
            case 'applyDiscount':
                options.discountPercent = parseFloat(prompt('نسبة الخصم (%):'));
                break;
        }
        
        const results = await bulkEditor.executeBulk(operation, products, options);
        
        this.showSuccess(`تم تحديث ${results.success} منتج`);
        this.clearSelection();
        this.closeAllModals();
        this.renderProducts();
    }

    openImportModal() {
        const modal = document.getElementById('importModal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📥 استيراد منتجات</h2>
                    <button onclick="app.closeAllModals()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="import-options">
                        <div class="import-option" onclick="document.getElementById('importFile').click()">
                            <div class="import-icon">📄</div>
                            <h3>من ملف</h3>
                            <p>CSV, JSON, Excel</p>
                        </div>
                        <div class="import-option" onclick="app.openBulkUrlImport()">
                            <div class="import-icon">🔗</div>
                            <h3>من روابط</h3>
                            <p>استيراد من مواقع متعددة</p>
                        </div>
                        <div class="import-option" onclick="app.openExcelImport()">
                            <div class="import-icon">📊</div>
                            <h3>من Excel</h3>
                            <p>ملف أسعار الشراء</p>
                        </div>
                    </div>
                    <input type="file" id="importFile" accept=".csv,.json,.xlsx,.xls" style="display:none" 
                           onchange="app.handleFileImport(this.files[0])">
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    async handleFileImport(file) {
        if (!file) return;
        
        const ext = file.name.split('.').pop().toLowerCase();
        const type = ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : 'excel';
        
        try {
            this.showLoading('جاري الاستيراد...');
            
            const products = await bulkImporter.importFromFile(file, type);
            
            for (const product of products) {
                await this.addProduct(product);
            }
            
            this.hideLoading();
            this.showSuccess(`تم استيراد ${products.length} منتج`);
            this.closeAllModals();
            this.renderProducts();
        } catch (error) {
            this.hideLoading();
            this.showError('فشل استيراد الملف');
            console.error(error);
        }
    }

    openExportModal() {
        const modal = document.getElementById('exportModal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📤 تصدير المنتجات</h2>
                    <button onclick="app.closeAllModals()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="export-option" onclick="app.exportProducts('csv')">
                            <span class="export-icon">📄</span>
                            <span>CSV</span>
                        </button>
                        <button class="export-option" onclick="app.exportProducts('json')">
                            <span class="export-icon">📋</span>
                            <span>JSON</span>
                        </button>
                        <button class="export-option" onclick="app.exportProducts('excel')">
                            <span class="export-icon">📊</span>
                            <span>Excel</span>
                        </button>
                        <button class="export-option" onclick="app.exportProducts('woocommerce')">
                            <span class="export-icon">🛒</span>
                            <span>WooCommerce</span>
                        </button>
                        <button class="export-option" onclick="app.exportProducts('shopify')">
                            <span class="export-icon">🏪</span>
                            <span>Shopify</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    async exportProducts(format) {
        const products = this.state.selectedProducts.size > 0
            ? this.state.products.filter(p => this.state.selectedProducts.has(p.id))
            : this.state.products;
        
        try {
            const content = await bulkExporter.export(products, format);
            const mimeType = format === 'json' ? 'application/json' : 'text/csv';
            const ext = format === 'json' ? 'json' : format === 'excel' ? 'xlsx' : 'csv';
            
            bulkExporter.download(content, `products.${ext}`, mimeType);
            this.showSuccess('تم التصدير بنجاح');
            this.closeAllModals();
        } catch (error) {
            this.showError('فشل التصدير');
            console.error(error);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    // === Dashboard ===

    async loadDashboard() {
        const stats = analytics.calculateStats(this.state.products);
        
        const dashboardEl = document.getElementById('dashboardView');
        if (!dashboardEl) return;
        
        dashboardEl.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value">${stats.totalProducts}</div>
                    <div class="stat-label">إجمالي المنتجات</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-value">${stats.totalValue.toFixed(0)}</div>
                    <div class="stat-label">إجمالي المخزون</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${stats.avgMargin.toFixed(1)}%</div>
                    <div class="stat-label">متوسط هامش الربح</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value">${stats.lowStockCount}</div>
                    <div class="stat-label">منتجات قليلة المخزون</div>
                </div>
                
                <div class="chart-card wide">
                    <h3>توزيع الفئات</h3>
                    <canvas id="categoryChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3>توزيع الأسعار</h3>
                    <canvas id="priceChart"></canvas>
                </div>
            </div>
        `;
        
        // Render charts
        this.renderCharts(stats);
    }

    renderCharts(stats) {
        // Category distribution
        const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (categoryCtx && stats.byCategory) {
            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.byCategory),
                    datasets: [{
                        data: Object.values(stats.byCategory),
                        backgroundColor: [
                            '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
                            '#3b82f6', '#ef4444', '#84cc16'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
    }

    // === UI Helpers ===

    toggleTheme() {
        const newTheme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
        this.state.settings.theme = newTheme;
        this.applyTheme(newTheme);
        configManager.set('ui.theme', newTheme);
    }

    showLoading(message = 'جاري التحميل...') {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.querySelector('.loader-text').textContent = message;
            loader.classList.add('active');
        }
    }

    hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('active');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    renderLoading() {
        const container = document.getElementById('productsGrid');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>جاري تحميل المنتجات...</p>
                </div>
            `;
        }
    }
}

// Initialize app
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
});

// Export
export { app, AppState };
