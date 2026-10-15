(function () {
var panel = document.getElementById("unitSearchPanel");
var listPanel = document.getElementById("unitListPanel");
if (!panel) return;

// Keep panel gestures away from the panorama drag handlers.
["touchstart", "mousedown", "pointerdown"].forEach(function (evt) {
    panel.addEventListener(evt, function (e) { e.stopPropagation(); }, { passive: true });
    if (listPanel) listPanel.addEventListener(evt, function (e) { e.stopPropagation(); }, { passive: true });
});

function byId(id) { return document.getElementById(id); }
function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// [normalizedFloorKey, shortLabel, sceneKey]
// Al Maazar: basement (parking), ground, first, second, roof. No
// per-floor orbits are rendered yet, so every floor stays on the
// exterior scene; swap the third column once floor scenes exist.
// …this project's floors (projects.js), bottom-up.
var FLOORS = ((window.MAAZAR_PROJECT && window.MAAZAR_PROJECT.floors) || []).map(function (f) { return [String(f.key), f.label || f.name || String(f.key), "exterior"]; });
if (!FLOORS.length) FLOORS = [
    ["LG", "Basement", "exterior"],
    ["GF", "Ground", "exterior"],
    ["1", "1st", "exterior"],
    ["2", "2nd", "exterior"],
    ["RF", "Roof", "exterior"],
];
function sceneForFloor(key) {
    for (var i = 0; i < FLOORS.length; i++) if (FLOORS[i][0] === key) return FLOORS[i][2];
    return "exterior";
}
// Where a floor leads from the CURRENT scene. On a floor plan (a still scene) a floor with a
// plan of its own opens that plan, any other floor — or "all" — goes back to the building view;
// on the building the chips stay filters (sceneForFloor: the exterior orbit).
function sceneForFloorNow(key) {
    var S = (typeof SCENES !== "undefined") ? SCENES : null;
    var cur = S && typeof currentScene !== "undefined" ? S[currentScene] : null;
    var plan = key && S && typeof floorSceneFor === "function" ? floorSceneFor(key) : "";
    if (cur && cur.still) {
        return plan || (typeof window.buildingScene === "function" ? window.buildingScene() : "exterior");
    }
    // A plan that says so (projects.js scenes.<x>.openFromFilter — the basement, which has no volume on the
    // building to click) opens from the building view too; the other floors' chips stay filters there.
    if (plan && S[plan] && S[plan].openFromFilter) return plan;
    return key === "" ? "exterior" : sceneForFloor(key);
}

function TF() { return (typeof TABLE_FILTERS !== "undefined") ? TABLE_FILTERS : {}; }
function UNITS() { return (typeof allUnits !== "undefined" && Array.isArray(allUnits)) ? allUnits : []; }
function areaOf(u) {
    if (typeof getAreaNumber === "function") return getAreaNumber(u);
    return Number(String(u.area || "").replace(/[^\d.]/g, "")) || 0;
}
function money(v) {
    if (typeof formatPriceShort === "function") return formatPriceShort(v);
    v = Number(v) || 0;
    if (v >= 1e6) return (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M";
    if (v >= 1e3) return Math.round(v / 1e3) + "K";
    return String(Math.round(v));
}
function filtered() {
    return (typeof getFilteredTableUnits === "function") ? getFilteredTableUnits() : UNITS();
}

/* ---------- prototype scope ----------
   The prototype (type) filter is the outer scope: every other filter —
   floors, availability, surface, budget — only ranges over the units of
   the selected prototype. No prototype selected = the whole project. */
function scopeUnits() {
    var types = TF().types || [];
    if (!types.length) return UNITS();
    return UNITS().filter(function (u) {
        return types.indexOf(String(u.type || "").trim()) !== -1;
    });
}

/* Called whenever the prototype changes: drop selections the new scope
   can't honour, forget the old surface/budget range, and rebuild the
   chips + slider bounds around the new set. */
function rescope() {
    var tf = TF(), scope = scopeUnits();
    var floorIn = {}, statusIn = {};
    scope.forEach(function (u) {
        floorIn[u.floor] = true;
        statusIn[String(u.status || "")] = true;
    });
    if (tf.floor && !floorIn[tf.floor]) { tf.floor = ""; goScene("exterior"); }
    if (tf.statuses && tf.statuses.length) {
        tf.statuses = tf.statuses.filter(function (st) { return statusIn[st]; });
    }
    // The new prototype has its own min/max, so the sliders start wide open — and its own
    // rooms & features chips, so that selection starts empty too.
    tf.minArea = ""; tf.maxArea = ""; tf.minPrice = ""; tf.maxPrice = "";
    tf.features = {};
    buildDynamic();
}

var boundsReady = false, chipsSig = "", scopeSig = "", raf = null;

// Heavy work (3D repaint + optional table rebuild) coalesced to one frame.
function commitHeavy() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
        raf = null;
        if (typeof applyThreeUnitsFromSheet === "function") applyThreeUnitsFromSheet();
        if (typeof renderUnitsTable === "function") renderUnitsTable(); // self-guards when drawer closed
    });
}
function applyFilters() { syncStates(); updateCount(); commitHeavy(); }
function updateCount() {
    var n = filtered().length;
    var a = byId("uspCount"); if (a) a.textContent = n;
    var b = byId("ulpCount"); if (b) b.textContent = n;
}

