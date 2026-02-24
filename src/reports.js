/**
 * WebHarvest Pro - Reports & Analytics Module
 * تقارير وإحصائيات متقدمة
 */

import { CONFIG, ConfigManager } from './config.js';

// Analytics Engine
class Analytics {
    constructor() {
        this.cache = new Map();
    }

    // Calculate summary statistics
    calculateSummary(products) {
        if (!products || products.length === 0) {
            return {
                totalProducts: 0,
                totalValue: 0,
                totalProfit: 0,
                avgMargin: 0,
                avgPrice: 0
            };
        }

        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.marketPrice || 0), 0);
        const totalProfit = products.reduce((sum, p) => sum + ((p.marketPrice || 0) - (p.purchasePrice || 0)), 0);
        const avgMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;
        const avgPrice = totalProducts > 0 ? totalValue / totalProducts : 0;

        return {
            totalProducts,
            totalValue,
            totalProfit,
            avgMargin,
            avgPrice
        };
    }

    // Category breakdown
    getCategoryBreakdown(products) {
        const breakdown = {};
        
        products.forEach(p => {
            const cat = p.category || 'other';
            if (!breakdown[cat]) {
                breakdown[cat] = { count: 0, value: 0, profit: 0 };
            }
            breakdown[cat].count++;
            breakdown[cat].value += p.marketPrice || 0;
            breakdown[cat].profit += (p.marketPrice || 0) - (p.purchasePrice || 0);
        });

        return breakdown;
    }

    // Profit analysis
    getProfitAnalysis(products) {
        const profits = products.map(p => ({
            name: p.name,
            profit: (p.marketPrice || 0) - (p.purchasePrice || 0),
            margin: p.purchasePrice > 0 ? 
                (((p.marketPrice || 0) - p.purchasePrice) / p.purchasePrice) * 100 : 0
        }));

        return {
            highest: profits.sort((a, b) => b.profit - a.profit).slice(0, 5),
            lowest: profits.sort((a, b) => a.profit - b.profit).slice(0, 5)
        };
    }

    // Margin distribution
    getMarginDistribution(products) {
        const ranges = [
            { label: '0-10%', min: 0, max: 10, count: 0 },
            { label: '10-20%', min: 10, max: 20, count: 0 },
            { label: '20-30%', min: 20, max: 30, count: 0 },
            { label: '30-50%', min: 30, max: 50, count: 0 },
            { label: '50%+', min: 50, max: Infinity, count: 0 }
        ];

        products.forEach(p => {
            const margin = p.purchasePrice > 0 ? 
                (((p.marketPrice || 0) - p.purchasePrice) / p.purchasePrice) * 100 : 0;
            
            for (const range of ranges) {
                if (margin >= range.min && margin < range.max) {
                    range.count++;
                    break;
                }
            }
        });

        return ranges;
    }

    // Top products by profit
    getTopProducts(products, limit = 10) {
        return [...products]
            .map(p => ({
                ...p,
                profit: (p.marketPrice || 0) - (p.purchasePrice || 0)
            }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, limit);
    }

    // Low stock products
    getLowStockProducts(products, threshold = 5) {
        return products
            .filter(p => (p.stock || 0) <= threshold)
            .sort((a, b) => a.stock - b.stock);
    }

    // Generate comprehensive report
    generateReport(products, options = {}) {
        return {
            summary: this.calculateSummary(products),
            categoryBreakdown: this.getCategoryBreakdown(products),
            profitAnalysis: this.getProfitAnalysis(products),
            marginDistribution: this.getMarginDistribution(products),
            topProducts: this.getTopProducts(products),
            lowStock: this.getLowStockProducts(products),
            generatedAt: new Date().toISOString()
        };
    }
}

// Export singleton
const analytics = new Analytics();
export { analytics, Analytics };
