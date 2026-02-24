/**
 * WebHarvest Pro - Bookmarklet
 * سكرابر يعمل من المتصفح مباشرة
 * 
 * ⚠️ ملاحظة مهمة:
 * localStorage و BroadcastChannel لا يعملان بين domains مختلفة
 * الحل: فتح WebHarvest Pro في tab جديدة مع البيانات في URL
 */

(function() {
    'use strict';

    // Prevent multiple instances
    if (window.__webharvest_running) {
        alert('⚠️ WebHarvest Pro يعمل بالفعل!');
        return;
    }
    window.__webharvest_running = true;

    // Configuration
    const CONFIG = {
        webharvestUrl: 'https://ahmedsheta89-cell.github.io/WebHarvest-Pro/',
        maxProducts: 1000,
        timeout: 30000
    };

    // State
    let selectedProducts = [];
    let mode = 'auto'; // 'auto' or 'manual'
    let overlay = null;

    // Create Overlay UI
    function createOverlay() {
        // Remove existing overlay if any
        const existing = document.getElementById('webharvest-overlay');
        if (existing) existing.remove();

        // Create overlay
        overlay = document.createElement('div');
        overlay.id = 'webharvest-overlay';
        overlay.innerHTML = `
            <style>
                #webharvest-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    direction: rtl;
                    overflow-y: auto;
                }
                #webharvest-container {
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 30px;
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    border-radius: 20px;
                    box-shadow: 0 25px 80px rgba(99, 102, 241, 0.4);
                }
                #webharvest-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid rgba(255,255,255,0.2);
                }
                #webharvest-title {
                    font-size: 28px;
                    color: white;
                    margin: 0;
                }
                #webharvest-close {
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                }
                #webharvest-close:hover {
                    background: #dc2626;
                }
                #webharvest-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    flex: 1;
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 15px;
                    text-align: center;
                }
                .stat-value {
                    font-size: 36px;
                    color: #a5f3fc;
                    font-weight: bold;
                }
                .stat-label {
                    color: #cbd5e1;
                    font-size: 14px;
                    margin-top: 5px;
                }
                #webharvest-mode {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .mode-btn {
                    flex: 1;
                    padding: 15px;
                    border: 2px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: white;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.3s;
                }
                .mode-btn.active {
                    background: #6366f1;
                    border-color: #6366f1;
                }
                .mode-btn:hover {
                    border-color: #6366f1;
                }
                #webharvest-products {
                    max-height: 300px;
                    overflow-y: auto;
                    background: rgba(0,0,0,0.3);
                    border-radius: 15px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                .product-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    margin-bottom: 10px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .product-item:hover {
                    background: rgba(99, 102, 241, 0.2);
                }
                .product-item.selected {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.2);
                }
                .product-name {
                    color: white;
                    font-size: 16px;
                }
                .product-price {
                    color: #a5f3fc;
                    font-weight: bold;
                }
                #webharvest-actions {
                    display: flex;
                    gap: 15px;
                }
                .action-btn {
                    flex: 1;
                    padding: 20px;
                    border: none;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: bold;
                    transition: all 0.3s;
                }
                #send-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }
                #send-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
                }
                #send-btn:disabled {
                    background: #4b5563;
                    cursor: not-allowed;
                    transform: none;
                }
                #cancel-btn {
                    background: #4b5563;
                    color: white;
                }
                #cancel-btn:hover {
                    background: #374151;
                }
                .loader {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            <div id="webharvest-container">
                <div id="webharvest-header">
                    <h1 id="webharvest-title">🛒 WebHarvest Pro</h1>
                    <button id="webharvest-close">✕ إغلاق</button>
                </div>
                
                <div id="webharvest-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="total-count">0</div>
                        <div class="stat-label">إجمالي المنتجات</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="selected-count">0</div>
                        <div class="stat-label">المنتجات المحددة</div>
                    </div>
                </div>
                
                <div id="webharvest-mode">
                    <button class="mode-btn active" data-mode="auto">🔍 استخراج تلقائي</button>
                    <button class="mode-btn" data-mode="manual">✋ تحديد يدوي</button>
                </div>
                
                <div id="webharvest-products">
                    <div style="text-align: center; color: #94a3b8; padding: 40px;">
                        جاري البحث عن المنتجات...
                    </div>
                </div>
                
                <div id="webharvest-actions">
                    <button class="action-btn" id="send-btn" disabled>
                        📤 إرسال المنتجات (0)
                    </button>
                    <button class="action-btn" id="cancel-btn">❌ إلغاء</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Setup event listeners
        setupEventListeners();
        
        // Auto-detect products
        autoDetectProducts();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        document.getElementById('webharvest-close').onclick = closeOverlay;
        document.getElementById('cancel-btn').onclick = closeOverlay;

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = () => switchMode(btn.dataset.mode);
        });

        // Send button
        document.getElementById('send-btn').onclick = sendProducts;
    }

    // Switch mode
    function switchMode(newMode) {
        mode = newMode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // If manual mode, enable selection on page
        if (mode === 'manual') {
            enableManualSelection();
        } else {
            disableManualSelection();
        }
    }

    // Auto detect products
    function autoDetectProducts() {
        const products = [];
        
        // Common product selectors
        const selectors = [
            // Generic
            '[class*="product"]',
            '[class*="item"]',
            '[data-product]',
            '[data-product-id]',
            '[itemtype*="Product"]',
            
            // E-commerce platforms
            '.product-card',
            '.product-item',
            '.product-box',
            '.product-wrapper',
            '.shop-item',
            '.item-box',
            
            // Amazon
            '[data-component-type="s-search-result"]',
            '.s-result-item',
            
            // Noon
            '[data-qa="product-card"]',
            
            // Jumia
            '.sku',
            '.product',
            
            // Custom
            '.card.product',
            'article.product',
            'div[class*="product"][class*="card"]'
        ];

        // Try each selector
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(el => {
                // Skip if already found
                if (el.dataset.webharvestFound) return;
                el.dataset.webharvestFound = 'true';

                // Extract product data
                const product = extractProductData(el);
                
                if (product && product.name) {
                    products.push(product);
                }
            });
        }

        // Update UI
        updateProductsList(products);
    }

    // Extract product data from element
    function extractProductData(el) {
        const nameSelectors = [
            'h1', 'h2', 'h3', 'h4',
            '[class*="title"]',
            '[class*="name"]',
            '.product-title',
            '.product-name',
            '.title',
            '.name',
            'a[title]',
            '[itemprop="name"]'
        ];

        const priceSelectors = [
            '[class*="price"]',
            '.price',
            '.product-price',
            '[itemprop="price"]',
            '[data-price]',
            '.amount'
        ];

        const imageSelectors = [
            'img',
            '[class*="image"]',
            '.product-image',
            '[itemprop="image"]'
        ];

        // Extract name
        let name = '';
        for (const selector of nameSelectors) {
            const nameEl = el.querySelector(selector);
            if (nameEl && nameEl.textContent.trim()) {
                name = nameEl.textContent.trim();
                break;
            }
        }

        // Extract price
        let price = 0;
        for (const selector of priceSelectors) {
            const priceEl = el.querySelector(selector);
            if (priceEl) {
                const text = priceEl.textContent || priceEl.dataset.price || '';
                const match = text.match(/[\d,]+\.?\d*/);
                if (match) {
                    price = parseFloat(match[0].replace(/,/g, ''));
                    break;
                }
            }
        }

        // Extract image
        let image = '';
        for (const selector of imageSelectors) {
            const imgEl = el.querySelector(selector);
            if (imgEl) {
                image = imgEl.src || imgEl.dataset.src || '';
                if (image && !image.includes('data:image')) break;
            }
        }

        // Extract URL
        const linkEl = el.querySelector('a[href]');
        const url = linkEl ? linkEl.href : window.location.href;

        // Extract description
        const descEl = el.querySelector('[class*="description"], [itemprop="description"], p');
        const description = descEl ? descEl.textContent.trim() : '';

        return {
            id: Date.now() + Math.random(),
            name: name,
            price: price,
            image: image,
            url: url,
            description: description,
            currency: 'EGP',
            source: window.location.hostname,
            scrapedAt: new Date().toISOString()
        };
    }

    // Update products list
    function updateProductsList(products) {
        selectedProducts = products;
        
        const container = document.getElementById('webharvest-products');
        
        if (products.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">😕</div>
                    <div>لم يتم العثور على منتجات</div>
                    <div style="font-size: 14px; margin-top: 10px;">جرب استخدام "تحديد يدوي"</div>
                </div>
            `;
            document.getElementById('send-btn').disabled = true;
            return;
        }

        container.innerHTML = products.map((p, i) => `
            <div class="product-item selected" data-index="${i}">
                <div>
                    <div class="product-name">${p.name}</div>
                    <div style="color: #94a3b8; font-size: 12px; margin-top: 5px;">${p.source}</div>
                </div>
                <div class="product-price">${p.price ? p.price + ' ' + p.currency : 'غير محدد'}</div>
            </div>
        `).join('');

        // Update stats
        document.getElementById('total-count').textContent = products.length;
        document.getElementById('selected-count').textContent = products.length;
        document.getElementById('send-btn').textContent = `📤 إرسال المنتجات (${products.length})`;
        document.getElementById('send-btn').disabled = false;

        // Add click handlers
        container.querySelectorAll('.product-item').forEach(item => {
            item.onclick = () => toggleProduct(item);
        });
    }

    // Toggle product selection
    function toggleProduct(item) {
        const index = parseInt(item.dataset.index);
        item.classList.toggle('selected');
        
        const selected = document.querySelectorAll('.product-item.selected').length;
        document.getElementById('selected-count').textContent = selected;
        document.getElementById('send-btn').textContent = `📤 إرسال المنتجات (${selected})`;
        document.getElementById('send-btn').disabled = selected === 0;
    }

    // Enable manual selection
    function enableManualSelection() {
        document.body.style.cursor = 'crosshair';
        
        // Add click handler to all elements
        document.addEventListener('click', handleManualClick, true);
        
        alert('✋ انقر على أي عنصر لتحديده كمنتج');
    }

    // Disable manual selection
    function disableManualSelection() {
        document.body.style.cursor = '';
        document.removeEventListener('click', handleManualClick, true);
    }

    // Handle manual click
    function handleManualClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const product = extractProductData(e.target.closest('[class*="product"], [class*="item"], div, article') || e.target);
        
        if (product && product.name) {
            selectedProducts.push(product);
            updateProductsList(selectedProducts);
        }
    }

    // Send products to WebHarvest Pro
    function sendProducts() {
        const btn = document.getElementById('send-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loader"></span> جاري الإرسال...';

        // Get selected products
        const selected = [];
        document.querySelectorAll('.product-item.selected').forEach(item => {
            const index = parseInt(item.dataset.index);
            selected.push(selectedProducts[index]);
        });

        if (selected.length === 0) {
            alert('⚠️ لم يتم تحديد أي منتجات');
            btn.disabled = false;
            btn.textContent = '📤 إرسال المنتجات (0)';
            return;
        }

        try {
            // Create data
            const data = {
                products: selected,
                source: window.location.hostname,
                url: window.location.href,
                timestamp: Date.now()
            };

            // Encode data
            const jsonStr = JSON.stringify(data);
            const encoded = btoa(encodeURIComponent(jsonStr));

            // Open WebHarvest Pro with data
            const url = `${CONFIG.webharvestUrl}?import=${encoded}`;
            
            // Show success message
            alert(`✅ تم استخراج ${selected.length} منتج!\nسيتم فتح WebHarvest Pro الآن...`);
            
            // Open in new tab
            window.open(url, '_blank');
            
            // Close overlay
            closeOverlay();

        } catch (error) {
            console.error('Error sending products:', error);
            alert('❌ حدث خطأ أثناء الإرسال: ' + error.message);
            btn.disabled = false;
            btn.textContent = `📤 إرسال المنتجات (${selected.length})`;
        }
    }

    // Close overlay
    function closeOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        window.__webharvest_running = false;
        disableManualSelection();
    }

    // Initialize
    createOverlay();

})();
