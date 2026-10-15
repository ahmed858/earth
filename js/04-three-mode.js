/* =========================================================
   3D MODE STATE
========================================================= */
let is3DMode = false;
let pendingSceneLoad = false; // scene changed while in 3D; fetch on exit
let orbitControls = null;
let buildingCenter = null; // world centre of the shell, the orbit pivot

// Where the camera should pivot: the centre of the occluder's bounding
// box, dropped to roughly eye-level of the mass rather than its middle so
// orbiting doesn't feel like circling a floating object.
function getBuildingCenter() {
    if (buildingCenter) return buildingCenter;
    const source = occluderModel || unitsModel;
    if (!source) return new THREE.Vector3(0, 0, 0);
    const box = new THREE.Box3().setFromObject(source);
    buildingCenter = box.getCenter(new THREE.Vector3());
    buildingCenter.y = box.min.y + (box.max.y - box.min.y) * 0.35;
    return buildingCenter;
}

// Radius of the shell's bounding sphere, used to keep the camera outside
// the building and to scale the zoom limits to whatever model is loaded.
let _buildingRadius = 0;
function getBuildingRadius() {
    if (_buildingRadius) return _buildingRadius;
    const source = occluderModel || unitsModel;
    if (!source) return 100;
    const sphere = new THREE.Box3()
        .setFromObject(source)
        .getBoundingSphere(new THREE.Sphere());
    _buildingRadius = sphere.radius;
    return _buildingRadius;
}

/* Careful: the OrbitControls constructor runs an update() immediately,
   and with its default target of (0,0,0) that update points the camera at
   the world origin -- wiping the baked pose before anyone can read it.
   Callers must therefore capture the camera's orientation BEFORE calling
   this, and hand it in as `target` so the pose can be restored. */
function ensureOrbitControls(target) {
    if (orbitControls) return orbitControls;
    orbitControls = new THREE.OrbitControls(
        threeCamera,
        threeRenderer.domElement,
    );
    if (target) orbitControls.target.copy(target);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.rotateSpeed = 0.5;
    orbitControls.zoomSpeed = 0.9;
    orbitControls.panSpeed = 0.6;
    // Stop the camera dropping under the site; allow going high enough to
    // read the massing from above.
    orbitControls.maxPolarAngle = Math.PI * 0.495;
    orbitControls.enabled = false;
    return orbitControls;
}

/* Hand off from the photo orbit to the free camera.
  
   The whole effect depends on NOT moving the camera here: the baked pose
   for the current frame is already the exact pose the photo was rendered
   from, so if we just reveal the model in place, the photo appears to
   become 3D. Pointing OrbitControls' target down the camera's existing
   forward axis (rather than at the building centre) keeps that pose
   untouched -- setting target directly would swing the camera. */
