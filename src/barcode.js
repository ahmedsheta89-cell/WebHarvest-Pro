/**
 * WebHarvest Pro - Barcode Scanner Module
 * قارئ الباركود الاحترافي بالكاميرا والصور
 */

import { googleVision } from './vision.js';

// Barcode Scanner Class
class BarcodeScanner {
    constructor() {
        this.videoStream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.isScanning = false;
        this.onDetected = null;
        this.scannerInterval = null;
        this.lastResult = null;
        this.scanAttempts = 0;
        this.maxAttempts = 100;
        
        // Supported barcode formats
        this.supportedFormats = [
            'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E',
            'CODE-128', 'CODE-39', 'CODE-93',
            'CODABAR', 'ITF', 'QR-Code', 'Data Matrix',
            'PDF-417', 'AZTEC'
        ];
    }

    // ==================== Camera Scanner ====================

    // Start camera scanning
    async startCameraScanner(options = {}) {
        const {
            videoElement,
            canvasElement,
            onDetected,
            facingMode = 'environment', // Back camera for mobile
            continuous = true
        } = options;

        if (!videoElement || !canvasElement) {
            return {
                success: false,
                error: 'Video و Canvas elements مطلوبين'
            };
        }

        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.onDetected = onDetected;
        this.isScanning = true;

        try {
            // Request camera access
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.videoElement.srcObject = this.videoStream;
            await this.videoElement.play();

            // Start scanning loop
            if (continuous) {
                this.startScanningLoop();
            }

            return {
                success: true,
                message: 'تم تشغيل الكاميرا بنجاح'
            };
        } catch (error) {
            console.error('Camera access error:', error);
            return {
                success: false,
                error: this.getCameraErrorMessage(error)
            };
        }
    }

    // Start continuous scanning
    startScanningLoop() {
        const scanFrame = async () => {
            if (!this.isScanning) return;

            const result = await this.scanFrame();
            
            if (result.detected) {
                // Check if this is a new result
                if (result.code !== this.lastResult?.code) {
                    this.lastResult = result;
                    this.scanAttempts = 0;
                    
                    if (this.onDetected) {
                        this.onDetected(result);
                    }
                }
            }

            this.scanAttempts++;
            
            // Stop after max attempts
            if (this.scanAttempts < this.maxAttempts && this.isScanning) {
                requestAnimationFrame(scanFrame);
            }
        };

        requestAnimationFrame(scanFrame);
    }

    // Scan current frame
    async scanFrame() {
        if (!this.videoElement || !this.canvasElement) {
            return { detected: false };
        }

        const ctx = this.canvasElement.getContext('2d');
        const width = this.videoElement.videoWidth;
        const height = this.videoElement.videoHeight;

        this.canvasElement.width = width;
        this.canvasElement.height = height;

        // Draw video frame to canvas
        ctx.drawImage(this.videoElement, 0, 0, width, height);

        // Get image data
        const imageData = this.canvasElement.toDataURL('image/png');

        // Try to detect barcode
        return await this.detectFromImage(imageData);
    }

    // Stop camera scanner
    stopCameraScanner() {
        this.isScanning = false;

        if (this.scannerInterval) {
            clearInterval(this.scannerInterval);
            this.scannerInterval = null;
        }

        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.lastResult = null;
        this.scanAttempts = 0;

        return {
            success: true,
            message: 'تم إيقاف الكاميرا'
        };
    }

