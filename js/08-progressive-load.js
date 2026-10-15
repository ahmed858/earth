/* =========================================================
   PROGRESSIVE LOADING  –  lowres first, hires in background
========================================================= */

const HIRES_CONCURRENT = 4;           // max simultaneous background hi-res fetches

// These point at the ACTIVE scene's cache (swapped by activateSceneFrameCache).
let hiresLoaded = new Array(TOTAL_FRAMES).fill(false);
let lowresLoaded = new Array(TOTAL_FRAMES).fill(false);
let _hiresImages = new Array(TOTAL_FRAMES).fill(null); // in-flight hi-res Image objects
let _lowresImages = [];               // in-flight low-res Image objects (for cancellation)
let _hiresQueue = [];               // ordered list of frame indices to load
let _hiresActive = 0;                // how many are currently in-flight

/* ── Per-scene frame cache ──────────────────────────────────────────────
   Every scene keeps its own loaded images + low/hi-res flags, so once a
   floor is downloaded it is NEVER fetched again when you return to it. */
const sceneFrameCache = {};

function getSceneFrameCache(key) {
    if (!sceneFrameCache[key]) {
        sceneFrameCache[key] = {
            frameImages: new Array(TOTAL_FRAMES).fill(undefined),
            hiresLoaded: new Array(TOTAL_FRAMES).fill(false),
            lowresLoaded: new Array(TOTAL_FRAMES).fill(false),
        };
    }
    return sceneFrameCache[key];
}

// Point the live globals at a scene's persistent cache + reset its transient trackers.
function activateSceneFrameCache(key) {
    const c = getSceneFrameCache(key);
    frameImages = c.frameImages;
    hiresLoaded = c.hiresLoaded;
    lowresLoaded = c.lowresLoaded;
    _hiresImages = new Array(TOTAL_FRAMES).fill(null);
    _lowresImages = [];
    _hiresQueue = [];
    _hiresActive = 0;
    loadedCount = lowresLoaded.reduce((n, v) => n + (v ? 1 : 0), 0);
}

// Circular distance between two frame indices on the 120-frame loop.
function circularFrameDist(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, TOTAL_FRAMES - d);
}

/* Load the ACTIVE scene's frames progressively, fetching ONLY what is not
   already cached for this scene (so a floor never re-downloads on return):
     1) low-res first — current angle first — loader shown until all are in,
     2) then hi-res in the background (throttled), current frame first.
   opts.initial uses the full-screen loader for the very first paint. */
function loadCurrentScene(opts) {
    const initial = !!(opts && opts.initial);
    const token = sceneToken;

    const showLoader = (show) => {
        if (initial) {
            if (mainLoader) mainLoader.style.display = show ? "flex" : "none";
        } else {
            showSceneLoader(show);
        }
    };
    const setPct = (pct) => {
        if (initial) {
            if (loadingText) loadingText.textContent = `Loading ${pct}%`;
        } else {
            setSceneLoaderPct(pct);
        }
    };

    // Show the current angle straight away if it is already cached for this scene.
    if (frameImages[currentFrame]) showFrame(currentFrame);

    // Which low-res frames are still missing for this scene?
    const missingLow = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!USED_SET.has(i) || i >= sceneFrames()) continue; // skip frames we deliberately don't load (a still has one)
        if (!lowresLoaded[i]) missingLow.push(i);
    }

    if (missingLow.length === 0) {
        // Fully cached — nothing to download, just display + top up any hi-res gaps.
        showLoader(false);
        imageElement.classList.remove("loading-frame");
        showFrame(currentFrame);
        _enqueueAllHires(); // queue is empty if hi-res is also complete
        return;
    }

    // Request the frame the user is on (and its neighbours) first.
    missingLow.sort(
        (a, b) => circularFrameDist(a, currentFrame) - circularFrameDist(b, currentFrame),
    );

    imageElement.classList.add("loading-frame");
    showLoader(true);
    setPct(Math.round((loadedCount / sceneUsedCount()) * 100));

    let pending = missingLow.length;
    let fails = 0;

    missingLow.forEach((i) => {
        const img = new Image();
        _lowresImages.push(img);

        const settle = () => {
            if (token !== sceneToken) return; // a newer scene took over — stop
            pending--;
            loadedCount = lowresLoaded.reduce((n, v) => n + (v ? 1 : 0), 0);
            setPct(Math.round((loadedCount / sceneUsedCount()) * 100));

            if (pending === 0) {
                showLoader(false); // all low-res in → dragging enabled
                imageElement.classList.remove("loading-frame");
                showFrame(currentFrame);
                if (fails < missingLow.length) _enqueueAllHires(); // hi-res in background
            }
        };

        img.onload = () => {
            if (token !== sceneToken) return;
            lowresLoaded[i] = true;
            if (!hiresLoaded[i]) {
                frameImages[i] = img;
                if (i === currentFrame) {
                    imageElement.src = img.src;
                    imageElement.classList.remove("loading-frame");
                }
            }
            settle();
        };

        img.onerror = () => {
            if (token !== sceneToken) return;
            fails++;
            settle();
        };

        img.src = `${LOWRES_FOLDER}/${i}.${FRAME_EXT}${FRAME_QS}`;
    });
}

