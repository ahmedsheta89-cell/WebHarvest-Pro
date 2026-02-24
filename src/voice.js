/**
 * WebHarvest Pro - Voice Search
 * بحث صوتي بالعربية والإنجليزية
 */

class VoiceSearch {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onEnd = null;
    }

    // تهيئة التعرف الصوتي
    async init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            throw new Error('المتصفح لا يدعم التعرف الصوتي');
        }
        
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
        
        return true;
    }

    // إعداد التعرف الصوتي
    setupRecognition() {
        // اللغات المدعومة
        this.recognition.lang = 'ar-EG'; // عربي مصري افتراضي
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        
        // معالجة النتائج
        this.recognition.onresult = (event) => {
            const results = [];
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                results.push({
                    transcript: result[0].transcript,
                    confidence: result[0].confidence,
                    isFinal: result.isFinal
                });
            }
            
            this.onResult?.({
                results: results,
                final: results.find(r => r.isFinal)?.transcript || ''
            });
        };
        
        // معالجة الأخطاء
        this.recognition.onerror = (event) => {
            const errorMessages = {
                'no-speech': 'لم يتم اكتشاف كلام',
                'audio-capture': 'لا يوجد ميكروفون',
                'not-allowed': 'تم رفض الوصول للميكروفون',
                'network': 'خطأ في الشبكة',
                'aborted': 'تم الإلغاء',
                'language-not-supported': 'اللغة غير مدعومة'
            };
            
            this.onError?.({
                type: event.error,
                message: errorMessages[event.error] || 'خطأ غير معروف'
            });
            
            this.isListening = false;
        };
        
        // بدء الاستماع
        this.recognition.onstart = () => {
            this.isListening = true;
            this.onStart?.();
        };
        
        // انتهاء الاستماع
        this.recognition.onend = () => {
            this.isListening = false;
            this.onEnd?.();
        };
    }

    // تغيير اللغة
    setLanguage(lang) {
        const languages = {
            'ar': 'ar-EG',
            'ar-eg': 'ar-EG',
            'ar-sa': 'ar-SA',
            'ar-ae': 'ar-AE',
            'en': 'en-US',
            'en-us': 'en-US',
            'en-gb': 'en-GB'
        };
        
        this.recognition.lang = languages[lang.toLowerCase()] || lang;
    }

    // بدء الاستماع
    start(options = {}) {
        if (this.isListening) return;
        
        if (options.language) {
            this.setLanguage(options.language);
        }
        
        this.onResult = options.onResult;
        this.onError = options.onError;
        this.onStart = options.onStart;
        this.onEnd = options.onEnd;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
        }
    }

    // إيقاف الاستماع
    stop() {
        if (!this.isListening) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping voice recognition:', error);
        }
    }

    // تبديل حالة الاستماع
    toggle(options = {}) {
        if (this.isListening) {
            this.stop();
        } else {
            this.start(options);
        }
    }
}

// Voice Commands - أوامر صوتية
class VoiceCommands {
    constructor() {
        this.commands = new Map();
        this.voiceSearch = new VoiceSearch();
    }

    // تسجيل أمر صوتي
    registerCommand(trigger, action, options = {}) {
        const triggers = Array.isArray(trigger) ? trigger : [trigger];
        
        triggers.forEach(t => {
            this.commands.set(t.toLowerCase(), {
                action: action,
                description: options.description || '',
                aliases: options.aliases || []
            });
        });
    }

    // معالجة النص الصوتي
    processTranscript(transcript) {
        const text = transcript.toLowerCase().trim();
        
        for (const [trigger, command] of this.commands) {
            if (text.includes(trigger)) {
                // استخراج المعاملات
                const params = text.replace(trigger, '').trim();
                return command.action(params);
            }
        }
        
        return null;
    }

    // بدء الاستماع للأوامر
    async startListening() {
        await this.voiceSearch.init();
        
        this.voiceSearch.start({
            onResult: (data) => {
                if (data.final) {
                    const result = this.processTranscript(data.final);
                    if (result) {
                        // تم تنفيذ أمر
                        console.log('Command executed:', result);
                    }
                }
            }
        });
    }

