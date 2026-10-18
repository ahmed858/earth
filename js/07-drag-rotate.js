/* =========================================================
   DRAG / SWIPE TO ROTATE FRAMES
========================================================= */

/* =========================================================
   FAST DRAG / SWIPE TO ROTATE FRAMES
========================================================= */

let isDraggingFrame = false;
let dragLastX = 0;
let dragLastY = 0;
let dragAccumulator = 0;
let blockClickAfterDrag = false;
let hasDraggedFrame = false;

const PIXELS_PER_FRAME = 18; // قلل الرقم لو عايزه أسرع: 2 سريع جدًا

function canDragFrame(event) {
    const target = event.target;

    // In 3D mode the drag belongs to OrbitControls; scrubbing frames would fight
    // it and change the photo nobody is looking at.
    if (is3DMode) return false;

    if (
        target.closest(".oc-header") ||
        target.closest(".usp") ||
        target.closest(".ulp") ||
        target.closest(".compare-drawer") ||
        target.closest(".ex3d-bar") ||
        target.closest("#galleryOverlay") ||
        target.closest(".wa-panel") ||
        target.closest(".units-table-drawer") ||
        target.closest(".units-table-toggle") ||
        target.closest(".units-table-resize-handle") ||
        target.closest(".unit-side-menu") ||
        target.closest(".unit-side-backdrop") ||
        target.closest(".media-modal") ||
        target.closest(".unit-modal") ||
        target.closest(".overlay") ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("textarea")
    ) {
        return false;
    }

    return true;
}

function updateInteractiveByFrame() {
    if (currentFrame === BUTTON_STEP) {
        showInteractiveContent();
    } else if (isInteractiveVisible) {
        hideInteractiveContent();
    }
}

function moveFrameFast(deltaX) {
    dragAccumulator += deltaX;

    // One "used" frame spans FRAME_STEP captured frames, so require proportionally
    // more drag distance per step. This keeps the rotation speed identical to when
    // all 120 frames were used.
    const pxPerUsedFrame = PIXELS_PER_FRAME * FRAME_STEP;
    const framesToMove = Math.trunc(Math.abs(dragAccumulator) / pxPerUsedFrame);
    if (framesToMove <= 0) return;

    // Only block clicks once we are sure this is a real drag (a frame actually moved)
    hasDraggedFrame = true;
    blockClickAfterDrag = true;
    document.body.classList.add("is-frame-dragging");

    // سحب شمال = قدام / سحب يمين = ورا
    const direction = dragAccumulator < 0 ? 1 : -1;

    // Step through the USED frames so we never land on a frame we didn't load.
    const usedIndex = Math.round(currentFrame / FRAME_STEP);
    const nextUsedIndex =
        (((usedIndex + direction * framesToMove) % USED_COUNT) + USED_COUNT) %
        USED_COUNT;
    const nextFrame = USED_FRAMES[nextUsedIndex];

    // مهم: showFrame تشتغل حتى لو الصورة مش محملة
    showFrame(nextFrame);

    if (typeof updateInteractiveByFrame === "function") {
        updateInteractiveByFrame();
    }

    dragAccumulator -=
        Math.sign(dragAccumulator) * framesToMove * pxPerUsedFrame;
}

function onFrameDragStart(event) {
    const isLoaded = typeof loadedCount !== "undefined" ? loadedCount : (window.loadedCount || 0);
    const requiredCount = typeof sceneUsedCount === "function" ? sceneUsedCount() : 0;
    if ((typeof sceneIsStill === "function" && sceneIsStill()) || isLoaded < requiredCount) return; // nothing to drag on a still scene
    if (!canDragFrame(event)) return;

    const point = event.touches ? event.touches[0] : event;
    if (!point) return;

    isDraggingFrame = true;
    dragLastX = point.clientX;
    dragLastY = point.clientY;
    dragAccumulator = 0;
    hasDraggedFrame = false;

    // Sync the Three.js canvas size to the current viewport before any drag movement.
    // Handles cases where the layout changed (mobile drawer resize, orientation, etc.)
    // since the last resize event.
    if (typeof resizeThreeOverlay === "function") resizeThreeOverlay();
}

