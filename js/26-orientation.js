(function () {
var SMALL_MAX = 600; // shorter viewport side (px) treated as a phone

var body = document.body;
var chooser = document.getElementById("orientChooser");
var toggleBtn = document.getElementById("orientToggle");
var toggleLabel = document.getElementById("orientToggleLabel");

var mode = null;        // 'portrait' | 'landscape' | null (not chosen)
var selfResize = false; // guard so our synthetic resize doesn't recurse

function shorterSide() {
    return Math.min(window.innerWidth, window.innerHeight);
}
function isSmallScreen() {
    var coarse =
        window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return !!coarse && shorterSide() <= SMALL_MAX;
}
function physicalOrientation() {
    return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
}

// Force the 360 canvas (and other resize-driven layout) to recompute for
// the new layout box after we toggle rotation. Reuse the existing window
// "resize" listeners, guarded so we don't re-enter apply().
function syncLayout() {
    requestAnimationFrame(function () {
        selfResize = true;
        try {
            window.dispatchEvent(new Event("resize"));
        } catch (e) { }
        selfResize = false;
    });
}

function apply() {
    var small = isSmallScreen();
    body.classList.toggle("small-ui", small);

    if (!small) {
        // Desktop / large screens: never rotate, never show the meta UI.
        body.classList.remove(
            "ui-rotated",
            "ui-mode-portrait",
            "ui-mode-landscape"
        );
        chooser.classList.remove("show");
        syncLayout();
        return;
    }

    if (!mode) {
        // No choice yet: show the chooser, keep the app upright behind it.
        chooser.classList.add("show");
        body.classList.remove("ui-rotated");
        syncLayout();
        return;
    }

    chooser.classList.remove("show");
    body.classList.toggle("ui-mode-portrait", mode === "portrait");
    body.classList.toggle("ui-mode-landscape", mode === "landscape");

    // CSS-rotate when landscape is wanted on an upright phone.
    var rotated =
        mode === "landscape" && physicalOrientation() === "portrait";
    body.classList.toggle("ui-rotated", rotated);

    // The location map reads raw (rotated) screen coords too: it picks the
    // new state up from the resize event syncLayout() dispatches below and
    // swaps to its own remapped drag (see the map script).

    if (toggleLabel) {
        toggleLabel.textContent =
            mode === "portrait" ? "Landscape" : "Portrait";
    }
    syncLayout();
}

function setMode(next) {
    mode = next;
    apply();
}

// Wire up the chooser buttons.
if (chooser) {
    var opts = chooser.querySelectorAll(".orient-opt");
    for (var i = 0; i < opts.length; i++) {
        (function (btn) {
            btn.addEventListener("click", function () {
                setMode(btn.getAttribute("data-mode"));
            });
        })(opts[i]);
    }
}

// The toggle flips between the two modes.
if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
        setMode(mode === "landscape" ? "portrait" : "landscape");
    });
}

// Note: the choice is intentionally NOT remembered — the chooser is
// shown on every page load.

// Re-evaluate on device rotation / viewport changes (ignore our own).
window.addEventListener("resize", function () {
    if (selfResize) return;
    apply();
});
window.addEventListener("orientationchange", apply);

apply();
})();