/**
 * WebHarvest Pro - Reports & Analytics Module
 *     // Calculate profit margin distribution
        const marginRanges = {
            '0-10%': 0,
            '10-25%': 0,
            '25-50%': 0,
            '50-100%': 0,
            '100%+': 0
        };

        products.forEach(p => {
            const margin = p.profitMargin || 0;
            if (margin < 10) marginRanges['0-10%']++;
            else if (margin < 25) marginRanges['10-25%']++;
            else if (margin < 50) marginRanges['25-50%']++;
            else if (margin < 100) marginRanges['50-100%']++;
            else marginRanges['100%+']++;
        });

        return marginRanges;
    }

    // Get top products
    getTopProducts(products, limit = 10) {
        return products
            .filter(p => p.profit && p.profit > 0)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, limit);
    }

    // Get low stock products
    getLowStockProducts(products, threshold = 5) {
        return products
            .filter(p => p.stock && p.stock > 0 && p.stock < threshold)
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
