(function () {
    const launcher = document.getElementById("ufLauncher");
    const win = document.getElementById("ufWindow");
    const closeBtn = document.getElementById("ufClose");
    const winBody = document.getElementById("ufBody");
    if (!launcher || !win || !winBody) return;

    // This project's floors (projects.js), bottom-up.
    const PROJECT_FLOORS = (window.MAAZAR_PROJECT && window.MAAZAR_PROJECT.floors) || [];
    const FLOOR_LABELS = PROJECT_FLOORS.length ? Object.fromEntries(PROJECT_FLOORS.map((f) => [String(f.key), f.name || f.label || String(f.key)])) : { LG: "Basement", GF: "Ground", 1: "First", 2: "Second", 3: "Third", RF: "Roof" };
    const FLOOR_ORDER = PROJECT_FLOORS.length ? PROJECT_FLOORS.map((f) => String(f.key)) : ["LG", "GF", "1", "2", "3", "RF"];

    // Budget brackets follow the prices on offer: cut at round figures
    // between the cheapest and the dearest unit, five brackets at most.
    // No prices in the table (or all the same) → no brackets, and the
    // budget question is skipped.
    const shortSar = (v) => (v >= 1e6 ? +(v / 1e6).toFixed(2) + "M" : Math.round(v / 1e3) + "K");
    function budgets() {
        const prices = getUnits().filter((u) => u.status !== "sold").map((u) => Number(u.priceRaw) || 0).filter((p) => p > 0);
        if (!prices.length) return [];
        const lo = Math.min(...prices), hi = Math.max(...prices);
        let cuts = [];
        for (const step of [25e3, 50e3, 100e3, 250e3, 500e3, 1e6, 2.5e6, 5e6, 10e6, 25e6, 50e6, 100e6]) {
            cuts = [];
            for (let c = Math.floor(lo / step) * step + step; c < hi; c += step) cuts.push(c);
            if (cuts.length <= 4) break;
        }
        if (!cuts.length) return [];
        return [0, ...cuts].map((min, i) => {
            const max = i < cuts.length ? cuts[i] : Infinity;
            const label = !i ? "Under " + shortSar(max) : max === Infinity ? "Over " + shortSar(min) : shortSar(min) + " – " + shortSar(max);
            return { label, min, max };
        });
    }
    const AREAS = [
        { label: "Under 50 m²", min: 0, max: 50 },
        { label: "50 – 100 m²", min: 50, max: 100 },
        { label: "100 – 200 m²", min: 100, max: 200 },
        { label: "Over 200 m²", min: 200, max: Infinity },
    ];

    // Pull the live units list loaded from Supabase (global `allUnits`).
    function getUnits() {
        try {
            return typeof allUnits !== "undefined" && Array.isArray(allUnits) ? allUnits : [];
        } catch (_) {
            return [];
        }
    }

    function areaNum(u) {
        const m = String(u && u.area ? u.area : "").match(/[\d.]+/);
        return m ? parseFloat(m[0]) : NaN;
    }

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Does a unit satisfy the chosen filters so far? (sold units are never recommended)
    function unitMatches(u, s) {
        if (u.status === "sold") return false;
        if (s.budget) {
            const p = Number(u.priceRaw) || 0;
            if (p > 0 && !(p >= s.budget.min && p < s.budget.max)) return false;
        }
        if (s.type && s.type !== "__any") {
            if (String(u.type || "").trim().toLowerCase() !== String(s.type).toLowerCase()) return false;
        }
        if (s.floor && s.floor !== "__any") {
            if (u.floor !== s.floor) return false;
        }
        if (s.area) {
            const a = areaNum(u);
            if (!(a >= s.area.min && a < s.area.max)) return false;
        }
        return true;
    }

    const STEPS = [
        {
            key: "budget",
            q: "What's your budget?",
            options: () =>
                budgets().map((b) => ({
                    label: b.label,
                    value: b,
                    // unknown-price units (0) match any budget so we never hide inventory
                    pred: (u) => {
                        const p = Number(u.priceRaw) || 0;
                        return p === 0 || (p >= b.min && p < b.max);
                    },
                })),
        },
        {
            key: "type",
            q: "What type of unit are you looking for?",
            options: () => {
                const types = [
                    ...new Set(
                        getUnits()
                            .filter((u) => u.status !== "sold")
                            .map((u) => String(u.type || "").trim())
                            .filter((t) => t && t !== "—"),
                    ),
                ].sort();
                return [
                    { label: "Any Type", value: "__any", pred: () => true },
                    ...types.map((t) => ({
                        label: t,
                        value: t,
                        pred: (u) => String(u.type || "").trim().toLowerCase() === t.toLowerCase(),
                    })),
                ];
            },
        },
        {
            key: "floor",
            q: "Which floor do you prefer?",
            options: () => {
                const present = new Set(getUnits().filter((u) => u.status !== "sold").map((u) => u.floor));
                const floors = FLOOR_ORDER.filter((f) => present.has(f));
                return [
                    { label: "Any Floor", value: "__any", pred: () => true },
                    ...floors.map((f) => ({
                        label: FLOOR_LABELS[f] || f,
                        value: f,
                        pred: (u) => u.floor === f,
                    })),
                ];
            },
        },
        {
            key: "area",
            q: "What unit size do you need?",
            options: () =>
                AREAS.map((a) => ({
                    label: a.label,
                    value: a,
                    pred: (u) => {
                        const n = areaNum(u);
                        return n >= a.min && n < a.max;
                    },
                })),
        },
    ];

    let stepIndex = 0;
    let sel = { budget: null, type: null, floor: null, area: null };

    function scrollBottom() {
        requestAnimationFrame(() => {
            winBody.scrollTop = winBody.scrollHeight;
        });
    }

    function addBot(text) {
        const el = document.createElement("div");
        el.className = "uf-msg uf-bot";
        el.textContent = text;
        winBody.appendChild(el);
        scrollBottom();
        return el;
    }

    function addUser(text) {
        const el = document.createElement("div");
        el.className = "uf-msg uf-user";
        el.textContent = text;
        winBody.appendChild(el);
        scrollBottom();
    }

    function askStep() {
        const step = STEPS[stepIndex];
        const options = step.options();
        if (!options.length) { // nothing to choose from: on to the next question
            stepIndex++;
            return stepIndex < STEPS.length ? askStep() : showResults();
        }
        addBot(step.q);

        const all = getUnits();
        const base = all.filter((u) => unitMatches(u, sel)); // applies previously-chosen filters only
        const row = document.createElement("div");
        row.className = "uf-chips";

        options.forEach((o) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "uf-chip";
            btn.textContent = o.label;
            const count = base.filter(o.pred).length;
            if (all.length && count === 0 && o.value !== "__any") {
                btn.disabled = true;
                btn.classList.add("uf-chip-disabled");
            } else {
                btn.addEventListener("click", () => chooseOption(step, o, row));
            }
            row.appendChild(btn);
        });

        winBody.appendChild(row);
        scrollBottom();
    }

    function chooseOption(step, o, row) {
        sel[step.key] = o.value;
        addUser(o.label);
        row.querySelectorAll(".uf-chip").forEach((b) => {
            b.disabled = true;
            b.classList.add("uf-chip-locked");
        });
        stepIndex++;
        if (stepIndex < STEPS.length) {
            setTimeout(askStep, 320);
        } else {
            setTimeout(showResults, 380);
        }
    }

    function resultCard(u) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "uf-card";

        const floorLabel = FLOOR_LABELS[u.floor] || u.floorRaw || u.floor || "—";
        const priceText = Number(u.priceRaw) > 0 ? esc(u.price) : "Price on request";
        const img = u.imgSource
            ? '<div class="uf-card-img"><img src="' +
            esc(u.imgSource) +
            '" alt="" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'uf-noimg\')"></div>'
            : '<div class="uf-card-img uf-noimg"></div>';

        card.innerHTML =
            img +
            '<div class="uf-card-body">' +
            '<div class="uf-card-name">' + esc(u.name) + "</div>" +
            '<div class="uf-card-meta">' +
            '<span class="uf-tag">🏷️ ' + esc(u.type || "—") + "</span>" +
            '<span class="uf-tag">☰ ' + esc(floorLabel) + "</span>" +
            "</div>" +
            '<div class="uf-card-meta">' +
            '<span class="uf-tag uf-muted">⛶ ' + esc(u.area || "—") + "</span>" +
            "</div>" +
            '<div class="uf-card-price">' + priceText + "</div>" +
            "</div>" +
            '<div class="uf-card-arrow">›</div>';

        card.addEventListener("click", () => {
            if (typeof openUnit === "function") openUnit(u);
            else if (typeof openUnitSideMenu === "function") openUnitSideMenu(u);
        });
        return card;
    }

    function addStartOver() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "uf-startover";
        btn.textContent = "↺ Start Over";
        btn.addEventListener("click", resetChat);
        winBody.appendChild(btn);
        scrollBottom();
    }

    function showResults() {
        const all = getUnits();
        if (!all.length) {
            addBot("I'm still loading the units… give me a moment and tap Start Over.");
            addStartOver();
            return;
        }

        const units = all.filter((u) => unitMatches(u, sel));
        units.sort((a, b) => {
            const sa = a.status === "available" ? 0 : 1;
            const sb = b.status === "available" ? 0 : 1;
            if (sa !== sb) return sa - sb;
            const pa = Number(a.priceRaw) || Infinity;
            const pb = Number(b.priceRaw) || Infinity;
            return pa - pb;
        });

        if (!units.length) {
            addBot("Hmm, I couldn't find a unit matching all of that. Let's try again with broader choices.");
            addStartOver();
            return;
        }

        addBot("Great! I found " + units.length + " unit" + (units.length > 1 ? "s" : "") + " for you 🎉");
        const list = document.createElement("div");
        list.className = "uf-results";
        units.slice(0, 40).forEach((u) => list.appendChild(resultCard(u)));
        winBody.appendChild(list);
        addStartOver();
        scrollBottom();
    }

    function resetChat() {
        stepIndex = 0;
        sel = { budget: null, type: null, floor: null, area: null };
        winBody.innerHTML = "";
        addBot("Hi! I'll help you find the perfect unit. 🏢");
        setTimeout(askStep, 380);
    }

    function toggleWindow(open) {
        win.classList.toggle("uf-open", open);
        launcher.classList.toggle("uf-hidden", open);
        if (open && !winBody.childElementCount) resetChat();
    }

    launcher.addEventListener("click", () => toggleWindow(true));
    closeBtn.addEventListener("click", () => toggleWindow(false));
})();