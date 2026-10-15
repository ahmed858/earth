/* =========================================================
   EXPLODED FLOOR VIEW
   Fans the unit volumes apart along world-up, one step per floor, so
   each level reads as its own plate. The prototype highlight painted by
   applyThreeUnitsFromSheet carries straight through — that is the point
   of the view: you see where Admin / Commercial / Clinic sit on every
   floor at once.
  
   Mechanics: unit meshes are re-parented (Object3D.attach, which
   preserves world transforms) into one Group per floor. The groups are
   children of unitsModel, so traversal, the Hide-Units toggle and
   raycasting all keep working untouched. Offsets are authored in WORLD
   space and converted into unitsModel's local space, because the FBX
   root carries its own axis/scale conversion.
========================================================= */
const EX3D_FLOOR_ORDER = ["LG", "GF", "1", "2", "3", "RF"];
let ex3dGroups = null;      // [{ key, group, label }] bottom -> top
let ex3dAmount = 0;         // 0 = collapsed, 1 = fully spread
let ex3dGap = 0;            // world units between adjacent floors at amount 1

function ex3dFloorRank(key) {
    const i = EX3D_FLOOR_ORDER.indexOf(String(key));
    return i === -1 ? EX3D_FLOOR_ORDER.length : i;
}

function buildFloorGroups() {
    if (ex3dGroups || !unitsModel || (!overlayHasFloors && !allUnits?.length)) return ex3dGroups;

    const byFloor = new Map();
    forEachUnitMesh((mesh) => {
        const unit = mesh.userData.floorKey ? null : findUnitFromMesh(mesh);
        if (!unit && !mesh.userData.floorKey) return;
        const key = mesh.userData.floorKey || String(unit.floor || "");
        if (!byFloor.has(key)) byFloor.set(key, []);
        byFloor.get(key).push(mesh);
    });
    if (byFloor.size < 2) return null; // nothing to explode

    unitsModel.updateWorldMatrix(true, false);
    ex3dGroups = [...byFloor.keys()]
        .sort((a, b) => ex3dFloorRank(a) - ex3dFloorRank(b))
        .map((key) => {
            const group = new THREE.Group();
            group.name = "FLOOR_" + key;
            unitsModel.add(group);
            // attach() keeps each mesh exactly where it already is in the world
            byFloor.get(key).forEach((mesh) => group.attach(mesh));
            return { key, group };
        });

    // One floor-height-ish step, derived from the model rather than guessed.
    ex3dGap = Math.max(6, getBuildingRadius() * 0.22);
    return ex3dGroups;
}

/* World-space Y displacement expressed in unitsModel's local space. */
function ex3dLocalOffset(worldY, out) {
    unitsModel.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(unitsModel.matrixWorld).invert();
    const origin = new THREE.Vector3(0, 0, 0).applyMatrix4(inv);
    return (out || new THREE.Vector3())
        .set(0, worldY, 0)
        .applyMatrix4(inv)
        .sub(origin);
}

function setExplode(amount) {
    amount = Math.max(0, Math.min(1, Number(amount) || 0));
    if (!buildFloorGroups()) return;
    ex3dAmount = amount;

    const off = new THREE.Vector3();
    ex3dGroups.forEach((f, i) => {
        ex3dLocalOffset(i * ex3dGap * amount, off);
        f.group.position.copy(off);
    });

    // The shell would swallow the floors the moment they move, so it steps
    // aside while exploded and comes back when they close up. Only while
    // 3D is open: outside it the shell's visibility is scene-driven
    // (mask on exterior, hidden on a floor view) and not ours to set.
    if (occluderModel && is3DMode) occluderModel.visible = amount <= 0.001;
    document.body.classList.toggle("is-exploded", amount > 0.001);

    const range = document.getElementById("ex3dRange");
    if (range && Math.abs(+range.value / 100 - amount) > 0.005) range.value = Math.round(amount * 100);
    const btn = document.getElementById("ex3dToggle");
    if (btn) {
        const on = amount > 0.001;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        const lbl = document.getElementById("ex3dToggleLabel");
        if (lbl && lbl.dataset.i18nSkip !== "1") lbl.textContent = on ? "Collapse" : "Exploded view";
    }
    ex3dSyncLabels();
}

