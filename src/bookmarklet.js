/**
 * WebHarvest Pro - Bookmarklet
 * استخراج المنتجات من أي موقع
 * 
 * ميزات:
 * - استخراج منتج واحد
 * - استخراج منتجات متعددة
 * - استخراج كل المنتجات
 * - إرسال مباشر للأداة
 */

(function() {
    'use strict';
    
    // ===== Configuration =====
    const CONFIG = {
        webHarvestUrl: 'https://ahmedsheta89-cell.github.io/WebHarvest-Pro/index.html',
        debug: true
    };
    
    // ===== Logger =====
    const log = (msg, ...args) => {
        if (CONFIG.debug) console.log(`[WebHarvest] ${msg}`, ...args);
    };
    
    // ===== Product Detector =====
    class ProductDetector {
        constructor() {
            this.selectors = this.getSelectors();
        }
        
        getSelectors() {
            return {
                // Containers
                containers: [
                    '[class*="product"]',
                    '[class*="item"]',
                    '[class*="card"]',
                    '[data-product-id]',
                    '[data-product]',
                    'article',
                    '.product-card',
                    '.product-item',
                    '.item-box',
                    '.product-box'
                ],
                // Name
                name: [
                    '[class*="name"]',
                    '[class*="title"]',
                    'h1', 'h2', 'h3',
                    'a[title]',
                    '[itemprop="name"]'
                ],
                // Price
                price: [
                    '[class*="price"]',
                    '[itemprop="price"]',
                    '[data-price]'
                ],
                // Description
                description: [
                    '[class*="desc"]',
                    '[class*="details"]',
                    '[itemprop="description"]',
                    'p'
                ],
                // Images
                images: [
                    'img[class*="product"]',
                    'img[class*="item"]',
                    'img[src*="product"]',
                    'img',
                    '[class*="image"] img',
                    '[class*="gallery"] img'
                ],
                // Link
                link: [
                    'a[href*="product"]',
                    'a[href*="item"]',
                    'a[href*="p-"]',
                    'a'
                ]
            };
        }
        
        detectProducts() {
            const products = [];
            const seen = new Set();
            
            // Find all potential product containers
            const containers = document.querySelectorAll(this.selectors.containers.join(', '));
            
            log(`Found ${containers.length} potential containers`);
            
            containers.forEach((container, index) => {
                try {
                    const product = this.extractProduct(container);
                    if (product && product.name && !seen.has(product.name)) {
                        seen.add(product.name);
                        product.id = `prod_${Date.now()}_${index}`;
                        products.push(product);
                    }
                } catch (e) {
                    log('Error extracting product:', e);
                }
            });
            
            // If no products found, try page-level extraction
            if (products.length === 0 && this.isProductPage()) {
                const product = this.extractFromProductPage();
                if (product) {
                    product.id = `prod_${Date.now()}_main`;
                    products.push(product);
                }
            }
            
            log(`Detected ${products.length} products`);
            return products;
        }
        
        isProductPage() {
            const url = window.location.href;
            const patterns = ['/product/', '/item/', '/p/', '/dp/', 'product-', 'item-'];
            return patterns.some(p => url.includes(p));
        }
        
        extractFromProductPage() {
            const product = {
                name: '',
                price: 0,
                currency: 'EGP',
                description: '',
                images: [],
                url: window.location.href,
                source: window.location.hostname
            };
            
            // Extract name (try multiple selectors)
            for (const sel of this.selectors.name) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 3 && el.textContent.trim().length < 200) {
                    product.name = el.textContent.trim();
                    break;
                }
            }
            
            // Extract price
            for (const sel of this.selectors.price) {
                const el = document.querySelector(sel);
                if (el) {
                    const price = this.parsePrice(el.textContent);
                    if (price > 0) {
                        product.price = price;
                        break;
                    }
                }
            }
            
            // Extract description
            for (const sel of this.selectors.description) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 20) {
                    product.description = el.textContent.trim().substring(0, 500);
                    break;
                }
            }
            
            // Extract images
            const imgs = document.querySelectorAll(this.selectors.images.join(', '));
            imgs.forEach(img => {
                const src = this.getBestImage(img);
                if (src && !product.images.includes(src)) {
                    product.images.push(src);
                }
            });
            
            return product.name ? product : null;
        }
        
        extractProduct(container) {
            const product = {
                name: '',
                price: 0,
                currency: 'EGP',
                description: '',
                images: [],
                url: window.location.href,
                source: window.location.hostname,
                element: container
            };
            
            // Extract name
            for (const sel of this.selectors.name) {
                const el = container.querySelector(sel);
                if (el && el.textContent.trim().length > 2 && el.textContent.trim().length < 200) {
                    product.name = el.textContent.trim();
                    break;
                }
            }
            
            // Extract price
            for (const sel of this.selectors.price) {
                const el = container.querySelector(sel);
                if (el) {
                    const price = this.parsePrice(el.textContent);
                    if (price > 0) {
                        product.price = price;
                        break;
                    }
                }
            }
            
            // Extract images
            const imgs = container.querySelectorAll(this.selectors.images.join(', '));
            imgs.forEach(img => {
                const src = this.getBestImage(img);
                if (src && !product.images.includes(src)) {
                    product.images.push(src);
                }
            });
            
            // Extract link
            for (const sel of this.selectors.link) {
                const el = container.querySelector(sel);
                if (el && el.href && el.href.includes(window.location.hostname)) {
                    product.url = el.href;
                    break;
                }
            }
            
            return product.name ? product : null;
        }
        
        parsePrice(text) {
            if (!text) return 0;
            
            // Remove currency symbols and text
            const cleaned = text.replace(/[^\d.,]/g, '');
            
            // Handle different formats
            const match = cleaned.match(/[\d.,]+/);
            if (!match) return 0;
            
            const num = match[0].replace(/,/g, '');
            return parseFloat(num) || 0;
        }
        
        getBestImage(img) {
            // Try various image sources
            const sources = [
                img.dataset.src,
                img.dataset.original,
                img.dataset.lazySrc,
                img.srcset?.split(' ')[0],
                img.src
            ];
            
            for (const src of sources) {
                if (src && src.startsWith('http')) {
                    return src;
                }
            }
            
            return null;
        }
    }
    
    // ===== UI Manager =====
    class UIManager {
        constructor() {
            this.overlay = null;
            this.modal = null;
            this.mode = null;
            this.selectedProducts = [];
            this.detectedProducts = [];
            this.detector = new ProductDetector();
        }
        
        createOverlay() {
            // Remove existing overlay if any
            this.removeOverlay();
            
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.id = 'webharvest-overlay';
            this.overlay.innerHTML = `
                <style>
                    #webharvest-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.3);
                        z-index: 999999;
                        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                    }
                    
                    #webharvest-modal {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: linear-gradient(135deg, #1e1e2f, #2d2d44);
                        border-radius: 20px;
                        padding: 30px;
                        min-width: 350px;
                        max-width: 500px;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                        z-index: 1000000;
                        color: white;
                        direction: rtl;
                    }
                    
                    .wh-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 20px;
                        text-align: center;
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    
                    .wh-modes {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    
                    .wh-mode-btn {
                        background: rgba(255, 255, 255, 0.1);
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        padding: 15px 10px;
                        color: white;
                        cursor: pointer;
                        transition: all 0.3s;
                        text-align: center;
                    }
                    
                    .wh-mode-btn:hover {
                        background: rgba(99, 102, 241, 0.2);
                        border-color: #6366f1;
                    }
                    
                    .wh-mode-btn.active {
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        border-color: transparent;
                    }
                    
                    .wh-mode-btn .icon {
                        font-size: 28px;
                        margin-bottom: 8px;
                        display: block;
                    }
                    
                    .wh-mode-btn .label {
                        font-size: 12px;
                    }
                    
                    .wh-count {
                        background: rgba(34, 197, 94, 0.2);
                        border-radius: 10px;
                        padding: 15px;
                        text-align: center;
                        margin-bottom: 20px;
                        display: none;
                    }
                    
                    .wh-count.visible {
                        display: block;
                    }
                    
                    .wh-count-value {
                        font-size: 32px;
                        font-weight: bold;
                        color: #22c55e;
                    }
                    
                    .wh-actions {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                    }
                    
                    .wh-btn {
                        padding: 15px 20px;
                        border-radius: 12px;
                        border: none;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    
                    .wh-btn-primary {
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        color: white;
                    }
                    
                    .wh-btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
                    }
                    
                    .wh-btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .wh-btn-secondary:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .wh-btn-danger {
                        background: rgba(239, 68, 68, 0.2);
                        color: #ef4444;
                    }
                    
                    .wh-btn-danger:hover {
                        background: rgba(239, 68, 68, 0.3);
                    }
                    
                    .wh-instructions {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                        padding: 15px;
                        margin-top: 20px;
                        font-size: 14px;
                        color: rgba(255, 255, 255, 0.7);
                        line-height: 1.6;
                    }
                    
                    .wh-product-list {
                        max-height: 200px;
                        overflow-y: auto;
                        margin: 15px 0;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                        padding: 10px;
                    }
                    
                    .wh-product-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        margin-bottom: 8px;
                    }
                    
                    .wh-product-item:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    .wh-product-item img {
                        width: 50px;
                        height: 50px;
                        object-fit: cover;
                        border-radius: 8px;
                    }
                    
                    .wh-product-info {
                        flex: 1;
                    }
                    
                    .wh-product-name {
                        font-size: 14px;
                        margin-bottom: 4px;
                    }
                    
                    .wh-product-price {
                        font-size: 12px;
                        color: #22c55e;
                    }
                    
                    .wh-status {
                        text-align: center;
                        padding: 20px;
                        background: rgba(99, 102, 241, 0.1);
                        border-radius: 10px;
                        margin: 15px 0;
                    }
                    
                    .wh-status.success {
                        background: rgba(34, 197, 94, 0.2);
                        color: #22c55e;
                    }
                    
                    .wh-status.error {
                        background: rgba(239, 68, 68, 0.2);
                        color: #ef4444;
                    }
                    
                    .wh-loading {
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        border: 3px solid rgba(255,255,255,0.3);
                        border-top-color: #6366f1;
                        border-radius: 50%;
                        animation: wh-spin 1s linear infinite;
                    }
                    
                    @keyframes wh-spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    @media (max-width: 600px) {
                        #webharvest-modal {
                            min-width: 90%;
                            padding: 20px;
                        }
                        
                        .wh-modes {
                            grid-template-columns: repeat(3, 1fr);
                            gap: 5px;
                        }
                        
                        .wh-mode-btn {
                            padding: 10px 5px;
                        }
                    }
                </style>
                
                <div id="webharvest-modal">
                    <div class="wh-title">🛒 WebHarvest Pro</div>
                    
                    <div class="wh-modes">
                        <button class="wh-mode-btn" data-mode="single">
                            <span class="icon">📦</span>
                            <span class="label">منتج واحد</span>
                        </button>
                        <button class="wh-mode-btn" data-mode="multiple">
                            <span class="icon">📊</span>
                            <span class="label">منتجات متعددة</span>
                        </button>
                        <button class="wh-mode-btn" data-mode="all">
                            <span class="icon">📋</span>
                            <span class="label">كل المنتجات</span>
                        </button>
                    </div>
                    
                    <div class="wh-count" id="wh-count">
                        <span class="wh-count-value" id="wh-count-value">0</span>
                        <div>منتج تم تحديده</div>
                    </div>
                    
                    <div class="wh-product-list" id="wh-product-list" style="display: none;"></div>
                    
                    <div class="wh-status" id="wh-status" style="display: none;"></div>
                    
                    <div class="wh-actions" id="wh-actions">
                        <button class="wh-btn wh-btn-primary" id="wh-send" disabled>
                            📤 إرسال المنتجات
                        </button>
                        <button class="wh-btn wh-btn-danger" id="wh-cancel">
                            ❌ إلغاء
                        </button>
                    </div>
                    
                    <div class="wh-instructions" id="wh-instructions">
                        👈 اختار نمط الاستخراج من الأزرار فوق
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.overlay);
            this.modal = this.overlay.querySelector('#webharvest-modal');
            this.setupEvents();
            
            log('Overlay created');
        }
        
        setupEvents() {
            // Mode buttons
            this.modal.querySelectorAll('.wh-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
            });
            
            // Send button
            this.modal.querySelector('#wh-send').addEventListener('click', () => this.sendProducts());
            
            // Cancel button
            this.modal.querySelector('#wh-cancel').addEventListener('click', () => this.removeOverlay());
            
            // Click outside to close
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.removeOverlay();
                }
            });
        }
        
        selectMode(mode) {
            this.mode = mode;
            log('Mode selected:', mode);
            
            // Update UI
            this.modal.querySelectorAll('.wh-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
            
            const instructions = this.modal.querySelector('#wh-instructions');
            const countEl = this.modal.querySelector('#wh-count');
            const sendBtn = this.modal.querySelector('#wh-send');
            
            if (mode === 'single') {
                instructions.innerHTML = '🖱️ اضغط على أي منتج في الصفحة';
                this.detectProducts();
                this.startSingleSelection();
            } else if (mode === 'multiple') {
                instructions.innerHTML = '🖱️ اضغط على المنتجات اللي تحب تضيفها';
                this.detectProducts();
                this.startMultipleSelection();
            } else if (mode === 'all') {
                instructions.innerHTML = '⏳ جاري استخراج كل المنتجات...';
                this.extractAllProducts();
            }
        }
        
        detectProducts() {
            this.detectedProducts = this.detector.detectProducts();
            log(`Detected ${this.detectedProducts.length} products`);
            
            if (this.detectedProducts.length === 0) {
                this.showStatus('لم يتم العثور على منتجات في هذه الصفحة', 'error');
            }
        }
        
        startSingleSelection() {
            this.highlightProducts();
            this.enableProductClick('single');
        }
        
        startMultipleSelection() {
            this.highlightProducts();
            this.enableProductClick('multiple');
        }
        
        highlightProducts() {
            this.detectedProducts.forEach(product => {
                if (product.element) {
                    product.element.style.outline = '2px dashed #6366f1';
                    product.element.style.cursor = 'pointer';
                }
            });
        }
        
        enableProductClick(mode) {
            const handler = (e) => {
                const clickedProduct = this.detectedProducts.find(p => 
                    p.element && (p.element === e.target || p.element.contains(e.target))
                );
                
                if (clickedProduct) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (mode === 'single') {
                        this.selectedProducts = [clickedProduct];
                        this.updateSelectedUI();
                        this.sendProducts();
                    } else {
                        const index = this.selectedProducts.findIndex(p => p.id === clickedProduct.id);
                        if (index === -1) {
                            this.selectedProducts.push(clickedProduct);
                            clickedProduct.element.style.outline = '2px solid #22c55e';
                        } else {
                            this.selectedProducts.splice(index, 1);
                            clickedProduct.element.style.outline = '2px dashed #6366f1';
                        }
                        this.updateSelectedUI();
                    }
                }
            };
            
            document.addEventListener('click', handler, true);
            this.clickHandler = handler;
        }
        
        async extractAllProducts() {
            if (this.detectedProducts.length === 0) {
                this.showStatus('لم يتم العثور على منتجات', 'error');
                return;
            }
            
            this.selectedProducts = [...this.detectedProducts];
            this.updateSelectedUI();
            
            this.showStatus(`تم العثور على ${this.selectedProducts.length} منتج`, 'success');
            
            // Enable send button
            this.modal.querySelector('#wh-send').disabled = false;
        }
        
        updateSelectedUI() {
            const countEl = this.modal.querySelector('#wh-count');
            const countValue = this.modal.querySelector('#wh-count-value');
            const sendBtn = this.modal.querySelector('#wh-send');
            const productList = this.modal.querySelector('#wh-product-list');
            
            countEl.classList.add('visible');
            countValue.textContent = this.selectedProducts.length;
            sendBtn.disabled = this.selectedProducts.length === 0;
            
            // Show product list
            if (this.selectedProducts.length > 0) {
                productList.style.display = 'block';
                productList.innerHTML = this.selectedProducts.map(p => `
                    <div class="wh-product-item">
                        ${p.images[0] ? `<img src="${p.images[0]}" alt="${p.name}">` : '<div style="width:50px;height:50px;background:#333;border-radius:8px;"></div>'}
                        <div class="wh-product-info">
                            <div class="wh-product-name">${p.name.substring(0, 50)}</div>
                            <div class="wh-product-price">${p.price} ${p.currency}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                productList.style.display = 'none';
            }
        }
        
        showStatus(message, type = 'info') {
            const statusEl = this.modal.querySelector('#wh-status');
            statusEl.className = `wh-status ${type}`;
            statusEl.textContent = message;
            statusEl.style.display = 'block';
        }
        
        hideStatus() {
            this.modal.querySelector('#wh-status').style.display = 'none';
        }
        
        sendProducts() {
            if (this.selectedProducts.length === 0) {
                this.showStatus('الرجاء تحديد منتجات أولاً', 'error');
                return;
            }
            
            log('Sending products:', this.selectedProducts);
            
            // Show loading
            this.showStatus('جاري الإرسال...', 'info');
            const sendBtn = this.modal.querySelector('#wh-send');
            sendBtn.innerHTML = '<span class="wh-loading"></span> جاري الإرسال...';
            sendBtn.disabled = true;
            
            // Prepare data
            const data = {
                products: this.selectedProducts.map(p => ({
                    name: p.name,
                    price: p.price,
                    currency: p.currency,
                    description: p.description,
                    images: p.images,
                    url: p.url,
                    source: p.source,
                    extractedAt: new Date().toISOString()
                })),
                source: window.location.href,
                extractedAt: new Date().toISOString()
            };
            
            log('Data prepared:', data);
            
            // Method 1: Try postMessage
            try {
                // Check if parent window exists and is accessible
                if (window.opener && !window.opener.closed) {
                    log('Using window.opener');
                    window.opener.postMessage({
                        type: 'WEBHARVEST_PRODUCTS',
                        data: data
                    }, '*');
                    
                    setTimeout(() => {
                        this.showStatus('✅ تم إرسال المنتجات بنجاح!', 'success');
                        setTimeout(() => this.removeOverlay(), 1500);
                    }, 500);
                    return;
                }
            } catch (e) {
                log('window.opener failed:', e);
            }
            
            // Method 2: Try localStorage
            try {
                log('Using localStorage');
                const storageKey = 'webharvest_pending_products';
                localStorage.setItem(storageKey, JSON.stringify(data));
                
                // Open WebHarvest Pro
                const newWindow = window.open(CONFIG.webHarvestUrl, '_blank');
                
                if (newWindow) {
                    this.showStatus('✅ تم فتح WebHarvest Pro - المنتجات في انتظار الاستيراد', 'success');
                    setTimeout(() => this.removeOverlay(), 1500);
                } else {
                    // Popup blocked
                    this.showStatus('⚠️ تم حفظ المنتجات - الرجاء السماح بالـ Popups أو فتح WebHarvest Pro يدوياً', 'info');
                    
                    // Show link
                    const instructions = this.modal.querySelector('#wh-instructions');
                    instructions.innerHTML = `
                        <a href="${CONFIG.webHarvestUrl}" target="_blank" style="color: #6366f1; text-decoration: underline;">
                            افتح WebHarvest Pro
                        </a>
                        <br><br>
                        المنتجات محفوظة في التخزين المحلي
                    `;
                }
            } catch (e) {
                log('localStorage failed:', e);
                
                // Method 3: Fallback - download as JSON
                this.showStatus('⬇️ تحميل المنتجات كملف JSON...', 'info');
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `webharvest_products_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                setTimeout(() => {
                    this.showStatus('✅ تم تحميل الملف - استورده في WebHarvest Pro', 'success');
                    
                    const instructions = this.modal.querySelector('#wh-instructions');
                    instructions.innerHTML = `
                        <a href="${CONFIG.webHarvestUrl}" target="_blank" style="color: #6366f1; text-decoration: underline;">
                            افتح WebHarvest Pro
                        </a>
                        <br><br>
                        ثم استورد الملف الذي تم تحميله
                    `;
                }, 1000);
            }
        }
        
        removeOverlay() {
            // Remove highlights
            this.detectedProducts.forEach(product => {
                if (product.element) {
                    product.element.style.outline = '';
                    product.element.style.cursor = '';
                }
            });
            
            // Remove click handler
            if (this.clickHandler) {
                document.removeEventListener('click', this.clickHandler, true);
            }
            
            // Remove overlay
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
                this.modal = null;
            }
            
            log('Overlay removed');
        }
    }
    
    // ===== Initialize =====
    function init() {
        log('Initializing WebHarvest Bookmarklet...');
        
        // Check if already running
        if (document.getElementById('webharvest-overlay')) {
            log('Already running, removing overlay');
            document.getElementById('webharvest-overlay').remove();
            return;
        }
        
        // Create UI
        const ui = new UIManager();
        ui.createOverlay();
    }
    
    // Run
    init();
    
})();
