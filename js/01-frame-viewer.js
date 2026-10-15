/* =========================================================
 PART 1: 360 FRAMES WITH SMOOTH ARROWS ONLY
  ========================================================= */

const imageElement = document.getElementById("backgroundImage");
imageElement.addEventListener("load", () => {
    if (typeof resizeThreeOverlay === "function") {
        resizeThreeOverlay();
    }
});
const mainLoader = document.getElementById("mainLoader");
const loadingText = document.getElementById("loadingText");


const interactiveContent = document.getElementById("interactiveContent");

const TOTAL_FRAMES = 40; // 0..39 — one full 360° orbit (see tools/optimize-frames.py)

/* Load only every Nth captured frame to cut image downloads (high AND low
   res, every scene). The stored images (0..119) are NOT changed — we just
   skip some at load time, so the user can't tell they're "gone".
      1 = all 120 · 2 = 60 · 3 = 40 · 5 = 24 frames per scene.
   The orbit stays a full 360°; it only rotates in slightly larger steps.
   Pick a divisor of 120 (and, ideally, of 30 so the legacy frame-30
   interactive trigger still lands): good values are 2, 3, 5, 6. */
const FRAME_STEP = 1;
const USED_FRAMES = (() => {
    const a = [];
    for (let i = 0; i < TOTAL_FRAMES; i += FRAME_STEP) a.push(i);
    return a;
})();
const USED_COUNT = USED_FRAMES.length;
const USED_SET = new Set(USED_FRAMES);

// Snap any frame index to the nearest frame we actually load (wrapped 0..119),
// so the photo and the 3D overlay always rotate to the same loaded angle.
function snapToUsed(frame) {
    const n = ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    return (Math.round(n / FRAME_STEP) * FRAME_STEP) % TOTAL_FRAMES;
}