/* The toggle animates; the slider is direct. Fanning five plates apart
   instantly reads as a glitch rather than a section coming apart. */
let _ex3dTween = null;
function animateExplode(to, ms) {
    if (_ex3dTween) cancelAnimationFrame(_ex3dTween);
    const from = ex3dAmount, t0 = performance.now();
    ms = ms || 520;
    (function step(now) {
        const k = Math.min(1, (now - t0) / ms);
        // easeInOutCubic
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        setExplode(from + (to - from) * e);
        if (k < 1) _ex3dTween = requestAnimationFrame(step);
        else _ex3dTween = null;
    })(t0);
}

(function wireExplodeBar() {
    const btn = document.getElementById("ex3dToggle");
    const range = document.getElementById("ex3dRange");
    if (btn) btn.addEventListener("click", function () {
        animateExplode(ex3dAmount > 0.05 ? 0 : 0.6);
    });
    if (range) range.addEventListener("input", function () {
        if (_ex3dTween) { cancelAnimationFrame(_ex3dTween); _ex3dTween = null; }
        setExplode(+range.value / 100);
    });
})();

/* Floor labels: HTML over the canvas, projected from each group's centre.
   Cheaper and sharper than sprites, and they inherit the site's type. */
function ex3dLabelLayer() {
    let el = document.getElementById("ex3dLabels");
    if (!el) {
        el = document.createElement("div");
        el.id = "ex3dLabels";
        el.className = "ex3d-labels";
        (document.getElementById("threeOverlay") || document.body).appendChild(el);
    }
    return el;
}

const EX3D_FLOOR_TEXT = { LG: "Lower Ground", GF: "Ground", "1": "First", "2": "Second", "3": "Third", RF: "Roof" };
/* Built on first use, never at load: window.THREE is assigned by the
   type="module" block above, which runs AFTER every classic script, so
   anything constructed at top level here would throw and take the whole
   script down with it. */
let _ex3dBox = null, _ex3dPt = null;

function ex3dSyncLabels() {
    if (!_ex3dBox) { _ex3dBox = new THREE.Box3(); _ex3dPt = new THREE.Vector3(); }
    const layer = ex3dLabelLayer();
    const rotated = document.body.classList.contains("ui-rotated");
    if (!ex3dGroups || ex3dAmount < 0.05 || !is3DMode || rotated) {
        layer.innerHTML = ""; layer._built = 0; return;
    }

    if (layer._built !== ex3dGroups.length) {
        layer.innerHTML = ex3dGroups
            .map((f) => '<span class="ex3d-label">' + (EX3D_FLOOR_TEXT[f.key] || f.key) + "</span>")
            .join("");
        layer._built = ex3dGroups.length;
    }
    const rect = threeRenderer.domElement.getBoundingClientRect();
    const nodes = layer.children;
    ex3dGroups.forEach((f, i) => {
        const node = nodes[i];
        if (!node) return;
        _ex3dBox.setFromObject(f.group);
        if (_ex3dBox.isEmpty()) { node.style.opacity = "0"; return; }
        _ex3dBox.getCenter(_ex3dPt);
        _ex3dPt.x = _ex3dBox.min.x; // pin to the left edge of the plate
        _ex3dPt.project(threeCamera);
        if (_ex3dPt.z > 1) { node.style.opacity = "0"; return; }
        node.style.opacity = "1";
        node.style.left = ((_ex3dPt.x * 0.5 + 0.5) * rect.width) + "px";
        node.style.top = ((-_ex3dPt.y * 0.5 + 0.5) * rect.height) + "px";
    });
}

