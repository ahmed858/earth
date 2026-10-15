/* =========================================================
   SCENE / FLOOR SWITCHING
========================================================= */

function showSceneLoader(show) {
    const el = document.getElementById("sceneLoader");
    if (el) el.classList.toggle("show", show);
}

function setSceneLoaderPct(pct) {
    const t = document.getElementById("sceneLoaderText");
    if (t) t.textContent = `Loading ${pct}%`;
}

// Pause (cancel) downloads still running for the scene we're LEAVING, without
// discarding what it already fetched — its cache survives in sceneFrameCache,
// so returning to it never re-downloads finished frames. This also frees the
// network so the scene we're switching to gets full bandwidth immediately.
function pauseSceneDownloads() {
    for (const img of _lowresImages) {
        if (img && !img.complete) {
            img.onload = null;
            img.onerror = null;
            img.src = ""; // aborts the pending download in browsers
        }
    }
    _lowresImages = [];

    for (let i = 0; i < _hiresImages.length; i++) {
        const img = _hiresImages[i];
        if (img && !img.complete) {
            img.onload = null;
            img.onerror = null;
            img.src = "";
        }
        _hiresImages[i] = null;
    }

    _hiresQueue = [];
    _hiresActive = 0;
}

// Switch the visible 360° set + filter the units to that floor.
function setScene(sceneKey) {
    const scene = SCENES[sceneKey];
    if (!scene) return;

    // A still scene has no 3D view: leave it first (exit3DMode restores the scene we are leaving).
    if (scene.still && is3DMode) exit3DMode();
    pauseSceneDownloads(); // pause (don't discard) the scene we're leaving
    currentScene = sceneKey;
    if (scene.still) currentFrame = 0; // the one frame
    ["mode3DToggle", "och3D"].forEach((id) => { const b = document.getElementById(id); if (b) b.style.display = scene.still ? "none" : ""; });
    const backBtn = document.getElementById("sceneBackBtn"); if (backBtn) backBtn.hidden = !scene.still; // a floor screen offers the way back
    useOverlayModel(scene.units || THREE_ASSETS.units); // the scene's own overlay model, or the floors
    // Remember the time of day so it survives a trip through the floor scenes.
    if (sceneKey === "exterior" || sceneKey === "night") viewModePref = sceneKey;
    sceneToken++; // invalidate any stale in-flight callbacks

    IMAGE_FOLDER = `${STORAGE_PUBLIC_BASE}/${scene.path}/high`;
    LOWRES_FOLDER = `${STORAGE_PUBLIC_BASE}/${scene.path}/low`;

    activateSceneFrameCache(sceneKey); // point the globals at this scene's cache
    // In 3D mode the photos aren't on screen, so downloading a whole 60-frame
    // orbit (and showing its loading overlay over the model) is pure waste.
    // Defer it; exit3DMode fetches whatever the final scene needs.
    if (is3DMode) {
        pendingSceneLoad = true;
    } else {
        loadCurrentScene(); // fetch only what's missing (instant if fully cached)
    }

    // 3D unit model: keep it visible; the floor filter limits it to this floor.
    // (The floor volumes themselves only show on a scene whose camera is baked — floorsVisible.)
    const overlay = document.getElementById("threeOverlay");
    if (overlay) {
        overlay.style.display = scene.showUnitsOverlay ? "" : "none";
        if (scene.showUnitsOverlay) {
            requestAnimationFrame(() => {
                if (typeof resizeThreeOverlay === "function") resizeThreeOverlay();
                scheduleThreeFrame(currentFrame);
            });
        }
    }
    syncFloorsVisible();
    if (!is3DMode && !sceneOverlayAligned()) {
        if (typeof resetHoveredUnit === "function") resetHoveredUnit();
        if (typeof hideUnitHoverCard === "function") hideUnitHoverCard();
    }

    // The building shell masks unit boxes on the exterior/night orbits only (see
    // shellMasksOverlay): on a floor view it is hidden so units sitting under the
    // building still light up (the floor filter already hides the other floors).
    // In 3D mode the shell IS the view, so it stays visible whatever floor is
    // picked -- but it ghosts on a floor view so it doesn't swallow the units.
    if (occluderModel) {
        if (is3DMode) {
            occluderModel.visible = true;
            setShellMode();
            applyThree3DTheme(); // Day/Night buttons are scene switches, so retint
        } else {
            occluderModel.visible = shellMasksOverlay();
        }
    }

    applySceneFloorFilter(scene.unitFloor);

    // Note: selecting a floor only filters the units (table + 3D overlay above);
    // it does NOT auto-open the units table. The user opens it via its toggle.

    updateFloorMenuActive();
}

