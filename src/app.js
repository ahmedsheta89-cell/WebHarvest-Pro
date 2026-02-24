/**
 * WebHarvest Pro - Main Application
 * تطبيق إدارة المنتجات
 */

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
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            // Load saved products
            this.loadProducts();
            
            // Setup UI
            this.setupEventListeners();
            
            // Update stats
            this.updateStats();
            
            // Check for imported products
            this.checkForImports();
            
            console.log('✅ WebHarvest Pro initialized');
        } catch (error) {
            console.error('❌ Error initializing:', error);
        }
    }

    loadProducts() {
        const saved = localStorage.getItem('webharvest_products');
        if (saved) {
            AppState.products = JSON.parse(saved);
            AppState.filteredProducts = [...AppState.products];
        }
        
        // Also check for imported products
        const imported = localStorage.getItem('webharvest_imported_products');
        if (imported) {
            const products = JSON.parse(imported);
            AppState.products = [...AppState.products, ...products];
            localStorage.removeItem('webharvest_imported_products');
            this.saveProducts();
        }
    }

    saveProducts() {
        localStorage.setItem('webharvest_products', JSON.stringify(AppState.products));
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
    }

    checkForImports() {
        const urlParams = new URLSearchParams(window.location.search);
        const importData = urlParams.get('import');

        if (importData) {
            try {
                const decoded = decodeURIComponent(atob(importData));
                const data = JSON.parse(decoded);

                if (data && data.products && data.products.length > 0) {
                    // Add products
                    AppState.products = [...AppState.products, ...data.products];
                    this.saveProducts();
                    
                    // Show success message
                    this.showToast(`✅ تم استيراد ${data.products.length} منتج بنجاح!`, 'success');
                    
                    // Update stats
                    this.updateStats();
                    
                    // Render products
                    this.renderProducts();
                    
                    // Clean URL
                    const cleanUrl = window.location.href.split('?')[0];
                    window.history.replaceState({}, document.title, cleanUrl);
                    
                    console.log('✅ Imported products:', data.products.length);
                }
            } catch (error) {
                console.error('Error importing products:', error);
                this.showToast('❌ خطأ في استيراد المنتجات', 'error');
            }
        }
    }

    addProduct() {
        const name = document.getElementById('productName')?.value;
        const price = parseFloat(document.getElementById('productPrice')?.value) || 0;
        const cost = parseFloat(document.getElementById('productCost')?.value) || 0;
        const category = document.getElementById('productCategory')?.value || '';
        const description = document.getElementById('productDescription')?.value || '';

        if (!name) {
            this.showToast('⚠️ اسم المنتج مطلوب', 'error');
            return;
        }

        const product = {
            id: Date.now(),
            name,
            nameAr: name,
            price,
            cost,
            category,
            description,
            profit: price - cost,
            margin: cost > 0 ? ((price - cost) / price * 100).toFixed(1) : 0,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        AppState.products.unshift(product);
        this.saveProducts();
        this.updateStats();
        this.renderProducts();
        
        // Clear form
        document.getElementById('addProductForm')?.reset();
        
        // Close modal
        this.closeModal();
        
        this.showToast('✅ تم إضافة المنتج بنجاح', 'success');
    }

    filterProducts() {
        const query = AppState.searchQuery.toLowerCase();
        
        AppState.filteredProducts = AppState.products.filter(p => {
            const name = (p.name || p.nameAr || '').toLowerCase();
            const category = (p.category || '').toLowerCase();
            const description = (p.description || '').toLowerCase();
            
            return name.includes(query) || 
                   category.includes(query) || 
                   description.includes(query);
        });

        this.renderProducts();
    }

    renderProducts() {
        const container = document.getElementById('productsTableBody');
        if (!container) return;

        const products = AppState.filteredProducts.slice(
            (AppState.currentPage - 1) * AppState.itemsPerPage,
            AppState.currentPage * AppState.itemsPerPage
        );

        if (products.length === 0) {
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

        container.innerHTML = products.map(p => `
            <tr>
                <td><input type="checkbox" class="product-checkbox" data-id="${p.id}"></td>
                <td>
                    <div style="font-weight: bold;">${p.nameAr || p.name}</div>
                    <div style="font-size: 12px; color: #94a3b8;">${p.category || ''}</div>
                </td>
                <td>${p.price ? p.price + ' ج.م' : '-'}</td>
                <td>${p.cost ? p.cost + ' ج.م' : '-'}</td>
                <td>
                    <span style="color: ${p.profit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                        ${p.profit ? p.profit + ' ج.م' : '-'}
                    </span>
                </td>
                <td>
                    <span style="background: ${p.margin >= 20 ? '#10b981' : p.margin >= 10 ? '#f59e0b' : '#ef4444'}; 
                                 color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${p.margin ? p.margin + '%' : '-'}
                    </span>
                </td>
                <td>
                    <button onclick="app.deleteProduct(${p.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    deleteProduct(id) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        
        AppState.products = AppState.products.filter(p => p.id !== id);
        this.saveProducts();
        this.updateStats();
        this.renderProducts();
        
        this.showToast('✅ تم حذف المنتج', 'success');
    }

    updateStats() {
        // Update product count
        const countEl = document.getElementById('productCount');
        if (countEl) {
            countEl.textContent = AppState.products.length;
        }

        // Calculate total profit
        const totalProfit = AppState.products.reduce((sum, p) => sum + (p.profit || 0), 0);
        const profitEl = document.getElementById('totalProfit');
        if (profitEl) {
            profitEl.textContent = totalProfit.toLocaleString() + ' ج.م';
        }

        // Calculate average margin
        const avgMargin = AppState.products.length > 0 
            ? AppState.products.reduce((sum, p) => sum + parseFloat(p.margin || 0), 0) / AppState.products.length 
            : 0;
        const marginEl = document.getElementById('avgMargin');
        if (marginEl) {
            marginEl.textContent = avgMargin.toFixed(1) + '%';
        }

        // Count out of stock
        const outOfStock = AppState.products.filter(p => p.status === 'out_of_stock').length;
        const outOfStockEl = document.getElementById('outOfStock');
        if (outOfStockEl) {
            outOfStockEl.textContent = outOfStock;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            // Create container if doesn't exist
            const newContainer = document.createElement('div');
            newContainer.id = 'toastContainer';
            newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(newContainer);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            margin-bottom: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        const container2 = document.getElementById('toastContainer');
        if (container2) {
            container2.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('#productsTableBody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = selectAll?.checked);
    }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new App();
        window.app = app;
    });
} else {
    app = new App();
    window.app = app;
}

// Make App globally available for onclick handlers
window.App = App;
