/**
 * WebHarvest Pro - Product Templates
 * قوالب جاهزة للمنتجات
 */

// Product Templates Manager
class ProductTemplates {
    constructor() {
        this.templates = this.getDefaultTemplates();
        this.customTemplates = this.loadCustomTemplates();
    }

    // القوالب الافتراضية
    getDefaultTemplates() {
        return [
            // === العناية بالبشرة ===
            {
                id: 'skincare-cream',
                name: 'كريم بشرة',
                nameAr: 'كريم العناية بالبشرة',
                category: 'skincare',
                fields: {
                    name: '',
                    brand: '',
                    skinType: ['عادي', 'دهني', 'جاف', 'مختلط', 'حساس'],
                    concerns: ['تجاعيد', 'حب الشباب', 'تصبغات', 'جفاف', 'بهتان'],
                    size: '',
                    spf: false,
                    activeIngredients: []
                },
                tags: ['بشرة', 'كريم', 'ترطيب'],
                status: 'active'
            },
            {
                id: 'skincare-serum',
                name: 'سيروم',
                nameAr: 'سيروم بشرة',
                category: 'skincare',
                fields: {
                    name: '',
                    brand: '',
                    skinType: ['عادي', 'دهني', 'جاف', 'مختلط', 'حساس'],
                    activeIngredients: ['ريتينول', 'فيتامين سي', 'هيالورونيك', 'نياسيناميد'],
                    size: '',
                    concentration: ''
                },
                tags: ['بشرة', 'سيروم', 'مركّز'],
                status: 'active'
            },
            {
                id: 'skincare-cleanser',
                name: 'غسول بشرة',
                nameAr: 'غسول الوجه',
                category: 'skincare',
                fields: {
                    name: '',
                    brand: '',
                    skinType: ['عادي', 'دهني', 'جاف', 'مختلط', 'حساس'],
                    size: '',
                    form: ['جل', 'رغوة', 'كريم', 'زيت']
                },
                tags: ['بشرة', 'غسول', 'تنظيف'],
                status: 'active'
            },

            // === العناية بالشعر ===
            {
                id: 'hair-shampoo',
                name: 'شامبو',
                nameAr: 'شامبو',
                category: 'hair',
                fields: {
                    name: '',
                    brand: '',
                    hairType: ['عادي', 'دهني', 'جاف', 'ملون', 'تالف'],
                    concerns: ['تساقط', 'قشرة', 'بهتان', 'تقصف'],
                    size: '',
                    sulfateFree: false
                },
                tags: ['شعر', 'شامبو', 'تنظيف'],
                status: 'active'
            },
            {
                id: 'hair-conditioner',
                name: 'بلسم',
                nameAr: 'بلسم شعر',
                category: 'hair',
                fields: {
                    name: '',
                    brand: '',
                    hairType: ['عادي', 'دهني', 'جاف', 'ملون', 'تالف'],
                    size: '',
                    deepConditioning: false
                },
                tags: ['شعر', 'بلسم', 'ترطيب'],
                status: 'active'
            },
            {
                id: 'hair-oil',
                name: 'زيت شعر',
                nameAr: 'زيت للشعر',
                category: 'hair',
                fields: {
                    name: '',
                    brand: '',
                    hairType: ['جميع الأنواع', 'جاف', 'تالف'],
                    size: '',
                    heatProtection: false
                },
                tags: ['شعر', 'زيت', 'علاج'],
                status: 'active'
            },

            // === الصحة ===
            {
                id: 'health-vitamins',
                name: 'فيتامينات',
                nameAr: 'فيتامينات ومكملات',
                category: 'health',
                fields: {
                    name: '',
                    brand: '',
                    type: ['فيتامين', 'معدن', 'مكمل غذائي'],
                    benefit: ['طاقة', 'مناعة', 'بشرة', 'شعر', 'عظام'],
                    count: '',
                    dosage: ''
                },
                tags: ['صحة', 'فيتامين', 'مكمل'],
                status: 'active'
            },
            {
                id: 'health-supplement',
                name: 'مكمل غذائي',
                nameAr: 'مكمل غذائي',
                category: 'health',
                fields: {
                    name: '',
                    brand: '',
                    type: ['بروتين', 'أحماض أمينية', 'أعشاب', 'أوميجا'],
                    count: '',
                    dosage: ''
                },
                tags: ['صحة', 'مكمل', 'تغذية'],
                status: 'active'
            },

            // === المكياج ===
            {
                id: 'makeup-lipstick',
                name: 'أحمر شفاه',
                nameAr: 'أحمر شفاه',
                category: 'makeup',
                fields: {
                    name: '',
                    brand: '',
                    finish: ['مات', 'لامع', 'ساتان', 'كريمي'],
                    color: '',
                    longLasting: false
                },
                tags: ['مكياج', 'شفاه', 'أحمر شفاه'],
                status: 'active'
            },
            {
                id: 'makeup-foundation',
                name: 'كريم أساس',
                nameAr: 'كريم أساس',
                category: 'makeup',
                fields: {
                    name: '',
                    brand: '',
                    coverage: ['خفيف', 'متوسط', 'كامل'],
                    finish: ['مات', 'لامع', 'طبيعي'],
                    shade: '',
                    spf: false
                },
                tags: ['مكياج', 'أساس', 'وجه'],
                status: 'active'
            },
            {
                id: 'makeup-mascara',
                name: 'ماسكارا',
                nameAr: 'ماسكارا',
                category: 'makeup',
                fields: {
                    name: '',
                    brand: '',
                    effect: ['تكثيف', 'إطالة', 'فرد', 'مقوي'],
                    color: ['أسود', 'بني', 'أزرق'],
                    waterproof: false
                },
                tags: ['مكياج', 'رموش', 'ماسكارا'],
                status: 'active'
            },

            // === العطور ===
            {
                id: 'perfume-women',
                name: 'عطر نسائي',
                nameAr: 'عطر نسائي',
                category: 'perfume',
                fields: {
                    name: '',
                    brand: '',
                    concentration: ['بارفان', 'أو دي بارفان', 'أو دي تواليت'],
                    size: '',
                    notes: ['زهرية', 'فاكهية', 'خشبية', 'شرقية', 'منعشة']
                },
                tags: ['عطر', 'نسائي', 'فاخر'],
                status: 'active'
            },
            {
                id: 'perfume-men',
                name: 'عطر رجالي',
                nameAr: 'عطر رجالي',
                category: 'perfume',
                fields: {
                    name: '',
                    brand: '',
                    concentration: ['بارفان', 'أو دي بارفان', 'أو دي تواليت'],
                    size: '',
                    notes: ['خشبية', 'عطرية', 'حارة', 'منعشة', 'جريئة']
                },
                tags: ['عطر', 'رجالي', 'فاخر'],
                status: 'active'
            },

            // === العناية الشخصية ===
            {
                id: 'personal-body-lotion',
                name: 'لوشن جسم',
                nameAr: 'لوشن للجسم',
                category: 'personal-care',
                fields: {
                    name: '',
                    brand: '',
                    skinType: ['عادي', 'جاف', 'حساس'],
                    size: '',
                    spf: false
                },
                tags: ['عناية شخصية', 'جسم', 'ترطيب'],
                status: 'active'
            },
            {
                id: 'personal-deodorant',
                name: 'مزيل عرق',
                nameAr: 'مزيل عرق',
                category: 'personal-care',
                fields: {
                    name: '',
                    brand: '',
                    form: ['رول', 'سبراي', 'ستيك', 'كريم'],
                    fragrance: ['نعم', 'بدون رائحة'],
                    aluminumFree: false
                },
                tags: ['عناية شخصية', 'إبط', 'مزيل عرق'],
                status: 'active'
            }
        ];
    }

