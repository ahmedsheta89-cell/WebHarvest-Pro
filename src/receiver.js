/**
 * WebHarvest Pro - Product Receiver
 * استقبال المنتجات من الـ Bookmarklet
 */

class ProductReceiver {
    constructor() {
        this.storageKey = 'webharvest_pending_products';
        this.init();
    }
    
    init() {
        // Check for pending products in localStorage
        this.checkPendingProducts();
        
        // Listen for postMessage
        window.addEventListener('message', (event) => {
            console.log('[WebHarvest] Received message:', event.data);
            
            if (event.data && event.data.type === 'WEBHARVEST_PRODUCTS') {
                this.handleIncomingProducts(event.data.data);
            }
        });
        
        // Check periodically for pending products
        setInterval(() => this.checkPendingProducts(), 3000);
        
        console.log('[WebHarvest] Receiver initialized');
    }
    
    checkPendingProducts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                console.log('[WebHarvest] Found pending products:', data);
                
                // Process products
                this.handleIncomingProducts(data);
                
                // Clear storage
                localStorage.removeItem(this.storageKey);
            }
        } catch (e) {
            console.error('[WebHarvest] Error checking pending products:', e);
        }
    }
    
    handleIncomingProducts(data) {
        if (!data || !data.products || data.products.length === 0) {
            console.warn('[WebHarvest] No products to handle');
            return;
        }
        
        console.log('[WebHarvest] Handling incoming products:', data.products.length);
        
        // Show notification
        this.showNotification(`تم استلام ${data.products.length} منتج!`, 'success');
        
        // Store in temp storage for app to process
        const tempKey = 'webharvest_temp_products';
        localStorage.setItem(tempKey, JSON.stringify(data.products));
        
        // Trigger event for app
        window.dispatchEvent(new CustomEvent('webharvest-products-received', {
            detail: data.products
        }));
        
        // Update UI if app is ready
        if (window.app && window.app.handleIncomingProducts) {
            window.app.handleIncomingProducts(data.products);
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `webharvest-notification webharvest-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">✕</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize receiver
const productReceiver = new ProductReceiver();

// Export
export { productReceiver, ProductReceiver };
