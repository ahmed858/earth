/* =========================================================
   HOME SCREEN (intro hero) — markup at the top of #appRoot.
   Settings come from the site_settings table (admin → Home screen):
   video / poster / logo URLs, the texts in both languages and a few
   switches. Anything missing falls back to the defaults below (and to
   HERO_VIDEO / HERO_LOGO in config.js for the media), so the screen
   also works before the SQL file has been run. EXPLORE fades it out
   and leaves the location map, which booted underneath meanwhile.
   Skip it with  ?nohero  in the URL. Live edits from the dashboard
   arrive through window.introHero.refresh() (see LIVE UPDATES).
   The rows are also shared with the rest of the page — window.siteSettings
   and the "site:settings" event — for the floor overlay (FLOOR_LOOK).
========================================================= */
(function () {
var hero = document.getElementById("introHero");
if (!hero) return;
var media = document.getElementById("ihMedia");
var video = document.getElementById("ihVideo");
var poster = document.getElementById("ihPoster");
var logoBox = document.getElementById("ihLogo");
var logoImg = document.getElementById("ihLogoImg");
var logoInline = document.getElementById("ihLogoInline");
var logoInlineImg = document.getElementById("ihLogoInlineImg");
var elTagline = document.getElementById("ihTagline");
var elTitle1 = document.getElementById("ihTitle1");
var elTitle2 = document.getElementById("ihTitle2");
var elSub = document.getElementById("ihSub");
var elBtn = document.getElementById("ihExplore");
var elLang = document.getElementById("ihLang");

var done = false; // dismissed (or switched off)
var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// ----- leave: fade out, release the video, let the map take over -----
function enter() {
    if (done) return;
    done = true;
    hero.classList.add("ih-leaving");
    document.body.classList.remove("hero-open");
    try { document.dispatchEvent(new CustomEvent("hero:done")); } catch (e) { }
    setTimeout(function () {
        hero.classList.add("ih-off");
        try { video.pause(); video.removeAttribute("src"); video.load(); } catch (e) { }
    }, reduceMotion ? 0 : 850);
}
// Wired first, so the visitor can always get past this screen.
elBtn.addEventListener("click", enter);
if (/(^|[?&])(nohero(=[^&]*)?|hero=0)(&|$)/.test(location.search)) { hero.classList.add("ih-off"); done = true; return; }
document.body.classList.add("hero-open");

var MZ = window.MAAZAR_CONFIG || {};
var SB_URL = String(MZ.SUPABASE_URL || "").replace(/\/+$/, "");
var SB_KEY = MZ.SUPABASE_ANON_KEY || "";
var DEFAULTS = {
    hero_enabled: "true",
    hero_video: MZ.HERO_VIDEO ? encodeURI(MZ.HERO_VIDEO) : "",
    hero_poster: MZ.HERO_POSTER ? encodeURI(MZ.HERO_POSTER) : "",
    hero_logo: MZ.HERO_LOGO ? encodeURI(MZ.HERO_LOGO) : "",
    hero_logo_style: "auto",   // auto | dark | original | white
    hero_bg: "#786858",        // the colour the video is tinted towards (the brand colour); text flips to dark on a light one
    hero_layout: "corners",    // corners (text left, button right) | center | bottom (centred, lower part)
    hero_logo_pos: "header",   // header (top corner) | content (with the text and the button)
    hero_wash: "100",
    hero_tagline: "RESIDENTIAL",
    hero_tagline_ar: "مجمّع سكني",
    hero_title_1: "LIVE.",
    hero_title_1_ar: "عِش.",
    hero_title_2: "THRIVE.",
    hero_title_2_ar: "ازدهر.",
    hero_subtitle: "YOUR EVERYDAY *LUXURY* DESTINATION.",
    hero_subtitle_ar: "وجهتك اليومية *للرفاهية*.",
    hero_button: "EXPLORE",
    hero_button_ar: "استكشف",
};
var settings = {}; // rows from Supabase, key -> value
var current = { video: null, poster: null, logo: null };

function has(key) { return Object.prototype.hasOwnProperty.call(settings, key); }
function val(key) {
    return has(key) ? String(settings[key] == null ? "" : settings[key]).trim() : (DEFAULTS[key] || "");
}
// The rows, as fetched, for the rest of the page (the floor overlay reads floors_*).
function publish() {
    window.siteSettings = settings;
    try { document.dispatchEvent(new CustomEvent("site:settings", { detail: settings })); } catch (e) { }
}
// "#rgb" / "#rrggbb" (with or without the #) -> [r, g, b], else null
function parseHex(s) {
    var m = String(s || "").trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (!m) return null;
    var h = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function isAr() { return !!(window.i18n && window.i18n.lang === "ar"); }
// Arabic text, falling back to the English value the editor typed,
// and to the built-in Arabic only when neither was set.
function text(key) {
    if (isAr()) {
        var ar = has(key + "_ar") ? String(settings[key + "_ar"] == null ? "" : settings[key + "_ar"]).trim() : "";
        if (ar) return ar;
        if (has(key)) return val(key);
        return DEFAULTS[key + "_ar"] || DEFAULTS[key] || "";
    }
    return val(key);
}
// "*word*" -> accent colour (text is escaped first)
function rich(s) {
    var esc = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\*([^*]+)\*/g, '<span class="ih-accent">$1</span>');
}

function renderTexts() {
    elTagline.textContent = text("hero_tagline");
    elTitle1.innerHTML = rich(text("hero_title_1"));
    elTitle2.innerHTML = rich(text("hero_title_2"));
    elSub.innerHTML = rich(text("hero_subtitle"));
    elBtn.textContent = text("hero_button") || "EXPLORE";
    elLang.textContent = isAr() ? "EN" : "AR";
}

function applyMedia() {
    var p = val("hero_poster"), l = val("hero_logo"), v = val("hero_video");
    if (p !== current.poster) {
        current.poster = p;
        if (p) { poster.src = p; poster.hidden = false; } else { poster.removeAttribute("src"); poster.hidden = true; }
    }
    if (l !== current.logo) {
        current.logo = l;
        if (l) { logoImg.src = l; logoInlineImg.src = l; } else { logoImg.removeAttribute("src"); logoInlineImg.removeAttribute("src"); }
    }
    var style = val("hero_logo_style");
    style = /^(auto|dark|original|white)$/.test(style) ? style : "auto";
    logoBox.className = "ih-logo" + (l ? " has-logo" : "") + " logo-" + style;
    logoInline.className = "ih-logo-inline" + (l ? " has-logo" : "") + " logo-" + style;
    hero.classList.toggle("ih-logo-content", val("hero_logo_pos") === "content");
    // background colour: the video is tinted towards it; text turns light on a dark one
    var bg = parseHex(val("hero_bg")) || parseHex(DEFAULTS.hero_bg);
    var dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 140;
    // ink and accent: shades of the brand palette (the --brand-* tokens) that read on that background
    var ink = dark ? "var(--brand-50)" : "var(--brand-900)";
    var accent = dark ? "var(--brand-200)" : "var(--brand-500)";
    hero.style.setProperty("--ih-bg", "rgb(" + bg.join(", ") + ")");
    hero.style.setProperty("--ih-bg-rgb", bg.join(", "));
    hero.style.setProperty("--ih-ink", "rgb(" + ink + ")");
    hero.style.setProperty("--ih-ink-rgb", ink);
    hero.style.setProperty("--ih-accent", "rgb(" + accent + ")");
    hero.style.setProperty("--ih-accent-rgb", accent);
    hero.classList.toggle("ih-dark", dark);
    var layout = val("hero_layout");
    hero.classList.toggle("ih-center", layout === "center");
    hero.classList.toggle("ih-bottom", layout === "bottom");
    var wash = parseFloat(val("hero_wash"));
    if (isNaN(wash)) wash = 100;
    hero.style.setProperty("--ih-wash", String(Math.min(100, Math.max(0, wash)) / 100));

    if (done) return; // the video is only (re)loaded while the screen is up
    if (v === current.video) return;
    // A late answer from Supabase must not restart a fallback video that
    // is already playing fine; it does replace one that failed to load.
    if (current.video && media.classList.contains("ih-playing") && !video.error) return;
    current.video = v;
    media.classList.remove("ih-playing");
    if (v) {
        video.muted = true;
        video.src = v;
        video.load();
        if (!reduceMotion) {
            video.autoplay = true;
            var pr = video.play();
            if (pr && pr.catch) pr.catch(function () { /* autoplay blocked: poster / first frame stays */ });
        }
    } else {
        video.removeAttribute("src");
        video.load();
    }
}
video.addEventListener("playing", function () { media.classList.add("ih-playing"); });
video.addEventListener("error", function () { media.classList.remove("ih-playing"); });

function applyAll() {
    if (val("hero_enabled") === "false") {
        if (!done) { done = true; hero.classList.add("ih-off"); document.body.classList.remove("hero-open"); }
        return;
    }
    renderTexts();
    applyMedia();
    if (!hero.classList.contains("ih-ready")) {
        // two frames so the first styles are applied before the transitions start
        requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("ih-ready"); }); });
    }
}