/* ---------- dual-range controllers (start + end thumbs) ---------- */
function setupDual(cfg) {
    function pct(inp) {
        var mn = +inp.min, mx = +inp.max;
        return mx > mn ? ((+inp.value - mn) / (mx - mn)) * 100 : 0;
    }
    function refreshUI() {
        cfg.fill.style.left = pct(cfg.minI) + "%";
        cfg.fill.style.right = (100 - pct(cfg.maxI)) + "%";
        if (cfg.minV) cfg.minV.textContent = cfg.fmt(+cfg.minI.value);
        if (cfg.maxV) cfg.maxV.textContent = cfg.fmt(+cfg.maxI.value);
    }
    function onMin(kind) {
        if (+cfg.minI.value > +cfg.maxI.value) cfg.minI.value = cfg.maxI.value;
        TF()[cfg.keyMin] = (+cfg.minI.value <= +cfg.minI.min) ? "" : String(cfg.minI.value);
        refreshUI();
        if (kind === "change") applyFilters(); else updateCount();
    }
    function onMax(kind) {
        if (+cfg.maxI.value < +cfg.minI.value) cfg.maxI.value = cfg.minI.value;
        TF()[cfg.keyMax] = (+cfg.maxI.value >= +cfg.maxI.max) ? "" : String(cfg.maxI.value);
        refreshUI();
        if (kind === "change") applyFilters(); else updateCount();
    }
    cfg.minI.addEventListener("input", function () { onMin("input"); });
    cfg.minI.addEventListener("change", function () { onMin("change"); });
    cfg.maxI.addEventListener("input", function () { onMax("input"); });
    cfg.maxI.addEventListener("change", function () { onMax("change"); });
    [cfg.minI, cfg.maxI].forEach(function (inp) {
        inp.addEventListener("pointerdown", function () {
            cfg.minI.style.zIndex = 3; cfg.maxI.style.zIndex = 3; inp.style.zIndex = 5;
        });
    });
    cfg.refreshUI = refreshUI;
    cfg.setBounds = function (mn, mx) {
        if (mx <= mn) mx = mn + 1;
        [cfg.minI, cfg.maxI].forEach(function (inp) {
            // "any" so a thumb can sit on an exact data value (e.g. 25.5 m²)
            // instead of being rounded to a synthetic step.
            inp.min = mn; inp.max = mx; inp.step = "any";
        });
        if (!TF()[cfg.keyMin]) cfg.minI.value = mn;
        if (!TF()[cfg.keyMax]) cfg.maxI.value = mx;
        if (cfg.sMin) cfg.sMin.textContent = cfg.fmt(mn);
        if (cfg.sMax) cfg.sMax.textContent = cfg.fmt(mx);
        refreshUI();
    };

    /* ---- Steppers: walk a thumb through the real data values ----
       cfg.values is the sorted, de-duplicated list of areas / prices
       present in the sheet, so each click lands on an actual unit's
       number rather than an arbitrary slider position. */
    cfg.values = [];
    cfg.setValues = function (arr) {
        cfg.values = arr.slice().sort(function (a, b) { return a - b; })
            .filter(function (v, i, a) { return i === 0 || v !== a[i - 1]; });
    };
    function stepThumb(which, dir) {
        if (!cfg.values.length) return;
        var isMin = which === "min";
        var inp = isMin ? cfg.minI : cfg.maxI;
        var cur = +inp.value, next = null;
        // Hard stop: min can't pass the max thumb and vice versa.
        var lo = isMin ? +inp.min : +cfg.minI.value;
        var hi = isMin ? +cfg.maxI.value : +inp.max;
        if (dir > 0) {
            for (var i = 0; i < cfg.values.length; i++) {
                if (cfg.values[i] > cur + 1e-9 && cfg.values[i] <= hi) { next = cfg.values[i]; break; }
            }
        } else {
            for (var j = cfg.values.length - 1; j >= 0; j--) {
                if (cfg.values[j] < cur - 1e-9 && cfg.values[j] >= lo) { next = cfg.values[j]; break; }
            }
        }
        if (next == null) return;
        inp.value = next;
        if (isMin) onMin("change"); else onMax("change");
    }
    var row = cfg.minI.closest(".usp-range");
    if (row) {
        row.querySelectorAll(".usp-step").forEach(function (grp) {
            grp.querySelectorAll(".usp-step-btn").forEach(function (b) {
                b.addEventListener("click", function () { stepThumb(grp.dataset.thumb, +b.dataset.dir); });
            });
        });
    }
    return cfg;
}