function renderThreeLoop() {
    requestAnimationFrame(renderThreeLoop);
    if (_pendingThreeFrame !== null) {
        updateThreeByFrame(_pendingThreeFrame);
        _pendingThreeFrame = null;
    }
    if (unitFocusActive) stepUnitFocus();
    // Damping means the controls keep easing for a few frames after the
    // pointer stops, so this has to run every frame, not just on input.
    if (is3DMode && orbitControls) orbitControls.update();
    if (ex3dAmount > 0.05 && is3DMode) ex3dSyncLabels();
    if (threeRenderer && threeScene && threeCamera) {
        threeRenderer.render(threeScene, threeCamera);
    }
}

// Hover "focus" effect: ease the hovered unit (hoveredUnitMesh) up to full
// opacity while every other unit fades to a dim value, so the one under the
// cursor pops. With nothing hovered, all units ease back to their resting
// opacity; the animation self-stops once that fade-back has settled.
const UNIT_FOCUS = { ease: 0.2 }; // the lift / dim of a unit box come from the dashboard (FLOOR_LOOK.units)
function stepUnitFocus() {
    if (!unitsModel) { unitFocusActive = false; return; }
    const focus = hoveredUnitMesh;
    let moving = false;
    forEachUnitMesh((mesh) => {
        if (!mesh.material || !mesh.visible) return;
        const rest = mesh.userData.restOpacity ?? FLOOR_LOOK.units.rest;
        const restE = mesh.userData.restEdgeOpacity ?? FLOOR_LOOK.units.edge;
        // A floor covers a whole storey of the photo, so it lifts (and the
        // others fade) far less than a single unit box does.
        const onPhoto = mesh.userData.floorKey && !is3DMode;
        const lift = onPhoto ? FLOOR_LOOK.lift : FLOOR_LOOK.units.lift;
        const dim = onPhoto ? FLOOR_LOOK.dim : FLOOR_LOOK.units.dim;
        let tgt, tgtE;
        if (!focus) {                // easing back to the resting look
            tgt = rest; tgtE = restE;
        } else if (mesh === focus) { // the hovered unit / floor lifts up
            tgt = Math.max(rest, lift); tgtE = (onPhoto ? FLOOR_LOOK.edge : FLOOR_LOOK.units.edge) > 0 ? 1 : 0; // outlines set to 0 stay off on hover too
        } else {                     // every other one fades back
            tgt = Math.min(rest, dim); tgtE = Math.min(restE, onPhoto ? FLOOR_LOOK.edgeDim : FLOOR_LOOK.units.edgeDim);
        }
        const o = mesh.material.opacity;
        mesh.material.opacity = o + (tgt - o) * UNIT_FOCUS.ease;
        if (Math.abs(tgt - mesh.material.opacity) > 0.004) moving = true;
        const edge = mesh.userData.edgeLine;
        if (edge && edge.material) {
            edge.material.opacity += (tgtE - edge.material.opacity) * UNIT_FOCUS.ease;
        }
    });
    // Once nothing is hovered and the fade-back has finished, stop animating.
    if (!focus && !moving) unitFocusActive = false;
}

