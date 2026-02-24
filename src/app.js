/**
 * WebHarvest Pro - Main Application
 * تطبيق إدارة المنتجات
 */

(function() {
    'use strict';

    // ==================== Global State ====================
    const AppState = {
        products: [],
        filteredProducts: [],
        currentPage: 1,
        itemsPerPage: 20,
        selectedProducts: [],
        sortBy: 'name',
        sortOrder: 'asc',
        searchQuery: ''
    };

    // ==================== Main Application ====================
    class App {
        constructor() {
            console.log('🚀 WebHarvest Pro starting...');
            this.init();
        }

        async init() {
            try {
                // أولاً: تحميل المنتجات المحفوظة
                this.loadProducts();
                
                // ثانياً: فحص الاستيراد من URL
                this.checkForImports();
                
                // ثالثاً: إعداد الواجهة
                this.setupEventListeners();
                
                // رابعاً: تحديث العرض
                this.updateStats();
                this.renderProducts();
                
                console.log('✅ WebHarvest Pro initialized');
                console.log('📦 Products count:', AppState.products.length);
            } catch (error) {
                console.error('❌ Error initializing:', error);
            }
        }

        loadProducts() {
            const saved = localStorage.getItem('webharvest_products');
            if (saved) {
                try {
                    AppState.products = JSON.parse(saved);
                    AppState.filteredProducts = [...AppState.products];
                    console.log('📦 Loaded', AppState.products.length, 'products from storage');
                } catch (e) {
                    console.error('Error loading products:', e);
                    AppState.products = [];
                }
            }
        }

        saveProducts() {
            localStorage.setItem('webharvest_products', JSON.stringify(AppState.products));
            console.log('💾 Saved', AppState.products.length, 'products');
        }

        setupEventListeners() {
            // Search
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    AppState.searchQuery = e.target.value;
                    this.filterProducts();
                });
            }

            // Add product form
            const addForm = document.getElementById('addProductForm');
            if (addForm) {
                addForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addProduct();
                });
            }

            // Modal close buttons
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) modal.style.display = 'none';
                });
            });
        }

        checkForImports() {
            const urlParams = new URLSearchParams(window.location.search);
            const importData = urlParams.get('import');

            if (importData) {
                console.log('📥 Import data found in URL');
                try {
                    const decoded = decodeURIComponent(atob(importData));
                    const data = JSON.parse(decoded);
                    console.log('📦 Decoded data:', data);

                    if (data && data.products && Array.isArray(data.products) && data.products.length > 0) {
                        // تنسيق المنتجات
                        const formattedProducts = data.products.map(p => ({
                            id: Date.now() + Math.random(),
                            name: p.name || 'منتج بدون اسم',
                            price: parseFloat(p.price) || 0,
                            purchasePrice: parseFloat(p.purchasePrice) || 0,
                            image: p.image || '',
                            url: p.url || '',
                            description: p.description || '',
                            category: p.category || '',
                            currency: p.currency || 'EGP',
                            source: p.source || data.source || '',
                            stock: p.stock || 0,
                            createdAt: new Date().toISOString()
                        }));

                        // إضافة المنتجات
                        AppState.products = [...AppState.products, ...formattedProducts];
                        AppState.filteredProducts = [...AppState.products];
                        
                        // حفظ
                        this.saveProducts();
                        
                        console.log('✅ Imported', formattedProducts.length, 'products');
                        
                        // مسح الـ URL parameter
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, '', newUrl);
                    }
                } catch (error) {
                    console.error('❌ Error importing products:', error);
                }
            }
        }

        addProduct() {
            const nameInput = document.getElementById('productName');
            const priceInput = document.getElementById('productPrice');
            const purchaseInput = document.getElementById('productPurchasePrice');
            const categoryInput = document.getElementById('productCategory');
            const descInput = document.getElementById('productDescription');

            const name = nameInput?.value?.trim();
            if (!name) {
                this.showToast('⚠️ اسم المنتج مطلوب', 'error');
                return;
            }

            const product = {
                id: Date.now(),
                name: name,
                price: parseFloat(priceInput?.value) || 0,
                purchasePrice: parseFloat(purchaseInput?.value) || 0,
                category: categoryInput?.value || '',
                description: descInput?.value || '',
                image: '',
                url: '',
                currency: 'EGP',
                stock: 0,
                createdAt: new Date().toISOString()
            };

            AppState.products.push(product);
            AppState.filteredProducts.push(product);
            
            this.saveProducts();
            this.updateStats();
            this.renderProducts();
            
            // Clear form
            if (nameInput) nameInput.value = '';
            if (priceInput) priceInput.value = '';
            if (purchaseInput) purchaseInput.value = '';
            if (categoryInput) categoryInput.value = '';
            if (descInput) descInput.value = '';
            
            this.showToast('✅ تم إضافة المنتج بنجاح', 'success');
        }

        filterProducts() {
            const query = AppState.searchQuery.toLowerCase();
            AppState.filteredProducts = AppState.products.filter(p => 
                p.name?.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
            this.renderProducts();
        }

        deleteProduct(id) {
            AppState.products = AppState.products.filter(p => p.id !== id);
            AppState.filteredProducts = AppState.filteredProducts.filter(p => p.id !== id);
            this.saveProducts();
            this.updateStats();
            this.renderProducts();
            this.showToast('✅ تم حذف المنتج', 'success');
        }

        updateStats() {
            const total = AppState.products.length;
            const totalProfit = AppState.products.reduce((sum, p) => {
                const profit = (p.price || 0) - (p.purchasePrice || 0);
                return sum + profit;
            }, 0);
            const avgMargin = total > 0 
                ? AppState.products.reduce((sum, p) => {
                    const margin = p.price > 0 ? ((p.price - (p.purchasePrice || 0)) / p.price) * 100 : 0;
                    return sum + margin;
                }, 0) / total 
                : 0;
            const outOfStock = AppState.products.filter(p => (p.stock || 0) <= 0).length;

            // Update DOM
            const totalEl = document.getElementById('totalProducts');
            const profitEl = document.getElementById('totalProfit');
            const marginEl = document.getElementById('avgMargin');
            const stockEl = document.getElementById('outOfStock');

            if (totalEl) totalEl.textContent = total;
            if (profitEl) profitEl.textContent = totalProfit.toLocaleString('ar-EG') + ' ج.م';
            if (marginEl) marginEl.textContent = avgMargin.toFixed(1) + '%';
            if (stockEl) stockEl.textContent = outOfStock;
        }

        renderProducts() {
            const container = document.getElementById('productsTableBody');
            if (!container) {
                console.warn('productsTableBody not found');
                return;
            }

            if (AppState.filteredProducts.length === 0) {
                container.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                            <div>لا توجد منتجات</div>
                            <div style="font-size: 14px; margin-top: 5px;">أضف منتجات جديدة أو استخدم الـ Bookmarklet</div>
                        </td>
                    </tr>
                `;
                return;
            }

            container.innerHTML = AppState.filteredProducts.map(p => `
                <tr class="product-row" data-id="${p.id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${p.image ? '<img src="' + p.image + '" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">' : '<div style="width: 40px; height: 40px; background: #4b5563; border-radius: 8px; display: flex; align-items: center; justify-content: center;">📦</div>'}
                            <span>${p.name}</span>
                        </div>
                    </td>
                    <td>${(p.price || 0).toLocaleString('ar-EG')} ${p.currency || 'ج.م'}</td>
                    <td>${(p.purchasePrice || 0).toLocaleString('ar-EG')} ${p.currency || 'ج.م'}</td>
                    <td style="color: ${(p.price || 0) - (p.purchasePrice || 0) > 0 ? '#10b981' : '#ef4444'}">
                        ${((p.price || 0) - (p.purchasePrice || 0)).toLocaleString('ar-EG')} ${p.currency || 'ج.م'}
                    </td>
                    <td>${p.price > 0 ? (((p.price - (p.purchasePrice || 0)) / p.price) * 100).toFixed(1) : 0}%</td>
                    <td>
                        <button class="btn-delete" onclick="app.deleteProduct(${p.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                            🗑️ حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        showToast(message, type) {
            // Remove existing toast
            const existing = document.querySelector('.webharvest-toast');
            if (existing) existing.remove();

            // Create toast
            const toast = document.createElement('div');
            toast.className = 'webharvest-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                animation: slideIn 0.5s ease;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            // Remove after 3 seconds
            setTimeout(function() {
                toast.style.animation = 'slideOut 0.5s ease';
                setTimeout(function() { toast.remove(); }, 500);
            }, 3000);
        }
    }

    // Initialize app when DOM is ready
    function initApp() {
        window.app = new App();
        window.AppState = AppState;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