var areaDual = setupDual({
    minI: byId("uspAreaMin"), maxI: byId("uspAreaMax"), fill: byId("uspAreaFill"),
    minV: byId("uspAreaMinV"), maxV: byId("uspAreaMaxV"),
    sMin: byId("uspAreaScaleMin"), sMax: byId("uspAreaScaleMax"),
    keyMin: "minArea", keyMax: "maxArea",
    fmt: function (v) { return String(Math.round(v)); },
});
var budgetDual = setupDual({
    minI: byId("uspBudgetMin"), maxI: byId("uspBudgetMax"), fill: byId("uspBudgetFill"),
    minV: byId("uspBudgetMinV"), maxV: byId("uspBudgetMaxV"),
    sMin: byId("uspBudgetScaleMin"), sMax: byId("uspBudgetScaleMax"),
    keyMin: "minPrice", keyMax: "maxPrice",
    fmt: money,
});

/* ---------- rooms & features chips (UNIT_FEATURES — SQL section 9) ----------
   Built from the data of the current scope: a Facing / count group lists the values its
   units have (counts from 1 up, when there is more than one — or one value next to units
   without), and a yes / no feature becomes a chip of the "Features" group when some units
   have it and some do not (a chip every unit passes would filter nothing). A project whose
   rows carry none of these (Khawalid 20) gets no such section at all. */
