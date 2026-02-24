/**
 * WebHarvest Pro - Enhanced Bookmarklet
 * سحب منتجات متعددة من صفحة القائمة
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        webharvestUrl: 'https://ahmedsheta89-cell.github.io/WebHarvest-Pro',
        highlightColor: '#6366f1',
        selectedColor: '#22c55e',
        hoverColor: '#3b82f6'
    };

    // State
    const state = {
        mode: null, // 'single' | 'multiple' | 'list'
        selectedProducts: [],
        overlay: null,
        highlighter: null
    };

    // Create overlay
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'webharvest-overlay';
        overlay.innerHTML = `
            <style>
                #webharvest-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.85);
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    direction: rtl;
                }
                #webharvest-panel {
                    background: linear-gradient(135deg, #1e1e2e, #2d2d44);
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                #webharvest-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: white;
                    text-align: center;
                    margin-bottom: 25px;
                }
                #webharvest-title span {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .webharvest-btn {
                    display: block;
                    width: 100%;
                    padding: 18px;
                    margin: 10px 0;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    justify-content: center;
                }
                .webharvest-btn-primary {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                }
                .webharvest-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
                }
                .webharvest-btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .webharvest-btn-secondary:hover {
                    background: rgba(255,255,255,0.2);
                }
                .webharvest-btn-danger {
                    background: #ef4444;
                    color: white;
                }
                .webharvest-btn-danger:hover {
                    background: #dc2626;
                }
                .webharvest-icon {
                    font-size: 24px;
                }
                #webharvest-status {
                    text-align: center;
                    color: rgba(255,255,255,0.7);
                    margin-top: 15px;
                    font-size: 14px;
                }
                #webharvest-selected-count {
                    background: #22c55e;
                    color: white;
                    padding: 8px 20px;
                    border-radius: 20px;
                    margin: 15px 0;
                    text-align: center;
                    font-weight: bold;
                    display: none;
                }
                .webharvest-product {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    padding: 15px;
                    margin: 10px 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .webharvest-product img {
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 8px;
                }
                .webharvest-product-info {
                    flex: 1;
                    color: white;
                }
                .webharvest-product-name {
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                .webharvest-product-price {
                    color: #22c55e;
                    font-size: 18px;
                }
                .webharvest-checkbox {
                    width: 24px;
                    height: 24px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .webharvest-checkbox.checked {
                    background: #22c55e;
                    border-color: #22c55e;
                }
                .webharvest-checkbox.checked::after {
                    content: '✓';
                    color: white;
                    font-size: 16px;
                }
                #webharvest-products-list {
                    max-height: 300px;
                    overflow-y: auto;
                    margin: 15px 0;
                }
                .webharvest-instructions {
                    background: rgba(99, 102, 241, 0.2);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 10px;
                    padding: 15px;
                    margin: 15px 0;
                    color: rgba(255,255,255,0.9);
                    font-size: 14px;
                    line-height: 1.6;
                }
            </style>
            <div id="webharvest-panel">
                <div id="webharvest-title">
                    <span>🚀 WebHarvest Pro</span>
                </div>
                
                <div id="webharvest-main-menu">
                    <button class="webharvest-btn webharvest-btn-primary" onclick="window.webharvestStartSingle()">
                        <span class="webharvest-icon">📦</span>
                        استخراج منتج واحد
                    </button>
                    
                    <button class="webharvest-btn webharvest-btn-primary" onclick="window.webharvestStartMultiple()">
                        <span class="webharvest-icon">📊</span>
                        تحديد منتجات متعددة
                    </button>
                    
                    <button class="webharvest-btn webharvest-btn-secondary" onclick="window.webharvestExtractList()">
                        <span class="webharvest-icon">📋</span>
                        استخراج كل منتجات الصفحة
                    </button>
                    
                    <button class="webharvest-btn webharvest-btn-secondary" onclick="window.webharvestClose()">
                        <span class="webharvest-icon">❌</span>
                        إلغاء
                    </button>
                </div>
                
                <div id="webharvest-selection-mode" style="display: none;">
                    <div class="webharvest-instructions">
                        👆 اضغط على المنتجات اللي تحب تضيفها
                        <br>
                        ✅ هيظهر إطار أخضر حوالين المنتجات المحددة
                        <br>
                        📍 لما تخلص اضغط "إرسال المنتجات"
                    </div>
                    
                    <div id="webharvest-selected-count"></div>
                    
                    <button class="webharvest-btn webharvest-btn-primary" onclick="window.webharvestSendSelected()">
                        <span class="webharvest-icon">📤</span>
                        إرسال المنتجات المحددة
                    </button>
                    
                    <button class="webharvest-btn webharvest-btn-danger" onclick="window.webharvestCancelSelection()">
                        <span class="webharvest-icon">❌</span>
                        إلغاء التحديد
                    </button>
                </div>
                
                <div id="webharvest-extracting" style="display: none;">
                    <div style="text-align: center; padding: 30px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                        <div style="color: white; font-size: 18px;">جاري الاستخراج...</div>
                        <div id="webharvest-progress" style="color: rgba(255,255,255,0.7); margin-top: 10px;"></div>
                    </div>
                </div>
                
                <div id="webharvest-results" style="display: none;">
                    <div id="webharvest-selected-count"></div>
                    <div id="webharvest-products-list"></div>
                    
                    <button class="webharvest-btn webharvest-btn-primary" onclick="window.webharvestSendAll()">
                        <span class="webharvest-icon">📤</span>
                        إرسال الكل لـ WebHarvest
                    </button>
                    
                    <button class="webharvest-btn webharvest-btn-secondary" onclick="window.webharvestClose()">
                        <span class="webharvest-icon">❌</span>
                        إغلاق
                    </button>
                </div>
                
                <div id="webharvest-status"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        state.overlay = overlay;
        
        // Expose functions globally
        window.webharvestClose = closeOverlay;
        window.webharvestStartSingle = startSingleMode;
        window.webharvestStartMultiple = startMultipleMode;
        window.webharvestExtractList = extractListMode;
        window.webharvestSendSelected = sendSelected;
        window.webharvestCancelSelection = cancelSelection;
        window.webharvestSendAll = sendAll;
    }

    // Close overlay
    function closeOverlay() {
        if (state.overlay) {
            document.body.removeChild(state.overlay);
            state.overlay = null;
        }
        removeHighlighter();
        state.mode = null;
        state.selectedProducts = [];
    }

    // Single product mode
    function startSingleMode() {
        state.mode = 'single';
        document.getElementById('webharvest-main-menu').style.display = 'none';
        document.getElementById('webharvest-selection-mode').style.display = 'block';
        document.querySelector('.webharvest-instructions').innerHTML = `
            👆 اضغط على المنتج اللي تحب تستخرجه
            <br>
            📍 هيظهر إطار حوالين المنتج
        `;
        createHighlighter();
    }

    // Multiple products mode
    function startMultipleMode() {
        state.mode = 'multiple';
        document.getElementById('webharvest-main-menu').style.display = 'none';
        document.getElementById('webharvest-selection-mode').style.display = 'block';
        createHighlighter();
    }

    // Extract list mode
    async function extractListMode() {
        state.mode = 'list';
        document.getElementById('webharvest-main-menu').style.display = 'none';
        document.getElementById('webharvest-extracting').style.display = 'block';
        
        const products = await extractAllProducts();
        
        if (products.length > 0) {
            state.selectedProducts = products;
            showResults(products);
        } else {
            document.getElementById('webharvest-progress').textContent = 'لم يتم العثور على منتجات';
            setTimeout(closeOverlay, 2000);
        }
    }

    // Create highlighter element
    function createHighlighter() {
        const highlighter = document.createElement('div');
        highlighter.id = 'webharvest-highlighter';
        highlighter.style.cssText = `
            position: absolute;
            border: 3px dashed ${CONFIG.highlightColor};
            background: rgba(99, 102, 241, 0.1);
            pointer-events: none;
            z-index: 999998;
            display: none;
            border-radius: 8px;
            transition: all 0.15s ease;
        `;
        document.body.appendChild(highlighter);
        state.highlighter = highlighter;
        
        // Add mouse move listener
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onMouseClick, true);
    }

    // Remove highlighter
    function removeHighlighter() {
        if (state.highlighter) {
            document.body.removeChild(state.highlighter);
            state.highlighter = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('click', onMouseClick, true);
        
        // Remove selected highlights
        document.querySelectorAll('.webharvest-selected').forEach(el => {
            el.classList.remove('webharvest-selected');
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
    }

    // Mouse move handler
    function onMouseMove(e) {
        if (!state.highlighter || !['single', 'multiple'].includes(state.mode)) return;
        
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) return;
        
        const productContainer = findProductContainer(element);
        
        if (productContainer) {
            const rect = productContainer.getBoundingClientRect();
            state.highlighter.style.display = 'block';
            state.highlighter.style.top = `${rect.top + window.scrollY}px`;
            state.highlighter.style.left = `${rect.left + window.scrollX}px`;
            state.highlighter.style.width = `${rect.width}px`;
            state.highlighter.style.height = `${rect.height}px`;
            state.highlighter.dataset.element = productContainer.dataset.webharvestId || '';
        } else {
            state.highlighter.style.display = 'none';
        }
    }

    // Mouse click handler
    function onMouseClick(e) {
        if (!['single', 'multiple'].includes(state.mode)) return;
        
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) return;
        
        const productContainer = findProductContainer(element);
        
        if (productContainer) {
            e.preventDefault();
            e.stopPropagation();
            
            if (state.mode === 'single') {
                // Single mode - extract immediately
                const product = extractProductData(productContainer);
                state.selectedProducts = [product];
                sendToWebHarvest([product]);
            } else {
                // Multiple mode - toggle selection
                const id = productContainer.dataset.webharvestId || `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                productContainer.dataset.webharvestId = id;
                
                const index = state.selectedProducts.findIndex(p => p._id === id);
                
                if (index > -1) {
                    // Deselect
                    state.selectedProducts.splice(index, 1);
                    productContainer.classList.remove('webharvest-selected');
                    productContainer.style.outline = '';
                } else {
                    // Select
                    const product = extractProductData(productContainer);
                    product._id = id;
                    state.selectedProducts.push(product);
                    productContainer.classList.add('webharvest-selected');
                    productContainer.style.outline = `3px solid ${CONFIG.selectedColor}`;
                    productContainer.style.outlineOffset = '2px';
                }
                
                updateSelectedCount();
            }
        }
    }

    // Find product container
    function findProductContainer(element) {
        const selectors = [
            '[data-product-id]',
            '[data-product]',
            '[data-item-id]',
            '[data-sku]',
            '.product',
            '.product-item',
            '.product-card',
            '.product-container',
            '.product-box',
            '.item',
            '.item-product',
            '[class*="product"]',
            '[class*="Product"]',
            '[class*="item"]',
            'article',
            'li'
        ];
        
        let current = element;
        while (current && current !== document.body) {
            for (const selector of selectors) {
                if (current.matches && current.matches(selector)) {
                    // Verify it has product-like content
                    const hasPrice = current.querySelector('[class*="price"], [class*="Price"]') || 
                                    current.textContent.match(/\$\d+|\d+\s*(EGP|USD|LE|ج\.م)/i);
                    const hasTitle = current.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
                    
                    if (hasPrice || hasTitle) {
                        return current;
                    }
                }
            }
            current = current.parentElement;
        }
        
        return null;
    }

    // Extract product data
    function extractProductData(container) {
        const product = {
            url: window.location.href,
            scrapedAt: new Date().toISOString()
        };
        
        // Name
        const nameSelectors = [
            'h1', 'h2', 'h3',
            '[class*="title"]',
            '[class*="name"]',
            '[class*="Title"]',
            '[class*="Name"]',
            '.product-title',
            '.product-name'
        ];
        
        for (const sel of nameSelectors) {
            const el = container.querySelector(sel);
            if (el && el.textContent.trim().length > 3 && el.textContent.trim().length < 200) {
                product.name = el.textContent.trim();
                break;
            }
        }
        
        // Price
        const priceSelectors = [
            '[class*="price"]',
            '[class*="Price"]',
            '.price',
            '.product-price',
            '[data-price]'
        ];
        
        for (const sel of priceSelectors) {
            const el = container.querySelector(sel);
            if (el) {
                const text = el.textContent;
                const match = text.match(/[\d,]+\.?\d*/);
                if (match) {
                    product.price = parseFloat(match[0].replace(/,/g, ''));
                    product.currency = text.includes('EGP') || text.includes('ج.م') ? 'EGP' : 
                                      text.includes('USD') ? 'USD' : 'EGP';
                    break;
                }
            }
        }
        
        // Images
        const images = [];
        container.querySelectorAll('img').forEach(img => {
            const src = img.src || img.dataset.src || img.dataset.original;
            if (src && !src.includes('data:image') && !src.includes('placeholder') && !src.includes('loading')) {
                // Get high quality version
                let highQualitySrc = src;
                if (src.includes('_thumbnail')) {
                    highQualitySrc = src.replace('_thumbnail', '');
                }
                if (src.includes('thumb')) {
                    highQualitySrc = src.replace('thumb', 'large');
                }
                images.push(highQualitySrc);
            }
        });
        
        if (images.length > 0) {
            product.images = [...new Set(images)];
            product.mainImage = images[0];
        }
        
        // Description
        const descSelectors = [
            '[class*="description"]',
            '[class*="Description"]',
            '.description',
            'p'
        ];
        
        for (const sel of descSelectors) {
            const el = container.querySelector(sel);
            if (el && el.textContent.trim().length > 20) {
                product.description = el.textContent.trim().substring(0, 500);
                break;
            }
        }
        
        // Link
        const link = container.querySelector('a[href*="/product"], a[href*="/item"], a[href*="/p/"]');
        if (link) {
            product.productUrl = new URL(link.href, window.location.origin).href;
        }
        
        return product;
    }

    // Extract all products from page
    async function extractAllProducts() {
        const products = [];
        const containers = [];
        
        // Find all product containers
        document.querySelectorAll('*').forEach(el => {
            const container = findProductContainer(el);
            if (container && !containers.includes(container)) {
                containers.push(container);
            }
        });
        
        // Update progress
        const progress = document.getElementById('webharvest-progress');
        
        for (let i = 0; i < containers.length; i++) {
            const product = extractProductData(containers[i]);
            if (product.name && product.price) {
                product._id = `wh-${Date.now()}-${i}`;
                products.push(product);
            }
            
            if (progress) {
                progress.textContent = `تم استخراج ${products.length} منتج من ${containers.length}`;
            }
        }
        
        return products;
    }

    // Update selected count
    function updateSelectedCount() {
        const countEl = document.getElementById('webharvest-selected-count');
        if (state.selectedProducts.length > 0) {
            countEl.style.display = 'block';
            countEl.textContent = `✅ تم تحديد ${state.selectedProducts.length} منتج`;
        } else {
            countEl.style.display = 'none';
        }
    }

    // Show results
    function showResults(products) {
        document.getElementById('webharvest-extracting').style.display = 'none';
        document.getElementById('webharvest-results').style.display = 'block';
        
        const countEl = document.getElementById('webharvest-selected-count');
        countEl.style.display = 'block';
        countEl.textContent = `✅ تم استخراج ${products.length} منتج`;
        
        const listEl = document.getElementById('webharvest-products-list');
        listEl.innerHTML = products.map((p, i) => `
            <div class="webharvest-product">
                <div class="webharvest-checkbox checked" onclick="window.webharvestToggleProduct(${i})"></div>
                ${p.mainImage ? `<img src="${p.mainImage}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect fill=%22%23ccc%22 width=%22100%%22 height=%22100%%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22>📷</text></svg>'">` : '<div style="width:60px;height:60px;background:#ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;">📷</div>'}
                <div class="webharvest-product-info">
                    <div class="webharvest-product-name">${p.name || 'بدون اسم'}</div>
                    <div class="webharvest-product-price">${p.price ? p.price + ' ' + (p.currency || 'EGP') : 'بدون سعر'}</div>
                </div>
            </div>
        `).join('');
        
        // Expose toggle function
        window.webharvestToggleProduct = (index) => {
            // Toggle logic here
        };
    }

    // Send selected products
    function sendSelected() {
        if (state.selectedProducts.length === 0) {
            alert('لم تحدد أي منتجات');
            return;
        }
        sendToWebHarvest(state.selectedProducts);
    }

    // Send all products
    function sendAll() {
        sendToWebHarvest(state.selectedProducts);
    }

    // Cancel selection
    function cancelSelection() {
        removeHighlighter();
        state.mode = null;
        state.selectedProducts = [];
        document.getElementById('webharvest-selection-mode').style.display = 'none';
        document.getElementById('webharvest-main-menu').style.display = 'block';
    }

    // Send to WebHarvest
    function sendToWebHarvest(products) {
        const data = {
            products: products,
            source: window.location.hostname,
            scrapedAt: new Date().toISOString()
        };
        
        // Store in localStorage
        localStorage.setItem('webharvest_import', JSON.stringify(data));
        
        // Open WebHarvest
        const popup = window.open(
            `${CONFIG.webharvestUrl}?import=true`,
            'webharvest',
            'width=1400,height=900,scrollbars=yes,resizable=yes'
        );
        
        if (popup) {
            popup.focus();
            closeOverlay();
        } else {
            alert('الرجاء السماح بالنوافذ المنبثقة لفتح WebHarvest');
        }
    }

    // Initialize
    createOverlay();
})();
