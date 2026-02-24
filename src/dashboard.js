/**
 * WebHarvest Pro - Dashboard Module
 * لوحة تحكم متقدمة
 */

import { productManager } from './products.js';

// Dashboard Manager
class Dashboard {
    constructor() {
        this.widgets = [];
        this.refreshInterval = null;
    }

    // Initialize dashboard
    async init() {
        await this.loadWidgets();
        this.startAutoRefresh();
    }

    // Load widgets
    async loadWidgets() {
        this.widgets = [
            { id: 'stats', type: 'stats', title: 'إحصائيات', position: { x: 0, y: 0, w: 2, h: 1 } },
            { id: 'recent', type: 'list', title: 'أحدث المنتجات', position: { x: 2, y: 0, w: 2, h: 2 } },
            { id: 'chart', type: 'chart', title: 'توزيع الأسعار', position: { x: 0, y: 1, w: 2, h: 1 } }
        ];
    }

    // Get stats
    async getStats() {
        const products = await productManager.getAllProducts();
        
        return {
            total: products.length,
            inStock: products.filter(p => p.stock > 0).length,
            outOfStock: products.filter(p => p.stock === 0).length,
            avgPrice: products.length > 0 
                ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
                : 0,
            totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0)
        };
    }

    // Get recent products
    async getRecentProducts(limit = 10) {
        const products = await productManager.getAllProducts();
        return products
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    // Get price distribution
    async getPriceDistribution() {
        const products = await productManager.getAllProducts();
        const ranges = [
            { label: '0-100', min: 0, max: 100, count: 0 },
            { label: '100-500', min: 100, max: 500, count: 0 },
            { label: '500-1000', min: 500, max: 1000, count: 0 },
            { label: '1000+', min: 1000, max: Infinity, count: 0 }
        ];

        products.forEach(p => {
            const price = p.price || 0;
            for (const range of ranges) {
                if (price >= range.min && price < range.max) {
                    range.count++;
                    break;
                }
            }
        });

        return ranges;
    }

    // Start auto refresh
    startAutoRefresh(intervalMs = 60000) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => this.refresh(), intervalMs);
    }

    // Stop auto refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Refresh dashboard
    async refresh() {
        const event = new CustomEvent('dashboard-refresh', { 
            detail: await this.getStats() 
        });
        window.dispatchEvent(event);
    }

    // Render widget
    renderWidget(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return null;

        switch (widget.type) {
            case 'stats':
                return this.renderStatsWidget(widget);
            case 'list':
                return this.renderListWidget(widget);
            case 'chart':
                return this.renderChartWidget(widget);
            default:
                return null;
        }
    }

    // Render stats widget
    renderStatsWidget(widget) {
        return {
            id: widget.id,
            title: widget.title,
            type: 'stats',
            position: widget.position
        };
    }

    // Render list widget
    renderListWidget(widget) {
        return {
            id: widget.id,
            title: widget.title,
            type: 'list',
            position: widget.position
        };
    }

    // Render chart widget
    renderChartWidget(widget) {
        return {
            id: widget.id,
            title: widget.title,
            type: 'chart',
            position: widget.position
        };
    }
}

// Export singleton
const dashboard = new Dashboard();
export { dashboard, Dashboard };
