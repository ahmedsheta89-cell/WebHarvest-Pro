# WebHarvest Pro

> أداة إدارة المنتجات الاحترافية - سحب وتحليل وتصدير

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ المميزات

### 🔍 Scraping ذكي
- سحب المنتجات من أي موقع
- كشف تلقائي لنوع الموقع
- دعم الصور المتعددة

### 📱 QR Scanner
- مسح الباركود بالكاميرا
- توليد QR Code
- سجل المسح

### 🎤 Voice Search
- بحث صوتي بالعربية والإنجليزية
- أوامر صوتية
- تحويل الأرقام العربية

### 🤖 AI Suggestions
- اقتراحات أسعار ذكية
- تصنيف تلقائي للمنتجات
- توليد أوصاف

### 📦 Bulk Operations
- تعديل جماعي
- استيراد/تصدير Excel
- قوالب جاهزة

### 🎨 واجهة احترافية
- Dark/Light Mode
- RTL Support
- Responsive Design

## 🚀 البدء السريع

### 1. فتح التطبيق
```
https://ahmedsheta89-cell.github.io/WebHarvest-Pro/
```

### 2. الإعداد
- افتح صفحة الإعدادات
- أدخل بيانات Firebase
- أدخل بيانات Cloudinary
- احفظ الإعدادات

### 3. الاستخدام
- أدخل رابط المنتج
- اضغط "سحب المنتج"
- عدّل البيانات حسب الحاجة
- صدّر للـ Excel أو WooCommerce

## 📁 هيكل المشروع

```
WebHarvest-Pro/
├── index.html          # الصفحة الرئيسية
├── pages/
│   └── settings.html   # صفحة الإعدادات
├── src/
│   ├── app.js          # التطبيق الرئيسي
│   ├── config.js       # الإعدادات
│   ├── scraper.js      # السكرابر
│   ├── products.js     # إدارة المنتجات
│   ├── firebase.js     # Firebase
│   ├── images.js       # Cloudinary
│   ├── translate.js    # الترجمة
│   ├── export.js       # التصدير
│   ├── qr-scanner.js   # QR Scanner
│   ├── voice.js        # البحث الصوتي
│   ├── ai-suggestions.js # AI
│   ├── bulk-operations.js # العمليات الجماعية
│   └── templates.js    # القوالب
├── styles/
│   └── main.css        # التنسيقات
└── public/
    ├── robots.txt
    └── sitemap.xml
```

## ⚙️ الإعدادات

### Firebase
```javascript
{
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com"
}
```

### Cloudinary
```javascript
{
    cloudName: "YOUR_CLOUD_NAME",
    uploadPreset: "YOUR_UPLOAD_PRESET"
}
```

## 📦 التصدير

- Excel (.xlsx)
- WooCommerce CSV
- Shopify CSV
- JSON
- Sale Zone Format

## 🛡️ الأمان

- البيانات تُخزن محلياً
- لا يوجد تخزين للـ API Keys
- اتصال آمن عبر HTTPS

## 📞 الدعم

- GitHub Issues للأخطاء
- البريد: support@webharvest.pro

---

**Made with ❤️ for Sale Zone Store**
