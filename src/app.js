/**
 * WebHarvest Pro - Main Application Controller
 *     // Initialize modules
        await this.initModules();

        // Load products
        await this.loadProducts();

        // Render UI
        this.render();

        // Setup auto-refresh
        this.setupAutoRefresh();

        // Show ready
        this.state.isReady = true;
        UI.hideLoading();
        UI.showToast('WebHarvest Pro is ready!', 'success');
    }

    // Initialize modules
    async initModules() {
        // Check config
        const errors = ConfigManager.validate();
        if (errors.length > 0) {
            this.showSetupModal(errors);
            return;
        }

        // Initialize Firebase
        await firebaseDB.init();

        // Initialize barcode scanner
        if (await barcodeScanner.checkCameraPermission()) {
            console.log('Camera available for barcode scanning');
        }
    }

    // Load products
    async loadProducts() {
        this.state.isLoading = true;
        UI.showLoading('Loading products...');

        try {
            this.products = await productManager.getAllProducts();
            this.filteredProducts = [...this.products];
            this.state.isLoading = false;
        } catch (error) {
            console.error('Failed to load products:', error);
            this.state.isLoading = false;
            UI.showToast('Failed to load products', 'error');
        }

        UI.hideLoading();
    }

    // Render main UI
    render() {
        this.renderHeader();
        this.renderSidebar();
        this.renderMain();
        this.renderModals();
        this.bindEvents();
    }

    // Render header
    renderHeader() {
        const header = document.getElementById('app-header');
        if (!header) return;

        header.innerHTML = `
            <div class="header-content">
                <div class="header-left">
                    <button id="menu-toggle" class="btn btn-icon">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="search-container">
                        <i class="fas fa-search"></i>
                        <input type="text" id="search-input" placeholder="Search products...">
                    </div>
                </div>
                <div class="header-center">
                    <h1>WebHarvest Pro</h1>
                </div>
                <div class="header-right">
                    <button id="btn-barcode" class="btn btn-icon" title="Scan Barcode">
                        <i class="fas fa-barcode"></i>
                    </button>
                    <button id="btn-sync" class="btn btn-icon" title="Sync Excel">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button id="btn-bulk" class="btn btn-icon" title="Bulk Operations">
                        <i class="fas fa-layer-group"></i>
                    </button>
                    <button id="btn-dashboard" class="btn btn-icon" title="Dashboard">
                        <i class="fas fa-chart-pie"></i>
                    </button>
                    <button id="btn-settings" class="btn btn-icon" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Render sidebar
    renderSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar-content">
                <div class="sidebar-section">
                    <h3>Quick Actions</h3>
                    <button id="btn-add-product" class="sidebar-btn">
                        <i class="fas fa-plus"></i>
                        Add Product
                    </button>
                    <button id="btn-scrape" class="sidebar-btn">
                        <i class="fas fa-download"></i>
                        Scrape Product
                    </button>
                    <button id="btn-import" class="sidebar-btn">
                        <i class="fas fa-file-import"></i>
                        Import Excel
                    </button>
                    <button id="btn-export" class="sidebar-btn">
                        <i class="fas fa-file-export"></i>
                        Export All
                    </button>
                </div>

                <div class="sidebar-section">
                    <h3>Filters</h3>
                    <div class="filter-group">
                        <label>Status</label>
                        <select id="filter-status">
                            <option value="">All</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Category</label>
                        <select id="filter-category">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Stock</label>
                        <select id="filter-stock">
                            <option value="">All</option>
                            <option value="in-stock">In Stock</option>
                            <option value="low-stock">Low Stock</option>
                            <option value="out-of-stock">Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3>Statistics</h3>
                    <div class="stat-item">
                        <span class="stat-label">Total</span>
                        <span class="stat-value" id="stat-total">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Published</span>
                        <span class="stat-value" id="stat-published">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Out of Stock</span>
                        <span class="stat-value text-danger" id="stat-out">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Profit</span>
                        <span class="stat-value text-success" id="stat-profit">0</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Render main content
    renderMain() {
        const main = document.getElementById('app-main');
        if (!main) return;

        main.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <label class="checkbox-container">
                        <input type="checkbox" id="select-all">
                        <span>Select All</span>
                    </label>
                    <span class="selected-count" id="selected-count"></span>
                </div>
                <div class="toolbar-right">
                    <button id="btn-grid-view" class="btn btn-icon active">
                        <i class="fas fa-th"></i>
                    </button>
                    <button id="btn-list-view" class="btn btn-icon">
                        <i class="fas fa-list"></i>
                    </button>
                    <select id="sort-by">
                        <option value="name">Name</option>
                        <option value="price">Price</option>
                        <option value="profit">Profit</option>
                        <option value="stock">Stock</option>
                        <option value="date">Date Added</option>
                    </select>
                </div>
            </div>
            <div class="products-container" id="products-container">
                ${this.renderProducts()}
            </div>
            <div class="pagination" id="pagination"></div>
        `;

        this.updateStats();
    }

    // Render products grid
    renderProducts() {
        if (this.state.isLoading) {
            return '<div class="loading-spinner"></div>';
        }

        if (this.filteredProducts.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Add your first product or import from Excel</p>
                    <button class="btn btn-primary" onclick="app.showAddModal()">
                        Add Product
                    </button>
                </div>
            `;
        }

        return this.filteredProducts.map(product => this.renderProductCard(product)).join('');
    }

    // Render single product card
    renderProductCard(product) {
        const profitClass = product.profit > 0 ? 'positive' : product.profit < 0 ? 'negative' : 'neutral';
        const stockClass = !product.stock ? 'out' : product.stock < 5 ? 'low' : 'in';

        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-card-checkbox">
                    <input type="checkbox" class="product-select" data-id="${product.id}">
                </div>
                <div class="product-card-image">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/200'}" 
                         alt="${product.nameAr || product.name}"
                         loading="lazy">
                    ${product.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
                </div>
                <div class="product-card-content">
                    <h3 class="product-name">${product.nameAr || product.name}</h3>
                    <p class="product-category">${product.categoryAr || product.category || ''}</p>
                    <div class="product-prices">
                        <div class="price-row">
                            <span class="price-label">Cost:</span>
                            <span class="price-value">${product.purchasePrice || '-'}</span>
                        </div>
                        <div class="price-row">
                            <span class="price-label">Market:</span>
                            <span class="price-value">${product.marketPrice || '-'}</span>
                        </div>
                        <div class="price-row highlight">
                            <span class="price-label">Sale:</span>
                            <span class="price-value">${product.salePrice || '-'}</span>
                        </div>
                    </div>
                    <div class="product-meta">
                        <span class="profit ${profitClass}">
                            Profit: ${product.profit || 0} (${product.profitMargin || 0}%)
                        </span>
                        <span class="stock ${stockClass}">
                            Stock: ${product.stock || 0}
                        </span>
                    </div>
                </div>
                <div class="product-card-actions">
                    <button class="btn btn-sm btn-icon" onclick="app.editProduct('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="app.translateProduct('${product.id}')" title="Translate">
                        <i class="fas fa-language"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="app.scrapeProduct('${product.id}')" title="Re-scrape">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="app.deleteProduct('${product.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Render modals
    renderModals() {
        this.modals = {
            add: document.getElementById('modal-add-product'),
            scrape: document.getElementById('modal-scrape'),
            settings: document.getElementById('modal-settings'),
            bulk: document.getElementById('modal-bulk'),
            dashboard: document.getElementById('modal-dashboard')
        };
    }

    // Bind events
    bindEvents() {
        // Search
        document.getElementById('search-input')?.addEventListener('input', 
            this.debounce((e) => this.search(e.target.value), 300));

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', (e) => this.filter('status', e.target.value));
        document.getElementById('filter-category')?.addEventListener('change', (e) => this.filter('category', e.target.value));
        document.getElementById('filter-stock')?.addEventListener('change', (e) => this.filter('stock', e.target.value));

        // Sort
        document.getElementById('sort-by')?.addEventListener('change', (e) => this.sort(e.target.value));

        // View toggle
        document.getElementById('btn-grid-view')?.addEventListener('click', () => this.setView('grid'));
        document.getElementById('btn-list-view')?.addEventListener('click', () => this.setView('list'));

        // Select all
        document.getElementById('select-all')?.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));

        // Header buttons
        document.getElementById('btn-barcode')?.addEventListener('click', () => this.showBarcodeScanner());
        document.getElementById('btn-sync')?.addEventListener('click', () => this.syncWithExcel());
        document.getElementById('btn-bulk')?.addEventListener('click', () => this.showBulkModal());
        document.getElementById('btn-dashboard')?.addEventListener('click', () => this.showDashboard());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettingsModal());

        // Sidebar buttons
        document.getElementById('btn-add-product')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('btn-scrape')?.addEventListener('click', () => this.showScrapeModal());
        document.getElementById('btn-import')?.addEventListener('click', () => this.importExcel());
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportAll());

        // Product selection
        document.querySelectorAll('.product-select').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleProductSelect(e.target.dataset.id, e.target.checked));
        });

        // Firebase realtime updates
        firebaseDB.onProductsChange((products) => {
            this.products = products;
            this.applyFilters();
            this.updateStats();
        });
    }

    // Search
    search(query) {
        this.state.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    // Filter
    filter(type, value) {
        this.state.filters[type] = value;
        this.applyFilters();
    }

    // Apply all filters
    applyFilters() {
        let filtered = [...this.products];

        // Search
        if (this.state.searchQuery) {
            const query = this.state.searchQuery;
            filtered = filtered.filter(p => 
                (p.name || '').toLowerCase().includes(query) ||
                (p.nameAr || '').toLowerCase().includes(query) ||
                (p.barcode || '').includes(query) ||
                (p.sku || '').toLowerCase().includes(query)
            );
        }

        // Status filter
        if (this.state.filters.status) {
            filtered = filtered.filter(p => p.status === this.state.filters.status);
        }

        // Category filter
        if (this.state.filters.category) {
            filtered = filtered.filter(p => p.category === this.state.filters.category);
        }

        // Stock filter
        if (this.state.filters.stock === 'in-stock') {
            filtered = filtered.filter(p => p.stock > 5);
        } else if (this.state.filters.stock === 'low-stock') {
            filtered = filtered.filter(p => p.stock > 0 && p.stock < 5);
        } else if (this.state.filters.stock === 'out-of-stock') {
            filtered = filtered.filter(p => !p.stock || p.stock === 0);
        }

        this.filteredProducts = filtered;
        this.renderProducts();
        this.updateStats();
    }

    // Sort
    sort(field) {
        this.state.sortBy = field;
        const order = this.state.sortOrder;

        this.filteredProducts.sort((a, b) => {
            let aVal = a[field] || 0;
            let bVal = b[field] || 0;

            if (field === 'name') {
                aVal = (a.nameAr || a.name || '').toLowerCase();
                bVal = (b.nameAr || b.name || '').toLowerCase();
                return aVal.localeCompare(bVal) * (order === 'desc' ? -1 : 1);
            }

            return (aVal - bVal) * (order === 'desc' ? -1 : 1);
        });

        this.renderProducts();
    }

    // Update statistics
    updateStats() {
        document.getElementById('stat-total').textContent = this.products.length;
        document.getElementById('stat-published').textContent = this.products.filter(p => p.status === 'published').length;
        document.getElementById('stat-out').textContent = this.products.filter(p => !p.stock || p.stock === 0).length;
        document.getElementById('stat-profit').textContent = Formatters.number(
            this.products.reduce((sum, p) => sum + (p.profit || 0), 0)
        );
    }

    // Selection management
    toggleSelectAll(checked) {
        this.state.selectedProducts = checked ? this.filteredProducts.map(p => p.id) : [];
        document.querySelectorAll('.product-select').forEach(cb => cb.checked = checked);
        this.updateSelectedCount();
    }

    toggleProductSelect(id, checked) {
        if (checked) {
            if (!this.state.selectedProducts.includes(id)) {
                this.state.selectedProducts.push(id);
            }
        } else {
            this.state.selectedProducts = this.state.selectedProducts.filter(pId => pId !== id);
        }
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selected-count');
        if (countEl) {
            countEl.textContent = this.state.selectedProducts.length > 0 
                ? `${this.state.selectedProducts.length} selected` 
                : '';
        }
    }

    // Show modals
    showAddModal() {
        UI.showModal('modal-add-product');
    }

    showScrapeModal() {
        UI.showModal('modal-scrape');
    }

    showSettingsModal() {
        UI.showModal('modal-settings');
    }

    showBulkModal() {
        if (this.state.selectedProducts.length === 0) {
            UI.showToast('Select products first', 'warning');
            return;
        }
        UI.showModal('modal-bulk');
    }

    showDashboard() {
        dashboard.render();
        UI.showModal('modal-dashboard');
    }

    // Product actions
    async editProduct(id) {
        const product = await productManager.getProduct(id);
        if (product) {
            // Fill edit form
            UI.showModal('modal-add-product');
            // Populate form fields...
        }
    }

    async translateProduct(id) {
        const product = await productManager.getProduct(id);
        if (!product) return;

        UI.showLoading('Translating...');
        try {
            const translated = await translator.translateBatch([
                { text: product.name, key: 'nameAr' },
                { text: product.description, key: 'descriptionAr' }
            ], 'en', 'ar');

            await productManager.updateProduct(id, {
                nameAr: translated.nameAr,
                descriptionAr: translated.descriptionAr
            });

            UI.showToast('Translated successfully', 'success');
        } catch (error) {
            UI.showToast('Translation failed', 'error');
        }
        UI.hideLoading();
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        UI.showLoading('Deleting...');
        try {
            await productManager.deleteProduct(id);
            UI.showToast('Product deleted', 'success');
        } catch (error) {
            UI.showToast('Delete failed', 'error');
        }
        UI.hideLoading();
    }

    // Barcode scanner
    async showBarcodeScanner() {
        const result = await barcodeScanner.scanFromCamera();
        if (result && result.barcode) {
            this.search(result.barcode);
        }
    }

    // Sync with Excel
    async syncWithExcel() {
        UI.showLoading('Syncing with Excel...');
        try {
            const results = await syncManager.syncAllWithExcel();
            UI.showToast(`Synced: ${results.matched} matched, ${results.updated} updated`, 'success');
        } catch (error) {
            UI.showToast('Sync failed', 'error');
        }
        UI.hideLoading();
    }

    // Import Excel
    async importExcel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            UI.showLoading('Importing...');
            try {
                await syncManager.importExcel(file);
                UI.showToast('Excel imported successfully', 'success');
            } catch (error) {
                UI.showToast('Import failed', 'error');
            }
            UI.hideLoading();
        };

        input.click();
    }

    // Export all
    async exportAll() {
        const format = await this.showExportDialog();
        if (!format) return;

        UI.showLoading('Exporting...');
        try {
            const products = this.filteredProducts.length > 0 ? this.filteredProducts : this.products;
            
            switch (format) {
                case 'excel':
                    await ExcelExporter.export(products);
                    break;
                case 'woo':
                    await WooCommerceExporter.export(products);
                    break;
                case 'shopify':
                    await ShopifyExporter.export(products);
                    break;
                case 'pdf':
                    const doc = await pdfGenerator.generateCatalog(products);
                    pdfGenerator.download('catalog.pdf');
                    break;
                case 'salezone':
                    await SaleZoneExporter.export(products);
                    break;
            }
            
            UI.showToast('Exported successfully', 'success');
        } catch (error) {
            UI.showToast('Export failed', 'error');
        }
        UI.hideLoading();
    }

    async showExportDialog() {
        return new Promise((resolve) => {
            const formats = ExportManager.getFormats();
            let html = '<div class="export-dialog"><h3>Select Export Format</h3><div class="formats-grid">';
            
            formats.forEach(f => {
                html += `
                    <button class="format-btn" data-format="${f.id}">
                        <span class="format-icon">${f.icon}</span>
                        <span class="format-name">${f.name}</span>
                    </button>
                `;
            });
            
            html += '</div></div>';
            
            UI.showCustomDialog(html, (result) => {
                resolve(result);
            });
        });
    }

    // Setup modal
    showSetupModal(errors) {
        const html = `
            <div class="setup-modal">
                <h2>Setup Required</h2>
                <p>Please configure the following:</p>
                <ul class="setup-errors">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" onclick="app.showSettingsModal()">
                    Open Settings
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // Auto-refresh
    setupAutoRefresh() {
        setInterval(() => {
            this.loadProducts();
        }, 300000); // Every 5 minutes
    }

    // Utilities
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
});

export { app, AppState };