// Drive the existing table/3D filters from the active scene's floor.
// A floor scene (unitFloor set) pins the filter to its floor. An exterior
// orbit only clears a floor that a previous floor scene pinned — a floor the
// visitor picked in Unit Search / the table survives Day ⇄ Night switches.
let sceneFloorFilter = "";
function applySceneFloorFilter(floorKey) {
    if (typeof TABLE_FILTERS !== "undefined") {
        if (floorKey) {
            TABLE_FILTERS.floor = floorKey;
            sceneFloorFilter = floorKey;
        } else if (sceneFloorFilter && TABLE_FILTERS.floor === sceneFloorFilter) {
            TABLE_FILTERS.floor = "";
            sceneFloorFilter = "";
        } else {
            sceneFloorFilter = "";
        }
    }

    const sel = document.getElementById("tableFloorFilter");
    if (sel && typeof TABLE_FILTERS !== "undefined") sel.value = TABLE_FILTERS.floor || "";

    if (typeof renderUnitsTable === "function") renderUnitsTable();
    if (typeof applyThreeUnitsFromSheet === "function") applyThreeUnitsFromSheet();
}

function buildFloorMenu() {
    const menu = document.getElementById("floorMenu");
    if (!menu) return;

    menu.innerHTML = MENU_ORDER.map(
        (key) =>
            `<button type="button" class="floor-menu-btn" data-scene="${key}">${SCENES[key].label}</button>`,
    ).join("");
    menu.classList.toggle("one-scene", MENU_ORDER.length < 2); // a project with one orbit has nothing to switch between

    menu.querySelectorAll(".floor-menu-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            // Choosing a floor from the top menu should NOT open (or keep open) the
            // units table — close it so the floor is visible in 3D.
            if (typeof closeUnitsTable === "function") closeUnitsTable();
            setScene(btn.dataset.scene);
        });
    });

    // The building view a floor screen goes back to (Day or Night, remembered in setScene) — the Back
    // button, and the Unit Search chips / table floor select when they lead off a floor plan.
    window.buildingScene = () => viewModePref || "exterior";
    document.getElementById("sceneBackBtn")?.addEventListener("click", () => {
        if (typeof closeUnitsTable === "function") closeUnitsTable();
        setScene(window.buildingScene());
    });

    updateFloorMenuActive();
}

function updateFloorMenuActive() {
    document.querySelectorAll("#floorMenu .floor-menu-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.scene === currentScene);
    });
}

// three now arrives via a deferred module, so wait for it. The frame
// preloader and the floor menu don't touch three and start immediately.
window.threeLibReady.then(initThreeOverlay);
preloadFrames();
buildFloorMenu();

/* Hide / show ALL units (the whole 3D overlay group). Hiding the group
   also disables hover/click on units via the guards in the raycast handlers. */
function setUnitsOverlayHidden(hidden) {
    unitsOverlayHidden = hidden;
    syncFloorsVisible();
    if (hidden) {
        if (typeof resetHoveredUnit === "function") resetHoveredUnit();
        if (typeof hideUnitHoverCard === "function") hideUnitHoverCard();
    }
    const btn = document.getElementById("hideUnitsToggle");
    if (btn) {
        // .is-hidden swaps the eye / eye-off SVG icons via CSS.
        btn.classList.toggle("is-hidden", hidden);
        const label = btn.querySelector("b");
        if (label) label.textContent = overlayToggleLabel(hidden);
    }
}
// "Units" or "Floors", after what the overlay model actually carries.
function overlayToggleLabel(hidden) {
    return (hidden ? "Show " : "Hide ") + (overlayHasFloors ? "Floors" : "Units");
}
function syncOverlayToggleLabel() {
    const btn = document.getElementById("hideUnitsToggle");
    if (!btn) return;
    const label = btn.querySelector("b");
    if (label) label.textContent = overlayToggleLabel(unitsOverlayHidden);
    btn.dataset.noun = overlayHasFloors ? "floors" : "units"; // the header button mirrors this
}
document
    .getElementById("hideUnitsToggle")
    ?.addEventListener("click", () => setUnitsOverlayHidden(!unitsOverlayHidden));

document
    .getElementById("mode3DToggle")
    ?.addEventListener("click", () => toggle3DMode());
