/**
 * WebHarvest Pro - AI Price Suggestions
 * اقتراحات ذكية للأسعار والمنتجات
 */

import { CONFIG, configManager } from './config.js';

// AI Price Analyzer
class AIPriceAnalyzer {
    constructor() {
        this.priceHistory = new Map();
        this.marketTrends = new Map();
    }

    // تحليل السعر
    analyzePrice(purchasePrice, marketPrice, category = null) {
        const suggestions = [];
        
        // حساب الهامش الحالي
        const margin = ((marketPrice - purchasePrice) / marketPrice) * 100;
        const profit = marketPrice - purchasePrice;
        
        // اقتراح السعر الأمثل
        const optimalPrice = this.calculateOptimalPrice(purchasePrice, marketPrice, category);
        
        // تحليل المنافسة
        const competitiveAnalysis = this.analyzeCompetition(marketPrice, category);
        
        // اقتراحات التسعير
        suggestions.push({
            type: 'optimal_price',
            price: optimalPrice.recommended,
            profit: optimalPrice.recommended - purchasePrice,
            margin: ((optimalPrice.recommended - purchasePrice) / optimalPrice.recommended) * 100,
            confidence: optimalPrice.confidence,
            reason: optimalPrice.reason
        });
        
        // اقتراحات الخصم
        if (margin > 40) {
            suggestions.push({
                type: 'discount_opportunity',
                message: 'يمكنك تقديم خصم 10-15% وجني أرباح جيدة',
                maxDiscount: (marketPrice - purchasePrice) * 0.3,
                suggestedDiscountPrice: marketPrice * 0.9,
                profitAfterDiscount: (marketPrice * 0.9) - purchasePrice
            });
        }
        
        // تحذيرات
        if (profit < CONFIG.pricing?.minProfit) {
            suggestions.push({
                type: 'warning',
                level: 'high',
                message: 'الربح قليل جداً - فكر في رفع السعر أو البحث عن مورد أرخص'
            });
        }
        
        if (margin < 15) {
            suggestions.push({
                type: 'warning',
                level: 'medium',
                message: 'هامش الربح ضعيف - يُفضل رفع السعر 5-10%'
            });
        }
        
        return {
            current: {
                purchasePrice,
                marketPrice,
                profit,
                margin
            },
            suggestions,
            competitiveAnalysis
        };
    }

    // حساب السعر الأمثل
    calculateOptimalPrice(purchasePrice, marketPrice, category) {
        // قواعد التسعير حسب الفئة
        const categoryMargins = {
            'skincare': { min: 25, optimal: 35, max: 50 },
            'hair': { min: 25, optimal: 35, max: 50 },
            'health': { min: 20, optimal: 30, max: 45 },
            'makeup': { min: 30, optimal: 45, max: 60 },
            'perfume': { min: 25, optimal: 40, max: 55 },
            'electronics': { min: 10, optimal: 15, max: 25 },
            'fashion': { min: 40, optimal: 55, max: 70 },
            'default': { min: 20, optimal: 30, max: 40 }
        };
        
        const margins = categoryMargins[category] || categoryMargins.default;
        
        // السعر الأمثل بناءً على هامش الربح
        const optimalPriceByMargin = purchasePrice / (1 - margins.optimal / 100);
        
        // مقارنة بسعر السوق
        let recommended = optimalPriceByMargin;
        let confidence = 0.8;
        let reason = '';
        
        if (optimalPriceByMargin > marketPrice * 1.1) {
            // سعرنا أعلى من السوق بكتير
            recommended = marketPrice * 1.05;
            confidence = 0.6;
            reason = 'تم تعديل السعر ليكون تنافسي في السوق';
        } else if (optimalPriceByMargin < marketPrice * 0.8) {
            // سعرنا أقل من السوق بكتير
            recommended = marketPrice * 0.9;
            confidence = 0.9;
            reason = 'السعر ممتاز - يمكنك رفعه قليلاً لزيادة الربح';
        } else {
            recommended = Math.max(optimalPriceByMargin, purchasePrice + CONFIG.pricing?.minProfit);
            confidence = 0.85;
            reason = 'السعر مثالي - هامش ربح جيد وتنافسي';
        }
        
        return { recommended, confidence, reason };
    }

    // تحليل المنافسة
    analyzeCompetition(marketPrice, category) {
        return {
            position: marketPrice > 0 ? 'competitive' : 'unknown',
            suggestions: [
                'قارن أسعارك بالمنافسين قبل التسعير النهائي',
                'راجع تقييمات المنتجات المشابهة',
                'لاحظ سرعة بيع المنتجات المنافسة'
            ]
        };
    }

    // توقع الطلب
    predictDemand(product) {
        const factors = {
            category: this.getCategoryDemand(product.category),
            seasonality: this.getSeasonalityFactor(),
            price: this.getPriceFactor(product.price),
            trend: this.getTrendFactor(product.name)
        };
        
        const score = (factors.category + factors.seasonality + factors.price + factors.trend) / 4;
        
        return {
            score: score,
            level: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low',
            factors: factors,
            recommendation: this.getDemandRecommendation(score)
        };
    }

    getCategoryDemand(category) {
        const demandScores = {
            'skincare': 0.8,
            'hair': 0.7,
            'health': 0.75,
            'makeup': 0.65,
            'perfume': 0.6,
            'electronics': 0.5,
            'fashion': 0.55
        };
        return demandScores[category] || 0.5;
    }

