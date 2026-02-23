/**
 * WebHarvest Pro - Google Vision API Module
 * التعرف على الصور والنصوص (OCR)
 */

import { CONFIG, ConfigManager } from './config.js';

// Google Vision API Handler
class GoogleVisionAPI {
    constructor() {
        this.apiKey = null;
        this.cache = new Map();
        this.enabled = false;
    }

    // Initialize with API Key
    initialize(apiKey) {
        this.apiKey = apiKey;
        this.enabled = !!apiKey;
        
        // Save to config
        ConfigManager.set('googleVisionApiKey', apiKey);
        
        return this.enabled;
    }

    // Check if API is configured
    isConfigured() {
        return !!(this.apiKey || ConfigManager.get('googleVisionApiKey'));
    }

    // Get API Key
    getApiKey() {
        return this.apiKey || ConfigManager.get('googleVisionApiKey');
    }

    // Call Vision API
    async callAPI(imageData, features) {
        const apiKey = this.getApiKey();
        
        if (!apiKey) {
            return {
                success: false,
                error: 'Google Vision API Key غير مُعرّف. أضفه في الإعدادات.'
            };
        }

        // Check cache
        const cacheKey = this.generateCacheKey(imageData, features);
        if (this.cache.has(cacheKey)) {
            return {
                success: true,
                cached: true,
                data: this.cache.get(cacheKey)
            };
        }

        try {
            const response = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requests: [{
                            image: this.prepareImage(imageData),
                            features: features.map(f => ({ type: f }))
                        }]
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API Error');
            }

            const result = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Google Vision API Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Prepare image data for API
    prepareImage(imageData) {
        // If it's a URL, use source
        if (typeof imageData === 'string' && imageData.startsWith('http')) {
            return { source: { imageUri: imageData } };
        }
        
        // If it's base64, use content (remove data:image prefix)
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
            const base64 = imageData.split(',')[1];
            return { content: base64 };
        }
        
        // If it's already base64
        if (typeof imageData === 'string') {
            return { content: imageData };
        }
        
        // If it's a File/Blob, convert to base64
        if (imageData instanceof File || imageData instanceof Blob) {
            // Will be handled separately with async conversion
            return { content: imageData };
        }
        
        return { content: imageData };
    }

    // Generate cache key
    generateCacheKey(imageData, features) {
        const featuresStr = features.sort().join('-');
        const imageStr = typeof imageData === 'string' 
            ? imageData.substring(0, 100) 
            : 'blob';
        return `${featuresStr}-${imageStr}`;
    }

    // ==================== Text Detection (OCR) ====================

