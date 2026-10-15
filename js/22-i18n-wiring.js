/* The project's texts and logos (projects.js). The markup above is written for the default
   project (Khawalid 20); this swaps in the project this page shows, and hides the switches
   for scenes it does not have (the header's Day / Night segment, the zoning panel's buttons). */
(function () {
    var P = window.MAAZAR_PROJECT;
    if (!P) return;
    var name = P.name || "";
    var el = document.getElementById("ufAssistantName");
    if (el && name) el.textContent = name + " Assistant";
    el = document.getElementById("waSubName");
    if (el && name) el.textContent = name + " · Typically replies instantly";
    document.querySelectorAll("[data-project-logo]").forEach(function (span) {
        if (P.logoClass) span.className = P.logoClass;
        var img = span.querySelector("img");
        if (img && P.logo) { img.src = encodeURI(P.logo); img.alt = name; }
    });
    var scenes = (typeof SCENES !== "undefined" && SCENES) || {};
    document.querySelectorAll("[data-scene], [data-zn-scene]").forEach(function (b) {
        var k = b.getAttribute("data-scene") || b.getAttribute("data-zn-scene");
        if (k && !scenes[k]) b.style.display = "none";
    });
    if (Object.keys(scenes).length < 2) document.body.classList.add("one-scene");
})();