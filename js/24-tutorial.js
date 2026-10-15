(function () {
    const launcher = document.getElementById("tutLauncher");
    const catcher = document.getElementById("tutCatcher");
    const hi = document.getElementById("tutHighlight");
    const bubble = document.getElementById("tutBubble");
    const arrow = document.getElementById("tutArrow");
    const iconEl = document.getElementById("tutIcon");
    const titleEl = document.getElementById("tutTitle");
    const descEl = document.getElementById("tutDesc");
    const dotsEl = document.getElementById("tutDots");
    const backBtn = document.getElementById("tutBack");
    const nextBtn = document.getElementById("tutNext");
    const closeBtn = document.getElementById("tutClose");
    if (!launcher || !bubble) return;

    /* The price/area filters and the favourite hearts live inside the units
       table drawer, so the tour opens it for those steps and closes it again
       afterwards (only if the tour was the one that opened it). On mobile the
       drawer is permanently docked, so these become harmless no-ops. */
    // The tour now demos the Unit Search panel (+ its results list),
    // not the old units-table drawer.
    let panelOpenedByTour = false;
    let listOpenedByTour = false;
    function openDrawer(step) {
        let changed = false;
        const panel = document.getElementById("unitSearchPanel");
        if (panel && !panel.classList.contains("show")) {
            if (typeof window.refreshUnitSearchPanel === "function")
                window.refreshUnitSearchPanel();
            panel.classList.add("show");
            panelOpenedByTour = true;
            changed = true;
        }
        if (step && step.list) {
            const list = document.getElementById("unitListPanel");
            if (list && !list.classList.contains("show")) {
                const v = document.getElementById("uspView");
                if (v) v.click();
                else list.classList.add("show");
                listOpenedByTour = true;
                changed = true;
            }
        }
        return changed;
    }
    function closeDrawerIfOurs() {
        let changed = false;
        if (listOpenedByTour) {
            document.getElementById("unitListPanel")?.classList.remove("show");
            listOpenedByTour = false;
            changed = true;
        }
        if (panelOpenedByTour) {
            document.getElementById("unitSearchPanel")?.classList.remove("show");
            panelOpenedByTour = false;
            changed = true;
        }
        return changed;
    }

    /* Each step: icon, title, desc.
       target  -> selector or [selectors]; first usable one is highlighted.
       place   -> preferred bubble side ("bottom" | "top" | "left" | "right").
       center  -> show a centred bubble with no spotlight.
       drawer  -> open the units table drawer before showing this step. */
    const STEPS = [
        {
            icon: "👋",
            center: true,
            title: "Welcome!",
            desc: "Take a quick tour to learn how to explore the building and find the apartment that's right for you.",
            titleAr: "مرحبًا بك!",
            descAr:
                "خذ جولة سريعة لتتعلّم كيف تستكشف المبنى وتجد الشقة المناسبة لك.",
        },
        {
            icon: "🔄",
            target: "#frameViewer",
            center: true,
            title: "Explore in 360°",
            desc: "Click and drag — or swipe — left or right to rotate the building and see it from every angle. Click a highlighted floor on the building to see its apartments.",
            titleAr: "استكشف بزاوية 360°",
            descAr:
                "اضغط واسحب — أو مرّر — يمينًا أو يسارًا لتدوير المبنى ورؤيته من كل الزوايا. اضغط على أي طابق مميّز على المبنى لعرض شققه.",
        },
        {
            icon: "🏢",
            target: ["#ochFloorsBtn", "#floorMenu"],
            place: "bottom",
            title: "Pick a prototype",
            desc: "Choose Admin, Commercial or Clinic to highlight only that kind of unit on the building. Floors are in Unit Search.",
            titleAr: "اختر نموذجًا",
            descAr:
                "اختر إداري أو تجاري أو عيادة لإبراز هذا النوع من الوحدات فقط على المبنى. الطوابق موجودة في بحث الوحدات.",
        },
        {
            icon: "👁️",
            target: ["#ochEye", "#hideUnitsToggle"],
            place: "bottom",
            title: "Show or hide floors",
            desc: "Turn the coloured floor overlays on the building on or off whenever you want a cleaner view.",
            titleAr: "إظهار أو إخفاء الطوابق",
            descAr:
                "شغّل أو أوقف طبقات الطوابق الملوّنة على المبنى وقتما تريد رؤية أوضح.",
        },
        {
            icon: "🔎",
            target: ["#unitSearchPanel", "#ochUnits"],
            place: "right",
            drawer: true,
            title: "Find your unit",
            desc: "Open Unit Search to explore every apartment. It's your one place to filter by surface, availability, type, floor and budget.",
            titleAr: "ابحث عن وحدتك",
            descAr:
                "افتح «بحث الوحدات» لاستكشاف كل الشقق. إنه مكانك الوحيد للتصفية حسب المساحة والتوفر والنوع والطابق والميزانية.",
        },
        {
            icon: "🎚️",
            target: [".usp-body", "#unitSearchPanel"],
            place: "right",
            drawer: true,
            title: "Filter your search",
            desc: "Drag the surface and budget sliders and tap availability, type or floor to narrow the results. Use Section View to jump to a floor on the building.",
            titleAr: "صفِّ بحثك",
            descAr:
                "اسحب شريطَي المساحة والميزانية واضغط على التوفر أو النوع أو الطابق لتضييق النتائج. استخدم «عرض القطاع» للانتقال إلى طابق على المبنى.",
        },
        {
            icon: "❤️",
            target: ["#unitListPanel", "#ochCompare"],
            place: "right",
            drawer: true,
            list: true,
            title: "Browse & compare",
            desc: "Tap “View list” to see matching units beside the filters. Open any unit for details, or tap its heart to add it to Compare in the top bar.",
            titleAr: "تصفّح وقارن",
            descAr:
                "اضغط «عرض القائمة» لرؤية الوحدات المطابقة بجانب الفلاتر. افتح أي وحدة للتفاصيل، أو اضغط القلب لإضافتها إلى «مقارنة» في الشريط العلوي.",
        },
        {
            icon: "🖼️",
            target: ["#ochGallery", "#galleryToggle", "#tableHeadGallery"],
            place: "right",
            title: "Photo gallery",
            desc: "Open the gallery to browse high-quality photos of the building, the amenities and the finishes.",
            titleAr: "معرض الصور",
            descAr:
                "افتح المعرض لتصفّح صور عالية الجودة للمبنى والمرافق والتشطيبات.",
        },
        {
            icon: "💬",
            target: "#waLauncher",
            place: "left",
            title: "Talk to our sales team",
            desc: "Got a question? Chat with us instantly on WhatsApp for prices, availability and viewings.",
            titleAr: "تحدّث مع فريق المبيعات",
            descAr:
                "لديك سؤال؟ تواصل معنا فورًا عبر واتساب لمعرفة الأسعار والتوفر ومواعيد المعاينة.",
        },
        {
            icon: "🤖",
            target: "#ufLauncher",
            place: "top",
            title: "Smart unit finder",
            desc: "Tell the assistant your budget and what you're looking for — it will suggest the apartments that match you best.",
            titleAr: "الباحث الذكي عن الوحدات",
            descAr:
                "أخبر المساعد بميزانيتك وما تبحث عنه — وسيقترح عليك الشقق الأنسب لك.",
        },
        {
            icon: "🎉",
            center: true,
            title: "You're all set!",
            desc: "Explore freely and find your dream home. You can replay this tour anytime from the “?” button at the top-left.",
            titleAr: "أنت جاهز الآن!",
            descAr:
                "استكشف بحرّية واعثر على منزل أحلامك. يمكنك إعادة هذه الجولة في أي وقت من زر «؟» في أعلى اليسار.",
        },
    ];

    // Current tour language, mirrored from the global translation engine.
    const isAr = () => !!(window.i18n && window.i18n.lang === "ar");
    const T = {
        back: () => (isAr() ? "السابق" : "Back"),
        next: () => (isAr() ? "التالي" : "Next"),
        finish: () => (isAr() ? "إنهاء" : "Finish"),
    };

    let idx = 0;
    let active = false;

    function asList(sel) {
        return Array.isArray(sel) ? sel : [sel];
    }

    /* Exists, is displayed and has a real size (ignores occlusion). Used to
       decide whether a step is worth showing at all. */
    function existsVisible(sel) {
        if (!sel) return false;
        return asList(sel).some((s) => {
            const el = document.querySelector(s);
            if (!el) return false;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            const r = el.getBoundingClientRect();
            return r.width >= 4 && r.height >= 4;
        });
    }

    /* The first target that is on-screen AND not covered by another element.
       Returns null if every candidate is hidden or occluded. */
    function firstUsable(sel) {
        if (!sel) return null;
        for (const s of asList(sel)) {
            const el = document.querySelector(s);
            if (el && isUsable(el)) return el;
        }
        return null;
    }

    function isUsable(el) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth)
            return false;
        const cx = Math.min(Math.max(r.left + r.width / 2, 2), innerWidth - 2);
        const cy = Math.min(Math.max(r.top + r.height / 2, 2), innerHeight - 2);
        const prevC = catcher.style.pointerEvents;
        const prevB = bubble.style.pointerEvents;
        catcher.style.pointerEvents = "none";
        bubble.style.pointerEvents = "none";
        const top = document.elementFromPoint(cx, cy);
        catcher.style.pointerEvents = prevC;
        bubble.style.pointerEvents = prevB;
        if (!top) return true;
        return el.contains(top) || top.contains(el) || top === el;
    }

    function resolvable(step) {
        if (!step) return false;
        if (step.center || !step.target) return true;
        if (step.drawer) return true; // opening the drawer will reveal it
        return existsVisible(step.target);
    }

    function buildDots() {
        dotsEl.innerHTML = "";
        STEPS.forEach((_, i) => {
            const d = document.createElement("span");
            d.className = "tut-dot" + (i === idx ? " active" : "");
            dotsEl.appendChild(d);
        });
    }

    function render() {
        const step = STEPS[idx];

        // Sync the Unit Search panel/list to what this step needs.
        const changed = step.drawer ? openDrawer(step) : closeDrawerIfOurs();

        const ar = isAr();
        iconEl.textContent = step.icon || "•";
        titleEl.textContent = (ar ? step.titleAr : step.title) || "";
        descEl.textContent = (ar ? step.descAr : step.desc) || "";
        buildDots();
        backBtn.style.visibility = idx === 0 ? "hidden" : "visible";
        backBtn.textContent = T.back();
        nextBtn.textContent =
            idx === STEPS.length - 1 ? T.finish() : T.next();

        // Fade the spotlight out while the drawer animates, then reposition.
        if (changed) {
            hi.classList.remove("show");
            bubble.classList.remove("show");
            setTimeout(() => active && positionFor(step), 430);
        } else {
            requestAnimationFrame(() => active && positionFor(step));
        }
    }

    function positionFor(step) {
        const el = step.center ? null : firstUsable(step.target);
        const isCenter = step.center || !el;

        catcher.classList.add("show");
        catcher.classList.toggle("center", isCenter);
        bubble.classList.add("show");

        if (isCenter) {
            hi.classList.remove("show");
            arrow.style.display = "none";
            const bw = bubble.offsetWidth;
            const bh = bubble.offsetHeight;
            bubble.style.left = Math.round((innerWidth - bw) / 2) + "px";
            bubble.style.top = Math.round((innerHeight - bh) / 2) + "px";
            return;
        }

        const r = el.getBoundingClientRect();
        const pad = 8;
        hi.classList.add("show");
        hi.style.left = r.left - pad + "px";
        hi.style.top = r.top - pad + "px";
        hi.style.width = r.width + pad * 2 + "px";
        hi.style.height = r.height + pad * 2 + "px";

        placeBubble(r, step.place);
    }

    function placeBubble(r, prefer) {
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;
        const M = 16;
        const gap = 14;
        const vw = innerWidth;
        const vh = innerHeight;
        const space = {
            bottom: vh - r.bottom,
            top: r.top,
            right: vw - r.right,
            left: r.left,
        };
        const order = [prefer, "bottom", "top", "right", "left"].filter(Boolean);
        const fits = (p) =>
            (p === "bottom" && space.bottom >= bh + gap) ||
            (p === "top" && space.top >= bh + gap) ||
            (p === "right" && space.right >= bw + gap) ||
            (p === "left" && space.left >= bw + gap);
        const place = order.find(fits) || "bottom";

        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let left;
        let top;
        if (place === "bottom") {
            top = r.bottom + gap;
            left = cx - bw / 2;
        } else if (place === "top") {
            top = r.top - gap - bh;
            left = cx - bw / 2;
        } else if (place === "right") {
            left = r.right + gap;
            top = cy - bh / 2;
        } else {
            left = r.left - gap - bw;
            top = cy - bh / 2;
        }

        left = Math.min(Math.max(left, M), vw - bw - M);
        top = Math.min(Math.max(top, M), vh - bh - M);
        bubble.style.left = Math.round(left) + "px";
        bubble.style.top = Math.round(top) + "px";

        // Point the little arrow back at the target.
        const A = 7;
        arrow.style.display = "block";
        arrow.style.left = "";
        arrow.style.top = "";
        if (place === "bottom" || place === "top") {
            let ax = Math.min(Math.max(cx - left, 18), bw - 18);
            arrow.style.left = ax - A + "px";
            arrow.style.top = (place === "bottom" ? -A : bh - A) + "px";
        } else {
            let ay = Math.min(Math.max(cy - top, 18), bh - 18);
            arrow.style.top = ay - A + "px";
            arrow.style.left = (place === "right" ? -A : bw - A) + "px";
        }
    }

    // Move to step n, skipping any steps that can't be shown right now.
    function go(n) {
        const dir = n >= idx ? 1 : -1;
        let i = n;
        while (i >= 0 && i < STEPS.length && !resolvable(STEPS[i])) i += dir;
        if (i < 0 || i >= STEPS.length) {
            stop();
            return;
        }
        idx = i;
        render();
    }

    function start() {
        if (active) return;
        active = true;
        idx = 0;
        launcher.classList.remove("tut-pulse");
        try {
            localStorage.setItem("tutSeen", "1");
        } catch (e) { }
        render();
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", onResize);
    }

    function stop() {
        active = false;
        closeDrawerIfOurs();
        catcher.classList.remove("show", "center");
        hi.classList.remove("show");
        bubble.classList.remove("show");
        arrow.style.display = "none";
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
    }

    function onKey(e) {
        if (!active) return;
        if (e.key === "Escape") stop();
        else if (e.key === "ArrowRight") go(idx + 1);
        else if (e.key === "ArrowLeft") go(idx - 1);
    }

    let resizeT;
    function onResize() {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => active && positionFor(STEPS[idx]), 120);
    }

    launcher.addEventListener("click", start);
    closeBtn.addEventListener("click", stop);
    backBtn.addEventListener("click", () => go(idx - 1));
    nextBtn.addEventListener("click", () =>
        idx >= STEPS.length - 1 ? stop() : go(idx + 1)
    );
    // Block clicks on the dimmed page; navigation is via the bubble buttons.
    catcher.addEventListener("click", (e) => e.stopPropagation());

    // Re-render the open tour when the site language is switched.
    document.addEventListener("i18n:change", () => {
        if (active) render();
    });

    // Gently pulse the button on a visitor's first ever load.
    try {
        if (!localStorage.getItem("tutSeen")) launcher.classList.add("tut-pulse");
    } catch (e) { }
})();