    // Extract text from image
    async extractText(imageData) {
        const result = await this.callAPI(imageData, ['TEXT_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const textAnnotations = responses.textAnnotations || [];
        
        // First annotation contains full text
        const fullText = textAnnotations[0]?.description || '';
        
        // Extract individual words with positions
        const words = textAnnotations.slice(1).map(annotation => ({
            text: annotation.description,
            bounds: annotation.boundingPoly?.vertices || []
        }));

        return {
            success: true,
            fullText,
            words,
            locale: responses.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || 'unknown',
            confidence: responses.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.confidence || 0
        };
    }

    // Extract text with document structure (better for products)
    async extractDocumentText(imageData) {
        const result = await this.callAPI(imageData, ['DOCUMENT_TEXT_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const fullTextAnnotation = responses.fullTextAnnotation || {};
        
        // Extract paragraphs and blocks
        const blocks = [];
        const pages = fullTextAnnotation.pages || [];
        
        for (const page of pages) {
            for (const block of page.blocks || []) {
                const blockText = block.paragraphs
                    ?.map(p => p.words?.map(w => w.symbols?.map(s => s.text).join('')).join(' '))
                    .join('\n') || '';
                
                blocks.push({
                    type: block.blockType,
                    text: blockText,
                    confidence: block.confidence,
                    bounds: block.boundingBox?.normalizedVertices || []
                });
            }
        }

        return {
            success: true,
            fullText: fullTextAnnotation.text || '',
            blocks,
            pages: pages.length
        };
    }

    // ==================== Label Detection ====================

    // Detect objects and labels in image
    async detectLabels(imageData) {
        const result = await this.callAPI(imageData, ['LABEL_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const labelAnnotations = responses.labelAnnotations || [];
        
        const labels = labelAnnotations.map(label => ({
            name: label.description,
            nameAr: this.translateLabel(label.description),
            confidence: label.score,
            topicality: label.topicality,
            mid: label.mid // Knowledge Graph ID
        }));

        return {
            success: true,
            labels,
            topLabels: labels.slice(0, 5)
        };
    }

    // Translate common labels to Arabic
    translateLabel(label) {
        const translations = {
            // Products
            'product': 'منتج',
            'cosmetics': 'مستحضرات تجميل',
            'skincare': 'العناية بالبشرة',
            'skin care': 'العناية بالبشرة',
            'cream': 'كريم',
            'lotion': 'لوشن',
            'serum': 'سيروم',
            'moisturizer': 'مرطب',
            'cleanser': 'منظف',
            'toner': 'تونر',
            'sunscreen': 'واقي شمس',
            'mask': 'قناع',
            'makeup': 'مكياج',
            'lipstick': 'أحمر شفاه',
            'mascara': 'ماسكارا',
            'foundation': 'كريم أساس',
            'perfume': 'عطر',
            'fragrance': 'عطر',
            
            // Hair
            'hair': 'شعر',
            'shampoo': 'شامبو',
            'conditioner': 'بلسم',
            'hair oil': 'زيت شعر',
            'hair care': 'العناية بالشعر',
            
            // Body
            'body': 'جسم',
            'body lotion': 'لوشن جسم',
            'body wash': 'غسول جسم',
            'deodorant': 'مزيل عرق',
            
            // Medical
            'medicine': 'دواء',
            'supplement': 'مكمل غذائي',
            'vitamin': 'فيتامين',
            'pill': 'حبوب',
            'tablet': 'أقراص',
            'capsule': 'كبسولات',
            
            // Packaging
            'bottle': 'زجاجة',
            'tube': 'أنبوب',
            'jar': 'جرة',
            'box': 'علبة',
            'container': 'حاوية',
            'package': 'عبوة',
            
            // Colors
            'white': 'أبيض',
            'black': 'أسود',
            'red': 'أحمر',
            'blue': 'أزرق',
            'green': 'أخضر',
            'yellow': 'أصفر',
            'pink': 'وردي',
            'purple': 'بنفسجي',
            'orange': 'برتقالي',
            
            // Other
            'brand': 'ماركة',
            'logo': 'شعار',
            'text': 'نص',
            'label': 'ملصق',
            'ingredient': 'مكون',
            'natural': 'طبيعي',
            'organic': 'عضوي'
        };

        const normalized = label.toLowerCase().trim();
        return translations[normalized] || label;
    }

    // ==================== Logo Detection ====================

    // Detect brand logos
    async detectLogos(imageData) {
        const result = await this.callAPI(imageData, ['LOGO_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const logoAnnotations = responses.logoAnnotations || [];
        
        const logos = logoAnnotations.map(logo => ({
            name: logo.description,
            confidence: logo.score,
            bounds: logo.boundingPoly?.vertices || [],
            mid: logo.mid
        }));

        return {
            success: true,
            logos,
            detectedBrands: logos.map(l => l.name)
        };
    }

    // ==================== Web Detection ====================

    // Find similar products on web
    async detectWeb(imageData) {
        const result = await this.callAPI(imageData, ['WEB_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const webDetection = responses.webDetection || {};
        
        // Visually similar images
        const similarImages = (webDetection.visuallySimilarImages || []).map(img => ({
            url: img.url
        }));

        // Pages containing the image
        const pagesWithImage = (webDetection.pagesWithMatchingImages || []).map(page => ({
            url: page.url,
            title: page.title,
            pageTitle: page.pageTitle
        }));

        // Web entities (what Google thinks this is)
        const webEntities = (webDetection.webEntities || []).map(entity => ({
            entityId: entity.entityId,
            name: entity.description,
            confidence: entity.score
        }));

        // Best guess labels
        const bestGuessLabels = webDetection.bestGuessLabels?.map(label => label.label) || [];

        return {
            success: true,
            similarImages,
            pagesWithImage,
            webEntities,
            bestGuessLabels,
            productSuggestions: this.extractProductSuggestions(webEntities, bestGuessLabels)
        };
    }

    // Extract product suggestions from web detection
    extractProductSuggestions(webEntities, bestGuessLabels) {
        const suggestions = [];
        
        // Add from best guess
        bestGuessLabels.forEach(label => {
            if (label && !suggestions.includes(label)) {
                suggestions.push(label);
            }
        });
        
        // Add high-confidence entities
        webEntities
            .filter(e => e.confidence > 0.7)
            .forEach(e => {
                if (e.name && !suggestions.includes(e.name)) {
                    suggestions.push(e.name);
                }
            });
        
        return suggestions.slice(0, 10);
    }

    // ==================== Product Detection ====================

    // Comprehensive product analysis
    async analyzeProductImage(imageData) {
        // Run all detections in parallel
        const [textResult, labelsResult, logosResult, webResult] = await Promise.all([
            this.extractDocumentText(imageData),
            this.detectLabels(imageData),
            this.detectLogos(imageData),
            this.detectWeb(imageData)
        ]);

        // Combine results
        const analysis = {
            success: true,
            
            // Text found
            text: textResult.success ? textResult.fullText : '',
            textBlocks: textResult.success ? textResult.blocks : [],
            
            // Detected objects
            labels: labelsResult.success ? labelsResult.labels : [],
            topLabels: labelsResult.success ? labelsResult.topLabels : [],
            
            // Brand detection
            logos: logosResult.success ? logosResult.logos : [],
            brands: logosResult.success ? logosResult.detectedBrands : [],
            
            // Web matching
            similarProducts: webResult.success ? webResult.similarImages : [],
            productSuggestions: webResult.success ? webResult.productSuggestions : [],
            
            // Category suggestion
            suggestedCategory: this.suggestCategory(
                labelsResult.success ? labelsResult.labels : [],
                textResult.success ? textResult.fullText : ''
            ),
            
            // Product name suggestion
            suggestedName: this.suggestProductName(
                logosResult.success ? logosResult.logos : [],
                webResult.success ? webResult.productSuggestions : [],
                textResult.success ? textResult.blocks : []
            )
        };

        // Try to extract price from text
        if (analysis.text) {
            analysis.detectedPrices = this.extractPrices(analysis.text);
        }

        // Try to extract barcode
        if (analysis.text) {
            analysis.detectedBarcodes = this.extractBarcodes(analysis.text);
        }

        return analysis;
    }

    // Suggest product category from labels
    suggestCategory(labels, text) {
        const categoryKeywords = {
            skincare: ['skincare', 'skin care', 'cream', 'lotion', 'serum', 'moisturizer', 'cleanser', 'toner', 'sunscreen', 'mask', 'بشرة', 'كريم', 'لوشن', 'سيروم', 'مرطب'],
            hair: ['hair', 'shampoo', 'conditioner', 'hair oil', 'hair care', 'شعر', 'شامبو', 'بلسم'],
            body: ['body', 'body lotion', 'body wash', 'deodorant', 'جسم', 'لوشن جسم'],
            makeup: ['makeup', 'lipstick', 'mascara', 'foundation', 'concealer', 'blush', 'مكياج', 'أحمر شفاه'],
            fragrance: ['perfume', 'fragrance', 'cologne', 'عطر', 'بارفان'],
            health: ['medicine', 'supplement', 'vitamin', 'pill', 'tablet', 'capsule', 'دواء', 'فيتامين', 'مكمل'],
            baby: ['baby', 'diaper', 'baby lotion', 'baby powder', 'طفل', 'حفاضات'],
            personal: ['deodorant', 'soap', 'toothpaste', 'razor', 'صابون', 'معجون']
        };

        const textLower = text.toLowerCase();
        const labelNames = labels.map(l => l.name.toLowerCase());
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            // Check in labels
            if (labelNames.some(l => keywords.some(k => l.includes(k)))) {
                return { category, confidence: 0.8, source: 'labels' };
            }
            // Check in text
            if (keywords.some(k => textLower.includes(k))) {
                return { category, confidence: 0.7, source: 'text' };
            }
        }

        return { category: 'general', confidence: 0.3, source: 'default' };
    }

    // Suggest product name
    suggestProductName(logos, webSuggestions, textBlocks) {
        // Priority: Brand + Web suggestion
        if (logos.length > 0 && webSuggestions.length > 0) {
            const brand = logos[0].name;
            const product = webSuggestions[0];
            return `${brand} ${product}`;
        }
        
        // Web suggestion alone
        if (webSuggestions.length > 0) {
            return webSuggestions[0];
        }
        
        // Extract from text (first significant block)
        if (textBlocks.length > 0) {
            const firstBlock = textBlocks[0]?.text || '';
            if (firstBlock.length > 3 && firstBlock.length < 100) {
                return firstBlock;
            }
        }

        return null;
    }

    // Extract prices from text
    extractPrices(text) {
        const prices = [];
        
        // Match various price formats
        const patterns = [
            /(\d+(?:\.\d{1,2})?)\s*(EGP|LE|ج\.م|جنيه)/gi,      // Egyptian Pound
            /(\d+(?:\.\d{1,2})?)\s*(USD|\$|دولار)/gi,           // US Dollar
            /(\d+(?:\.\d{1,2})?)\s*(SAR|ر\.س|ريال)/gi,          // Saudi Riyal
            /(\d+(?:\.\d{1,2})?)\s*(AED|د\.إ|درهم)/gi,          // UAE Dirham
            /(\$|£|€)\s*(\d+(?:\.\d{1,2})?)/g,                  // Symbol before
            /Price[:\s]*(\d+(?:\.\d{1,2})?)/gi,                  // Price label
            /السعر[:\s]*(\d+(?:\.\d{1,2})?)/gi,                  // Arabic price label
            /(\d+(?:\.\d{1,2})?)\s*(جنيه|ريال|درهم|دولار)/gi    // Arabic currency names
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseFloat(match[1] || match[2]);
                if (value > 0 && value < 100000) { // Reasonable price range
                    prices.push({
                        value,
                        currency: match[2] || match[1] || 'Unknown',
                        raw: match[0]
                    });
                }
            }
        }

        // Sort by value and remove duplicates
        return [...new Map(prices.map(p => [p.value, p])).values()]
            .sort((a, b) => a.value - b.value);
    }

    // Extract barcodes from text
    extractBarcodes(text) {
        const barcodes = [];
        
        // Match various barcode formats
        const patterns = [
            /\b(\d{8})\b/g,           // EAN-8
            /\b(\d{12})\b/g,          // UPC
            /\b(\d{13})\b/g,          // EAN-13
            /\b(\d{14})\b/g,          // GTIN
            /Barcode[:\s]*(\d+)/gi,    // Barcode label
            /باركود[:\s]*(\d+)/gi,     // Arabic barcode label
            /ISBN[:\s]*(\d+)/gi        // ISBN
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const code = match[1];
                if (code.length >= 8 && code.length <= 14) {
                    barcodes.push({
                        code,
                        type: this.getBarcodeType(code),
                        raw: match[0]
                    });
                }
            }
        }

        // Remove duplicates
        return [...new Map(barcodes.map(b => [b.code, b])).values()];
    }

    // Get barcode type
    getBarcodeType(code) {
        if (code.length === 8) return 'EAN-8';
        if (code.length === 12) return 'UPC-A';
        if (code.length === 13) return 'EAN-13';
        if (code.length === 14) return 'GTIN';
        return 'Unknown';
    }

    // ==================== Safe Search ====================

    // Check if image is safe
    async safeSearch(imageData) {
        const result = await this.callAPI(imageData, ['SAFE_SEARCH_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const safeSearch = responses.safeSearchAnnotation || {};

        return {
            success: true,
            safe: safeSearch,
            isSafe: (safeSearch.adult === 'VERY_UNLIKELY' || safeSearch.adult === 'UNLIKELY') &&
                    (safeSearch.violence === 'VERY_UNLIKELY' || safeSearch.violence === 'UNLIKELY')
        };
    }

    // ==================== Image Properties ====================

    // Get image colors
    async detectColors(imageData) {
        const result = await this.callAPI(imageData, ['IMAGE_PROPERTIES']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const colorInfo = responses.imagePropertiesAnnotation?.dominantColors?.colors || [];

        const colors = colorInfo.map(c => ({
            red: c.color.red,
            green: c.color.green,
            blue: c.color.blue,
            hex: this.rgbToHex(c.color.red, c.color.green, c.color.blue),
            fraction: c.pixelFraction,
            score: c.score
        }));

        return {
            success: true,
            colors,
            dominantColor: colors[0] || null
        };
    }

    // RGB to Hex
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // ==================== Face Detection ====================

    // Detect faces (for cosmetic products showing models)
    async detectFaces(imageData) {
        const result = await this.callAPI(imageData, ['FACE_DETECTION']);
        
        if (!result.success) {
            return result;
        }

        const responses = result.data.responses?.[0] || {};
        const faceAnnotations = responses.faceAnnotations || [];

        const faces = faceAnnotations.map(face => ({
            bounds: face.boundingPoly?.vertices || [],
            joy: face.joyLikelihood,
            sorrow: face.sorrowLikelihood,
            anger: face.angerLikelihood,
            surprise: face.surpriseLikelihood,
            blurred: face.blurredLikelihood,
            headwear: face.headwearLikelihood
        }));

        return {
            success: true,
            faceCount: faces.length,
            faces,
            hasHumanFace: faces.length > 0
        };
    }

    // ==================== Batch Operations ====================

    // Analyze multiple images
    async batchAnalyze(images, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(img => this.analyzeProductImage(img))
            );
            results.push(...batchResults);
            
            // Rate limiting
            if (i + batchSize < images.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            success: true,
            results,
            total: images.length
        };
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache stats
    getCacheStats() {
        return {
            entries: this.cache.size,
            memoryUsage: JSON.stringify([...this.cache.entries()]).length
        };
    }
}

// Export singleton
const googleVision = new GoogleVisionAPI();
export { googleVision, GoogleVisionAPI };