// Initial first-paint load of the default scene (full-screen loader).
function preloadFrames() {
    activateSceneFrameCache(currentScene);
    loadCurrentScene({ initial: true });
}

// ── Phase 2: throttled background hi-res queue ───────────────────────────────

function _enqueueAllHires() {
    // Build queue: start from frame after current so visible area loads first
    _hiresQueue = [];
    for (let offset = 0; offset < TOTAL_FRAMES; offset++) {
        const idx = (currentFrame + offset) % TOTAL_FRAMES;
        if (!USED_SET.has(idx) || idx >= sceneFrames()) continue; // only background-load the frames we use
        if (!hiresLoaded[idx]) _hiresQueue.push(idx);
    }
    _pumpHiresQueue();
}

function _pumpHiresQueue() {
    while (_hiresActive < HIRES_CONCURRENT && _hiresQueue.length > 0) {
        const frameIdx = _hiresQueue.shift();
        if (hiresLoaded[frameIdx] || _hiresImages[frameIdx]) continue; // skip if done or in-flight

        _hiresActive++;
        const img = new Image();
        _hiresImages[frameIdx] = img;
        const token = sceneToken; // capture: ignore this load if the scene changes

        const onDone = () => {
            _hiresActive--;
            _hiresImages[frameIdx] = null;
            _pumpHiresQueue(); // pull next from queue
        };

        img.onload = () => {
            if (token !== sceneToken) return onDone(); // stale scene, discard
            hiresLoaded[frameIdx] = true;
            frameImages[frameIdx] = img;
            if (frameIdx === currentFrame) imageElement.src = img.src;
            onDone();
        };

        img.onerror = onDone;
        img.src = `${IMAGE_FOLDER}/${frameIdx}.${FRAME_EXT}${FRAME_QS}`;
    }
}

// Called on drag-end: move this frame to the front of the queue (or start it now)
function prioritizeHiresFrame(frameIdx) {
    if (hiresLoaded[frameIdx]) return;               // already hi-res, nothing to do

    if (_hiresImages[frameIdx]) return;              // already in-flight, let it finish

    // Remove from wherever it is in the queue and push to front
    _hiresQueue = _hiresQueue.filter(i => i !== frameIdx);
    _hiresQueue.unshift(frameIdx);
    _pumpHiresQueue();
}

// Called when the user STAYS on a frame (drag stops): rebuild the remaining
// hi-res queue so the current frame loads first, then its neighbours outward.
// This makes "the frame you're looking at" sharpen first, then the rest.
function reprioritizeHiresAround(centerFrame) {
    const remaining = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!USED_SET.has(i)) continue;
        if (!hiresLoaded[i] && !_hiresImages[i]) remaining.push(i);
    }

    const circularDist = (a) => {
        const d = Math.abs(a - centerFrame);
        return Math.min(d, TOTAL_FRAMES - d);
    };

    remaining.sort((a, b) => circularDist(a) - circularDist(b));
    _hiresQueue = remaining; // current frame (dist 0) is now first
    _pumpHiresQueue();
}