    // Get camera error message
    getCameraErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'تم رفض الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.';
        }
        if (error.name === 'NotFoundError') {
            return 'لم يتم العثور على كاميرا.';
        }
        if (error.name === 'NotReadableError') {
            return 'الكاميرا قيد الاستخدام من تطبيق آخر.';
        }
        return `خطأ في الوصول للكاميرا: ${error.message}`;
    }

    // ==================== Image Scanner ====================

    // Detect barcode from image
    async detectFromImage(imageSource) {
        // Try different methods
        
        // Method 1: Google Vision API
        if (googleVision.isConfigured()) {
            const visionResult = await this.detectWithVision(imageSource);
            if (visionResult.detected) {
                return visionResult;
            }
        }

        // Method 2: Browser BarcodeDetector API (if supported)
        if ('BarcodeDetector' in window) {
            const browserResult = await this.detectWithBrowserAPI(imageSource);
            if (browserResult.detected) {
                return browserResult;
            }
        }

        // Method 3: Pattern matching on processed image
        const patternResult = await this.detectWithPatterns(imageSource);
        if (patternResult.detected) {
            return patternResult;
        }

        return {
            detected: false,
            message: 'لم يتم العثور على باركود'
        };
    }

    // Detect with Google Vision API
    async detectWithVision(imageSource) {
        const textResult = await googleVision.extractText(imageSource);
        
        if (textResult.success && textResult.fullText) {
            const barcodes = googleVision.extractBarcodes(textResult.fullText);
            
            if (barcodes.length > 0) {
                return {
                    detected: true,
                    code: barcodes[0].code,
                    type: barcodes[0].type,
                    raw: barcodes[0].raw,
                    allBarcodes: barcodes,
                    method: 'google-vision',
                    confidence: 0.9
                };
            }
        }

        return { detected: false };
    }

    // Detect with Browser BarcodeDetector API
    async detectWithBrowserAPI(imageSource) {
        try {
            const barcodeDetector = new BarcodeDetector({
                formats: this.supportedFormats
            });

            let image;
            if (typeof imageSource === 'string') {
                image = await this.loadImage(imageSource);
            } else if (imageSource instanceof HTMLImageElement || 
                       imageSource instanceof HTMLCanvasElement ||
                       imageSource instanceof HTMLVideoElement) {
                image = imageSource;
            } else {
                return { detected: false };
            }

            const barcodes = await barcodeDetector.detect(image);

            if (barcodes.length > 0) {
                return {
                    detected: true,
                    code: barcodes[0].rawValue,
                    type: barcodes[0].format,
                    bounds: barcodes[0].boundingBox,
                    allBarcodes: barcodes.map(b => ({
                        code: b.rawValue,
                        type: b.format,
                        bounds: b.boundingBox
                    })),
                    method: 'browser-api',
                    confidence: 0.95
                };
            }
        } catch (error) {
            console.error('Browser BarcodeDetector error:', error);
        }

        return { detected: false };
    }

    // Detect with pattern matching
    async detectWithPatterns(imageSource) {
        try {
            // Load image
            const image = await this.loadImage(imageSource);
            
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = image.width || image.videoWidth;
            canvas.height = image.height || image.videoHeight;
            
            ctx.drawImage(image, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Process image for barcode detection
            const processedData = this.preprocessForBarcode(imageData);
            
            // Try to find barcode patterns
            const barcode = this.findBarcodePattern(processedData);
            
            if (barcode) {
                return {
                    detected: true,
                    code: barcode.code,
                    type: barcode.type,
                    method: 'pattern-matching',
                    confidence: 0.7
                };
            }
        } catch (error) {
            console.error('Pattern matching error:', error);
        }

        return { detected: false };
    }

    // Load image from URL or data URL
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    // Preprocess image for barcode detection
    preprocessForBarcode(imageData) {
        const { data, width, height } = imageData;
        const binary = new Uint8Array(width * height);
        
        // Convert to grayscale and binarize
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const index = i / 4;
            binary[index] = gray > 128 ? 1 : 0;
        }
        
        return { binary, width, height };
    }

    // Find barcode pattern in binary image
    findBarcodePattern(processedData) {
        const { binary, width, height } = processedData;
        
        // Look for barcode-like patterns in each row
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(binary[y * width + x]);
            }
            
            // Try to decode EAN-13 pattern
            const ean13 = this.tryDecodeEAN13(row);
            if (ean13) {
                return { code: ean13, type: 'EAN-13' };
            }
        }
        
        return null;
    }

    // Try to decode EAN-13 from row pattern
    tryDecodeEAN13(row) {
        // EAN-13 encoding patterns
        const L_PATTERNS = [
            [0, 0, 0, 1, 1, 0, 1],
            [0, 0, 1, 1, 0, 0, 1],
            [0, 0, 1, 0, 0, 1, 1],
            [0, 1, 1, 1, 1, 0, 1],
            [0, 1, 0, 0, 0, 1, 1],
            [0, 1, 1, 0, 0, 0, 1],
            [0, 1, 0, 1, 1, 1, 1],
            [0, 1, 1, 1, 0, 1, 1],
            [0, 1, 1, 0, 1, 1, 1],
            [0, 0, 0, 1, 0, 1, 1]
        ];
        
        const G_PATTERNS = L_PATTERNS.map(p => p.map(v => 1 - v));
        
        const R_PATTERNS = L_PATTERNS.map(p => p.slice().reverse());
        
        // Find start pattern (101)
        let startIdx = this.findPattern(row, [1, 0, 1]);
        if (startIdx === -1) return null;
        
        // This is a simplified implementation
        // Full implementation would need to:
        // 1. Decode left 6 digits (mix of L and G patterns)
        // 2. Find middle pattern (01010)
        // 3. Decode right 6 digits (R patterns)
        // 4. Validate check digit
        
        return null; // Placeholder - needs full implementation
    }

    // Find pattern in row
    findPattern(row, pattern) {
        const tolerance = 0.5;
        
        for (let i = 0; i < row.length - pattern.length; i++) {
            let match = true;
            for (let j = 0; j < pattern.length; j++) {
                if (row[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) return i;
        }
        
        return -1;
    }

    // ==================== File Scanner ====================

    // Scan from file input
    async scanFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const result = await this.detectFromImage(e.target.result);
                result.fileName = file.name;
                result.fileSize = file.size;
                result.fileType = file.type;
                resolve(result);
            };
            
            reader.onerror = () => {
                resolve({
                    detected: false,
                    error: 'فشل في قراءة الملف'
                });
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Scan multiple files
    async scanMultipleFiles(files) {
        const results = [];
        
        for (const file of files) {
            const result = await this.scanFromFile(file);
            results.push(result);
            
            // Small delay between files
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            success: true,
            results,
            total: files.length,
            detected: results.filter(r => r.detected).length
        };
    }

    // ==================== Barcode Utilities ====================

    // Validate barcode check digit
    validateBarcode(code) {
        const cleanCode = code.replace(/\D/g, '');
        
        if (cleanCode.length === 13) {
            return this.validateEAN13(cleanCode);
        }
        if (cleanCode.length === 12) {
            return this.validateUPC(cleanCode);
        }
        if (cleanCode.length === 8) {
            return this.validateEAN8(cleanCode);
        }
        
        return { valid: false, reason: 'طول الباركود غير صحيح' };
    }

    // Validate EAN-13 check digit
    validateEAN13(code) {
        if (code.length !== 13) {
            return { valid: false, reason: 'EAN-13 يجب أن يكون 13 رقم' };
        }

        const digits = code.split('').map(Number);
        const checkDigit = digits[12];
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        
        const calculatedCheck = (10 - (sum % 10)) % 10;
        
        if (calculatedCheck === checkDigit) {
            return {
                valid: true,
                type: 'EAN-13',
                country: this.getEAN13Country(code.substring(0, 3))
            };
        }
        
        return {
            valid: false,
            reason: 'رقم التحقق غير صحيح',
            expected: calculatedCheck,
            actual: checkDigit
        };
    }

    // Validate UPC check digit
    validateUPC(code) {
        if (code.length !== 12) {
            return { valid: false, reason: 'UPC يجب أن يكون 12 رقم' };
        }

        const digits = code.split('').map(Number);
        const checkDigit = digits[11];
        
        let sum = 0;
        for (let i = 0; i < 11; i++) {
            sum += digits[i] * (i % 2 === 0 ? 3 : 1);
        }
        
        const calculatedCheck = (10 - (sum % 10)) % 10;
        
        return {
            valid: calculatedCheck === checkDigit,
            type: 'UPC-A'
        };
    }

    // Validate EAN-8 check digit
    validateEAN8(code) {
        if (code.length !== 8) {
            return { valid: false, reason: 'EAN-8 يجب أن يكون 8 أرقام' };
        }

        const digits = code.split('').map(Number);
        const checkDigit = digits[7];
        
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            sum += digits[i] * (i % 2 === 0 ? 3 : 1);
        }
        
        const calculatedCheck = (10 - (sum % 10)) % 10;
        
        return {
            valid: calculatedCheck === checkDigit,
            type: 'EAN-8'
        };
    }

    // Get country from EAN-13 prefix
    getEAN13Country(prefix) {
        const prefixes = {
            '622': 'مصر',
            '621': 'سوريا',
            '625': 'الأردن',
            '626': 'إيران',
            '627': 'الكويت',
            '628': 'السعودية',
            '629': 'الإمارات',
            '630-639': 'لبنان وسوريا',
            
            '300-379': 'فرنسا',
            '400-440': 'ألمانيا',
            '450-459': 'اليابان',
            '460-469': 'روسيا',
            '471': 'تايوان',
            '474': 'إستونيا',
            '475': 'لاتفيا',
            '476': 'أذربيجان',
            '477': 'ليتوانيا',
            '478': 'أوزبكستان',
            '479': 'سريلانكا',
            '480': 'الفلبين',
            '481': 'بيلاروس',
            '482': 'أوكرانيا',
            '484': 'مولدوفا',
            '485': 'أرمينيا',
            '486': 'جورجيا',
            '487': 'كازاخستان',
            '489': 'هونغ كونغ',
            '490-499': 'اليابان',
            '500-509': 'المملكة المتحدة',
            '520': 'اليونان',
            '528': 'لبنان',
            '529': 'قبرص',
            '530': 'ألبانيا',
            '531': 'مقدونيا',
            '535': 'مالطا',
            '539': 'أيرلندا',
            '540-549': 'بلجيكا ولوكسمبورغ',
            '560': 'البرتغال',
            '569': 'آيسلندا',
            '570-579': 'الدنمارك',
            '590': 'بولندا',
            '594': 'رومانيا',
            '599': 'هنغاريا',
            '600-601': 'جنوب أفريقيا',
            '603': 'غانا',
            '604': 'سنغال',
            '608': 'البحرين',
            '609': 'موريشيوس',
            '611': 'المغرب',
            '613': 'الجزائر',
            '616': 'كينيا',
            '618': 'ساحل العاج',
            '619': 'تونس',
            '620': 'تنزانيا',
            '623': 'بروناي',
            '624': 'ليبيا',
            
            '640-649': 'فنلندا',
            '690-699': 'الصين',
            '700-709': 'النرويج',
            '729': 'إسرائيل',
            '730-739': 'السويد',
            '740': 'غواتيمالا',
            '741': 'السلفادور',
            '742': 'هندوراس',
            '743': 'نيكاراغوا',
            '744': 'كوستاريكا',
            '745': 'بنما',
            '746': 'جمهورية الدومينيكان',
            '750': 'المكسيك',
            '754-755': 'كندا',
            '759': 'فنزويلا',
            '760-769': 'سويسرا',
            '770': 'كولومبيا',
            '773': 'أوروغواي',
            '775': 'بيرو',
            '777': 'بوليفيا',
            '779': 'الأرجنتين',
            '780': 'تشيلي',
            '784': 'باراغواي',
            '786': 'إكوادور',
            '789-790': 'البرازيل',
            '800-839': 'إيطاليا',
            '840-849': 'إسبانيا',
            '850': 'كوبا',
            '858': 'سلوفاكيا',
            '859': 'التشيك',
            '860': 'صربيا',
            '865': 'منغوليا',
            '867': 'كوريا الشمالية',
            '868-869': 'تركيا',
            '870-879': 'هولندا',
            '880': 'كوريا الجنوبية',
            '884': 'كمبوديا',
            '885': 'تايلاند',
            '888': 'سنغافورة',
            '890': 'الهند',
            '893': 'فيتنام',
            '896': 'باكستان',
            '899': 'إندونيسيا',
            '900-919': 'النمسا',
            '930-939': 'أستراليا',
            '940-949': 'نيوزيلندا',
            '950': 'المنظمة الدولية للمعايير',
            '955': 'ماليزيا',
            '958': 'ماكاو'
        };

        // Check exact match first
        if (prefixes[prefix]) {
            return prefixes[prefix];
        }

        // Check ranges
        const prefixNum = parseInt(prefix);
        for (const [range, country] of Object.entries(prefixes)) {
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(Number);
                if (prefixNum >= start && prefixNum <= end) {
                    return country;
                }
            }
        }

        return 'غير معروف';
    }

    // Generate barcode (for testing)
    generateBarcode(length = 13) {
        let code = '';
        for (let i = 0; i < length - 1; i++) {
            code += Math.floor(Math.random() * 10);
        }
        
        // Calculate check digit
        const digits = code.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        
        return code + checkDigit;
    }

    // Lookup product by barcode (using open APIs)
    async lookupProduct(barcode) {
        const cleanBarcode = barcode.replace(/\D/g, '');
        
        // Try multiple APIs
        const apis = [
            () => this.lookupOpenFoodFacts(cleanBarcode),
            () => this.lookupBarcodeLookup(cleanBarcode),
            () => this.lookupUPCDatabase(cleanBarcode)
        ];

        for (const api of apis) {
            try {
                const result = await api();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.error('API lookup error:', error);
            }
        }

        return {
            success: false,
            error: 'لم يتم العثور على معلومات المنتج'
        };
    }

    // Open Food Facts API
    async lookupOpenFoodFacts(barcode) {
        try {
            const response = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
            );
            const data = await response.json();

            if (data.status === 1 && data.product) {
                const product = data.product;
                return {
                    success: true,
                    source: 'Open Food Facts',
                    product: {
                        name: product.product_name || product.product_name_en,
                        nameAr: product.product_name_ar,
                        brand: product.brands,
                        category: product.categories,
                        image: product.image_url,
                        ingredients: product.ingredients_text,
                        nutrition: product.nutriments,
                        barcode: product.code,
                        quantity: product.quantity,
                        countries: product.countries
                    }
                };
            }
        } catch (error) {
            console.error('Open Food Facts error:', error);
        }

        return { success: false };
    }

    // Barcode Lookup API
    async lookupBarcodeLookup(barcode) {
        try {
            const response = await fetch(
                `https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=YOUR_API_KEY`
            );
            const data = await response.json();

            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                return {
                    success: true,
                    source: 'Barcode Lookup',
                    product: {
                        name: product.product_name,
                        brand: product.brand,
                        category: product.category,
                        image: product.images?.[0],
                        description: product.description,
                        barcode: product.barcode_number
                    }
                };
            }
        } catch (error) {
            console.error('Barcode Lookup error:', error);
        }

        return { success: false };
    }

    // UPC Database API
    async lookupUPCDatabase(barcode) {
        try {
            const response = await fetch(
                `https://api.upcdatabase.org/product/${barcode}?apikey=YOUR_API_KEY`
            );
            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    source: 'UPC Database',
                    product: {
                        name: data.title,
                        description: data.description,
                        brand: data.brand,
                        category: data.category,
                        barcode: data.ean
                    }
                };
            }
        } catch (error) {
            console.error('UPC Database error:', error);
        }

        return { success: false };
    }

    // ==================== UI Helpers ====================

    // Create scanner UI
    createScannerUI(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const html = `
            <div class="barcode-scanner-ui">
                <div class="scanner-video-container">
                    <video id="barcode-video" autoplay playsinline></video>
                    <canvas id="barcode-canvas" style="display: none;"></canvas>
                    <div class="scanner-overlay">
                        <div class="scanner-frame">
                            <div class="corner top-left"></div>
                            <div class="corner top-right"></div>
                            <div class="corner bottom-left"></div>
                            <div class="corner bottom-right"></div>
                        </div>
                        <p class="scanner-hint">وجّه الكاميرا نحو الباركود</p>
                    </div>
                </div>
                
                <div class="scanner-controls">
                    <button id="btn-start-scanner" class="btn btn-primary">
                        <i class="fas fa-camera"></i>
                        بدء المسح
                    </button>
                    <button id="btn-stop-scanner" class="btn btn-secondary" disabled>
                        <i class="fas fa-stop"></i>
                        إيقاف
                    </button>
                    <button id="btn-upload-image" class="btn btn-outline">
                        <i class="fas fa-image"></i>
                        رفع صورة
                    </button>
                    <input type="file" id="barcode-image-input" accept="image/*" style="display: none;">
                </div>
                
                <div class="scanner-result" id="scanner-result" style="display: none;">
                    <div class="result-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="result-code" id="result-code"></div>
                    <div class="result-type" id="result-type"></div>
                    <button id="btn-use-result" class="btn btn-success">استخدام</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Bind events
        const video = document.getElementById('barcode-video');
        const canvas = document.getElementById('barcode-canvas');
        const startBtn = document.getElementById('btn-start-scanner');
        const stopBtn = document.getElementById('btn-stop-scanner');
        const uploadBtn = document.getElementById('btn-upload-image');
        const fileInput = document.getElementById('barcode-image-input');

        startBtn?.addEventListener('click', async () => {
            startBtn.disabled = true;
            const result = await this.startCameraScanner({
                videoElement: video,
                canvasElement: canvas,
                onDetected: (barcode) => {
                    this.showResult(barcode, options.onDetected);
                }
            });
            
            if (result.success) {
                stopBtn.disabled = false;
            } else {
                startBtn.disabled = false;
                alert(result.error);
            }
        });

        stopBtn?.addEventListener('click', () => {
            this.stopCameraScanner();
            startBtn.disabled = false;
            stopBtn.disabled = true;
        });

        uploadBtn?.addEventListener('click', () => fileInput.click());

        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const result = await this.scanFromFile(file);
                if (result.detected) {
                    this.showResult(result, options.onDetected);
                } else {
                    alert('لم يتم العثور على باركود في الصورة');
                }
            }
        });

        return this;
    }

    // Show scan result
    showResult(result, callback) {
        const resultDiv = document.getElementById('scanner-result');
        const codeDiv = document.getElementById('result-code');
        const typeDiv = document.getElementById('result-type');
        const useBtn = document.getElementById('btn-use-result');

        if (resultDiv && codeDiv && typeDiv) {
            codeDiv.textContent = result.code;
            typeDiv.textContent = result.type || 'باركود';
            resultDiv.style.display = 'flex';

            useBtn?.addEventListener('click', () => {
                if (callback) {
                    callback(result);
                }
            });
        }
    }

    // Check if BarcodeDetector is supported
    isBrowserAPISupported() {
        return 'BarcodeDetector' in window;
    }

    // Check if camera is available
    async isCameraAvailable() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(d => d.kind === 'videoinput');
        } catch {
            return false;
        }
    }
}

// Export singleton
const barcodeScanner = new BarcodeScanner();
export { barcodeScanner, BarcodeScanner };
