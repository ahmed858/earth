// Zoning overlay — open from the launcher, close via ✕ / Back / backdrop / Esc
(function () {
    var launcher = document.getElementById("znLauncher");
    var overlay = document.getElementById("zoningOverlay");
    if (!launcher || !overlay) return;
    var lastFocus = null;

    function openZoning() {
        lastFocus = document.activeElement;
        overlay.classList.add("zn-open");
        overlay.setAttribute("aria-hidden", "false");
        document.addEventListener("keydown", onKey);
        var back = overlay.querySelector(".zn-back");
        if (back) back.focus();
    }
    function closeZoning() {
        overlay.classList.remove("zn-open");
        overlay.setAttribute("aria-hidden", "true");
        document.removeEventListener("keydown", onKey);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
        if (e.key === "Escape" || e.key === "Esc") closeZoning();
    }

    launcher.addEventListener("click", openZoning);
    var closers = overlay.querySelectorAll("[data-zn-close]");
    for (var i = 0; i < closers.length; i++) {
        closers[i].addEventListener("click", closeZoning);
    }

    // Action buttons: jump the 360 viewer to a scene, then close the panel.
    // Prefer the floor-menu button (it also closes the units table); fall
    // back to the global setScene(), then any element wired to that scene.
    function znGoScene(sceneKey) {
        var btn = document.querySelector('#floorMenu .floor-menu-btn[data-scene="' + sceneKey + '"]');
        if (btn) { btn.click(); return; }
        if (typeof window.setScene === "function") { window.setScene(sceneKey); return; }
        var alt = document.querySelector('[data-scene="' + sceneKey + '"]');
        if (alt) alt.click();
    }
    var sceneBtns = overlay.querySelectorAll("[data-zn-scene]");
    for (var j = 0; j < sceneBtns.length; j++) {
        sceneBtns[j].addEventListener("click", function () {
            znGoScene(this.getAttribute("data-zn-scene"));
            closeZoning();
        });
    }
})();