/**
 * WebHarvest Pro - QR & Barcode Scanner
 * مسح الباركود والـ QR بالكاميرا
 */

class QRScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.scanning = false;
        this.onResult = null;
        this.onError = null;
    }

    // تهيئة الماسح
    async init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvas.getContext('2d');
        
        // تحميل مكتبة ZXing
        if (typeof window.ZXing === 'undefined') {
            await this.loadLibrary();
        }
        
        return true;
    }

    // تحميل مكتبة المسح
    async loadLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@aspect-libs/zxing-js@0.0.6/dist/zxing.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // بدء المسح
    async startScan(onResult, onError) {
        this.onResult = onResult;
        this.onError = onError;
        
        try {
            // طلب الوصول للكاميرا
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.video.srcObject = stream;
            await this.video.play();
            
            this.scanning = true;
            this.scanLoop();
            
            return true;
        } catch (error) {
            this.onError?.({
                type: 'CAMERA_ERROR',
                message: 'فشل الوصول للكاميرا',
                error: error.message
            });
            return false;
        }
    }

    // حلقة المسح
    async scanLoop() {
        if (!this.scanning) return;
        
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);
            
            try {
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                const code = await this.decodeImage(imageData);
                
                if (code) {
                    this.onResult?.({
                        type: 'BARCODE_FOUND',
                        code: code,
                        format: code.format,
                        text: code.text
                    });
                    
                    // اهتزاز للتأكيد
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                }
            } catch (e) {
                // لا يوجد باركود في هذه الصورة
            }
        }
        
        requestAnimationFrame(() => this.scanLoop());
    }

    // فك تشفير الصورة
    async decodeImage(imageData) {
        // استخدام مكتبة بسيطة للباركود
        const code = this.detectBarcode(imageData);
        return code;
    }

    // كشف الباركود (خوارزمية بسيطة)
    detectBarcode(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // البحث عن نمط الباركود (أبيض وأسود متعاقب)
        let barcodeLine = [];
        const centerY = Math.floor(height / 2);
        
        for (let x = 0; x < width; x++) {
            const idx = (centerY * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            barcodeLine.push(brightness > 128 ? 1 : 0);
        }
        
        // تحويل إلى أرقام
        const code = this.decodeBars(barcodeLine);
        
        if (code) {
            return {
                text: code,
                format: 'EAN-13',
                raw: barcodeLine
            };
        }
        
        return null;
    }

    // فك تشفير الأعمدة
    decodeBars(bars) {
        // تنفيذ بسيط - يمكن تحسينه بمكتبة متخصصة
        // للآن سنستخدم API خارجي للفك التشفير الدقيق
        return null;
    }

    // إيقاف المسح
    stopScan() {
        this.scanning = false;
        
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }

    // مسح من صورة
    async scanFromImage(imageFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = await this.decodeImage(imageData);
                    
                    if (code) {
                        resolve(code);
                    } else {
                        reject(new Error('لم يتم العثور على باركود'));
                    }
                };
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(imageFile);
        });
    }
}

// Barcode Generator - لإنشاء باركود
class BarcodeGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
    }

    // إنشاء باركود EAN-13
    generateEAN13(code, options = {}) {
        const width = options.width || 200;
        const height = options.height || 100;
        
        this.canvas.width = width;
        this.canvas.height = height;
        const ctx = this.canvas.getContext('2d');
        
        // خلفية بيضاء
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // رسم الباركود (خوارزمية مبسطة)
        const barWidth = width / 95;
        const bars = this.getEAN13Pattern(code);
        
        ctx.fillStyle = '#000000';
        let x = 10;
        
        for (const bar of bars) {
            if (bar === '1') {
                ctx.fillRect(x, 10, barWidth, height - 30);
            }
            x += barWidth;
        }
        
        // كتابة الرقم
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(code, width / 2, height - 5);
        
        return this.canvas.toDataURL();
    }

    // الحصول على نمط EAN-13
    getEAN13Pattern(code) {
        // L-pattern و R-pattern للـ EAN-13
        const L = ['0001101', '0011001', '0010011', '0111101', '0100011',
                   '0110001', '0101111', '0111011', '0110111', '0001011'];
        const R = ['1110010', '1100110', '1101100', '1000010', '1011100',
                   '1001110', '1010000', '1000100', '1001000', '1110100'];
        
        let pattern = '101'; // Start guard
        
        for (let i = 0; i < 6; i++) {
            pattern += L[parseInt(code[i])];
        }
        
        pattern += '01010'; // Center guard
        
        for (let i = 6; i < 12; i++) {
            pattern += R[parseInt(code[i])];
        }
        
        pattern += '101'; // End guard
        
        return pattern;
    }

    // إنشاء QR Code
    async generateQR(text, options = {}) {
        const size = options.size || 200;
        const color = options.color || '#000000';
        const bgColor = options.bgColor || '#FFFFFF';
        
        // استخدام QR Code API
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${color.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}`;
        
        return apiUrl;
    }
}

// QR History - سجل المسح
class QRHistory {
    constructor() {
        this.storageKey = 'webharvest_qr_history';
        this.history = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    }

    add(item) {
        const entry = {
            id: Date.now(),
            code: item.code,
            text: item.text,
            format: item.format,
            type: item.type || 'barcode',
            timestamp: new Date().toISOString()
        };
        
        this.history.unshift(entry);
        if (this.history.length > 100) this.history.pop();
        this.save();
        
        return entry;
    }

    getAll() {
        return this.history;
    }

    clear() {
        this.history = [];
        localStorage.removeItem(this.storageKey);
    }

    delete(id) {
        this.history = this.history.filter(h => h.id !== id);
        this.save();
    }
}

// Create instances
const qrScanner = new QRScanner();
const barcodeGenerator = new BarcodeGenerator();
const qrHistory = new QRHistory();

// Export
export { 
    QRScanner, 
    BarcodeGenerator, 
    QRHistory,
    qrScanner,
    barcodeGenerator,
    qrHistory
};
