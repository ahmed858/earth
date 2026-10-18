/* =========================================================
   SUPABASE CONFIG  (images + units)
========================================================= */
// Values live in ./config.js (shared with admin/ and tools/).
const MZ = window.MAAZAR_CONFIG || {};
const SUPABASE_URL = MZ.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = MZ.SUPABASE_ANON_KEY || "";
const STORAGE_BUCKET = MZ.BACKGROUNDS_BUCKET || "backgrounds";
const FRAME_EXT = MZ.FRAME_EXT || "webp";
if (!SUPABASE_URL) console.warn("[config] config.js has no SUPABASE_URL — fill it in to load frames, units and the gallery.");
// FRAMES_BASE (optional, config.js) overrides the bucket — e.g. "data/_optimized"
// to preview the locally optimized frames before they are uploaded.
const STORAGE_PUBLIC_BASE = MZ.FRAMES_BASE || `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`;

/* Each scene is a 40-frame 360° orbit stored as
   <path>/high/<n>.webp  and  <path>/low/<n>.webp in the bucket
   (built by tools/optimize-frames.js, pushed by tools/upload-frames.js).
   camera names the baked render camera (BAKED_CAMERAS below) the orbit
   was shot with — Day is the street-level orbit, Night still the first,
   aerial one — so the 3D overlay lines up with whichever is on screen.
   unitFloor is the normalized floor key (see normalizeFloor) used to
   filter both the units list AND the 3D overlay; "" = show everything.
   showUnitsOverlay toggles the 3D overlay for the scene.
   Per-floor scenes can be added here once their orbits are rendered. */
/* The project this page shows — projects.js: ?project=<id> in the URL, else the default
   (Khawalid 20). Its scenes, floors, 3D models, map pin and texts all come from that entry;
   the scene table above describes the shape of SCENES. */
const PROJECT_ID = window.MAAZAR_PROJECT_ID;
const PROJECT = window.MAAZAR_PROJECT || { scenes: {}, floors: [], models: {} };
if (PROJECT.title || PROJECT.name) document.title = PROJECT.title || PROJECT.name;
const SCENES = PROJECT.scenes || {};
/* Rows of a floor marked `amenities: true` in projects.js (the basement's dining, majlis, entertainment) are
   shared spaces, not apartments: the unit panel, the hover card and the lists show them without bedrooms,
   price, Compare or the sales button. */
const AMENITY_FLOORS = new Set((PROJECT.floors || []).filter((f) => f.amenities).map((f) => String(f.key)));
window.isAmenityUnit = (unit) => !!unit && AMENITY_FLOORS.has(String(unit.floor || ""));
if (!SCENES.exterior) console.warn("[config] projects.js: project " + PROJECT_ID + " has no 'exterior' scene");
const SCENE_ORDER = (PROJECT.sceneMenu || Object.keys(SCENES)).filter((k) => SCENES[k]);
const FLOOR_MENU_ORDER = SCENE_ORDER.filter((k) => SCENES[k].still);
// Order of buttons in the menu (day exterior, night exterior, then floors).
const MENU_ORDER = SCENE_ORDER;
// The scene a floor volume opens when clicked ("" = that floor's units in Unit Search, as before).
const floorSceneFor = (floorKey) => Object.keys(SCENES).find((k) => SCENES[k].still && SCENES[k].unitFloor === floorKey) || "";
const sceneIsStill = (key = currentScene) => !!(SCENES[key] && SCENES[key].still);
const sceneFrames = (key = currentScene) => (sceneIsStill(key) ? 1 : TOTAL_FRAMES); // frames a scene has…
const sceneUsedCount = (key = currentScene) => (sceneIsStill(key) ? 1 : USED_COUNT); // …of which are loaded
let currentScene = "exterior";
let sceneToken = 0; // bumped on every scene switch to cancel stale image loads

/* These point at the active scene and change as you switch floors. */
const exteriorPath = (SCENES.exterior && SCENES.exterior.path) || "exterior/day";
let IMAGE_FOLDER = `${STORAGE_PUBLIC_BASE}/${exteriorPath}/high`;
let LOWRES_FOLDER = `${STORAGE_PUBLIC_BASE}/${exteriorPath}/low`;
// Frames are served with a one-year cache. Bump FRAMES_VERSION in
// config.js whenever the renders in the bucket are replaced, so browsers
// that cached the old orbit fetch the new one.
const FRAME_QS = MZ.FRAMES_VERSION ? `?v=${encodeURIComponent(MZ.FRAMES_VERSION)}` : "";

const BUTTON_STEP = 10;
const ANIMATION_SPEED = 35;

var frameImages = []; // points at the active scene's cache (see sceneFrameCache)
let loadedCount = 0;
window.loadedCount = loadedCount;
let currentFrame = 0;

let isAnimating = false;
let animationTimer = null;

/* let firstStopDone = false; */
let isInteractiveVisible = false;


