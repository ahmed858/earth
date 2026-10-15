/* =========================================================
   3D MODE: WHITE MASSING MATERIALS
   The FBX carries no textures or UVs, so the look is built entirely from
   material response: matte white shell, tinted glass at the openings,
   slightly warmer slabs so floor lines read against the walls.
========================================================= */

// Doors and elevator doors are the only openings modelled in the shell,
// so they're what sells the building as glass-and-concrete rather than a
// solid lump. Matched on name because there are no materials to key off.
function isGlassMesh(name) {
    return /door/i.test(name || "");
}
function isSlabMesh(name) {
    return /slab/i.test(name || "");
}

/* Day / night palette for 3D mode.
  
   "Dark mode" in this app isn't a CSS theme -- it's the `night` scene
   (the sun/moon View Mode buttons just switch scenes). So the 3D view
   follows the same signal: whenever the active scene is the night orbit,
   the model renders dark to match the photo you toggled away from.
  
   The unit colours are deliberately NOT themed. Green/amber/red are the
   availability legend; re-tinting them by time of day would break the one
   thing the model exists to communicate. They're MeshBasic (unlit), so
   they keep full saturation and simply pop harder against a dark shell. */
const THREE_THEME = {
    day: {
        wall: 0xf4f2ee,
        slab: 0xe8e2d9,
        glass: 0x9fc4d8,
        ambient: 1.1,
        dir: 1.2,
        env: 1.0,
        exposure: 1.0,
    },
    /* Tuned by eye against the render, not derived: pushed darker than this
       and the roofs crush to flat black silhouettes with no form at all.
       The albedo stays a mid taupe (--brand-600 / --brand-700 of the
       stylesheet) rather than a true dark so the massing still catches
       enough light to show its shape. */
    night: {
        wall: 0x625447,
        slab: 0x4d4238,
        glass: 0x5f86bd,
        ambient: 0.55,
        dir: 0.8,
        env: 0.55,
        exposure: 0.95,
    },
};

/* Day/Night is a sticky preference, not a property of the active scene.
   Only `exterior` and `night` carry a time of day -- floor scenes are
   neither -- so keying the theme off currentScene would snap the model
   back to daylight the moment you picked a floor. setScene updates this
   only when you actually choose an exterior view. */
let viewModePref = "exterior";
function is3DNight() {
    return viewModePref === "night";
}
function three3DTheme() {
    return is3DNight() ? THREE_THEME.night : THREE_THEME.day;
}

/* The shell is OPAQUE and writes depth. That's what makes the model read
   as a building instead of a transparent jumble: without it, every far
   unit and every interior edge shows through the near faces at once.
   It plays exactly the role it already plays in photo mode -- hiding
   what's behind it -- except here it's also drawn rather than invisible.
  
   polygonOffset pushes the shell very slightly away from the camera in
   depth. The occluder's own per-floor volumes are coincident with the
   unit meshes, so without the nudge the two z-fight and the facade
   flickers between white and unit colour. The offset makes the units
   reliably win on shared surfaces. */