var featureSig = "";
function buildFeatureSections(scope) {
    var wrap = byId("uspFeatureSecs");
    if (!wrap || typeof UNIT_FEATURES === "undefined") return;
    var groups = [], flags = [];
    UNIT_FEATURES.forEach(function (f) {
        var vals = {}, yes = 0, no = 0;
        scope.forEach(function (u) {
            var v = u.features ? u.features[f.key] : null;
            if (v === null || v === undefined) return;
            if (f.kind === "bool") { if (v) yes++; else no++; }
            else if (f.kind === "count") { if (v >= 1) vals[String(v)] = 1; else no++; }
            else vals[String(v)] = 1;
        });
        if (f.kind === "bool") { if (yes && no) flags.push(f); return; }
        var keys = Object.keys(vals);
        if (f.kind === "choice") keys.sort(function (a, b) { return (f.values || []).indexOf(a) - (f.values || []).indexOf(b); });
        else keys.sort(function (a, b) { return Number(a) - Number(b); });
        if (keys.length >= 2 || (keys.length === 1 && no)) groups.push({ f: f, values: keys });
    });
    var sig = groups.map(function (g) { return g.f.key + ":" + g.values.join(","); }).join("|") + "##" + flags.map(function (f) { return f.key; }).join(",");
    if (sig === featureSig) return;
    featureSig = sig;
    var html = groups.map(function (g) {
        return '<section class="usp-sec"><div class="usp-sec-h">' + esc(g.f.label) + '</div><div class="usp-chips">' +
            g.values.map(function (v) {
                return '<button type="button" class="usp-chip" data-fkey="' + esc(g.f.key) + '" data-fval="' + esc(v) + '">' + esc(v) + "</button>";
            }).join("") + "</div></section>";
    }).join("");
    if (flags.length) {
        html += '<section class="usp-sec"><div class="usp-sec-h">Features</div><div class="usp-chips">' +
            flags.map(function (f) {
                return '<button type="button" class="usp-chip" data-fkey="' + esc(f.key) + '" data-fhas="1">' + esc(f.label) + "</button>";
            }).join("") + "</div></section>";
    }
    wrap.innerHTML = html;
}

/* ---------- build dynamic chips + slider bounds ---------- */
function buildDynamic() {
    var us = UNITS();
    if (!us.length) return;
    var tf = TF();
    var scope = scopeUnits();
    if (!scope.length) scope = us;

    // Type chips always list every prototype — that's how you switch scope.
    var types = [];
    us.forEach(function (u) {
        var t = String(u.type || "").trim();
        if (t && t !== "—" && types.indexOf(t) === -1) types.push(t);
    });
    // "1 Bedroom, 2 Bedrooms, 3 Bedrooms" — not the order rows happen to arrive in.
    types.sort(function (a, b) {
        var na = parseInt(a, 10), nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
        return a.localeCompare(b);
    });

    // Floor chips, though, only the floors this prototype actually occupies.
    var present = {};
    scope.forEach(function (u) { present[u.floor] = true; });
    var floors = FLOORS.filter(function (f) { return present[f[0]]; });
    if (!floors.length) floors = FLOORS.slice();

    var sig = types.join("|") + "##" + floors.map(function (f) { return f[0]; }).join("|");
    if (sig !== chipsSig) {
        chipsSig = sig;
        var typeSec = byId("uspTypeSec"), typeWrap = byId("uspTypes");
        if (types.length) {
            typeSec.style.display = "";
            typeWrap.innerHTML = types.map(function (t) {
                return '<button type="button" class="usp-chip" data-type="' + esc(t) + '">' + esc(t) + "</button>";
            }).join("");
        } else { typeSec.style.display = "none"; }

        byId("uspFloors").innerHTML =
            '<button type="button" class="usp-chip" data-floor="">All</button>' +
            floors.map(function (f) {
                return '<button type="button" class="usp-chip" data-floor="' + f[0] + '">' + f[1] + "</button>";
            }).join("");
    }
    buildFeatureSections(scope);

    // Availability options the current prototype simply doesn't have.
    var statusIn = {};
    scope.forEach(function (u) { statusIn[String(u.status || "")] = true; });
    document.querySelectorAll("#uspAvail .usp-chip").forEach(function (b) {
        b.classList.toggle("empty", !statusIn[b.dataset.status]);
    });

    // No prices in the sheet yet → no Budget filter at all (an unbounded
    // 0 – 100 slider would silently hide every unit the moment it moved).
    var priced = scope.some(function (u) { return Number(u.priceRaw) > 0; });
    var budgetSec = byId("uspBudgetSec");
    if (budgetSec) budgetSec.style.display = priced ? "" : "none";
    if (!priced && (tf.minPrice || tf.maxPrice)) {
        tf.minPrice = ""; tf.maxPrice = "";
        commitHeavy(); // a stale budget was still hiding units in the 3D overlay
    }

    // Slider bounds + stepper values follow the scope, so "25 – 589 m²"
    // becomes the Admin span the moment Admin is picked.
    var bsig = (tf.types || []).slice().sort().join("|") + "##" + us.length + "##" + (priced ? "p" : "");
    if (bsig !== scopeSig) {
        var areas = scope.map(areaOf).filter(function (v) { return v > 0; });
        var prices = scope.map(function (u) { return Number(u.priceRaw) || 0; }).filter(function (v) { return v > 0; });
        if (areas.length || prices.length) {
            scopeSig = bsig;
            if (areas.length) {
                areaDual.setBounds(Math.floor(Math.min.apply(null, areas)), Math.ceil(Math.max.apply(null, areas)));
                areaDual.setValues(areas);
            }
            if (prices.length) {
                budgetDual.setBounds(Math.floor(Math.min.apply(null, prices)), Math.ceil(Math.max.apply(null, prices)));
                budgetDual.setValues(prices);
            }
            boundsReady = true;
        }
    }
}

