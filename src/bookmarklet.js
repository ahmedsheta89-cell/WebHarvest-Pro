/**
 * WebHarvest Pro - Bookmarklet (Production)
 * يعمل على أي موقع ويستخرج المنتجات
 */

(function() {
    'use strict';
    
    // التأكد من عدم التشغيل المتكرر
    if (window.__webharvest_running) {
        alert('WebHarvest Pro يعمل بالفعل!');
        return;
    }
    window.__webharvest_running = true;
    
    console.log('[WebHarvest] Starting Bookmarklet...');
    
    // ==================== Configuration ====================
    const CONFIG = {
        targetOrigin: 'https://ahmedsheta89-cell.github.io',
        targetPath: '/WebHarvest-Pro/',
        storageKey: 'webharvest_products_data'
    };
    
    // ==================== Product Detection ====================
    const ProductDetector = {
        // قوالب اكتشاف المنتجات
        patterns: {
            productCard: [
                '[class*="product"]',
                '[class*="item"]',
                '[class*="card"]',
                '[data-product-id]',
                '[data-product]',
                '[itemtype*="Product"]'
            ],
            name: [
                'h1', 'h2', 'h3',
                '[class*="title"]',
                '[class*="name"]',
                '[itemprop="name"]',
                'a[title]'
            ],
            price: [
                '[class*="price"]',
                '[itemprop="price"]',
                '[data-price]'
            ],
            image: [
                'img',
                '[class*="image"]',
                '[itemprop="image"]'
            ],
            link: [
                'a[href*="product"]',
                'a[href*="item"]',
                'a[href*="p-"]'
            ]
        },
        
        // اكتشاف المنتجات في الصفحة
        detectProducts() {
            const products = [];
            const seen = new Set();
            
            // البحث عن كروت المنتجات
            for (const pattern of this.patterns.productCard) {
                const elements = document.querySelectorAll(pattern);
                
                elements.forEach(el => {
                    // تجنب العناصر المكررة
                    const key = el.outerHTML.slice(0, 100);
                    if (seen.has(key)) return;
                    seen.add(key);
                    
                    // تجنب العناصر الصغيرة جداً
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 50 || rect.height < 50) return;
                    
                    // استخراج البيانات
                    const product = this.extractProductData(el);
                    if (product && product.name) {
                        products.push(product);
                    }
                });
            }
            
            return products;
        },
        
        // استخراج بيانات منتج واحد
        extractProductData(element) {
            // الاسم
            let name = '';
            for (const pattern of this.patterns.name) {
                const el = element.querySelector(pattern);
                if (el && el.textContent.trim()) {
                    name = el.textContent.trim();
                    break;
                }
            }
            
            // السعر
            let price = 0;
            for (const pattern of this.patterns.price) {
                const el = element.querySelector(pattern);
                if (el) {
                    const text = el.textContent || el.value || '';
                    const match = text.match(/[\d,]+\.?\d*/);
                    if (match) {
                        price = parseFloat(match[0].replace(/,/g, ''));
                        break;
                    }
                }
            }
            
            // الصور
            const images = [];
            for (const pattern of this.patterns.image) {
                const els = element.querySelectorAll(pattern);
                els.forEach(img => {
                    const src = img.src || img.dataset.src || img.dataset.lazySrc;
                    if (src && !images.includes(src)) {
                        images.push(src);
                    }
                });
            }
            
            // الرابط
            let link = '';
            for (const pattern of this.patterns.link) {
                const el = element.querySelector(pattern);
                if (el && el.href) {
                    link = el.href;
                    break;
                }
            }
            
            return {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                name: name,
                price: price,
                images: images.slice(0, 5),
                link: link || window.location.href,
                source: window.location.hostname,
                scrapedAt: new Date().toISOString()
            };
        }
    };
    
    // ==================== UI Manager ====================
    const UIManager = {
        overlay: null,
        mode: 'multi', // 'single', 'multi', 'all'
        selectedProducts: [],
        detectedProducts: [],
        
        create() {
            // حذف أي overlay قديم
            const oldOverlay = document.getElementById('webharvest-overlay');
            if (oldOverlay) oldOverlay.remove();
            
            // إنشاء الـ overlay
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
                        background: rgba(0, 0, 0, 0.85);
                        z-index: 2147483647;
                        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                        direction: rtl;
                    }
                    
                    .wh-modal {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                        border-radius: 20px;
                        padding: 30px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 80vh;
                        overflow: hidden;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                    }
                    
                    .wh-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    .wh-title {
                        color: white;
                        font-size: 24px;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .wh-close {
                        background: rgba(239, 68, 68, 0.2);
                        border: none;
                        color: #ef4444;
                        font-size: 20px;
                        width: 35px;
                        height: 35px;
                        border-radius: 50%;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    
                    .wh-close:hover {
                        background: #ef4444;
                        color: white;
                    }
                    
                    .wh-mode-selector {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    
                    .wh-mode-btn {
                        padding: 15px;
                        border: 2px solid rgba(139, 92, 246, 0.3);
                        background: rgba(139, 92, 246, 0.1);
                        color: white;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                    }
                    
                    .wh-mode-btn:hover {
                        background: rgba(139, 92, 246, 0.2);
                    }
                    
                    .wh-mode-btn.active {
                        background: #8b5cf6;
                        border-color: #8b5cf6;
                    }
                    
                    .wh-mode-icon {
                        font-size: 28px;
                        margin-bottom: 5px;
                    }
                    
                    .wh-mode-label {
                        font-size: 13px;
                        opacity: 0.9;
                    }
                    
                    .wh-products-container {
                        max-height: 250px;
                        overflow-y: auto;
                        margin-bottom: 15px;
                        border-radius: 12px;
                        background: rgba(0, 0, 0, 0.3);
                        padding: 15px;
                    }
                    
                    .wh-product-count {
                        color: #a5b4fc;
                        font-size: 14px;
                        margin-bottom: 10px;
                    }
                    
                    .wh-product-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        margin-bottom: 8px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        border: 1px solid transparent;
                        transition: all 0.2s;
                    }
                    
                    .wh-product-item:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    .wh-product-item.selected {
                        border-color: #8b5cf6;
                        background: rgba(139, 92, 246, 0.2);
                    }
                    
                    .wh-product-img {
                        width: 50px;
                        height: 50px;
                        border-radius: 8px;
                        object-fit: cover;
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    .wh-product-info {
                        flex: 1;
                    }
                    
                    .wh-product-name {
                        color: white;
                        font-size: 14px;
                        margin-bottom: 4px;
                    }
                    
                    .wh-product-price {
                        color: #a5b4fc;
                        font-size: 12px;
                    }
                    
                    .wh-footer {
                        display: flex;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    
                    .wh-btn {
                        flex: 1;
                        padding: 15px;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    
                    .wh-btn-primary {
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        color: white;
                    }
                    
                    .wh-btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 20px rgba(99, 102, 241, 0.4);
                    }
                    
                    .wh-btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                    }
                    
                    .wh-btn-secondary:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .wh-status {
                        text-align: center;
                        padding: 20px;
                        color: #a5b4fc;
                    }
                    
                    .wh-highlight {
                        outline: 3px solid #8b5cf6 !important;
                        outline-offset: 2px;
                        cursor: pointer !important;
                    }
                    
                    .wh-highlight:hover {
                        background: rgba(139, 92, 246, 0.2) !important;
                    }
                </style>
                
                <div class="wh-modal">
                    <div class="wh-header">
                        <div class="wh-title">
                            🛒 WebHarvest Pro
                        </div>
                        <button class="wh-close" id="wh-close">✕</button>
                    </div>
                    
                    <div class="wh-mode-selector">
                        <button class="wh-mode-btn" data-mode="single">
                            <div class="wh-mode-icon">📦</div>
                            <div class="wh-mode-label">منتج واحد</div>
                        </button>
                        <button class="wh-mode-btn active" data-mode="multi">
                            <div class="wh-mode-icon">📊</div>
                            <div class="wh-mode-label">منتجات متعددة</div>
                        </button>
                        <button class="wh-mode-btn" data-mode="all">
                            <div class="wh-mode-icon">📋</div>
                            <div class="wh-mode-label">كل المنتجات</div>
                        </button>
                    </div>
                    
                    <div id="wh-content">
                        <!-- Content will be inserted here -->
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.overlay);
            
            // Bind events
            this.bindEvents();
            
            // Show initial content
            this.showMode('multi');
        },
        
        bindEvents() {
            // Close button
            this.overlay.querySelector('#wh-close').addEventListener('click', () => {
                this.destroy();
            });
            
            // Mode buttons
            this.overlay.querySelectorAll('.wh-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    this.overlay.querySelectorAll('.wh-mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.showMode(mode);
                });
            });
        },
        
        showMode(mode) {
            this.mode = mode;
            this.selectedProducts = [];
            
            const content = this.overlay.querySelector('#wh-content');
            
            if (mode === 'single') {
                content.innerHTML = `
                    <div class="wh-status">
                        <p>🎯 اضغط على أي منتج في الصفحة لتحديده</p>
                        <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                            سيتم تمييز المنتجات المتاحة
                        </p>
                    </div>
                `;
                this.highlightProducts();
            } else if (mode === 'multi') {
                this.detectedProducts = ProductDetector.detectProducts();
                content.innerHTML = `
                    <div class="wh-products-container">
                        <div class="wh-product-count">
                            تم اكتشاف ${this.detectedProducts.length} منتج - اضغط للتحديد
                        </div>
                        ${this.detectedProducts.map((p, i) => `
                            <div class="wh-product-item" data-index="${i}">
                                <img class="wh-product-img" src="${p.images[0] || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect fill=%22%236366f1%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22>📦</text></svg>'}" alt="">
                                <div class="wh-product-info">
                                    <div class="wh-product-name">${p.name.slice(0, 50)}${p.name.length > 50 ? '...' : ''}</div>
                                    <div class="wh-product-price">${p.price ? p.price + ' جنيه' : 'السعر غير متوفر'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="wh-footer">
                        <button class="wh-btn wh-btn-primary" id="wh-send">
                            إرسال ${this.selectedProducts.length} منتج
                        </button>
                        <button class="wh-btn wh-btn-secondary" id="wh-cancel">
                            إلغاء التحديد
                        </button>
                    </div>
                `;
                
                // Bind product selection
                content.querySelectorAll('.wh-product-item').forEach(item => {
                    item.addEventListener('click', () => {
                        item.classList.toggle('selected');
                        this.updateSelection();
                    });
                });
                
                // Bind send button
                content.querySelector('#wh-send').addEventListener('click', () => {
                    this.sendProducts();
                });
                
                // Bind cancel button
                content.querySelector('#wh-cancel').addEventListener('click', () => {
                    this.selectedProducts = [];
                    content.querySelectorAll('.wh-product-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    this.updateSelection();
                });
                
            } else if (mode === 'all') {
                this.detectedProducts = ProductDetector.detectProducts();
                this.selectedProducts = [...this.detectedProducts];
                
                content.innerHTML = `
                    <div class="wh-products-container">
                        <div class="wh-product-count">
                            ✅ تم تحديد ${this.selectedProducts.length} منتج
                        </div>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${this.selectedProducts.slice(0, 10).map(p => `
                                <div class="wh-product-item selected">
                                    <img class="wh-product-img" src="${p.images[0] || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect fill=%22%236366f1%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2220%22>📦</text></svg>'}" alt="">
                                    <div class="wh-product-info">
                                        <div class="wh-product-name">${p.name.slice(0, 50)}${p.name.length > 50 ? '...' : ''}</div>
                                        <div class="wh-product-price">${p.price ? p.price + ' جنيه' : 'السعر غير متوفر'}</div>
                                    </div>
                                </div>
                            `).join('')}
                            ${this.selectedProducts.length > 10 ? `
                                <div style="text-align: center; padding: 10px; color: #a5b4fc;">
                                    ... و ${this.selectedProducts.length - 10} منتج آخر
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="wh-footer">
                        <button class="wh-btn wh-btn-primary" id="wh-send">
                            إرسال ${this.selectedProducts.length} منتج
                        </button>
                        <button class="wh-btn wh-btn-secondary" id="wh-cancel">
                            إلغاء
                        </button>
                    </div>
                `;
                
                // Bind send button
                content.querySelector('#wh-send').addEventListener('click', () => {
                    this.sendProducts();
                });
                
                // Bind cancel button
                content.querySelector('#wh-cancel').addEventListener('click', () => {
                    this.destroy();
                });
            }
        },
        
        highlightProducts() {
            // Remove previous highlights
            document.querySelectorAll('.wh-highlight').forEach(el => {
                el.classList.remove('wh-highlight');
            });
            
            // Highlight all product cards
            const products = document.querySelectorAll('[class*="product"], [class*="item"], [class*="card"]');
            products.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 50) {
                    el.classList.add('wh-highlight');
                    el.addEventListener('click', this.handleSingleSelect.bind(this), { once: true });
                }
            });
        },
        
        handleSingleSelect(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const product = ProductDetector.extractProductData(event.currentTarget);
            this.selectedProducts = [product];
            this.sendProducts();
        },
        
        updateSelection() {
            const selected = this.overlay.querySelectorAll('.wh-product-item.selected');
            this.selectedProducts = [];
            
            selected.forEach(item => {
                const index = parseInt(item.dataset.index);
                this.selectedProducts.push(this.detectedProducts[index]);
            });
            
            const sendBtn = this.overlay.querySelector('#wh-send');
            if (sendBtn) {
                sendBtn.textContent = `إرسال ${this.selectedProducts.length} منتج`;
            }
        },
        
        sendProducts() {
            if (this.selectedProducts.length === 0) {
                alert('الرجاء تحديد منتج واحد على الأقل');
                return;
            }
            
            console.log('[WebHarvest] Sending products:', this.selectedProducts.length);
            
            // Store data in localStorage
            const data = {
                products: this.selectedProducts,
                source: window.location.href,
                scrapedAt: new Date().toISOString()
            };
            
            try {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
                console.log('[WebHarvest] Data saved to localStorage');
            } catch (e) {
                console.error('[WebHarvest] Error saving to localStorage:', e);
            }
            
            // Show success message
            this.showSuccess(this.selectedProducts.length);
            
            // Open WebHarvest Pro
            setTimeout(() => {
                const targetUrl = CONFIG.targetOrigin + CONFIG.targetPath + '?import=' + Date.now();
                window.open(targetUrl, '_blank');
                this.destroy();
            }, 500);
        },
        
        showSuccess(count) {
            const content = this.overlay.querySelector('#wh-content');
            content.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
                    <div style="color: white; font-size: 24px; margin-bottom: 10px;">
                        تم استخراج ${count} منتج بنجاح!
                    </div>
                    <div style="color: #a5b4fc; font-size: 14px;">
                        جارٍ فتح WebHarvest Pro...
                    </div>
                </div>
            `;
        },
        
        destroy() {
            if (this.overlay) {
                this.overlay.remove();
            }
            window.__webharvest_running = false;
            
            // Remove highlights
            document.querySelectorAll('.wh-highlight').forEach(el => {
                el.classList.remove('wh-highlight');
            });
        }
    };
    
    // ==================== Initialize ====================
    UIManager.create();
    
})();