function onFrameDragMove(event) {
    if (!isDraggingFrame) return;

    const point = event.touches ? event.touches[0] : event;

    let deltaX = point.clientX - dragLastX;
    let deltaY = point.clientY - dragLastY;

    // When the app is CSS-rotated 90deg for landscape mode, on-screen axes are
    // swapped relative to what the user sees. Remap the deltas so a horizontal
    // swipe (in the rotated view) still spins the panorama and a vertical swipe
    // is still treated as vertical. (Flip the signs if spin feels reversed.)
    if (document.body.classList.contains("ui-rotated")) {
        const screenDeltaX = deltaX;
        deltaX = deltaY;
        deltaY = -screenDeltaX;
    }

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        dragLastX = point.clientX;
        dragLastY = point.clientY;
        return;
    }

    if (Math.abs(deltaX) > 1) {
        if (typeof hideUnitHoverCard === "function") hideUnitHoverCard();
        if (typeof resetHoveredUnit === "function") resetHoveredUnit();

        moveFrameFast(deltaX);
    }

    dragLastX = point.clientX;
    dragLastY = point.clientY;

    if (event.cancelable) {
        event.preventDefault();
    }
}

function onFrameDragEnd() {
    const didDragFrame = hasDraggedFrame;

    isDraggingFrame = false;
    dragAccumulator = 0;
    hasDraggedFrame = false;

    document.body.classList.remove("is-frame-dragging");

    if (didDragFrame) {
        // User stopped on a frame: load its hi-res first, then nearest frames outward.
        reprioritizeHiresAround(currentFrame);
    }

    // Resync overlay size/position, then let the fade-in CSS transition show it
    requestAnimationFrame(() => {
        if (typeof resizeThreeOverlay === "function") resizeThreeOverlay();
        scheduleThreeFrame(currentFrame);
    });

    setTimeout(() => {
        blockClickAfterDrag = false;
    }, 100);
}

window.addEventListener("mousedown", onFrameDragStart);
window.addEventListener("mousemove", onFrameDragMove);
window.addEventListener("mouseup", onFrameDragEnd);

window.addEventListener("touchstart", onFrameDragStart, { passive: false });
window.addEventListener("touchmove", onFrameDragMove, { passive: false });
window.addEventListener("touchend", onFrameDragEnd);
window.addEventListener("touchcancel", onFrameDragEnd);
/* function preloadFrames() {
  loadedCount = 0;

  // حمل أول صورة بس عشان نبدأ الموقع بسرعة
  const firstImg = new Image();

  firstImg.onload = () => {
    frameImages[0] = firstImg;

    imageElement.src = firstImg.src;
    imageElement.classList.add("frame-ready");
    imageElement.classList.remove("loading-next-frame");

    mainLoader.style.display = "none";
    showFrame(0);

    // بعد أول صورة، حمل باقي الصور في الخلفية
    preloadRemainingFrames();
  };

  firstImg.onerror = () => {
    console.error(`First image load error: ${IMAGE_FOLDER}/0.${FRAME_EXT}${FRAME_QS}`);

    mainLoader.style.display = "none";

    // حتى لو أول صورة فشلت، حاول تكمل تحميل الباقي
    preloadRemainingFrames();
  };

  firstImg.src = `${IMAGE_FOLDER}/0.${FRAME_EXT}${FRAME_QS}`;
}
 */
/* function preloadRemainingFrames() {
  for (let i = 1; i < TOTAL_FRAMES; i++) {
    const img = new Image();

    img.onload = () => {
      loadedCount++;

      const percent = Math.round((loadedCount / (TOTAL_FRAMES - 1)) * 100);
      loadingText.textContent = `Loading ${percent}%`;

      frameImages[i] = img;
    };

    img.onerror = () => {
      loadedCount++;
      console.warn(`Image load error frame ${i}: ${IMAGE_FOLDER}/${i}.${FRAME_EXT}${FRAME_QS}`);
    };

    img.src = `${IMAGE_FOLDER}/${i}.${FRAME_EXT}${FRAME_QS}`;
    frameImages[i] = img;
  }
}
 */