    // إيقاف الاستماع
    stopListening() {
        this.voiceSearch.stop();
    }

    // الحصول على الأوامر المسجلة
    getCommands() {
        const list = [];
        for (const [trigger, command] of this.commands) {
            list.push({
                trigger: trigger,
                description: command.description
            });
        }
        return list;
    }
}

// Arabic Number Converter - تحويل الأرقام العربية
class ArabicNumberConverter {
    constructor() {
        this.arabicNums = ['صفر', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
        this.arabicTens = ['عشرة', 'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'ثمانين', 'تسعين'];
        this.arabicHundreds = ['مائة', 'مائتين', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
        this.arabicThousands = ['ألف', 'ألفين', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف'];
    }

    // من رقم إلى كلمات عربية
    toWords(num) {
        if (num === 0) return 'صفر';
        
        let result = '';
        
        // آلاف
        if (num >= 1000) {
            const thousands = Math.floor(num / 1000);
            if (thousands <= 5) {
                result += this.arabicThousands[thousands - 1] + ' ';
            } else {
                result += this.toWords(thousands) + ' ألف ';
            }
            num = num % 1000;
        }
        
        // مئات
        if (num >= 100) {
            const hundreds = Math.floor(num / 100);
            result += this.arabicHundreds[hundreds - 1] + ' ';
            num = num % 100;
        }
        
        // عشرات
        if (num >= 10) {
            const tens = Math.floor(num / 10);
            const ones = num % 10;
            
            if (num === 10) {
                result += 'عشرة';
            } else if (num === 11) {
                result += 'أحد عشر';
            } else if (num === 12) {
                result += 'اثني عشر';
            } else if (ones === 0) {
                result += this.arabicTens[tens - 1];
            } else {
                result += this.arabicNums[ones] + ' و ' + this.arabicTens[tens - 1];
            }
        } else if (num > 0) {
            result += this.arabicNums[num];
        }
        
        return result.trim();
    }

    // من كلمات عربية إلى رقم
    fromWords(text) {
        // تنفيذ مبسط
        const words = text.toLowerCase().split(/[\s-]+/);
        let result = 0;
        
        const numMap = {
            'صفر': 0, 'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'أربعة': 4,
            'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9,
            'عشرة': 10, 'عشرين': 20, 'ثلاثين': 30, 'أربعين': 40,
            'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90,
            'مائة': 100, 'مائتين': 200, 'ألف': 1000
        };
        
        for (const word of words) {
            if (numMap[word] !== undefined) {
                result += numMap[word];
            }
        }
        
        return result;
    }
}

// Voice History - سجل البحث الصوتي
class VoiceHistory {
    constructor() {
        this.storageKey = 'webharvest_voice_history';
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

    add(transcript, language) {
        const entry = {
            id: Date.now(),
            text: transcript,
            language: language,
            timestamp: new Date().toISOString()
        };
        
        this.history.unshift(entry);
        if (this.history.length > 50) this.history.pop();
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
}

// Create instances
const voiceSearch = new VoiceSearch();
const voiceCommands = new VoiceCommands();
const arabicNumberConverter = new ArabicNumberConverter();
const voiceHistory = new VoiceHistory();

// Register default commands
voiceCommands.registerCommand(['ابحث عن', 'دور على'], (params) => ({
    action: 'search',
    query: params
}), { description: 'البحث عن منتج' });

voiceCommands.registerCommand(['أضف منتج', 'ضيف منتج'], (params) => ({
    action: 'addProduct',
    name: params
}), { description: 'إضافة منتج جديد' });

voiceCommands.registerCommand(['إعدادات', 'فتح الإعدادات'], () => ({
    action: 'openSettings'
}), { description: 'فتح الإعدادات' });

// Export
export { 
    VoiceSearch, 
    VoiceCommands, 
    ArabicNumberConverter,
    VoiceHistory,
    voiceSearch,
    voiceCommands,
    arabicNumberConverter,
    voiceHistory
};
