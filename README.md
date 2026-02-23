# WebHarvest Pro

> أداة إدارة المنتجات الاحترافية - سحب وتحليل وتصدير

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Language](https://img.shields.io/badge/language-AR-yellow.svg)

---

## 🎯 الهدف

أداة متكاملة لإدارة المنتجات مع:
- **سحب تلقائي** من مواقع التجارة الإلكترونية
- **تحليل ذكي** للأسعار والأرباح
- **تصدير متعدد** (Excel, WooCommerce, Shopify)
- **مزامنة** مع Firebase + Cloudinary

---

## 🚀 المميزات

### ✅ المرحلة الأولى - الأساس
- [x] هيكل المشروع الاحترافي
- [x] واجهة عربية كاملة (RTL)
- [x] سكرابر ذكي متعدد المواقع
- [x] Firebase CRUD كامل
- [x] Cloudinary للصور
- [x] ترجمة تلقائية (AR/EN)
- [x] حساب الأرباح
- [x] تصدير متعدد الصيغ

### ✅ المرحلة الثانية - التكامل
- [x] Google Vision API (OCR)
- [x] قارئ الباركود
- [x] Remove.bg (إزالة الخلفية)

### ✅ المرحلة الثالثة - التقارير
- [x] PDF Reports
- [x] Bulk Operations
- [x] Dashboard متقدم
- [x] Analytics

### ✅ المرحلة الرابعة - المتقدم
- [x] Offline Mode (PWA)
- [x] Activity Log
- [x] Service Worker
- [x] Background Sync

---

## 📁 هيكل المشروع

```
WebHarvest-Pro/
├── index.html              # الواجهة الرئيسية
├── server.js               # سيرفر Node.js
├── manifest.json           # PWA config
├── sw.js                   # Service Worker
├── package.json
├── .gitignore
│
├── styles/
│   └── main.css            # التصميم الكامل
│
├── src/
│   ├── app.js              # المتحكم الرئيسي
│   ├── config.js           # الإعدادات
│   ├── firebase.js         # قاعدة البيانات
│   ├── products.js         # إدارة المنتجات
│   ├── scraper.js          # سكرابر المواقع
│   ├── images.js           # Cloudinary
│   ├── translate.js        # الترجمة
│   ├── export.js           # التصدير
│   ├── utils.js            # أدوات مساعدة
│   ├── vision.js           # Google Vision
│   ├── barcode.js          # قارئ الباركود
│   ├── removebg.js         # إزالة الخلفية
│   ├── pdf.js              # تقارير PDF
│   ├── bulk.js             # عمليات جماعية
│   ├── dashboard.js        # لوحة التحكم
│   ├── sync.js             # المزامنة
│   ├── reports.js          # التقارير
│   ├── offline.js          # العمل بدون نت
│   └── activity.js         # سجل العمليات
│
├── public/
│   ├── robots.txt
│   └── sitemap.xml
│
└── assets/
    └── icons/
```

---

## ⚡ التشغيل السريع

### 1. تحميل المشروع
```bash
git clone https://github.com/YOUR_USERNAME/WebHarvest-Pro.git
cd WebHarvest-Pro
```

### 2. تشغيل مباشر (بدون سيرفر)
افتح `index.html` في المتصفح

### 3. تشغيل بالسيرفر (اختياري)
```bash
npm install
npm start
```
ثم افتح `http://localhost:3000`

---

## ⚙️ الإعدادات

### Firebase (مطلوب)

1. إنشاء مشروع من [Firebase Console](https://console.firebase.google.com)
2. تفعيل Firestore Database
3. نسخ الإعدادات:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Cloudinary (مطلوب للصور)

1. إنشاء حساب من [Cloudinary](https://cloudinary.com)
2. نسخ الإعدادات:

```javascript
const cloudinaryConfig = {
    cloudName: "YOUR_CLOUD_NAME",
    uploadPreset: "YOUR_UPLOAD_PRESET"
};
```

### Google Vision API (اختياري)

1. إنشاء مشروع من [Google Cloud](https://console.cloud.google.com)
2. تفعيل Vision API
3. إنشاء API Key

### Remove.bg API (اختياري)

1. التسجيل في [Remove.bg](https://www.remove.bg/api)
2. نسخ API Key

---

## 📖 دليل الاستخدام

### سحب منتج من موقع

```javascript
// مثال: سحب منتج من Noon
const product = await scraper.scrapeProduct('https://www.noon.com/...');

// النتيجة:
{
    name: "Product Name",
    nameAr: "اسم المنتج",
    price: 299,
    marketPrice: 350,
    images: ["url1", "url2"],
    description: "...",
    category: "electronics"
}
```

### حساب الربح

```javascript
const pricing = PriceCalculator.calculate(
    100,  // سعر الشراء
    150,  // سعر السوق
    { profitMargin: 30, shippingCost: 20 }
);

// النتيجة:
{
    purchasePrice: 100,
    marketPrice: 150,
    suggestedPrice: 135,
    profit: 35,
    profitMargin: 35,
    isProfitable: true
}
```

### تصدير المنتجات

```javascript
// Excel
const blob = await ExcelExporter.export(products);
saveAs(blob, 'products.xlsx');

// WooCommerce
const csv = WooCommerceExporter.export(products);

// Shopify
const json = ShopifyExporter.export(products);
```

---

## 🔧 API Reference

### Scraper API

| Method | Description |
|--------|-------------|
| `scraper.scrapeProduct(url)` | سحب منتج واحد |
| `scraper.scrapeMultiple(urls)` | سحب منتجات متعددة |
| `scraper.detectSite(url)` | اكتشاف نوع الموقع |

### Products API

| Method | Description |
|--------|-------------|
| `productManager.create(product)` | إضافة منتج |
| `productManager.update(id, data)` | تحديث منتج |
| `productManager.delete(id)` | حذف منتج |
| `productManager.getAll()` | جلب كل المنتجات |

### Export API

| Method | Description |
|--------|-------------|
| `ExcelExporter.export(products)` | تصدير Excel |
| `WooCommerceExporter.export(products)` | تصدير WooCommerce |
| `ShopifyExporter.export(products)` | تصدير Shopify |

---

## 🌐 المواقع المدعومة

| الموقع | النوع | الحالة |
|--------|-------|--------|
| Amazon | Generic | ✅ |
| Noon | Shopify-like | ✅ |
| Shein | Custom | ✅ |
| iHerb | Generic | ✅ |
| Sally Pharmacies | React | ⚠️ يحتاج سيرفر |

---

## 📊 التقارير

### تقرير المنتجات
```javascript
const report = await analytics.generateReport(products);
// يحتوي على: إحصائيات، رسوم بيانية، توصيات
```

### كتالوج PDF
```javascript
const pdf = await pdfGenerator.generateCatalog(products, options);
saveAs(pdf, 'catalog.pdf');
```

---

## 🔄 المزامنة

### Excel Sync
```javascript
// رفع ملف Excel
await syncManager.loadExcelFile(file);

// مزامنة المنتجات
await syncManager.syncAllWithExcel();
```

---

## 📱 PWA Features

- ✅ تثبيت على الهاتف
- ✅ العمل بدون إنترنت
- ✐ إشعارات Push
- ✅ مزامنة في الخلفية

---

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

---

## 📄 الترخيص

MIT License - انظر [LICENSE](LICENSE)

---

## 📞 التواصل

- GitHub Issues للأخطاء والاقتراحات
- البريد: support@webharvest.pro

---

## 🙏 شكر خاص

- Firebase by Google
- Cloudinary
- Font Awesome
- Chart.js
- SheetJS

---

**Created for Sale Zone Store** 🛍️

**Made with ❤️ in Egypt**