function syncStates() {
    var tf = TF();
    document.querySelectorAll("#uspAvail .usp-chip").forEach(function (b) {
        b.classList.toggle("active", (tf.statuses || []).indexOf(b.dataset.status) !== -1);
    });
    document.querySelectorAll("#uspTypes .usp-chip").forEach(function (b) {
        b.classList.toggle("active", (tf.types || []).indexOf(b.dataset.type) !== -1);
    });
    document.querySelectorAll("#uspFloors .usp-chip").forEach(function (b) {
        b.classList.toggle("active", (tf.floor || "") === b.dataset.floor);
    });
    var fsel = tf.features || {};
    document.querySelectorAll("#uspFeatureSecs .usp-chip").forEach(function (b) {
        var sel = fsel[b.dataset.fkey];
        b.classList.toggle("active", b.dataset.fhas ? sel === true : (Array.isArray(sel) && sel.indexOf(b.dataset.fval) !== -1));
    });
    // The units table's own Floor / Status selects show the same state.
    var tfl = byId("tableFloorFilter"); if (tfl) tfl.value = tf.floor || "";
    var tst = byId("tableStatusFilter"); if (tst) tst.value = (tf.statuses || []).length === 1 ? tf.statuses[0] : "";
    // The header's Prototype dropdown mirrors the same type filter.
    if (typeof window.syncHeaderPrototype === "function") window.syncHeaderPrototype();
    if (boundsReady) {
        areaDual.minI.value = tf.minArea ? tf.minArea : areaDual.minI.min;
        areaDual.maxI.value = tf.maxArea ? tf.maxArea : areaDual.maxI.max;
        areaDual.refreshUI();
        budgetDual.minI.value = tf.minPrice ? tf.minPrice : budgetDual.minI.min;
        budgetDual.maxI.value = tf.maxPrice ? tf.maxPrice : budgetDual.maxI.max;
        budgetDual.refreshUI();
    }
}

// Called by renderUnitsTable() so the panel always mirrors the real state.
window.refreshUnitSearchPanel = function () {
    buildDynamic();
    syncStates();
    updateCount();
    if (isListOpen()) renderList();
};

/* ---------- scene switching (Floor chips double as the section view) ---------- */
function goScene(sceneKey) {
    if (typeof currentScene !== "undefined" && sceneKey === currentScene) return; // already there
    // Only a real per-floor orbit needs a scene change. While every floor
    // maps to the exterior orbit, keep the Day / Night the visitor chose
    // instead of snapping back to Day (which also wiped the floor filter).
    var S = (typeof SCENES !== "undefined") ? SCENES : null;
    var target = S ? S[sceneKey] : null;
    var cur = S && typeof currentScene !== "undefined" ? S[currentScene] : null;
    if (!S || (target && cur && !target.unitFloor && !cur.unitFloor)) return;
    if (typeof setScene === "function") setScene(sceneKey);
    else {
        var mb = document.querySelector('#floorMenu .floor-menu-btn[data-scene="' + sceneKey + '"]');
        if (mb) mb.click();
    }
}