function enter3DMode() {
    if (is3DMode || !threeReady || !occluderModel) return;
    is3DMode = true;

    const center = getBuildingCenter();

    // Read the baked pose FIRST -- constructing OrbitControls below will
    // immediately re-aim the camera, so this is the last moment the photo's
    // own orientation is still readable.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        threeCamera.quaternion,
    );
    // A shifted lens (see applyLensShift) is level but looks BELOW its axis:
    // the image centre is the axis pitched down by atan(shift · 2·tan(fov/2)).
    // Aim the pivot through the image centre, so the free camera -- which
    // has no shift -- frames the same spot the photo did.
    if (lensShiftApplied) {
        const pitch = Math.atan(lensShiftApplied * 2 * Math.tan((threeCamera.fov * Math.PI) / 360));
        const upAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(threeCamera.quaternion);
        forward.multiplyScalar(Math.cos(pitch)).addScaledVector(upAxis, -Math.sin(pitch)).normalize();
    }
    const distance = threeCamera.position.distanceTo(center);
    // Pivot at the building centre, but projected onto the current view
    // direction so the camera keeps its exact position AND orientation.
    const target = threeCamera.position
        .clone()
        .addScaledVector(forward, distance);

    const controls = ensureOrbitControls(target);
    controls.target.copy(target); // also covers the re-entry case
    // The street-level camera looks almost level: let the controls keep
    // that pose instead of lifting the camera to their usual floor.
    controls.maxPolarAngle = Math.max(Math.PI * 0.495, Math.min(Math.PI * 0.4995, forward.angleTo(new THREE.Vector3(0, 1, 0)) + 0.0005));

    threeCamera.near = CAMERA_NEAR;
    threeCamera.far = CAMERA_FAR;
    threeCamera.updateProjectionMatrix();

    // Re-derived once the dolly-zoom lands (see dollyZoomTo).
    controls.minDistance = getBuildingRadius() * 1.1;
    controls.maxDistance = distance * 3;
    controls.enabled = true;
    controls.update();

    setShellMode(); // solid on the exterior, ghosted on a floor view
    applyThree3DTheme(); // match the day/night scene you came from
    applyThreeUnitsFromSheet(); // repaint at 3D-mode opacity
    occluderModel.visible = true; // ignore the per-floor hide from setScene
    syncFloorsVisible(); // the floors show in 3D even when the photo scene has no baked camera
    setPhotoVisible(false);
    applyLensShift(null); // the free camera looks straight down its axis
    // Hand off at the photo's own 20deg lens so the reveal is seamless,
    // then dolly-zoom to a navigable 45deg.
    dollyZoomTo(FREE_FOV);
    update3DModeButton();
}

// Clip planes. The FBX models and the baked camera keys are in
// centimetres and the render camera orbits ~250 m out, so the far plane
// has to reach kilometres; near stays well above zero so the depth mask
// (shell vs units) keeps its precision.
const CAMERA_NEAR = 10, CAMERA_FAR = 400000;
/* How wide we open up to. This is a trade, not a taste call: holding the
   framing while the lens widens means the camera must travel inward, and
   the wider the target lens the further in it goes. The shell's bounding
   sphere is ~115 across a ~350 viewing distance, so 45deg would park the
   camera at ~149 -- inside the facade, looking at nothing. 30deg lands at
   ~230, safely outside, and still opens the perspective up noticeably. */
const FREE_FOV = 30;

/* The signature move. Widening the lens alone would just shrink the
   building and shove it off-centre -- so as the FOV opens, the camera
   also travels toward its target, holding `distance * tan(fov/2)`
   constant. The building stays exactly the same size on screen while the
   perspective deepens around it: you are physically moving in on the
   building without the frame appearing to change. (Hitchcock's vertigo
   shot, used here as the exterior->3D handoff.) */
