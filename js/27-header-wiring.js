(function () {
var header = document.getElementById("ocHeader");
if (!header) return;

// Keep header touches away from the window-level panorama drag handlers
// so a tap is never swallowed by preventDefault (notably in landscape).
["touchstart", "mousedown", "pointerdown"].forEach(function (evt) {
    header.addEventListener(evt, function (e) { e.stopPropagation(); }, { passive: true });
});

function click(sel) {
    var el = document.querySelector(sel);
    if (el) el.click();
}
function clickFloor(scene) {
    var b = document.querySelector('#floorMenu .floor-menu-btn[data-scene="' + scene + '"]');
    if (b) b.click();
}
var burger = document.getElementById("ochBurger");
function setMenu(open) {
    header.classList.toggle("open", open);
    // Toggling this body class fades out the floating launchers so the
    // open menu stays clean (see the mobile stylesheet).
    document.body.classList.toggle("header-menu-open", open);
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) { header.classList.remove("open"); }
}
function closeMobile() { setMenu(false); }

/* ---- Mobile hamburger ---- */
if (burger) {
    burger.addEventListener("click", function (e) {
        e.stopPropagation();
        setMenu(!header.classList.contains("open"));
    });
}
document.addEventListener("click", function (e) {
    if (!header.contains(e.target)) closeMobile();
});

/* ---- Floors dropdown ---- */
var floors = document.getElementById("ochFloors");
var floorsBtn = document.getElementById("ochFloorsBtn");
if (floorsBtn) {
    floorsBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = floors.classList.toggle("open");
        floorsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
}
document.addEventListener("click", function (e) {
    if (floors && !floors.contains(e.target)) floors.classList.remove("open");
});
/* Prototype items set the unit-type filter (single select). The
   Unit Search panel owns the filter state; we just drive it. */
document.querySelectorAll("#ochFloors .och-dd-item").forEach(function (it) {
    it.addEventListener("click", function () {
        if (typeof window.setUnitTypeFilter === "function") window.setUnitTypeFilter(it.dataset.type || "");
        floors.classList.remove("open");
        closeMobile();
    });
});

/* The highlight is already painted by the filter — this just takes you
   to the view where it reads. enter() no-ops if 3D is already open. */
var proto3D = document.getElementById("ochProto3D");
if (proto3D) proto3D.addEventListener("click", function () {
    floors.classList.remove("open");
    closeMobile();
    if (window.viewer3D && !window.viewer3D.active) window.viewer3D.enter();
    else if (!window.viewer3D) click("#mode3DToggle");
});

/* Mirror the current type filter into the Prototype label + items.
   Called from the Unit Search panel whenever its state syncs. */
window.syncHeaderPrototype = function () {
    var types = (typeof TABLE_FILTERS !== "undefined" && TABLE_FILTERS.types) || [];
    var lbl = document.getElementById("ochFloorsLabel");
    if (floorsBtn) floorsBtn.classList.toggle("active", types.length > 0);
    document.querySelectorAll("#ochFloors .och-dd-item").forEach(function (it) {
        var t = it.dataset.type || "";
        it.classList.toggle("active", t === "" ? types.length === 0 : types.indexOf(t) !== -1);
    });
    if (lbl) lbl.textContent = types.length === 1 ? types[0] : "Prototype";
};

/* ---- Simple nav actions (reuse the existing launchers) ---- */
function on(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", function () { fn(); closeMobile(); });
}
on("ochUnits", function () {
    if (typeof window.toggleUnitSearch === "function") window.toggleUnitSearch();
    else click("#unitsTableToggle");
});
on("ochCompare", function () { click("#compareToggle"); });
on("ochGallery", function () { click("#galleryToggle"); });
on("ochLang", function () { click("#langToggle"); });
on("ochTut", function () { click("#tutLauncher"); });
on("ochOrient", function () { click("#orientToggle"); });
on("ochEye", function () { click("#hideUnitsToggle"); });
on("och3D", function () { click("#mode3DToggle"); });

/* ---- Mirror the hide-units / 3D state into the header buttons.
   The original pills stay the source of truth; we just watch their
   class list and reflect it (icon swap, tint, label, aria). ---- */
function mirrorToggle(srcId, btnId, lblId, stateClass, onText, offText) {
    var src = document.getElementById(srcId);
    var btn = document.getElementById(btnId);
    if (!src || !btn) return;
    var lbl = document.getElementById(lblId);
    function sync() {
        var on = src.classList.contains(stateClass);
        btn.classList.toggle(stateClass, on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        var text = on ? onText : offText;
        if (typeof text === "function") text = text(src);
        btn.title = text;
        if (lbl) lbl.textContent = text;
    }
    new MutationObserver(sync).observe(src, {
        attributes: true, attributeFilter: ["class", "data-noun"],
    });
    sync();
}
// The pill says what the 3D overlay carries (data-noun: units or floors).
function overlayNoun(src) { return src.dataset.noun === "floors" ? "floors" : "units"; }
mirrorToggle("hideUnitsToggle", "ochEye", "ochEyeLabel", "is-hidden",
    function (src) { return "Show " + overlayNoun(src); }, function (src) { return "Hide " + overlayNoun(src); });
mirrorToggle("mode3DToggle", "och3D", "och3DLabel", "active", "Exit 3D", "3D View");

// "Surrounding" re-opens the existing project-location map launcher.
on("ochSurround", function () { click("#locLauncher"); });

// Home — return to the exterior view and close any open panels.
function closeIfOpen(panelSel, closeSel) {
    var p = document.querySelector(panelSel);
    if (p && (p.classList.contains("show") || p.classList.contains("open"))) {
        var c = document.querySelector(closeSel);
        if (c) c.click();
    }
}
on("ochHome", function () {
    closeIfOpen("#unitsTableDrawer", "#closeUnitsTable");
    closeIfOpen("#compareDrawer", "#closeCompare");
    closeIfOpen("#galleryOverlay", "#galleryCloseX");
    clickFloor("exterior");
});

/* ---- View-mode segment (Day / Night) ---- */
document.querySelectorAll(".och-seg-btn").forEach(function (b) {
    b.addEventListener("click", function () { clickFloor(b.dataset.scene); });
});

/* ---- Keep active states in sync with the real scene state ---- */
function syncActive() {
    var active = document.querySelector("#floorMenu .floor-menu-btn.active");
    var scene = active ? active.dataset.scene : null;
    // Prototype (type filter) state is synced separately — see syncHeaderPrototype.

    document.querySelectorAll(".och-seg-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.scene === scene);
    });

    var home = document.getElementById("ochHome");
    if (home) home.classList.toggle("active", scene === "exterior");
}
var fm = document.getElementById("floorMenu");
if (fm) {
    new MutationObserver(syncActive).observe(fm, {
        attributes: true, subtree: true, attributeFilter: ["class"],
    });
}
setTimeout(syncActive, 600);
setTimeout(syncActive, 1800);

/* ---- Compare count badge mirror ---- */
function syncCompare() {
    var src = document.getElementById("compareCount");
    var n = src ? parseInt(src.textContent, 10) || 0 : 0;
    var badge = document.getElementById("ochCompareCount");
    if (badge) {
        badge.textContent = n;
        badge.setAttribute("data-empty", n > 0 ? "0" : "1");
    }
}
var cc = document.getElementById("compareCount");
if (cc) {
    new MutationObserver(syncCompare).observe(cc, {
        childList: true, characterData: true, subtree: true,
    });
}
syncCompare();

/* ---- Mirror the language toggle label into the header button ---- */
function syncLang() {
    var src = document.getElementById("langToggleLabel");
    var dst = document.getElementById("ochLangLabel");
    if (src && dst) dst.textContent = src.textContent;
}
var lt = document.getElementById("langToggleLabel");
if (lt) {
    new MutationObserver(syncLang).observe(lt, {
        childList: true, characterData: true, subtree: true,
    });
}
syncLang();
})();