byId("uspAvail").addEventListener("click", function (e) {
    var b = e.target.closest(".usp-chip"); if (!b) return;
    // A status with no units can't be picked — but if the table's own
    // Status select put it on, a click here must still take it off.
    if (b.classList.contains("empty") && !b.classList.contains("active")) return;
    var tf = TF(); if (!tf.statuses) tf.statuses = [];
    var i = tf.statuses.indexOf(b.dataset.status);
    if (i === -1) tf.statuses.push(b.dataset.status); else tf.statuses.splice(i, 1);
    b.classList.toggle("active");
    applyFilters();
});
byId("uspTypes").addEventListener("click", function (e) {
    var b = e.target.closest(".usp-chip"); if (!b) return;
    var tf = TF(); if (!tf.types) tf.types = [];
    var i = tf.types.indexOf(b.dataset.type);
    if (i === -1) tf.types.push(b.dataset.type); else tf.types.splice(i, 1);
    b.classList.toggle("active");
    rescope();
    applyFilters();
});
byId("uspFloors").addEventListener("click", function (e) {
    var b = e.target.closest(".usp-chip"); if (!b) return;
    var key = b.dataset.floor || "";
    TF().floor = key;
    goScene(sceneForFloorNow(key));
    applyFilters();
});
// Rooms & features: a value chip toggles its value in the group's list, a Features chip toggles the requirement.
byId("uspFeatureSecs").addEventListener("click", function (e) {
    var b = e.target.closest(".usp-chip"); if (!b) return;
    var tf = TF(); if (!tf.features) tf.features = {};
    var key = b.dataset.fkey;
    if (b.dataset.fhas) {
        if (tf.features[key] === true) delete tf.features[key]; else tf.features[key] = true;
    } else {
        var arr = Array.isArray(tf.features[key]) ? tf.features[key] : [];
        var i = arr.indexOf(b.dataset.fval);
        if (i === -1) arr.push(b.dataset.fval); else arr.splice(i, 1);
        if (arr.length) tf.features[key] = arr; else delete tf.features[key];
    }
    applyFilters();
});

/* Single-select type filter, driven by the header's Prototype menu.
   "" clears it. Matches the sheet value case-insensitively so the
   hard-coded menu labels survive minor spelling differences. */
window.setUnitTypeFilter = function (type) {
    var tf = TF();
    var want = String(type || "").trim().toLowerCase();
    var hit = "";
    if (want) {
        UNITS().some(function (u) {
            var t = String(u.type || "").trim();
            if (t.toLowerCase() === want) { hit = t; return true; }
            return false;
        });
        if (!hit) hit = String(type).trim();
    }
    tf.types = hit ? [hit] : [];
    rescope();
    applyFilters();
};

/* ---------- results list ---------- */
function isListOpen() { return listPanel && listPanel.classList.contains("show"); }
function renderList() {
    if (!listPanel) return;
    var rows = filtered();
    var cnt = byId("ulpCount"); if (cnt) cnt.textContent = rows.length;
    var body = byId("ulpBody"); if (!body) return;
    if (!rows.length) { body.innerHTML = '<div class="ulp-empty">No units match your filters.</div>'; return; }
    var CAP = 140;
    var shown = rows.slice(0, CAP);
    var canCompare = (typeof isUnitCompared === "function");
    var html = shown.map(function (u) {
        var st = String(u.status || "");
        var isC = canCompare && isUnitCompared(u.id);
        return '<div class="ulp-row" data-id="' + esc(u.id) + '">' +
            '<div class="ulp-name">' + esc(u.name) + '</div>' +
            '<div class="ulp-right">' +
            '<span class="ulp-badge ' + esc(st) + '">' + esc(u.availability || st || "—") + '</span>' +
            (typeof isAmenityUnit === "function" && isAmenityUnit(u) ? '' : '<button class="ulp-heart' + (isC ? " active" : "") + '" type="button" data-heart="' + esc(u.id) + '">' + (isC ? "♥" : "♡") + '</button>') +
            '</div>' +
            '<div class="ulp-meta">' +
            '<span>Floor <b>' + esc(u.floorRaw || u.floor || "—") + '</b></span>' +
            '<span>Area <b>' + esc(u.area || "—") + '</b></span>' +
            (typeof isAmenityUnit === "function" && isAmenityUnit(u) ? '' : '<span>Price <b>' + esc(u.price || "—") + '</b></span>') +
            (u.type && u.type !== "—" ? '<span>Type <b>' + esc(u.type) + '</b></span>' : '') +
            '</div>' +
            '</div>';
    }).join("");
    if (rows.length > CAP) html += '<div class="ulp-more">Showing ' + CAP + ' of ' + rows.length + ' — refine filters to narrow down.</div>';
    body.innerHTML = html;
}
if (listPanel) {
    byId("ulpBody").addEventListener("click", function (e) {
        var heart = e.target.closest(".ulp-heart");
        if (heart) {
            e.stopPropagation();
            if (typeof toggleCompareUnit === "function") toggleCompareUnit(heart.dataset.heart, e);
            renderList();
            return;
        }
        var row = e.target.closest(".ulp-row");
        if (row && typeof openUnitSideMenuFromTable === "function") openUnitSideMenuFromTable(row.dataset.id);
    });
    byId("ulpClose").addEventListener("click", function () { listPanel.classList.remove("show"); });
}