let _fovTween = null;
function dollyZoomTo(targetFov, ms = 1100) {
    if (_fovTween) cancelAnimationFrame(_fovTween);

    const controls = ensureOrbitControls();
    const fromFov = threeCamera.fov;
    const fromDist = threeCamera.position.distanceTo(controls.target);
    // The framing constant we hold: half-height of the view at the target.
    const halfHeight = fromDist * Math.tan((fromFov * Math.PI) / 360);
    const axis = new THREE.Vector3()
        .subVectors(threeCamera.position, controls.target)
        .normalize();

    // Never let the inward travel put the camera inside the building. If
    // the requested lens would, ease off the framing constant instead --
    // the building growing slightly is far less broken than the camera
    // ending up in a wall.
    const minSafe = getBuildingRadius() * 1.35;

    const start = performance.now();
    const step = (now) => {
        const t = Math.min((now - start) / ms, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const fov = fromFov + (targetFov - fromFov) * eased;

        threeCamera.fov = fov;
        threeCamera.updateProjectionMatrix();
        // Distance that keeps the subject the same size at this new lens.
        const dist = Math.max(
            minSafe,
            halfHeight / Math.tan((fov * Math.PI) / 360),
        );
        threeCamera.position
            .copy(controls.target)
            .addScaledVector(axis, dist);
        controls.update();

        if (t < 1) {
            _fovTween = requestAnimationFrame(step);
        } else {
            _fovTween = null;
            /* Re-derive the zoom limits from where we actually ended up.
               OrbitControls measures distance from its target -- the building
               CENTRE -- so any distance below the bounding radius is already
               inside the mass. 1.1x keeps the camera just outside the skin.
               Going further in needs the interior work (culling the volumes
               you'd be standing in); until then it's a wash of one unit's
               colour, so the limit stops short of it deliberately. Use pan to
               bring a specific facade closer. */
            controls.minDistance = getBuildingRadius() * 1.1;
            controls.maxDistance = dist * 3;
        }
    };
    _fovTween = requestAnimationFrame(step);
}

function exit3DMode() {
    if (!is3DMode) return;
    is3DMode = false;

    if (orbitControls) orbitControls.enabled = false;

    threeCamera.near = CAMERA_NEAR;
    threeCamera.far = CAMERA_FAR;
    threeCamera.updateProjectionMatrix();

    setShellMode("mask");
    applyThreeUnitsFromSheet(); // back to the photo-overlay opacity
    syncFloorsVisible(); // hidden again on a photo scene whose camera is not baked

    // Fetch the photos for whatever scene we ended up on (see setScene).
    if (pendingSceneLoad) {
        pendingSceneLoad = false;
        loadCurrentScene();
    }
    // Restore the shell's overlay role: a mask behind unit boxes on the
    // exterior views, hidden otherwise (see shellMasksOverlay).
    if (occluderModel) occluderModel.visible = shellMasksOverlay();
    setPhotoVisible(true);
    // The lens has to be back at the baked FOV BEFORE the pose is restored,
    // or the overlay won't line up with the photo it's sitting on.
    if (_fovTween) cancelAnimationFrame(_fovTween);
    _fovTween = null;
    threeCamera.fov = bakedCamera().fov; // the lens this scene's frames were rendered with
    threeCamera.updateProjectionMatrix();
    updateThreeByFrame(currentFrame); // snap back onto the photo's pose
    update3DModeButton();
}

function toggle3DMode() {
    is3DMode ? exit3DMode() : enter3DMode();
}

/* Small public handle on the 3D view. The camera/scene are script-scoped
   `let`s, so nothing outside this script can reach them otherwise -- and
   other scripts in this file already drive the viewer from outside (see
   the embed helpers near the bottom). Also the only practical way to
   inspect the scene from the console. */
window.viewer3D = {
    enter: enter3DMode,
    exit: exit3DMode,
    toggle: toggle3DMode,
    get active() { return is3DMode; },
    get camera() { return threeCamera; },
    get scene() { return threeScene; },
    get controls() { return orbitControls; },
    get shell() { return occluderModel; },
    get units() { return unitsModel; },
    explode: (a) => setExplode(a),
    get explodeAmount() { return ex3dAmount; },
};

// Cross-fade the photo layer. The 3D canvas sits on top of it, so fading
// the photo out is what reveals the model.
function setPhotoVisible(visible) {
    const img = document.getElementById("backgroundImage");
    if (img) {
        img.style.transition = "opacity 0.6s ease";
        img.style.opacity = visible ? "1" : "0";
    }
    document.body.classList.toggle("mode-3d", !visible);
}

function update3DModeButton() {
    document.body.classList.toggle("is-3d", is3DMode);
    if (!is3DMode) {
        if (_ex3dTween) { cancelAnimationFrame(_ex3dTween); _ex3dTween = null; }
        setExplode(0); // collapse on exit
    }
    const btn = document.getElementById("mode3DToggle");
    if (!btn) return;
    btn.classList.toggle("active", is3DMode);
    const label = btn.querySelector("b");
    if (label) label.textContent = is3DMode ? "Exit 3D" : "3D View";
}