    getSeasonalityFactor() {
        const month = new Date().getMonth();
        // المواسم الأكثر طلباً
        const seasonality = [0.6, 0.6, 0.7, 0.75, 0.8, 0.7, 0.65, 0.7, 0.8, 0.85, 0.9, 0.95];
        return seasonality[month];
    }

    getPriceFactor(price) {
        if (price < 100) return 0.9;
        if (price < 300) return 0.8;
        if (price < 500) return 0.7;
        if (price < 1000) return 0.6;
        return 0.5;
    }

    getTrendFactor(productName) {
        // كلمات تدل على منتجات رائجة
        const trending = ['فيتامين', 'ريتينول', 'هيالورونيك', 'نياسيناميد', 'كافيين'];
        const name = productName?.toLowerCase() || '';
        
        for (const term of trending) {
            if (name.includes(term)) return 0.85;
        }
        return 0.6;
    }

    getDemandRecommendation(score) {
        if (score > 0.7) return 'منتج مطلوب - خزّن كمية كبيرة';
        if (score > 0.4) return 'طلب متوسط - خزّن كمية معتدلة';
        return 'طلب منخفض - ابدأ بكمية صغيرة';
    }
}

// AI Product Suggestions
class AIProductSuggestions {
    constructor() {
        this.relatedProducts = new Map();
    }

    // اقتراح منتجات مكملة
    suggestRelated(product) {
        const complementary = {
            'skincare': ['moisturizer', 'serum', 'sunscreen', 'cleanser'],
            'hair': ['shampoo', 'conditioner', 'hair oil', 'mask'],
            'makeup': ['primer', 'setting spray', 'brushes', 'sponge'],
            'perfume': ['body lotion', 'shower gel', 'deodorant']
        };
        
        const category = product.category?.toLowerCase();
        const related = complementary[category] || [];
        
        return {
            type: 'complementary',
            suggestions: related.map(r => ({
                type: r,
                reason: `منتج مكمل لـ ${product.name}`
            }))
        };
    }

    // اقتراح بدائل أرخص
    suggestCheaperAlternatives(product, priceHistory) {
        // تحليل الأسعار السابقة
        return {
            type: 'cheaper_alternatives',
            message: 'ابحث عن منتجات بنفس الفعالية بسعر أقل',
            tips: [
                'قارن مع العلامات التجارية الأقل شهرة',
                'ابحث عن نسخ generic',
                'تواصل مع موردين آخرين'
            ]
        };
    }

    // اقتراح كلمات مفتاحية للبحث
    suggestKeywords(productName, description) {
        const keywords = [];
        
        // استخراج الكلمات المهمة
        const text = `${productName} ${description}`.toLowerCase();
        
        // كلمات مفتاحية شائعة
        const commonKeywords = [
            'طبيعي', 'عضوي', 'أصلي', 'مستورد',
            'للبشرة', 'للشعر', 'للجسم',
            'ترطيب', 'تفتيح', 'مضاد للتجاعيد'
        ];
        
        for (const keyword of commonKeywords) {
            if (text.includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        return {
            keywords: keywords,
            seoTitle: this.generateSEOTitle(productName, keywords),
            seoDescription: this.generateSEODescription(productName, description, keywords)
        };
    }

    generateSEOTitle(productName, keywords) {
        const mainKeywords = keywords.slice(0, 2).join(' - ');
        return `${productName} | ${mainKeywords} | أفضل الأسعار`;
    }

    generateSEODescription(productName, description, keywords) {
        const shortDesc = description?.substring(0, 100) || '';
        return `${productName} - ${shortDesc}. توصيل سريع وأفضل الأسعار.`;
    }
}

// AI Inventory Advisor
class AIInventoryAdvisor {
    // اقتراح إعادة الطلب
    suggestReorder(product, salesHistory) {
        const avgDailySales = this.calculateAvgDailySales(salesHistory);
        const daysUntilEmpty = product.stock / avgDailySales;
        
        return {
            shouldReorder: daysUntilEmpty < 14,
            urgency: daysUntilEmpty < 7 ? 'high' : daysUntilEmpty < 14 ? 'medium' : 'low',
            suggestedQuantity: Math.ceil(avgDailySales * 30), // شهر
            reorderDate: new Date(Date.now() + daysUntilEmpty * 7 * 24 * 60 * 60 * 1000)
        };
    }

    calculateAvgDailySales(salesHistory) {
        if (!salesHistory || salesHistory.length === 0) return 1;
        
        const total = salesHistory.reduce((sum, s) => sum + s.quantity, 0);
        const days = salesHistory.length;
        
        return total / days;
    }

    // اقتراح التخلص من المخزون
    suggestClearance(product) {
        const daysSinceAdded = (Date.now() - new Date(product.addedAt)) / (1000 * 60 * 60 * 24);
        const salesRate = product.salesCount / daysSinceAdded;
        
        return {
            shouldClear: daysSinceAdded > 90 && salesRate < 0.1,
            suggestedDiscount: daysSinceAdded > 180 ? 40 : daysSinceAdded > 90 ? 25 : 0,
            reason: salesRate < 0.1 ? 'المنتج بطيء الحركة' : ''
        };
    }
}

// Create instances
const aiPriceAnalyzer = new AIPriceAnalyzer();
const aiProductSuggestions = new AIProductSuggestions();
const aiInventoryAdvisor = new AIInventoryAdvisor();

// Export
export { 
    AIPriceAnalyzer,
    AIProductSuggestions,
    AIInventoryAdvisor,
    aiPriceAnalyzer,
    aiProductSuggestions,
    aiInventoryAdvisor
};