// Convert a client (screen) point to Three.js NDC for the units canvas.
// When body.ui-rotated is set, the whole app is CSS-rotated 90deg
// (transform: rotate(90deg) translateY(-100%)), so getBoundingClientRect()
// reports an axis-aligned box while the canvas pixels are turned 90deg.
// Remap the pointer into the canvas's local space, otherwise clicks/hover
// would hit the wrong units.
function clientToUnitsNDC(clientX, clientY, out) {
    const rect = threeRenderer.domElement.getBoundingClientRect();
    out = out || new THREE.Vector2();
    if (document.body.classList.contains("ui-rotated")) {
        out.x = ((clientY - rect.top) / rect.height) * 2 - 1;
        out.y = ((clientX - rect.left) / rect.width) * 2 - 1;
    } else {
        out.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        out.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    return out;
}

function onThreeMouseMove(event) {
    // Skip expensive raycasting while the user is rotating frames.
    // Using a JS flag (not CSS pointer-events) so mouseup/click still reach the canvas.
    if (typeof hasDraggedFrame !== "undefined" && hasDraggedFrame) return;
    if (!floorsVisible()) return; // hidden, or a photo scene whose camera is not baked
    if (!unitsModel || !threeCamera || !threeRaycaster) return;

    clientToUnitsNDC(event.clientX, event.clientY, threeMouse);

    threeRaycaster.setFromCamera(threeMouse, threeCamera);

    // Meshes only: a box's outline (LineSegments) is hit first when a plan is seen from below (the basement's
    // camera), and as the hovered object it would be neither focused nor opened.
    const hits = threeRaycaster
        .intersectObject(unitsModel, true)
        .filter((hit) => hit.object.isMesh && hit.object.visible && !hit.object.userData.ghosted);

    if (!hits.length) {
        resetHoveredUnit();
        hideUnitHoverCard();
        return;
    }

    const mesh = hits[0].object;

    // A floor volume stands for its whole floor.
    if (mesh.userData.floorKey) {
        if (hoveredUnitMesh !== mesh) {
            hoveredUnitMesh = mesh;
            unitFocusActive = true;
            document.body.style.cursor = "pointer";
        }
        showFloorHoverCard(mesh.userData.floorKey, event);
        return;
    }

    const unit = findUnitFromMesh(mesh);

    if (!unit) {
        resetHoveredUnit();
        hideUnitHoverCard();
        return;
    }

    if (hoveredUnitMesh !== mesh) {
        // Focus this unit: the render loop eases it up to full opacity and fades
        // every other unit down so the hovered one clearly stands out.
        hoveredUnitMesh = mesh;
        unitFocusActive = true;
        document.body.style.cursor = "pointer";
    }

    showUnitHoverCard(unit, event);
}

function resetHoveredUnit() {
    // Release focus; the render loop eases every unit back to its resting opacity
    // (unitFocusActive stays on until that fade-back has settled).
    if (hoveredUnitMesh) unitFocusActive = true;
    hoveredUnitMesh = null;
    document.body.style.cursor = "";
    hideFloorHoverCard();
}

/* In 3D mode the frame-scrubber's own drag guard (blockClickAfterDrag) never
   arms, because canDragFrame() bows out to OrbitControls. Without this, every
   orbit of the camera ends in a click and pops open whichever unit happened to
   be under the cursor. Track the pointer travel and treat anything past a few
   pixels as a drag, not a click. */
let orbitPointerStart = null;
let orbitDidDrag = false;
const ORBIT_CLICK_SLOP = 5; // px

function onOrbitPointerDown(event) {
    orbitPointerStart = { x: event.clientX, y: event.clientY };
    orbitDidDrag = false;
}

function onOrbitPointerMove(event) {
    if (!orbitPointerStart) return;
    const dx = event.clientX - orbitPointerStart.x;
    const dy = event.clientY - orbitPointerStart.y;
    if (Math.hypot(dx, dy) > ORBIT_CLICK_SLOP) orbitDidDrag = true;
}

function onOrbitPointerUp() {
    orbitPointerStart = null;
}

function onThreeClick(event) {
    if (typeof blockClickAfterDrag !== "undefined" && blockClickAfterDrag) return;
    if (is3DMode && orbitDidDrag) return;
    if (!floorsVisible()) return; // hidden, or a photo scene whose camera is not baked

    let mesh = hoveredUnitMesh;

    // Touch / mobile: no mousemove before tap so hoveredUnitMesh is null.
    // Raycast directly at the click/tap position instead.
    if (!mesh && threeRaycaster && threeCamera && unitsModel && event) {
        const cx = (event.changedTouches ? event.changedTouches[0] : event).clientX;
        const cy = (event.changedTouches ? event.changedTouches[0] : event).clientY;
        const clickPt = clientToUnitsNDC(cx, cy);
        threeRaycaster.setFromCamera(clickPt, threeCamera);
        const hits = threeRaycaster
            .intersectObject(unitsModel, true)
            .filter(h => h.object.isMesh && h.object.visible && !h.object.userData.ghosted); // meshes only (see onThreeMouseMove)
        if (hits.length) mesh = hits[0].object;
    }

    if (!mesh) return;

    if (mesh.userData.floorKey) {
        const floorScene = floorSceneFor(mesh.userData.floorKey); // a floor with a render of its own opens it
        if (floorScene) { if (typeof closeUnitsTable === "function") closeUnitsTable(); setScene(floorScene); }
        else selectFloorFromOverlay(mesh.userData.floorKey);
        return;
    }

    const unit = findUnitFromMesh(mesh);

    if (unit) {
        highlightUnitInThree(unit);
        openUnit(unit);
    } else {
        console.log(
            "Clicked mesh — no matching sheet unit:",
            mesh.name || mesh.parent?.name,
            mesh
        );
    }
}

function normalizeFrame(frame) {
    return (frame + TOTAL_FRAMES) % TOTAL_FRAMES;
}

function showFrame(frame) {
    const normalized = sceneIsStill() ? 0 : snapToUsed(frame); // a still scene has the one frame
    currentFrame = normalized;

    scheduleThreeFrame(currentFrame);

    const cachedImg = frameImages[currentFrame];

    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        imageElement.classList.remove("loading-frame");
        imageElement.src = cachedImg.src;
        return;
    }

    imageElement.classList.add("loading-frame");

    const img = new Image();

    img.onload = () => {
        frameImages[normalized] = img;
        hiresLoaded[normalized] = true; // this fetched the hi-res file
        lowresLoaded[normalized] = true;

        if (currentFrame === normalized) {
            imageElement.src = img.src;

            requestAnimationFrame(() => {
                imageElement.classList.remove("loading-frame");
            });
        }
    };

    img.onerror = () => {
        console.warn(`Image load error frame ${normalized}`);
        imageElement.classList.remove("loading-frame");
    };

    img.src = `${IMAGE_FOLDER}/${normalized}.${FRAME_EXT}${FRAME_QS}`;
}