function makeShellMaterial(name) {
    const theme = three3DTheme();
    if (isGlassMesh(name)) {
        return new THREE.MeshPhysicalMaterial({
            color: theme.glass,
            metalness: 0.0,
            roughness: 0.08,
            ior: 1.45,
            transmission: 0.6,
            thickness: 4,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
        });
    }
    const slab = isSlabMesh(name);
    return new THREE.MeshStandardMaterial({
        color: slab ? theme.slab : theme.wall,
        metalness: 0.0,
        roughness: slab ? 0.95 : 0.8,
        side: THREE.DoubleSide, // FBX normals are unreliable from inside
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
}

/* The "ghost" shell: translucent and depth-neutral, for 3D floor views.
   A solid shell is right for the exterior, but on a single floor it
   swallows the very units you selected the floor to see -- which is why
   photo mode hides the shell outright on floor views. Ghosting keeps the
   building's outline as context instead of throwing it away. */
function makeShellGhostMaterial(name) {
    const theme = three3DTheme();
    const slab = isSlabMesh(name);
    return new THREE.MeshStandardMaterial({
        color: slab ? theme.slab : theme.wall,
        metalness: 0.0,
        roughness: slab ? 0.95 : 0.8,
        transparent: true,
        opacity: slab ? 0.5 : 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
}

/* Pick the shell's look:
     mask  – invisible depth-only writer, for the photo overlay
     solid – opaque white massing, for the 3D exterior
     ghost – translucent, for a 3D floor view
   Passing no mode re-derives the right one for the current state, so
   callers that change scene don't have to know the rules. */
function setShellMode(mode) {
    if (!occluderModel) return;
    if (!mode) {
        mode = !is3DMode
            ? "mask"
            : SCENES[currentScene] && SCENES[currentScene].unitFloor
                ? "ghost"
                : "solid";
    }
    occluderModel.traverse((child) => {
        if (!child.isMesh || !child.userData.maskMaterial) return;
        if (mode === "solid") {
            child.material = child.userData.solidMaterial;
        } else if (mode === "ghost") {
            child.userData.ghostMaterial =
                child.userData.ghostMaterial || makeShellGhostMaterial(child.name);
            child.material = child.userData.ghostMaterial;
        } else {
            child.material = child.userData.maskMaterial;
        }
    });
}

/* Re-tint the 3D view for the active scene's time of day.
  
   The shell materials are built once per mesh and cached, so switching
   Day/Night while already in 3D has to repaint those cached materials in
   place -- rebuilding them here would drop the cache and re-upload every
   material to the GPU on every toggle. Lights, IBL strength and exposure
   move together with the colours; darkening the albedo alone would just
   look like grey plastic under a midday sun. */
function applyThree3DTheme() {
    if (!threeRenderer || !threeScene) return;
    const theme = three3DTheme();

    if (occluderModel) {
        occluderModel.traverse((child) => {
            if (!child.isMesh) return;
            const slab = isSlabMesh(child.name);
            const glass = isGlassMesh(child.name);
            const tint = glass ? theme.glass : slab ? theme.slab : theme.wall;
            const solid = child.userData.solidMaterial;
            const ghost = child.userData.ghostMaterial;
            if (solid && solid.color) solid.color.setHex(tint);
            if (ghost && ghost.color) ghost.color.setHex(tint);
        });
    }

    if (ambientLight) ambientLight.intensity = theme.ambient;
    if (dirLight) dirLight.intensity = theme.dir;
    threeScene.environmentIntensity = theme.env;
    threeRenderer.toneMappingExposure = theme.exposure;

    // Drives the viewer backdrop behind the model (see body.mode-3d CSS).
    document.body.classList.toggle("mode-3d-night", is3DNight());
}

const HAS_3D_MODELS = !!(THREE_ASSETS.units && THREE_ASSETS.occluder);
/* The overlay model — floor volumes or unit boxes — is loaded once per file and
   kept: a scene can draw its own (SCENES[*].units, the ground floor's unit boxes)
   instead of config.js UNITS_FBX, and setScene swaps them with useOverlayModel.
   A slow load never installs a model the visitor has already left. */
let threeLoader = null;     // the FBXLoader, once three is up
let overlayWanted = "";     // the file the current scene asked for
const overlayModels = {};   // file → Promise<Group>
function loadOverlayModel(file) {
    if (!overlayModels[file]) overlayModels[file] = new Promise((resolve, reject) => {
        threeLoader.load(file, (loaded) => {
            // A file whose only top-level node is a group (boxes under a ROOF dummy) comes back as
            // that group itself — with its own transform, and without the file's unit (three unwraps
            // it). So the axis conversion goes on a wrapper of our own, never on the loaded object;
            // a metres export of that shape still draws 100× too small — fix-fbx.js --to-cm fixes it.
            if (loaded.userData.unitScaleFactor == null) console.info("[3d] " + file + ": the file's unit is not known (a lone top-level group hides it) — taken as cm; if it was exported in metres, run tools/fix-fbx.js --to-cm");
            const obj = new THREE.Group();
            obj.name = "UNITS";
            obj.userData.unitScaleFactor = loaded.userData.unitScaleFactor;
            obj.add(loaded);
            applyModelUpAxis(obj);
            // Collected first: the floor set-up adds child meshes, which a
            // traverse() still in progress would walk into.
            const overlayMeshes = [];
            obj.traverse((child) => { if (child.isMesh) overlayMeshes.push(child); });
            overlayMeshes.forEach((child) => {
                child.renderOrder = 1;
                child.userData.isUnit = true;

                // One mesh per floor (GROUND_SELECT, FIRST_SELECT, …) or one per unit.
                const floorKey = floorKeyFromMeshName(child.name);
                if (floorKey) {
                    child.userData.floorKey = floorKey;
                    setupFloorMesh(child);
                    return;
                }

                child.material = new THREE.MeshBasicMaterial({
                    color: 0x22c55e,
                    transparent: true,
                    opacity: FLOOR_LOOK.units.rest,
                    depthWrite: false,
                    depthTest: true,
                    side: THREE.DoubleSide,
                    // push the faces back a hair so the box's own outline wins
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1,
                });

                // Optional outline (UNIT_OUTLINES). Off by default: the
                // 8 cm gap between boxes (tidyUnitGeometry) already keeps
                // neighbours apart, and the lines cluttered the photo.
                if (UNIT_OUTLINES) {
                    const edgeLine = new THREE.LineSegments(
                        new THREE.EdgesGeometry(child.geometry, 20),
                        new THREE.LineBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: FLOOR_LOOK.units.edge,
                            depthTest: true,
                            depthWrite: false,
                        }),
                    );
                    edgeLine.renderOrder = 2;
                    edgeLine.userData.isUnitEdge = true;
                    child.add(edgeLine);
                    child.userData.edgeLine = edgeLine;
                }
            });
            obj.userData.hasFloors = overlayMeshes.some((m) => m.userData.floorKey);
            resolve(obj);
        }, undefined, (err) => { console.error("Units FBX load error", file, err); reject(err); });
    });
    return overlayModels[file];
}
function useOverlayModel(file) {
    overlayWanted = file;
    if (!threeLoader || !threeScene) return; // three is not up yet: initThreeOverlay picks overlayWanted up
    if (!file) { if (unitsModel) { threeScene.remove(unitsModel); unitsModel = null; } return; }
    loadOverlayModel(file).then((obj) => {
        if (overlayWanted !== file || unitsModel === obj) return; // the visitor moved on, or nothing to do
        if (unitsModel) threeScene.remove(unitsModel);
        if (typeof resetHoveredUnit === "function") resetHoveredUnit();
        unitsModel = obj;
        overlayHasFloors = !!obj.userData.hasFloors;
        syncOverlayToggleLabel();
        if (occluderModel && !is3DMode) occluderModel.visible = shellMasksOverlay();
        threeScene.add(unitsModel);
        // مهم: أول ما الـ FBX يتحمل، طبّق ألوان الشيت والفلاتر عليه
        applyThreeUnitsFromSheet();
        syncFloorsVisible(); // the Hide Units toggle, and only on a scene whose camera is baked
        scheduleThreeFrame(currentFrame);
    }).catch(() => { /* logged by the loader */ });
}

function initThreeOverlay() {
    const holder = document.getElementById("threeOverlay");
    if (!HAS_3D_MODELS) {
        console.info("[3d] no unit/occluder models configured — 3D layer disabled");
        document.body.classList.add("no-3d");
        if (holder) holder.style.display = "none";
        return;
    }
    if (!holder || !window.THREE || !THREE.FBXLoader) {
        console.error("Three.js or FBXLoader not loaded");
        return;
    }

    threeScene = new THREE.Scene();

    const coverRect = getBackgroundCoverRect();

    threeCamera = new THREE.PerspectiveCamera(
        bakedCamera().fov,
        coverRect.aspect,
        CAMERA_NEAR,
        CAMERA_FAR
    );
    threeCamera.up.set(0, 1, 0);

    threeRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
    });
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    threeRenderer.setSize(
        Math.round(coverRect.width),
        Math.round(coverRect.height),
        false
    );
    threeRenderer.setClearColor(0x000000, 0);
    // r152+ renamed outputEncoding -> outputColorSpace. ACES tone mapping is
    // what stops the white massing model from blowing out to flat paper in
    // 3D mode; it costs nothing in overlay mode where everything is unlit.
    threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeRenderer.toneMappingExposure = 1.0;
    holder.appendChild(threeRenderer.domElement);
    resizeThreeOverlay();
    // Kept on refs so the day/night palette can re-tune them (see
    // applyThree3DTheme). Both are unused while the units are MeshBasic.
    ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    threeScene.add(ambientLight);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 500, 300);
    threeScene.add(dirLight);

    // Image-based lighting for 3D mode. RoomEnvironment is generated in
    // code (no HDR to download) and is what gives the untextured white
    // massing its soft gradients instead of a flat matte silhouette.
    const pmrem = new THREE.PMREMGenerator(threeRenderer);
    threeScene.environment = pmrem.fromScene(
        new THREE.RoomEnvironment(),
        0.04,
    ).texture;
    pmrem.dispose();

    threeRaycaster = new THREE.Raycaster();
    threeMouse = new THREE.Vector2();

    const loader = new THREE.FBXLoader();

    loader.load(THREE_ASSETS.occluder, (obj) => {
        occluderModel = obj;
        occluderModel.name = "OCCLUDER";
        applyModelUpAxis(occluderModel);
        occluderModel.traverse((child) => {
            if (child.isMesh) {
                child.renderOrder = 0;
                // Two materials per shell mesh, swapped by setShellMode():
                //  · "mask"  – the original depth-only writer. Invisible, but it
                //              fills the depth buffer so units behind a wall stay
                //              hidden while the photo is what you actually see.
                //  · "solid" – the white massing look for 3D mode.
                // Kept side by side (not rebuilt on toggle) so switching modes is
                // instant and can't drop the depth mask mid-render.
                child.userData.maskMaterial = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    colorWrite: false,
                    depthWrite: true,
                    depthTest: true,
                });
                child.userData.solidMaterial = makeShellMaterial(child.name);
                child.material = child.userData.maskMaterial;
            }
        });
        threeScene.add(occluderModel);

        // Masks the overlay only where that helps (see shellMasksOverlay).
        occluderModel.visible = shellMasksOverlay();
        scheduleThreeFrame(currentFrame);
        occluderSettled = true;
        applyThreeUnitsFromSheet(); // the floor volumes were waiting for the shell's height
    }, undefined, (err) => {
        console.error("Occluder FBX load error", err);
        occluderSettled = true;
        applyThreeUnitsFromSheet();
    });

    // The overlay model the current scene wants (its own, or config.js UNITS_FBX) — see useOverlayModel.
    threeLoader = loader;
    useOverlayModel(overlayWanted || THREE_ASSETS.units);

    holder.addEventListener("mousemove", onThreeMouseMove);
    holder.addEventListener("mouseleave", resetHoveredUnit);
    holder.addEventListener("click", onThreeClick);
    // Distinguish an orbit drag from a unit click (see onOrbitPointerDown).
    holder.addEventListener("pointerdown", onOrbitPointerDown);
    window.addEventListener("pointermove", onOrbitPointerMove);
    window.addEventListener("pointerup", onOrbitPointerUp);

    window.addEventListener("resize", resizeThreeOverlay);

    threeReady = true;
    updateThreeByFrame(currentFrame);
    renderThreeLoop();
}