function fetchSettings() {
    if (!SB_URL || !SB_KEY) return Promise.resolve(null);
    return fetch(SB_URL + "/rest/v1/site_settings?select=key,value", {
        headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
        cache: "no-store",
    })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (rows) {
            var o = {};
            (rows || []).forEach(function (r) { if (r && r.key) o[r.key] = r.value == null ? "" : String(r.value); });
            return o;
        })
        .catch(function (e) {
            console.info("[home] site_settings unavailable — using the built-in defaults (" + (e && e.message ? e.message : e) + ")");
            return null;
        });
}

// Language: the hero keeps its own strings (the dictionary walker skips it)
document.addEventListener("i18n:change", function () { if (!done) renderTexts(); });
elLang.addEventListener("click", function () { if (window.i18n) window.i18n.toggle(); });

// First paint: wait briefly for the settings so the fallback video is
// not started and then swapped; after that, show whatever we have.
var applied = false;
function applyOnce(rows) {
    if (rows) { settings = rows; publish(); }
    if (applied && !rows) return;
    applied = true;
    try { applyAll(); } catch (e) { console.warn("[home]", e); enter(); }
}
var timer = setTimeout(function () { applyOnce(null); }, 1500);
fetchSettings().then(function (rows) { clearTimeout(timer); applyOnce(rows); });

window.introHero = {
    enter: enter,
    refresh: function () { fetchSettings().then(function (rows) { if (rows) { settings = rows; publish(); try { applyAll(); } catch (e) { console.warn("[home]", e); } } }); },
};
})();