# 🔍 Code Review — Khawalid 20 Website

## ملخص تنفيذي

الموقع ده هو **عارض تفاعلي لمشروع عقاري سكني** (Khawalid 20 Residential) في الرياض. فايل واحد (`index.html`) فيه **20,928 سطر** (~914KB) بيحتوي على CSS + HTML + JavaScript كلهم مدمجين.

> [!WARNING]
> الفايل ده عبارة عن **monolith** — كل حاجة في فايل واحد. ده بيخلي الصيانة صعبة جداً والتعديل خطير لأن أي غلطة ممكن تكسر حاجات مختلفة.

---

## 🏗️ هيكل الفايل الحالي

| القسم | الأسطر | الحجم | الوصف |
|--------|---------|-------|-------|
| **CSS (inline `<style>`)** | 1 → 9,215 | ~9,200 سطر | كل الـ styles بتاعت الموقع |
| **HTML `<body>`** | 9,235 → 10,446 | ~1,200 سطر | الـ markup بتاع كل الواجهة |
| **Three.js Import** | 10,447 → 10,471 | ~25 سطر | تحميل مكتبة Three.js |
| **Main Script Block** | 10,473 → 16,713 | **~6,240 سطر** | السكريبت الرئيسي الضخم |
| **Chatbot Widget** | 16,715 → 17,063 | ~350 سطر | واجهة + لوجيك الـ chatbot |
| **WhatsApp Widget** | 17,065 → 17,250 | ~190 سطر | ويدجت واتساب |
| **Zoning Directory** | 17,200 → 17,377 | ~180 سطر | معرض المناطق |
| **Arabic i18n** | 17,379 → 17,886 | ~500 سطر | محرك الترجمة العربية |
| **Tutorial/Onboarding** | 17,888 → 18,330 | ~440 سطر | جولة تعليمية |
| **Location Map** | 18,332 → 19,773 | **~1,440 سطر** | خريطة MapLibre + الرحلة |
| **Orientation Controller** | 19,783 → 19,900 | ~120 سطر | التحكم في اتجاه الشاشة |
| **Header Wiring** | 19,903 → 20,112 | ~210 سطر | ربط الهيدر |
| **Unit Search Panel** | 20,115 → 20,692 | ~580 سطر | لوحة البحث عن الوحدات |
| **Home Screen/Hero** | 20,693 → 20,925 | ~230 سطر | شاشة البداية |

---

## 📦 الأنظمة الفرعية (Subsystems)

الكود بيحتوي على **13 نظام فرعي** رئيسي:

### 1. 🎬 360° Frame Viewer (عارض الإطارات)
- **الخطوط**: 10,473 → ~10,590
- **الوظيفة**: عرض صور 360° بدوران سلس باستخدام 40 frame
- **يعتمد على**: Supabase Storage للصور، `config.js` و `projects.js`
- **المتغيرات الأساسية**: `currentFrame`, `frameImages[]`, `TOTAL_FRAMES`, `currentScene`

### 2. 🧊 Three.js 3D Overlay (الطبقة ثلاثية الأبعاد)
- **الخطوط**: 10,587 → ~11,160
- **الوظيفة**: عرض مجسمات 3D للطوابق والوحدات فوق الصور 360°
- **يعتمد على**: Three.js، FBXLoader، OrbitControls
- **المتغيرات الأساسية**: `is3DMode`, `orbitControls`, `unitsModel`, `occluderModel`
- **ملاحظة**: بيحمل ملفات FBX من Supabase ويطابقها مع كاميرات محسوبة مسبقاً (Baked Cameras)

### 3. 🔧 3D Mode State (حالة الوضع ثلاثي الأبعاد)
- **الخطوط**: 11,158 → ~11,440
- **الوظيفة**: التبديل بين وضع الصور ووضع 3D الحر
- **يعتمد على**: Three.js Overlay
- **يتحكم في**: OrbitControls، تحريك الكاميرا، zoom limits