/* ---------- footer + open/close ---------- */
byId("uspReset").addEventListener("click", function () {
    var tf = TF();
    tf.statuses = []; tf.types = []; tf.floor = "";
    tf.minArea = ""; tf.maxArea = ""; tf.minPrice = ""; tf.maxPrice = "";
    tf.search = ""; tf.status = ""; tf.features = {};
    // …and the table drawer's own controls, which share this state.
    var ts = byId("tableSearch"); if (ts) ts.value = "";
    var tfl = byId("tableFloorFilter"); if (tfl) tfl.value = "";
    var tst = byId("tableStatusFilter"); if (tst) tst.value = "";
    if (typeof RANGE_FILTERS !== "undefined") {
        if (RANGE_FILTERS.area) RANGE_FILTERS.area.reset();
        if (RANGE_FILTERS.price) RANGE_FILTERS.price.reset();
    }
    buildDynamic(); // back to the full all-prototypes bounds
    if (boundsReady) {
        areaDual.minI.value = areaDual.minI.min; areaDual.maxI.value = areaDual.maxI.max; areaDual.refreshUI();
        budgetDual.minI.value = budgetDual.minI.min; budgetDual.maxI.value = budgetDual.maxI.max; budgetDual.refreshUI();
    }
    goScene("exterior");
    applyFilters();
});

byId("uspView").addEventListener("click", function () {
    if (!listPanel) { var t = document.querySelector("#unitsTableToggle"); if (t) t.click(); return; }
    renderList();
    listPanel.classList.add("show");
});
byId("uspClose").addEventListener("click", closePanel);

function openPanel() {
    // Desktop only (see openUnitsTable): the units drawer goes away first.
    var phone = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
    var drawer = document.getElementById("unitsTableDrawer");
    if (!phone && drawer && drawer.classList.contains("show") && typeof closeUnitsTable === "function") closeUnitsTable();
    if (window.refreshUnitSearchPanel) window.refreshUnitSearchPanel();
    panel.classList.add("show");
}
function closePanel() {
    panel.classList.remove("show");
    if (listPanel) listPanel.classList.remove("show");
}
window.toggleUnitSearch = function () {
    if (panel.classList.contains("show")) closePanel(); else openPanel();
};
/* A floor picked on the building itself (the floor volumes of the 3D
   overlay): the same state as the Floor chips, then straight to that
   floor's units — the panel with its list beside it. */
window.showFloorUnits = function (key) {
    TF().floor = key || "";
    goScene(sceneForFloorNow(key)); // on a floor plan: that floor's plan, or the building view
    applyFilters();
    openPanel();
    if (listPanel) { renderList(); listPanel.classList.add("show"); }
};
window.closeUnitSearch = closePanel;
window.isUnitSearchOpen = function () { return panel.classList.contains("show"); };

if (window.refreshUnitSearchPanel) window.refreshUnitSearchPanel();
})();