function setButtonsDisabled(disabled) {
    // No buttons now. Keep this function to avoid changing moveSmooth logic.
}

function showInteractiveContent() {
    interactiveContent.classList.remove("hidden");
    isInteractiveVisible = true;

    document
        .querySelectorAll("#interactiveContent video")
        .forEach((video) => {
            video.play().catch(() => { });
        });
}

function hideInteractiveContent() {
    hideUnitHoverCard();
    closeUnitSideMenu();
    interactiveContent.classList.add("hidden");
    isInteractiveVisible = false;

    document.getElementById("floorOverlay")?.classList.remove("show");
    document.getElementById("unitModal")?.classList.remove("show");
    document.getElementById("mediaModal")?.classList.remove("show");

    const mediaBody = document.getElementById("mediaBody");
    if (mediaBody) mediaBody.innerHTML = "";

    document
        .querySelectorAll("#interactiveContent video")
        .forEach((video) => {
            video.pause();
        });

    if (currentHotspot) {
        currentHotspot.classList.remove("active");
        currentHotspot = null;
    }
}

function moveSmooth(direction) {
    if (!imageElement.src) return;
    if (isAnimating || sceneIsStill()) return;

    // أول ما أتحرك من مكان فيه المحتوى، أخفيه
    if (isInteractiveVisible) {
        hideInteractiveContent();
    }

    isAnimating = true;
    setButtonsDisabled(true);

    let movedFrames = 0;

    animationTimer = setInterval(() => {
        movedFrames++;

        showFrame(currentFrame + direction * FRAME_STEP);

        if (movedFrames >= BUTTON_STEP) {
            clearInterval(animationTimer);
            animationTimer = null;

            isAnimating = false;
            setButtonsDisabled(false);

            // يظهر كل مرة الحركة تخلص وتقف على frame 30
            if (currentFrame === BUTTON_STEP) {
                showInteractiveContent();
            }
        }
    }, ANIMATION_SPEED);
}
function goNext() {
    moveSmooth(1);
}

function goPrev() {
    moveSmooth(-1);
}