### 4. 💥 Exploded Floor View (عرض الطوابق المنفصلة)
- **الخطوط**: 11,930 → ~12,100
- **الوظيفة**: فصل الطوابق بصرياً في الفراغ (كل طابق يطلع لوحده)
- **يعتمد على**: Three.js Overlay + Units Data
- **مميز**: كل mesh بينتقل لـ Group خاص بطابقه

### 5. 📊 Units Data Source (مصدر بيانات الوحدات)
- **الخطوط**: 13,120 → ~14,950
- **الوظيفة**: تحميل بيانات الوحدات من Supabase (أو Google Sheets كـ fallback)
- **يعتمد على**: Supabase REST API
- **البيانات**: اسم الوحدة، الطابق، المساحة، السعر، الحالة (متاح/محجوز/مباع)
- **يتضمن**: Unit Features (غرف نوم، حمامات، مطبخ، بلكونة، إلخ)

### 6. 📋 Unit Detail Panel (لوحة تفاصيل الوحدة)
- **الخطوط**: ~14,950 → ~15,360
- **الوظيفة**: عرض تفاصيل وحدة معينة (صورة، بروشور، جولة 3D، مخططات)
- **يتضمن**: Share URL، Media Modal، Zoom/Pan للصور
- **يدعم**: Google Drive embeds، صور، PDF، iframes

### 7. 🔄 Live Updates (التحديثات الحية)
- **الخطوط**: 15,362 → ~15,445
- **الوظيفة**: تحديثات فورية من Supabase Realtime بدون إعادة تحميل
- **البروتوكول**: WebSocket + Phoenix Channel Protocol
- **يتضمن**: Fallback polling كل 15 ثانية

### 8. 📑 Units Table Drawer (جدول الوحدات)
- **الخطوط**: 15,446 → ~16,130
- **الوظيفة**: جدول Excel-like للوحدات مع فلاتر وبحث
- **يتضمن**: Dual-range sliders (سعر/مساحة)، drag-to-resize على الموبايل

### 9. ⚖️ Compare System (نظام المقارنة)
- **الخطوط**: 16,133 → ~16,415
- **الوظيفة**: مقارنة وحدات جنب بعض
- **يعتمد على**: localStorage لحفظ القائمة

### 10. 🖼️ Gallery (المعرض)
- **الخطوط**: 16,415 → ~16,713
- **الوظيفة**: معرض صور بتصنيفات (خارجي، فناء، نماذج، مخططات)
- **يعتمد على**: Supabase + fallback data
- **يتضمن**: Lightbox مع تنقل بالأسهم

### 11. 🤖 Unit Finder Chatbot
- **الخطوط**: 16,742 → ~17,063
- **الوظيفة**: chatbot تفاعلي يسأل المستخدم عن متطلباته ويقترح وحدات
- **الأسئلة**: الطابق → الميزانية → عدد الغرف → النتائج

### 12. 🗺️ Location Map (خريطة الموقع)
- **الخطوط**: 18,338 → ~19,773
- **الوظيفة**: رحلة تفاعلية من الكرة الأرضية → السعودية → الرياض → المشروع
- **يعتمد على**: MapLibre GL + Esri/NASA imagery + OSRM routing
- **4 مستويات**: Earth → Saudi Arabia → Riyadh → Project landmarks

### 13. 🌐 Arabic Translation Engine (محرك الترجمة)
- **الخطوط**: 17,405 → ~17,886
- **الوظيفة**: ترجمة كل الواجهة من الإنجليزية للعربية والعكس
- **الطريقة**: dictionary-based — يمشي على كل الـ DOM ويبدل النصوص
- **يتضمن**: RTL support + تخزين اللغة في localStorage

---

## 🔗 الملفات الخارجية الحالية

