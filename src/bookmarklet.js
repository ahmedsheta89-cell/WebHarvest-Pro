/**
 * WebHarvest Pro - Bookmarklet
 * سحب المنتجات والصور من أي صفحة
 * 
 * الاستخدام:
 * 1. أنشئ bookmark جديد في المتصفح
 * 2. ضع الكود في الـ URL
 * 3. افتح صفحة منتج واضغط على الـ bookmark
 */

(function() {
    'use strict';

    // إعدادات
    const WEBHARVEST_URL = 'https://ahmedsheta89-cell.github.io/WebHarvest-Pro';
    
    // استخراج البيانات من الصفحة
    function extractProductData() {
        const data = {
            name: '',
            price: 0,
            currency: 'EGP',
            description: '',
            images: [],
            url: window.location.href,
            source: window.location.hostname,
            scrapedAt: new Date().toISOString()
        };

        // استخراج الاسم
        const nameSelectors = [
            'h1',
            '[itemprop="name"]',
            '.product-title',
            '.product-name',
            '#product-name',
            'h2.product-title'
        ];
        
        for (const selector of nameSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
                data.name = el.textContent.trim();
                break;
            }
        }

        // استخراج السعر
        const priceSelectors = [
            '[itemprop="price"]',
            '.price',
            '.product-price',
            '.price-amount',
            '[class*="price"]'
        ];
        
        for (const selector of priceSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                const text = el.textContent || el.getAttribute('content') || '';
                const match = text.match(/[\d,]+\.?\d*/);
                if (match) {
                    data.price = parseFloat(match[0].replace(/,/g, ''));
                    break;
                }
            }
        }

        // استخراج الوصف
        const descSelectors = [
            '[itemprop="description"]',
            '.product-description',
            '.description',
            '#description',
            '[class*="description"]'
        ];
        
        for (const selector of descSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
                data.description = el.textContent.trim().substring(0, 1000);
                break;
            }
        }

        // استخراج الصور
        const imageSelectors = [
            '.product-image img',
            '.product-photos img',
            '.gallery-image',
            '[itemprop="image"]',
            '.product img',
            'img[class*="product"]',
            'img[data-zoom]'
        ];

        const foundImages = new Set();
        
        for (const selector of imageSelectors) {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
                let src = img.src || img.dataset.src || img.dataset.zoom || img.dataset.original;
                if (src && !foundImages.has(src)) {
                    // تحسين جودة الصورة
                    src = src
                        .replace(/\/small\//g, '/large/')
                        .replace(/\/thumb\//g, '/large/')
                        .replace(/\/thumbnail\//g, '/original/')
                        .replace(/\?.*$/, '');
                    
                    foundImages.add(src);
                    data.images.push(src);
                }
            });
        }

        // إذا لم نجد صور، نبحث في كل الصور
        if (data.images.length === 0) {
            const allImages = document.querySelectorAll('img');
            const minSize = 100;
            
            allImages.forEach(img => {
                if (img.width >= minSize && img.height >= minSize) {
                    let src = img.src;
                    if (src && !src.includes('logo') && !src.includes('icon') && !foundImages.has(src)) {
                        foundImages.add(src);
                        data.images.push(src);
                    }
                }
            });
        }

        return data;
    }

    // استخراج البيانات
    const productData = extractProductData();
    
    // عرض النتيجة للمستخدم
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #1a1a2e;
        border-radius: 16px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;
    
    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px; color: #6366f1;">🛒 WebHarvest Pro</h2>
            <p style="margin: 0; color: #a0a0a0;">تم استخراج بيانات المنتج</p>
        </div>
        
        <div style="background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <strong style="color: #6366f1;">📦 الاسم:</strong>
            <p style="margin: 8px 0 0;">${productData.name || 'غير موجود'}</p>
        </div>
        
        <div style="background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <strong style="color: #6366f1;">💰 السعر:</strong>
            <p style="margin: 8px 0 0;">${productData.price ? productData.price + ' ' + productData.currency : 'غير موجود'}</p>
        </div>
        
        <div style="background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <strong style="color: #6366f1;">🖼️ الصور (${productData.images.length}):</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${productData.images.slice(0, 5).map(img => 
                    `<img src="${img}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">`
                ).join('')}
                ${productData.images.length > 5 ? `<span style="color: #a0a0a0;">+${productData.images.length - 5} صور أخرى</span>` : ''}
            </div>
        </div>
        
        <div style="display: flex; gap: 12px;">
            <button id="wh-send" style="
                flex: 1;
                background: #6366f1;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            ">📤 إرسال لـ WebHarvest</button>
            
            <button id="wh-copy" style="
                flex: 1;
                background: #16213e;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            ">📋 نسخ البيانات</button>
            
            <button id="wh-close" style="
                background: #ef4444;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">✕</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // أزرار التحكم
    document.getElementById('wh-send').onclick = function() {
        // حفظ في localStorage
        const products = JSON.parse(localStorage.getItem('webharvest_products') || '[]');
        products.push(productData);
        localStorage.setItem('webharvest_products', JSON.stringify(products));
        
        // فتح WebHarvest
        window.open(WEBHARVEST_URL + '?import=true', '_blank');
    };
    
    document.getElementById('wh-copy').onclick = function() {
        navigator.clipboard.writeText(JSON.stringify(productData, null, 2));
        this.textContent = '✓ تم النسخ!';
        setTimeout(() => this.textContent = '📋 نسخ البيانات', 2000);
    };
    
    document.getElementById('wh-close').onclick = function() {
        document.body.removeChild(overlay);
    };
    
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
})();