function resizeThreeOverlay() {
    if (!threeCamera || !threeRenderer) return;

    const holder = document.getElementById("threeOverlay");

    // Note: this cover rect is used in 3D mode too. object-fit:cover guarantees
    // it's at least as large as the viewer in both axes, so it already fills the
    // screen -- and keeping one aspect across both modes is what stops the view
    // from jumping at the moment of handoff.
    const rect = getBackgroundCoverRect();

    // نخلي الـ Three overlay واخد نفس حجم ومكان الصورة بعد object-fit: cover
    holder.style.left = `${rect.left}px`;
    holder.style.top = `${rect.top}px`;
    holder.style.width = `${rect.width}px`;
    holder.style.height = `${rect.height}px`;

    // مهم جدًا: ما تستخدمش aspect الشاشة
    // استخدم aspect الصورة الأصلية اللي الكاميرا اتعملت عليها
    threeCamera.aspect = rect.aspect;
    threeCamera.updateProjectionMatrix();

    threeRenderer.setSize(
        Math.round(rect.width),
        Math.round(rect.height),
        false
    );
}

function updateThreeByFrame(frame) {
    if (!threeReady || !threeCamera) return;
    // In 3D mode the user owns the camera; baked frame poses would fight
    // OrbitControls and snap the view back on every scene/frame update.
    if (is3DMode) return;

    const safeFrame = normalizeFrame(frame);
    const cam = bakedCamera();
    const pos = cam.byFrame.get(safeFrame) || cam.byFrame.get(0);

    if (pos) {
        threeCamera.position.set(pos[0], pos[1], pos[2]);
    }

    const q = cam.rotation_XYZW, qIndex = Math.min(safeFrame, q.length / 4 - 1) * 4; // a still camera has one key
    if (q.length >= qIndex + 4) {
        threeCamera.quaternion.set(q[qIndex], q[qIndex + 1], q[qIndex + 2], q[qIndex + 3]);
    }

    // Day and Night were shot through different lenses.
    if (threeCamera.fov !== cam.fov) {
        threeCamera.fov = cam.fov;
        threeCamera.updateProjectionMatrix();
    }
    applyLensShift(cam);

    threeCamera.updateMatrixWorld(true);
}

/* A render made with the renderer's vertical tilt correction (Corona /
   V-Ray "auto vertical tilt") is shot through a LEVEL camera whose lens is
   shifted down, so verticals stay vertical — a tilted camera cannot
   reproduce it (it fits one strip of the image and drifts elsewhere).
   Such a camera is baked level (the pitch removed) with `shift`: the
   fraction of the frame height the image is shifted up by. Drawn here as
   an off-centre projection (three's view offset); the raycaster reads the
   projection matrix, so hover and click follow. */
let lensShiftApplied = null;
function applyLensShift(cam) {
    const shift = cam && Number(cam.shift) ? Number(cam.shift) : 0;
    if (shift === lensShiftApplied) return;
    lensShiftApplied = shift;
    if (shift) {
        const h = 1000, w = threeCamera.aspect * h; // ratios are all that matter; fullWidth/fullHeight keeps the aspect
        threeCamera.setViewOffset(w, h, 0, shift * h, w, h);
    } else {
        threeCamera.clearViewOffset();
    }
}

let _pendingThreeFrame = null;

function scheduleThreeFrame(frame) {
    _pendingThreeFrame = frame;
}