| الملف | الوظيفة |
|-------|---------|
| [`config.js`](file:///g:/Amaken%20Wibsite/earth/config.js) | Supabase URL/Key + إعدادات عامة |
| [`projects.js`](file:///g:/Amaken%20Wibsite/earth/projects.js) | بيانات المشاريع (scenes, floors, models, landmarks) |

---

## ⚠️ المشاكل الرئيسية

### 1. حجم الفايل (Monolith)
- **914 KB** في فايل HTML واحد — ده مش عملي
- الـ browser بيحمل كل الكود حتى لو المستخدم مش محتاج كله
- مفيش code splitting أو lazy loading

### 2. Global Scope Pollution
- كل المتغيرات والـ functions في الـ global scope
- مثال: `currentFrame`, `allUnits`, `is3DMode`, `compareUnitIds` كلهم globals
- ده بيخلي الـ naming conflicts خطر

### 3. Tight Coupling (ترابط شديد)
- الأنظمة بتنادي بعض مباشرة — مفيش interfaces
- مثال: الـ chatbot بيقرأ `allUnits` مباشرة، الـ header بينادي `switchScene()` مباشرة
- أي تغيير في نظام ممكن يكسر نظام تاني

### 4. الـ CSS مدمج (~9,200 سطر)
- كل الـ styles في `<style>` tag واحد
- مفيش CSS files خارجية (ماعدا Google Fonts و MapLibre)

### 5. مفيش Error Boundaries
- الأخطاء في نظام واحد ممكن توقف الموقع كله
- الـ try/catch موجود بس مش منتظم

---

## ✅ النقط الإيجابية

- **التعليقات ممتازة**: كل section فيه شرح واضح بالإنجليزية
- **Fallbacks ذكية**: Supabase → Google Sheets → built-in data
- **Responsive**: معمول لـ desktop + tablet + mobile + landscape
- **Live Updates**: Supabase Realtime مع WebSocket + polling fallback
- **i18n**: دعم كامل للعربية مع RTL
- **Accessibility**: `aria-label`, `role="dialog"`, keyboard navigation
- **Deep linking**: `?unit=<name>` و `?project=<id>` بيشتغلوا

---

## 📐 خطة الـ Refactoring

> [!IMPORTANT]
> الهدف: تكسير الـ script لفايلات مستقلة، كل فايل ≤ 300 سطر، مع الحفاظ على نفس السلوك.

### الهيكل المقترح

```
earth/
├── index.html              (~1,500 سطر: HTML markup فقط + script tags)
├── config.js               (موجود — لا تغيير)
├── projects.js             (موجود — لا تغيير)
├── css/
│   ├── main.css            (~300 سطر: reset, variables, base layout)
│   ├── frame-viewer.css    (~250 سطر: 360° viewer styles)
│   ├── header.css          (~300 سطر: top header + nav)
│   ├── units-panel.css     (~300 سطر: unit detail panel + modal)
│   ├── units-table.css     (~300 سطر: Excel table drawer)
│   ├── search-panel.css    (~300 سطر: unit search sidebar)
│   ├── gallery.css         (~300 سطر: gallery overlay + lightbox)
│   ├── chatbot.css         (~250 سطر: unit finder chatbot)
│   ├── whatsapp.css        (~200 سطر: WhatsApp widget)
│   ├── zoning.css          (~200 سطر: zoning directory)
│   ├── map.css             (~300 سطر: location map journey)
│   ├── hero.css            (~300 سطр: home screen intro)
│   ├── tutorial.css        (~250 سطر: onboarding tour)
│   ├── orientation.css     (~200 سطر: landscape/portrait chooser)
│   └── responsive.css      (~300 سطر: media queries)
├── js/
│   ├── globals.js          (~120 سطر: shared constants, DOM refs, helpers)
│   ├── frame-viewer.js     (~280 سطر: 360° frame loading + rotation)
│   ├── three-overlay.js    (~300 سطر: Three.js scene, models, camera sync)
│   ├── three-mode.js       (~280 سطر: 3D mode toggle, OrbitControls)
│   ├── exploded-view.js    (~170 سطر: exploded floor separation)
│   ├── units-data.js       (~300 سطر: Supabase units fetch + parse)
│   ├── units-colors.js     (~300 سطر: 3D status colors + geometry tidy)
│   ├── unit-panel.js       (~300 سطر: unit detail side panel + media)
│   ├── unit-share.js       (~130 سطر: share URL + deep-link open)
│   ├── live-updates.js     (~170 سطر: Supabase Realtime WebSocket)
│   ├── units-table.js      (~300 سطر: Excel drawer + filters)
│   ├── dual-range.js       (~200 سطر: dual-range slider controller)
│   ├── compare.js          (~280 سطر: compare system)
│   ├── gallery.js          (~300 سطر: gallery + lightbox)
│   ├── chatbot.js          (~300 سطر: unit finder chatbot)
│   ├── whatsapp.js         (~190 سطر: WhatsApp widget)
│   ├── zoning.js           (~180 سطر: zoning directory overlay)
│   ├── i18n.js             (~300 سطر: Arabic dictionary + walker)
│   ├── tutorial.js         (~300 سطر: guided onboarding tour)
│   ├── map.js              (~300 سطر: MapLibre config + journey steps)
│   ├── map-routes.js       (~280 سطر: OSRM routes + destination cards)
│   ├── orientation.js      (~120 سطر: landscape/portrait controller)
│   ├── header-wiring.js    (~210 سطر: header button bindings)
│   ├── search-panel.js     (~300 سطر: unit search panel wiring)
│   ├── hero.js             (~230 سطر: home screen intro)
│   └── scene-switcher.js   (~250 سطر: scene/floor switching logic)
```

### ترتيب التحميل

الـ scripts لازم تتحمل بترتيب معين عشان الـ dependencies:

```
1. config.js + projects.js       ← إعدادات
2. globals.js                    ← المتغيرات المشتركة
3. Three.js (import map module)  ← المكتبة
4. frame-viewer.js               ← الأساس
5. three-overlay.js              ← الطبقة ثلاثية الأبعاد
6. three-mode.js                 ← التبديل
7. exploded-view.js              ← العرض المنفصل
8. units-data.js                 ← البيانات
9. units-colors.js               ← الألوان + الهندسة
10. unit-panel.js + unit-share.js ← التفاصيل
11. scene-switcher.js             ← تبديل المشاهد
12. live-updates.js               ← التحديثات الحية
13. units-table.js + dual-range.js ← الجدول
14. compare.js                    ← المقارنة
15. gallery.js                    ← المعرض
16. chatbot.js                    ← الشات
17. whatsapp.js                   ← واتساب
18. zoning.js                     ← المناطق
19. i18n.js                       ← الترجمة
20. tutorial.js                   ← التعليم
21. map.js + map-routes.js        ← الخريطة
22. orientation.js                ← الاتجاه
23. header-wiring.js              ← الهيدر
24. search-panel.js               ← البحث
25. hero.js                       ← الصفحة الرئيسية
```

### استراتيجية التواصل بين الملفات

بما إن الكود الحالي بيعتمد على **global scope**, هنستخدم:

1. **`window` namespace**: كل فايل يعرض الـ functions اللي محتاجها فايلات تانية على `window`
2. **Custom Events**: للتواصل اللي مش مباشر (زي `document.dispatchEvent`)
3. **Shared object**: `window.KW = {}` — كل module يحط variables مشتركة فيه

> [!NOTE]
> الأسلوب ده أبسط حاجة ومش هيحتاج bundler أو build step. الكود هيفضل يشتغل بنفس الطريقة بالظبط.

---

## 🎯 الخطوة اللي جاية

عايز أبدأ الـ refactoring؟ هنبدأ من:
1. ✂️ فصل الـ CSS لملفات خارجية
2. ✂️ فصل الـ JS لملفات خارجية
3. 🧹 تنظيف `index.html` ليبقى HTML markup فقط مع `<link>` و `<script>` tags

> [!CAUTION]
> كل خطوة هتتعمل بحرص عشان منكسرش حاجة — هنختبر بعد كل فصل.