    // تحميل القوالب المخصصة
    loadCustomTemplates() {
        try {
            const saved = localStorage.getItem('webharvest_custom_templates');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    // حفظ القوالب المخصصة
    saveCustomTemplates() {
        localStorage.setItem('webharvest_custom_templates', JSON.stringify(this.customTemplates));
    }

    // إضافة قالب مخصص
    addCustomTemplate(template) {
        const newTemplate = {
            id: `custom-${Date.now()}`,
            ...template,
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        
        this.customTemplates.push(newTemplate);
        this.saveCustomTemplates();
        
        return newTemplate;
    }

    // تحديث قالب مخصص
    updateCustomTemplate(id, updates) {
        const index = this.customTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.customTemplates[index] = {
                ...this.customTemplates[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveCustomTemplates();
            return this.customTemplates[index];
        }
        return null;
    }

    // حذف قالب مخصص
    deleteCustomTemplate(id) {
        this.customTemplates = this.customTemplates.filter(t => t.id !== id);
        this.saveCustomTemplates();
    }

    // الحصول على قالب
    getTemplate(id) {
        return this.templates.find(t => t.id === id) || 
               this.customTemplates.find(t => t.id === id);
    }

    // الحصول على قوالب حسب الفئة
    getTemplatesByCategory(category) {
        return [...this.templates, ...this.customTemplates].filter(t => t.category === category);
    }

    // الحصول على كل القوالب
    getAllTemplates() {
        return [...this.templates, ...this.customTemplates];
    }

    // إنشاء منتج من قالب
    createFromTemplate(templateId, customData = {}) {
        const template = this.getTemplate(templateId);
        if (!template) return null;
        
        return {
            id: Date.now().toString(),
            name: customData.name || template.name,
            nameAr: customData.nameAr || template.nameAr,
            category: template.category,
            fields: { ...template.fields, ...customData.fields },
            tags: [...template.tags, ...(customData.tags || [])],
            status: template.status,
            purchasePrice: customData.purchasePrice || 0,
            price: customData.price || 0,
            stock: customData.stock || 0,
            images: customData.images || [],
            createdAt: new Date().toISOString(),
            templateId: templateId
        };
    }

    // استيراد قالب
    importTemplate(json) {
        try {
            const template = JSON.parse(json);
            return this.addCustomTemplate(template);
        } catch (error) {
            throw new Error('خطأ في استيراد القالب');
        }
    }

    // تصدير قالب
    exportTemplate(id) {
        const template = this.getTemplate(id);
        return JSON.stringify(template, null, 2);
    }
}

// Quick Fill - ملء سريع للبيانات
class QuickFill {
    constructor() {
        this.presets = {
            sizes: {
                skincare: ['30ml', '50ml', '75ml', '100ml', '150ml'],
                hair: ['250ml', '300ml', '400ml', '500ml', '1000ml'],
                perfume: ['30ml', '50ml', '75ml', '100ml', '200ml']
            },
            brands: {
                skincare: ['CeraVe', 'La Roche-Posay', 'The Ordinary', 'Neutrogena', 'Nivea'],
                hair: ['L\'Oreal', 'Pantene', 'Dove', 'Herbal Essences', 'Tresemme'],
                perfume: ['Dior', 'Chanel', 'Tom Ford', 'Versace', 'Dolce & Gabbana']
            },
            concerns: {
                skin: ['تجاعيد', 'حب الشباب', 'تصبغات', 'جفاف', 'حساسية', 'بهتان', 'مسام واسعة'],
                hair: ['تساقط', 'قشرة', 'تقصف', 'بهتان', 'تلف', 'دهون زائدة']
            }
        };
    }

    // الحصول على المقاسات
    getSizes(category) {
        return this.presets.sizes[category] || [];
    }

    // الحصول على الماركات
    getBrands(category) {
        return this.presets.brands[category] || [];
    }

    // الحصول على المشاكل
    getConcerns(type) {
        return this.presets.concerns[type] || [];
    }

    // إضافة preset جديد
    addPreset(category, type, values) {
        if (!this.presets[type]) {
            this.presets[type] = {};
        }
        this.presets[type][category] = values;
    }
}

// Create instances
const productTemplates = new ProductTemplates();
const quickFill = new QuickFill();

// Export
export { 
    ProductTemplates,
    QuickFill,
    productTemplates,
    quickFill
};
