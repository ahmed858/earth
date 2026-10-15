(function () {
    /* English -> Arabic dictionary for every static UI label. Dynamic data
       (unit names, prices, sheet values) is intentionally left untouched. */
    const AR = {
        // Top controls / floating buttons
        Tutorial: "الدليل",
        Units: "الوحدات",
        "Hide Units": "إخفاء الوحدات",
        "Show Units": "إظهار الوحدات",
        "Hide Floors": "إخفاء الطوابق",
        "Show Floors": "إظهار الطوابق",
        Gallery: "المعرض",
        // Units table
        "Excel Sheet": "جدول البيانات",
        "Units Table": "جدول الوحدات",
        "Reset Filters": "إعادة ضبط الفلاتر",
        Floor: "الطابق",
        Status: "الحالة",
        "All Floors": "كل الطوابق",
        "All Status": "كل الحالات",
        Available: "متاحة",
        Reserved: "محجوزة",
        Sold: "مباعة",
        // lowercase status values (as stored in the sheet / used on badges)
        available: "متاحة",
        reserved: "محجوزة",
        sold: "مباعة",
        "Price (SAR)": "السعر (ر.س)",
        "Area (m²)": "المساحة (م²)",
        Compare: "مقارنة",
        Unit: "الوحدة",
        Area: "المساحة",
        Price: "السعر",
        Type: "النوع",
        "Loading sheet data...": "جارٍ تحميل البيانات...",
        "No units found. Try changing filters.":
            "لا توجد وحدات مطابقة. جرّب تغيير الفلاتر.",
        "Add to compare": "إضافة إلى المقارنة",
        "Remove from compare": "إزالة من المقارنة",
        // Compare drawer
        "Selected Units": "الوحدات المختارة",
        "Compare Units": "مقارنة الوحدات",
        "No units selected yet. Press the heart beside any unit.":
            "لم تختر أي وحدة بعد. اضغط على القلب بجانب أي وحدة.",
        "Clear Compare": "مسح المقارنة",
        // Unit side menu / modal
        "Unit Details": "تفاصيل الوحدة",
        Details: "التفاصيل",
        Media: "الوسائط",
        Image: "صورة",
        Brochure: "كتيب",
        Tour: "جولة",
        "3D Tour": "جولة ثلاثية الأبعاد",
        "3D View": "عرض ثلاثي الأبعاد",
        Balcony: "الشرفة",
        Plans: "المخططات",
        "Open image": "فتح الصورة",
        "Open brochure": "فتح الكتيب",
        "Open tour": "فتح الجولة",
        "Open 3D": "فتح العرض ثلاثي الأبعاد",
        "Open view": "فتح العرض",
        "Open plans": "فتح المخططات",
        "Floor plan": "المخطط",
        Bedrooms: "غرف النوم",
        "3D images": "صور ثلاثية الأبعاد",
        "⤢ View full size": "⤢ عرض بالحجم الكامل",
        "⤢ View all plans": "⤢ عرض كل المخططات",
        "◂ All plans": "◂ كل المخططات",
        "Click to enlarge": "انقر للتكبير",
        "Click to zoom": "اضغط للتكبير",
        "Contact Sales on WhatsApp": "تواصل مع المبيعات عبر واتساب",
        Availability: "التوفر",
        "Units loaded from Google Sheet": "وحدات محمّلة من Google Sheet",
        "No video loaded for this floor. Check the data-video path.":
            "لا يوجد فيديو لهذا الطابق.",
        "← Main view": "← العرض الرئيسي",
        // Media tabs (emoji + label as one node)
        "🖼️ Image": "🖼️ صورة",
        "📄 Brochure": "📄 كتيب",
        "🎥 Tour": "🎥 جولة",
        "🧊 3D View": "🧊 عرض ثلاثي الأبعاد",
        "🌅 Balcony": "🌅 الشرفة",
        "📐 Plans": "📐 المخططات",
        // Placeholders
        "Search unit name...": "ابحث باسم الوحدة...",
        "Search unit, type, status...": "ابحث عن وحدة أو نوع أو حالة...",
        Any: "أي",
        // Titles / floor names
        Favourites: "المفضّلة",
        "Lower Ground": "بدروم",
        Basement: "القبو",
        Ground: "أرضي",
        First: "الأول",
        Second: "الثاني",
        Third: "الثالث",
        Roof: "السطح",
        "Ground Floor": "الطابق الأرضي",
        "First Floor": "الطابق الأول",
        "Second Floor": "الطابق الثاني",
        "Third Floor": "الطابق الثالث",
        "⌂ Exterior": "⌂ الخارج",
        "☀ Day": "☀ نهارًا",
        "🌙 Night": "🌙 ليلًا",
        "🏢 Ground floor": "🏢 الطابق الأرضي",
        "🏠 Roof": "🏠 السطح",
        "1️⃣ First floor": "1️⃣ الطابق الأول",
        "2️⃣ Second floor": "2️⃣ الطابق الثاني",
        "3️⃣ Third floor": "3️⃣ الطابق الثالث",
        "4️⃣ Fourth floor": "4️⃣ الطابق الرابع",
        "5️⃣ Fifth floor": "5️⃣ الطابق الخامس",
        "6️⃣ Sixth floor": "6️⃣ الطابق السادس",
        "7️⃣ Seventh floor": "7️⃣ الطابق السابع",
        "8️⃣ Eighth floor": "8️⃣ الطابق الثامن",
        "9️⃣ Ninth floor": "9️⃣ الطابق التاسع",
        "🚗 Basement": "🚗 القبو",
        "Back to building": "العودة إلى المبنى",
        // Unit finder chatbot
        "Unit Finder": "باحث الوحدات",
        "Khawalid 20 Assistant": "مساعد خوالد 20",
        "What's your budget?": "ما هي ميزانيتك؟",
        "What type of unit are you looking for?":
            "ما نوع الوحدة التي تبحث عنها؟",
        "Which floor do you prefer?": "أي طابق تفضّل؟",
        "What unit size do you need?": "ما المساحة التي تحتاجها؟",
        "Any Type": "أي نوع",
        "Any Floor": "أي طابق",
        "Under 50 m²": "أقل من 50 م²",
        "Over 200 m²": "أكثر من 200 م²",
        "↺ Start Over": "↺ ابدأ من جديد",
        "Hi! I'll help you find the perfect unit. 🏢":
            "مرحبًا! سأساعدك في إيجاد الوحدة المثالية. 🏢",
        "Price on request": "السعر عند الطلب",
        "I'm still loading the units… give me a moment and tap Start Over.":
            "ما زلت أحمّل الوحدات… أمهلني لحظة ثم اضغط ابدأ من جديد.",
        "Hmm, I couldn't find a unit matching all of that. Let's try again with broader choices.":
            "لم أجد وحدة تطابق كل ذلك. لنجرّب مرة أخرى بخيارات أوسع.",
        // WhatsApp panel
        "Customer Service": "خدمة العملاء",
        "Khawalid 20 · Typically replies instantly": "خوالد 20 · يردّ عادةً فورًا",
        "Copy details": "نسخ التفاصيل",
        "Open WhatsApp": "فتح واتساب",
        // Elegant header
        Home: "الرئيسية",
        Floors: "الطوابق",
        Surrounding: "المحيط",
        "View Mode": "وضع العرض",
        View: "العرض",
        Scene: "المشهد",
        "Exit 3D": "الخروج من ثلاثي الأبعاد",
        "Rotate screen": "تدوير الشاشة",
        "Hide units": "إخفاء الوحدات",
        "Show units": "إظهار الوحدات",
        "Hide floors": "إخفاء الطوابق",
        "Show floors": "إظهار الطوابق",
        "Show or hide the 3D overlay": "إظهار أو إخفاء الطبقة ثلاثية الأبعاد",
        "Click to view units": "اضغط لعرض الوحدات",
        "Choose a floor": "اختر طابقًا",
        Prototype: "النموذج",
        "View in 3D": "اعرض في ٣D",
        "Exploded view": "عرض مفكك",
        Collapse: "إغلاق",
        Spread: "المسافة",
        "Choose a prototype": "اختر نموذجًا",
        "All prototypes": "كل النماذج",
        // Unit Search panel
        "Unit Search": "بحث الوحدات",
        Surface: "المساحة",
        Budget: "الميزانية",
        "Section View": "عرض القطاع",
        Reset: "إعادة الضبط",
        All: "الكل",
        "units — View list": "وحدة — عرض القائمة",
        "No units match your filters.": "لا توجد وحدات مطابقة للفلاتر.",
        // Rooms & features (UNIT_FEATURES — the Unit Search chips and the unit panel)
        "Rooms & features": "الغرف والمميزات",
        Features: "المميزات",
        Facing: "الواجهة",
        North: "شمالية",
        South: "جنوبية",
        East: "شرقية",
        West: "غربية",
        "Master bedrooms": "غرف النوم الرئيسية",
        Bathrooms: "دورات المياه",
        "Dressing rooms": "غرف الملابس",
        "Maid's room": "غرفة خادمة",
        "Maid's bath": "حمام خادمة",
        Kitchen: "مطبخ",
        "Dining room": "صالة طعام",
        "Living room": "غرفة معيشة",
        "Laundry room": "غرفة غسيل",
        "Balcony / Terrace": "شرفة / تراس",
        // Floor / section short labels
        LG: "بدروم",
        G: "أرضي",
        "1st": "الأول",
        "2nd": "الثاني",
        "3rd": "الثالث",
        // Common unit types (from the sheet)
        "1 Bedroom": "غرفة نوم",
        "2 Bedrooms": "غرفتا نوم",
        "3 Bedrooms": "ثلاث غرف نوم",
        Duplex: "دوبلكس",
        Apartment: "شقة",
        "Roof Terrace": "تراس السطح",
        Garden: "حديقة",
        // Location journey (Earth → Saudi Arabia → Riyadh → Khawalid 20)
        Back: "رجوع",
        Earth: "الأرض",
        "Saudi Arabia": "السعودية",
        Riyadh: "الرياض",
        "Khawalid 20": "خوالد 20",
        Residential: "سكني",
        "Explore the project": "استكشف المشروع",
        "Drag to rotate": "اسحب للتدوير",
        "Tap to explore": "اضغط للاستكشاف",
        "Select Saudi Arabia to begin": "اختر السعودية للبدء",
        "Select the highlighted zone": "اختر المنطقة المظلّلة",
        "Choose a project": "اختر المشروع",
        "Tap a place to see distance & time from Khawalid 20":
            "اضغط على أي موقع لمعرفة المسافة والوقت من خوالد 20",
        "Minutes from everywhere": "دقائق من كل مكان",
        "from Panorama Mall": "من بانوراما مول",
        "from King Faisal Specialist Hospital": "من مستشفى الملك فيصل التخصصي",
        "from Kingdom Centre": "من مركز المملكة",
        "from the Diplomatic Quarter": "من حي السفارات",
        "from King Khalid Int’l Airport": "من مطار الملك خالد الدولي",
        "The interactive map could not load on this device.":
            "تعذّر تحميل الخريطة التفاعلية على هذا الجهاز.",
        "Zoom in": "تكبير",
        "Zoom out": "تصغير",
        "Reset view": "إعادة ضبط العرض",
        London: "لندن",
        Istanbul: "إسطنبول",
        Cairo: "القاهرة",
        Dubai: "دبي",
        Mumbai: "مومباي",
        Singapore: "سنغافورة",
        Tokyo: "طوكيو",
        "New York": "نيويورك",
    };

    /* Pattern rules for strings that carry a number. Returns the Arabic
       replacement, or null when the rule does not apply. */
    const RX = [
        [/^(\d+)\s+units?\s+selected$/, (m) => m[1] + " وحدة مختارة"],
        [
            /^(\d+)\s+of\s+(\d+)\s+units?$/,
            (m) => m[1] + " من " + m[2] + " وحدة",
        ],
        [/^(\d+)\s+units?$/, (m) => m[1] + " وحدة"],
        [/^(\d+)\s+apartments?$/, (m) => m[1] + " شقة"],
        [/^Price range:\s*(.*)$/, (m) => "نطاق السعر: " + m[1]],
        [/^Loading\s+(\d+)%$/, (m) => "جارٍ التحميل " + m[1] + "%"],
        [
            /^Great! I found (\d+) units? for you 🎉$/,
            (m) => "رائع! وجدت " + m[1] + " وحدة لك 🎉",
        ],
        [
            /^Showing (\d+) of (\d+) — refine filters to narrow down\.$/,
            (m) => "عرض " + m[1] + " من " + m[2] + " — عدّل الفلاتر لتضييق النتائج.",
        ],
        [
            /^(\d+)\s+min$/,
            (m) => m[1] + (+m[1] >= 3 && +m[1] <= 10 ? " دقائق" : " دقيقة"),
        ],
        [/^([\d.]+)\s+km$/, (m) => m[1] + " كم"],
        // Unit finder budget brackets ("Under 1.25M", "1.5M – 1.75M", "Over 2M")
        [/^Under ([\d.]+)([MK])$/, (m) => "أقل من " + m[1] + (m[2] === "M" ? " مليون" : " ألف")],
        [/^Over ([\d.]+)([MK])$/, (m) => "أكثر من " + m[1] + (m[2] === "M" ? " مليون" : " ألف")],
        [/^([\d.]+)([MK]) – ([\d.]+)\2$/, (m) => m[1] + " – " + m[3] + (m[2] === "M" ? " مليون" : " ألف")],
    ];

    let LANG = "en";
    const cache = new WeakMap(); // text node -> original English
    const attrCache = new WeakMap(); // element -> { attr: original English }
    const ATTRS = ["placeholder", "title", "aria-label"];
    let obs = null;

    const skip = (node) => {
        const el = node.nodeType === 1 ? node : node.parentNode;
        if (!el || !el.closest) return false;
        return !!el.closest(".tut-bubble, .lang-toggle, .intro-hero");
    };

    // Translate a raw string (with surrounding whitespace) or return null.
    function translate(raw) {
        const key = raw.trim();
        if (!key) return null;
        if (AR[key] != null) return raw.replace(key, AR[key]);
        for (const [rx, rep] of RX) {
            const m = key.match(rx);
            if (m) return raw.replace(key, rep(m));
        }
        return null;
    }

    function arNode(n) {
        if (skip(n)) return;
        const cur = n.nodeValue;
        if (!cur || !cur.trim()) return;
        const tr = translate(cur);
        if (tr != null && tr !== cur) {
            cache.set(n, cur);
            n.nodeValue = tr;
        }
    }
    function enNode(n) {
        if (cache.has(n)) {
            const o = cache.get(n);
            if (n.nodeValue !== o) n.nodeValue = o;
        }
    }

    function arAttr(el, a) {
        const cur = el.getAttribute(a);
        if (cur == null) return;
        const tr = translate(cur);
        if (tr != null && tr !== cur) {
            let m = attrCache.get(el);
            if (!m) {
                m = {};
                attrCache.set(el, m);
            }
            m[a] = cur;
            el.setAttribute(a, tr);
        }
    }
    function enAttr(el, a) {
        const m = attrCache.get(el);
        if (m && a in m) el.setAttribute(a, m[a]);
    }

    function walk(root, lang) {
        if (root.nodeType === 3) {
            lang === "ar" ? arNode(root) : enNode(root);
            return;
        }
        if (root.nodeType !== 1) return;
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tag = p.nodeName;
                if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT")
                    return NodeFilter.FILTER_REJECT;
                if (skip(n)) return NodeFilter.FILTER_REJECT;
                if (!n.nodeValue || !n.nodeValue.trim())
                    return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const arr = [];
        while (tw.nextNode()) arr.push(tw.currentNode);
        arr.forEach((n) => (lang === "ar" ? arNode(n) : enNode(n)));

        const sel = "[" + ATTRS.join("],[") + "]";
        const els = [];
        if (root.matches && root.matches(sel)) els.push(root);
        if (root.querySelectorAll)
            root.querySelectorAll(sel).forEach((e) => els.push(e));
        els.forEach((el) => {
            if (el.closest(".tut-bubble, .lang-toggle, .intro-hero")) return;
            ATTRS.forEach(
                (a) =>
                    el.hasAttribute(a) &&
                    (lang === "ar" ? arAttr(el, a) : enAttr(el, a))
            );
        });
    }

    function onMut(muts) {
        if (LANG !== "ar" || !obs) return;
        obs.disconnect();
        for (const m of muts) {
            if (m.type === "characterData") arNode(m.target);
            else if (m.type === "childList")
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) walk(node, "ar");
                    else if (node.nodeType === 3) arNode(node);
                });
        }
        obs.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true,
        });
    }
    function startObs() {
        if (obs) return;
        obs = new MutationObserver(onMut);
        obs.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true,
        });
    }
    function stopObs() {
        if (obs) {
            obs.disconnect();
            obs = null;
        }
    }

    function updateBtn() {
        const lbl = document.getElementById("langToggleLabel");
        if (lbl) lbl.textContent = LANG === "ar" ? "English" : "العربية";
    }

    function apply(lang) {
        LANG = lang;
        stopObs();
        walk(document.body, lang);
        document.documentElement.setAttribute("lang", lang);
        document.body.classList.toggle("lang-ar", lang === "ar");
        if (lang === "ar") startObs();
        updateBtn();
        document.dispatchEvent(
            new CustomEvent("i18n:change", { detail: { lang } })
        );
    }

    function setLang(lang) {
        try {
            localStorage.setItem("siteLang", lang);
        } catch (e) { }
        apply(lang);
    }

    window.i18n = {
        get lang() {
            return LANG;
        },
        t(en) {
            return LANG === "ar" && AR[en] != null ? AR[en] : en;
        },
        add(entries) {
            Object.assign(AR, entries || {});
        },
        setLang,
        toggle() {
            setLang(LANG === "ar" ? "en" : "ar");
        },
    };

    document
        .getElementById("langToggle")
        ?.addEventListener("click", () => window.i18n.toggle());

    // The projects' own Arabic (projects.js): every project's name (the Riyadh step shows them
    // all), and this project's title, map hint, floors and proximity strip.
    (function () {
        const all = window.MAAZAR_PROJECTS || {}, P = window.MAAZAR_PROJECT;
        const add = {};
        Object.keys(all).forEach(function (id) {
            const p = all[id];
            if (p.name && p.name_ar) {
                add[p.name] = p.name_ar;
                add[p.name + " Assistant"] = "مساعد " + p.name_ar;
                add[p.name + " · Typically replies instantly"] = p.name_ar + " · يردّ عادةً فورًا";
            }
            if (p.title && p.title_ar) add[p.title] = p.title_ar;
        });
        if (P) {
            if (P.hint && P.hint_ar) add[P.hint] = P.hint_ar;
            (P.prox || []).forEach(function (x) { if (x.en && x.ar) add[x.en] = x.ar; });
            (P.floors || []).forEach(function (f) {
                if (f.name && f.ar) add[f.name] = f.ar;
                if (f.label && f.ar && add[f.label] == null) add[f.label] = f.ar;
            });
        }
        Object.keys(add).forEach(function (k) { if (AR[k] == null) AR[k] = add[k]; });
    })();

    let saved = null;
    try {
        saved = localStorage.getItem("siteLang");
    } catch (e) { }
    if (saved === "ar") apply("ar");
    else updateBtn();
})();