(function () {
    "use strict";

    /* ---------------------------------------------------------
       CONFIG — edit coordinates / labels / links freely.
       Khawalid 20 sits in Al Ma'athar Ash Shamali, Riyadh — between
       Panorama Mall and Makkah Al Mukarramah Road, with King Fahd
       Branch Road to the east (brochure "Landmarks" page). Landmark
       coordinates come from OpenStreetMap. The project pin is the
       confirmed plot on Prince Sultan Bin Abdulaziz Rd, between Om Al
       Woroud Alley and Thamama Ibn Oday (24°40'56.7"N 46°40'09.0"E).
       `logo` is the picture its map markers carry (see .brand-logo).
    --------------------------------------------------------- */
    // The projects on the map (projects.js) and the one this page is about: its pin is the centre
    // of the project step; the other projects' chips show on the Riyadh step and open their own
    // project (the page reloads into it, straight on that step — openProject).
    const PROJECTS = window.MAAZAR_PROJECTS || {};
    const PROJECT_ID = window.MAAZAR_PROJECT_ID;
    const PROJECT = window.MAAZAR_PROJECT || {};
    const escHtml = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
    const pinOf = function (id) {
        const p = PROJECTS[id] || {};
        return { id: id, name: p.name || id, logo: p.logo || "01 copy - Copy.png", logoClass: p.logoClass || "brand-logo", lat: p.lat, lng: p.lng };
    };
    const OC = pinOf(PROJECT_ID);
    const OTHER_PROJECTS = Object.keys(PROJECTS).filter(function (id) { return id !== PROJECT_ID && isFinite(PROJECTS[id].lat) && isFinite(PROJECTS[id].lng); }).map(pinOf);
    function openProject(id) {
        // Into another project: reload with it, skipping the home screen, landing on its project step.
        window.location.href = window.location.pathname + "?project=" + encodeURIComponent(id) + "&level=3&nohero";
    }

    // Clicking OC enters the existing 360 viewer (same site). To send
    // visitors to an external URL instead, set this to that URL string.
    const OC_LINK = null; // e.g. "https://ocmall.com"

    const ICONS = {
        pin: '<svg viewBox="0 0 24 24"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L11 19v-5.5z"/></svg>',
        home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
        building: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>',
        calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
        route: '<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 003-3V8M16 5H9a3 3 0 00-3 3v8"/></svg>',
        road: '<svg viewBox="0 0 24 24"><path d="M4 21 9 3h6l5 18"/><path d="M12 6v3M12 12v3M12 18v3"/></svg>',
        ring: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    };

    // The places called out on the brochure location map, west → east
    // along the Suez Road. `img` (optional) is the photo shown at the top
    // of the destination card; leave it out to get an icon banner instead.
    // `desc` is the one-line blurb under the distance / time chips.
    const DESTS = (PROJECT.landmarks || []).map(function (d) { return Object.assign({}, d); });

    // Driving only — the card shows the real OSRM driving duration.
    const OSRM = "https://router.project-osrm.org/route/v1/driving/";

    /* ---------------------------------------------------------
       THE JOURNEY — the visitor arrives looking at the Earth and
       steps in one click at a time, all on a single map:
         0 Earth          the globe, a few city names, the country chip
         1 Saudi Arabia   the Riyadh zone, highlighted
         2 Riyadh         the city, with the project pin
         3 Khawalid 20    landmarks, routes and the proximity strip
       `label` is the name shown in the header control (and its menu),
       `hint` the line of guidance under the header. Set START_LEVEL
       to 3 to skip the journey and open straight on the project map.
    --------------------------------------------------------- */
    const LEVELS = [
        { label: "Earth", hint: "Select Saudi Arabia to begin" },
        { label: "Saudi Arabia", hint: "Select the highlighted zone" },
        { label: "Riyadh", hint: "Choose a project" },
        { label: OC.name, hint: PROJECT.hint || ("Tap a place to see distance & time from " + OC.name) },
    ];
    // ?level=0…3 opens the map on that step (openProject lands on the project step this way).
    const START_LEVEL = (function () {
        const v = parseInt(new URLSearchParams(window.location.search).get("level"), 10);
        return v >= 0 && v <= 3 ? v : 0;
    })();

    const EARTH_CENTER = [45.2, 23.6];      // what the globe faces on arrival [lng, lat]
    const COUNTRY_CHIP = [43.4, 23.8];      // where the "Saudi Arabia" chip sits
    const ZONE_LABEL = [46.752, 24.722];  // where the "Riyadh" name sits
    const CITY_VIEW = [[46.585, 24.60], [46.80, 24.80]]; // always in frame at the Riyadh step [sw, ne]

    // City names on the globe — orientation only, never clickable.
    const WORLD_CITIES = [
        { name: "London", at: [-0.12, 51.5] },
        { name: "Istanbul", at: [28.98, 41.01] },
        { name: "Cairo", at: [31.24, 30.04] },
        { name: "Dubai", at: [55.27, 25.2] },
        { name: "Mumbai", at: [72.88, 19.08] },
        { name: "Singapore", at: [103.82, 1.35] },
        { name: "Tokyo", at: [139.69, 35.68] },
        { name: "New York", at: [-74.0, 40.71] },
    ];

    // A shade of the brand palette for the map style and the canvases, which
    // cannot read CSS variables themselves: tone(300), tone(950, 0.45).
    // The numbers are the --brand-* tokens of the stylesheet.
    const brandTokens = getComputedStyle(document.documentElement);
    function tone(n, alpha) {
        const rgb = brandTokens.getPropertyValue("--brand-" + n).trim() || "120, 104, 88";
        return alpha === undefined ? "rgb(" + rgb + ")" : "rgba(" + rgb + ", " + alpha + ")";
    }

    // Outlines, as flat [lng, lat, lng, lat, …] lists to stay compact:
    //   ZONE      Riyadh's city limits (its 14 sub-municipalities, merged)
    //   DISTRICT  Al Ma'athar Ash Shamali, the project's district
    //   COUNTRY   Saudi Arabia's mainland (Natural Earth 1:50m)
    // ZONE and DISTRICT are simplified from © OpenStreetMap contributors.
    const ZONE = ring([
        46.4421, 24.5657, 46.4605, 24.5609, 46.5092, 24.5423, 46.6334, 24.503, 46.6533, 24.4895, 46.7767, 24.5118,
        46.7994, 24.4838, 46.834, 24.5099, 46.8653, 24.5488, 46.8499, 24.5586, 46.8706, 24.5826, 46.8712, 24.5888,
        46.9128, 24.5965, 46.9024, 24.6484, 46.8995, 24.6555, 46.8572, 24.6546, 46.8553, 24.7176, 46.8692, 24.7267,
        46.8652, 24.7367, 46.8557, 24.7436, 46.8679, 24.7507, 46.8906, 24.7508, 46.8902, 24.7633, 46.904, 24.7635,
        46.8936, 24.7692, 46.8783, 24.7815, 46.8892, 24.7964, 46.9051, 24.7758, 46.9042, 24.7744, 46.9403, 24.7784,
        46.9493, 24.7989, 46.9661, 24.812, 46.9753, 24.8145, 46.9731, 24.8225, 46.9781, 24.8357, 47.0024, 24.8481,
        47.0212, 24.8656, 47.0433, 24.8707, 47.0556, 24.8806, 47.0623, 24.8799, 47.0533, 24.923, 47.0416, 24.9519,
        47.0136, 24.942, 47.0103, 24.9415, 47.002, 24.9443, 46.9902, 24.9449, 46.9735, 24.9402, 46.9557, 24.9263,
        46.94, 24.9198, 46.9137, 24.9033, 46.9033, 24.8948, 46.8927, 24.8913, 46.8866, 24.8877, 46.8781, 24.8789,
        46.8704, 24.8597, 46.8501, 24.8395, 46.8069, 24.8282, 46.7223, 24.7926, 46.7136, 24.8125, 46.7149, 24.818,
        46.7213, 24.8294, 46.7086, 24.8206, 46.7003, 24.8193, 46.6795, 24.8541, 46.5842, 24.8138, 46.5804, 24.8105,
        46.5732, 24.7995, 46.5648, 24.7968, 46.5688, 24.7831, 46.5904, 24.7364, 46.5847, 24.7303, 46.5838, 24.7184,
        46.5803, 24.7108, 46.5601, 24.6895, 46.5579, 24.6848, 46.5573, 24.6762, 46.5537, 24.6767, 46.5469, 24.6749,
        46.5305, 24.6786, 46.5257, 24.6746, 46.5118, 24.6751, 46.4932, 24.6695, 46.4718, 24.6446, 46.4621, 24.6253,
        46.4547, 24.6065, 46.4421, 24.5657,
    ]);
    const DISTRICT = ring(PROJECT.outline && PROJECT.outline.length >= 8 ? PROJECT.outline
        : [OC.lng - 0.004, OC.lat - 0.004, OC.lng + 0.004, OC.lat - 0.004, OC.lng + 0.004, OC.lat + 0.004, OC.lng - 0.004, OC.lat + 0.004, OC.lng - 0.004, OC.lat - 0.004]); // the project's district (projects.js → outline)
    const COUNTRY = ring([
        51.98, 19, 49.04, 18.58, 48.17, 18.16, 47.58, 17.45, 47.44, 17.11, 47.14, 16.95, 46.98, 16.95,
        46.73, 17.27, 46.31, 17.23, 45.54, 17.3, 45.15, 17.43, 44.16, 17.4, 43.92, 17.32, 43.42, 17.52,
        43.19, 17.36, 43.24, 17.27, 43.16, 17.2, 43.12, 16.94, 43.18, 16.81, 43.17, 16.69, 42.8, 16.37,
        42.7, 16.74, 42.39, 17.12, 42.3, 17.44, 41.75, 17.88, 41.43, 18.45, 41.23, 18.68, 41.12, 19.08,
        40.76, 19.75, 40.08, 20.27, 39.88, 20.29, 39.73, 20.39, 39.27, 20.97, 39.09, 21.31, 39.15, 21.52,
        38.99, 21.88, 39.09, 22.39, 39.06, 22.59, 38.46, 23.71, 37.92, 24.18, 37.54, 24.29, 37.18, 24.82,
        37.27, 24.96, 37.15, 25.29, 36.92, 25.64, 36.76, 25.75, 36.68, 26.04, 36.52, 26.1, 36.25, 26.59,
        35.58, 27.43, 35.18, 28.04, 34.72, 28.13, 34.62, 28.06, 34.78, 28.51, 34.95, 29.35, 36.07, 29.2,
        36.48, 29.5, 36.75, 29.87, 37.47, 30, 37.63, 30.31, 37.98, 30.5, 36.96, 31.49, 38.96, 32, 39.14, 32.13,
        40.37, 31.94, 42.08, 31.08, 44.69, 29.2, 46.36, 29.06, 46.53, 29.1, 47.43, 28.99, 47.67, 28.53,
        48.44, 28.54, 48.63, 28.13, 48.81, 27.9, 48.8, 27.72, 49.24, 27.49, 49.17, 27.44, 49.41, 27.18,
        49.54, 27.15, 49.72, 26.96, 49.98, 26.83, 50.15, 26.66, 50.01, 26.68, 50.03, 26.53, 50.19, 26.41,
        50.22, 26.31, 50.15, 26.1, 50.03, 26.11, 50.24, 25.62, 50.46, 25.42, 50.56, 25.09, 50.93, 24.59,
        51.41, 24.57, 51.31, 24.34, 51.57, 24.29, 51.59, 24.08, 52.56, 22.93, 55.1, 22.62, 55.19, 22.7, 55.64, 22,
        54.98, 20, 51.98, 19,
    ]);
    function ring(flat) {
        const out = [];
        for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
        return out;
    }
    function boundsOf(points) {
        const b = [[Infinity, Infinity], [-Infinity, -Infinity]];
        points.forEach(function (p) {
            b[0][0] = Math.min(b[0][0], p[0]); b[0][1] = Math.min(b[0][1], p[1]);
            b[1][0] = Math.max(b[1][0], p[0]); b[1][1] = Math.max(b[1][1], p[1]);
        });
        return b;
    }

    // Map data — every source is keyless.
    //   satellite     Esri World Imagery
    //   blueMarble    NASA Blue Marble: the face of the globe, melting into
    //                 the sharper Esri imagery on the way down
    //   streets       TileJSON of OpenMapTiles-schema vector tiles: the white
    //                 road lines + the street / district names (a MapTiler
    //                 ".../tiles/v3/tiles.json?key=…" URL works here unchanged)
    //   glyphs        the fonts those names are set in
    //   rtlText       shapes Arabic street names (fetched only when one shows)
    //   labelsBackup  raster roads + names, used if `streets` can't be reached
    const TILES = {
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        blueMarble: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
        streets: "https://tiles.openfreemap.org/planet",
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        rtlText: "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
        labelsBackup: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
    };

    /* ---------------------------------------------------------
       DRIFTING CLOUDS — soft, translucent clouds that slide slowly
       across the satellite imagery (as on the reference site).
       Everything is generated in code (no image assets): a handful
       of cloud sprites are built once from fractal noise, then drawn
       each frame on a single canvas that sits inside the map, between
       the imagery and the pins. Shown at the last step only.
    --------------------------------------------------------- */
    const CLOUDS = {
        enabled: true,        // false = no cloud layer at all
        count: null,          // null = from the viewport size (≈5 on phones … 11 on desktops)
        sprites: 6,           // distinct cloud shapes (each is also drawn mirrored)
        wind: 0.011,          // drift per second, as a fraction of the longer viewport side
        slope: 0.10,          // downward drift per px travelled (0 = perfectly horizontal)
        opacity: [0.45, 0.85],
        size: [0.26, 0.60],   // cloud width as a fraction of the longer viewport side
        shadow: 0.12,         // faint ground shadow strength (0 = none)
    };

    // One cloud sprite as straight-alpha RGBA bytes (w*h*4), deterministic per seed.
    function makeCloudSprite(w, h, seed) {
        // seeded PRNG (mulberry32) for the lobe layout
        var s = seed | 0;
        function rnd() {
            s = (s + 0x6d2b79f5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        // hashed-lattice value noise
        function hash(ix, iy, k) {
            var n = (ix * 374761393 + iy * 668265263 + k * 1442695041) | 0;
            n = Math.imul(n ^ (n >>> 13), 1274126177);
            n ^= n >>> 16;
            return (n >>> 0) / 4294967296;
        }
        function vnoise(x, y, k) {
            var ix = Math.floor(x), iy = Math.floor(y);
            var fx = x - ix, fy = y - iy;
            fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
            var a = hash(ix, iy, k), b = hash(ix + 1, iy, k), c = hash(ix, iy + 1, k), d = hash(ix + 1, iy + 1, k);
            return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
        }
        // fractal noise, remapped so the bulk of values sit in ~[0,1]
        function fbm(x, y, k, oct, gain) {
            var sum = 0, amp = 1, tot = 0;
            for (var o = 0; o < oct; o++) {
                sum += vnoise(x, y, k + o * 97) * amp; tot += amp;
                x = x * 2.02 + 7.3; y = y * 2.02 + 3.1; amp *= gain;
            }
            return (sum / tot - 0.5) * 2.4 + 0.5;
        }
        function sstep(e0, e1, v) {
            v = (v - e0) / (e1 - e0); v = v < 0 ? 0 : v > 1 ? 1 : v;
            return v * v * (3 - 2 * v);
        }

        // cloud envelope: a few soft elliptical lobes clustered around the centre
        var lobes = [], nl = 3 + Math.floor(rnd() * 3);
        for (var i = 0; i < nl; i++) {
            lobes.push({
                cx: w * (0.30 + 0.40 * rnd()), cy: h * (0.36 + 0.28 * rnd()),
                rx: w * (0.16 + 0.14 * rnd()), ry: h * (0.20 + 0.16 * rnd()),
            });
        }
        var k = seed * 31 + 11;
        var cell = 0.30 * h;             // base noise cell size in px
        var warp = 0.25 * h;             // silhouette distortion
        var N = new Float32Array(w * h); // detail noise
        var E = new Float32Array(w * h); // smooth low-frequency noise (haze envelope)
        var M = new Float32Array(w * h); // lobe mask
        var x, y, p;
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                p = y * w + x;
                N[p] = fbm(x / cell, y / cell, k, 4, 0.5);
                E[p] = fbm(x / (cell * 1.6) + 3.7, y / (cell * 1.6) + 1.9, k + 300, 3, 0.55);
                var wx = x + (fbm(x / (cell * 2.6), y / (cell * 2.6), k + 500, 2, 0.5) - 0.5) * warp;
                var wy = y + (fbm(x / (cell * 2.6), y / (cell * 2.6), k + 900, 2, 0.5) - 0.5) * warp;
                var m = 0;
                for (i = 0; i < nl; i++) {
                    var L = lobes[i], dx = (wx - L.cx) / L.rx, dy = (wy - L.cy) / L.ry;
                    var g = 1 - (dx * dx + dy * dy);
                    if (g > 0) m += g * g;
                }
                // fade to nothing before the sprite border so scaled sprites never show a hard edge
                var bx = x < w - x ? x : w - x, by = y < h - y ? y : h - y;
                m *= sstep(0, 0.10 * w, bx) * sstep(0, 0.14 * h, by);
                M[p] = m > 1 ? 1 : m;
            }
        }
        var out = new Uint8ClampedArray(w * h * 4);
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                p = y * w + x;
                var m2 = M[p];
                if (m2 <= 0) continue;
                var nn = N[p], ee = E[p];
                // broad translucent haze: low-frequency noise contours, faded by the mask
                var haze = sstep(0.35, 1.05, ee * (0.45 + 0.55 * m2)) * 0.55;
                // brighter cores: detail noise, denser towards the middle of the cloud
                var core = sstep(0.42, 0.98, nn * (0.35 + 0.65 * m2));
                var a = 1 - (1 - haze) * (1 - core);
                a *= sstep(0, 0.5, m2);
                if (a <= 0.003) continue;
                // lit from above: brighter where density grows downwards (tops of puffs)
                var up = y > 1 ? N[p - 2 * w] : nn, dn = y < h - 2 ? N[p + 2 * w] : nn;
                var shade = 0.5 + (dn - up) * 0.9;
                shade = shade < 0 ? 0 : shade > 1 ? 1 : shade;
                var lum = 0.88 + 0.12 * shade;
                lum = lum + 0.05 * core; if (lum > 1) lum = 1;
                var o = p * 4;
                out[o] = Math.round(255 * lum);
                out[o + 1] = Math.round(255 * (lum * 0.985 + 0.015));
                out[o + 2] = 255;
                out[o + 3] = Math.round(255 * a);
            }
        }
        return out;
    }

    // The animated layer. Returns { start, stop } so the map can pause the
    // clouds whenever they are not on screen (other steps, 360 viewer).
    function makeCloudLayer(map) {
        if (!CLOUDS.enabled) return { start: function () { }, stop: function () { } };
        const SW = 256, SH = 128; // sprite pixels — drawn scaled up, clouds are soft anyway
        const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        const canvas = document.createElement("canvas");
        canvas.className = "loc-clouds";
        // straight after the map's own canvas: above the imagery, below every pin
        map.getCanvasContainer().insertBefore(canvas, map.getCanvas().nextSibling);
        const ctx = canvas.getContext("2d");
        const sprites = [], shadows = [], clouds = [];
        let W = 0, H = 0, dpr = 1, raf = 0, running = false, last = 0;

        function idle(fn) {
            if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 400 });
            else setTimeout(fn, 30);
        }
        // Sprites are built one per idle slot so the map itself paints first;
        // clouds fade in as their sprite becomes available.
        function buildSprite(i) {
            const c = document.createElement("canvas");
            c.width = SW; c.height = SH;
            const g = c.getContext("2d");
            const img = g.createImageData(SW, SH);
            img.data.set(makeCloudSprite(SW, SH, i + 1));
            g.putImageData(img, 0, 0);
            sprites.push(c);
            if (CLOUDS.shadow > 0) {
                const sc = document.createElement("canvas");
                sc.width = SW; sc.height = SH;
                const sg = sc.getContext("2d");
                sg.drawImage(c, 0, 0);
                sg.globalCompositeOperation = "source-in"; // keep the alpha, recolour dark
                sg.fillStyle = tone(950);
                sg.fillRect(0, 0, SW, SH);
                shadows.push(sc);
            }
            if (reduceMotion) draw(0);
            if (sprites.length < CLOUDS.sprites) idle(function () { buildSprite(i + 1); });
        }

        function rand(a, b) { return a + Math.random() * (b - a); }
        function spawn(c, initial) {
            const size = Math.max(W, H);
            c.sprite = Math.floor(Math.random() * CLOUDS.sprites);
            c.flip = Math.random() < 0.5;
            c.w = size * rand(CLOUDS.size[0], CLOUDS.size[1]);
            c.h = c.w * SH / SW;
            c.op = rand(CLOUDS.opacity[0], CLOUDS.opacity[1]);
            c.v = rand(0.6, 1.4);            // per-cloud speed → a little parallax
            c.a = reduceMotion ? 1 : 0;      // fades in on first draw
            c.y = rand(-0.05, 0.95) * H;
            c.x = initial ? rand(-c.w / 2, W + c.w / 2) : -c.w / 2 - rand(0, W * 0.5);
        }
        function resize() {
            const box = map.getContainer();
            if (!box.clientWidth || !box.clientHeight) return; // overlay hidden — keep the old state
            const ow = W, oh = H;
            W = box.clientWidth; H = box.clientHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 1.25);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = W + "px";
            canvas.style.height = H + "px";
            const n = CLOUDS.count || Math.min(12, Math.round(4 + (W * H) / 300000));
            if (ow && oh) {
                const k = Math.max(W, H) / Math.max(ow, oh);
                clouds.forEach(function (c) { c.x *= W / ow; c.y *= H / oh; c.w *= k; c.h *= k; });
            }
            while (clouds.length < n) { const c = {}; spawn(c, true); clouds.push(c); }
            clouds.length = n;
            if (reduceMotion) draw(0);
        }

        function blit(list, c, k, ox, oy) {
            const img = list[c.sprite % list.length];
            if (!img) return;
            ctx.globalAlpha = c.op * c.a * k;
            const x = c.x - c.w / 2 + ox, y = c.y - c.h / 2 + oy;
            if (c.flip) {
                ctx.save();
                ctx.translate(x + c.w, y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, c.w, c.h);
                ctx.restore();
            } else {
                ctx.drawImage(img, x, y, c.w, c.h);
            }
        }
        function draw(dt) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            if (!sprites.length) return;
            const wind = Math.max(W, H) * CLOUDS.wind;
            clouds.forEach(function (c) {
                const dx = wind * c.v * dt;
                c.x += dx; c.y += dx * CLOUDS.slope;
                if (c.x - c.w / 2 > W || c.y - c.h / 2 > H) spawn(c, false); // left the screen → re-enter from the left
                if (c.a < 1) c.a = Math.min(1, c.a + dt * 0.4);            // ~2.5 s fade-in
            });
            // shadows first, so a cloud is never darkened by its neighbour's shadow
            if (CLOUDS.shadow > 0) clouds.forEach(function (c) { blit(shadows, c, CLOUDS.shadow, c.w * 0.05, c.h * 0.16); });
            clouds.forEach(function (c) { blit(sprites, c, 1, 0, 0); });
            ctx.globalAlpha = 1;
        }
        function tick(now) {
            if (!running) return;
            const dt = Math.min(0.1, (now - last) / 1000) || 0;
            last = now;
            draw(dt);
            raf = requestAnimationFrame(tick);
        }
        function start() {
            resize();
            if (reduceMotion || running) return; // reduced motion: clouds stay still
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(tick);
        }
        function stop() {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
        }

        map.on("resize", resize);
        idle(function () { buildSprite(0); });
        return { start: start, stop: stop };
    }

    /* ---------------------------------------------------------
       The highlighted outlines. Each belongs to a step and fades
       with it (not with the zoom: a phone and a desktop reach the
       same step at quite different zooms). One opacity per step:
                                    Earth  Saudi  Riyadh  Khawalid 20
    --------------------------------------------------------- */
    const OUTLINES = {
        "country-fill": ["fill-opacity", [0.2, 0, 0, 0]],
        "country-line": ["line-opacity", [0.95, 0, 0, 0]],
        "zone-mask": ["fill-opacity", [0, 0.46, 0, 0]], // dims everything around the zone
        "zone-fill": ["fill-opacity", [0, 0.27, 0, 0]],
        "zone-glow": ["line-opacity", [0, 0.7, 0.4, 0]],
        "zone-line": ["line-opacity", [0, 1, 0.9, 0]],
        "district-fill": ["fill-opacity", [0, 0, 0.46, 0]],
        "district-line": ["line-opacity", [0, 0, 1, 0]],
    };

    /* ---------------------------------------------------------
       The map style: satellite imagery, the outlines above (each
       with a "-hover" twin that lights up under the pointer) and
       the route. Street lines and names join once their tiles
       answer (addStreets).
    --------------------------------------------------------- */
    function mapStyle() {
        const hover = ["boolean", ["feature-state", "hover"], false];
        const at = function (id) { return OUTLINES[id][1][START_LEVEL]; };
        const lit = function (id, source) {
            return { id: id, type: "fill", source: source, paint: { "fill-color": tone(100), "fill-opacity": ["case", hover, 0.16, 0] } };
        };
        const zoomed = function () { return ["interpolate", ["linear"], ["zoom"]].concat(Array.prototype.slice.call(arguments)); };
        const poly = function (rings) {
            return { type: "geojson", data: { type: "Feature", id: 1, properties: {}, geometry: { type: "Polygon", coordinates: rings } } };
        };
        const empty = function () { return { type: "geojson", data: { type: "FeatureCollection", features: [] } }; };
        const round = { "line-cap": "round", "line-join": "round" };
        return {
            version: 8,
            projection: { type: "globe" },
            glyphs: TILES.glyphs,
            // a thin blue rim on the globe, lit from the sun's side (top right)
            sky: { "atmosphere-blend": zoomed(0, 0.45, 4.5, 0.45, 6.5, 0) },
            light: { anchor: "viewport", position: [1.5, 60, 78] },
            sources: {
                satellite: { type: "raster", tiles: [TILES.satellite], tileSize: 256, maxzoom: 19 },
                "blue-marble": { type: "raster", tiles: [TILES.blueMarble], tileSize: 256, maxzoom: 8 },
                country: poly([COUNTRY]),
                zone: poly([ZONE]),
                // everything around the zone, dimmed so the zone reads as the bright area
                "zone-mask": poly([[[28, 8], [66, 8], [66, 40], [28, 40], [28, 8]], ZONE]),
                district: poly([DISTRICT]),
                route: empty(),
                "route-leads": empty(),
                "route-nodes": empty(),
            },
            layers: [
                { id: "satellite", type: "raster", source: "satellite" },
                {
                    id: "blue-marble", type: "raster", source: "blue-marble", maxzoom: 6.5,
                    paint: { "raster-opacity": zoomed(4, 1, 6, 0) }
                },

                {
                    id: "country-fill", type: "fill", source: "country",
                    paint: { "fill-color": tone(200), "fill-opacity": at("country-fill") }
                },
                lit("country-hover", "country"),
                {
                    id: "country-line", type: "line", source: "country", layout: round,
                    paint: { "line-color": tone(100), "line-width": 1.4, "line-opacity": at("country-line") }
                },

                {
                    id: "zone-mask", type: "fill", source: "zone-mask",
                    paint: { "fill-color": tone(975), "fill-opacity": at("zone-mask") }
                },
                {
                    id: "zone-fill", type: "fill", source: "zone",
                    paint: { "fill-color": tone(400), "fill-opacity": at("zone-fill") }
                },
                lit("zone-hover", "zone"),
                {
                    id: "district-fill", type: "fill", source: "district",
                    paint: { "fill-color": tone(300), "fill-opacity": at("district-fill") }
                },
                lit("district-hover", "district"),
                // street lines are inserted here, under the outlines (see addStreets)
                {
                    id: "zone-glow", type: "line", source: "zone", layout: round,
                    paint: { "line-color": tone(500), "line-width": 9, "line-blur": 7, "line-opacity": at("zone-glow") }
                },
                {
                    id: "zone-line", type: "line", source: "zone", layout: round,
                    paint: { "line-color": tone(150), "line-width": zoomed(7, 1.4, 10, 2.4), "line-opacity": at("zone-line") }
                },
                {
                    id: "district-line", type: "line", source: "district", layout: round,
                    paint: { "line-color": tone(100), "line-width": zoomed(10, 1.4, 12.5, 2.4), "line-opacity": at("district-line") }
                },

                // White route over a dark halo, dotted lead-ins and small node dots
                // (start, end and a few evenly spaced turns) like a printed itinerary.
                {
                    id: "route-casing", type: "line", source: "route", layout: round,
                    paint: { "line-color": tone(950), "line-width": 8, "line-opacity": 0.45 }
                },
                {
                    id: "route-line", type: "line", source: "route", layout: round,
                    paint: { "line-color": "#ffffff", "line-width": 3.5, "line-opacity": 0.98 }
                },
                {
                    id: "route-leads", type: "line", source: "route-leads", layout: { "line-cap": "round" },
                    paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.85, "line-dasharray": [1, 3.5] }
                },
                {
                    id: "route-nodes", type: "circle", source: "route-nodes",
                    paint: { "circle-radius": 4.5, "circle-color": "#ffffff", "circle-stroke-color": tone(950), "circle-stroke-width": 2 }
                },
            ],
        };
    }

    // Street / place names follow the site language; where a name has no
    // translation the local (Arabic) one is used.
    function nameField(lang) {
        return lang === "ar"
            ? ["coalesce", ["get", "name:ar"], ["get", "name"]]
            : ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];
    }
    function siteLang() {
        return window.i18n && window.i18n.lang === "ar" ? "ar" : "en";
    }

    // White road lines + names, drawn from the vector tiles. Thin and quiet
    // from far away; bigger roads show first, side streets join as you zoom.
    function streetLayers() {
        const zoomed = function () { return ["interpolate", ["linear"], ["zoom"]].concat(Array.prototype.slice.call(arguments)); };
        const classIs = function (list) { return ["match", ["get", "class"], list, true, false]; };
        const MAJOR = ["motorway", "trunk", "primary"], MID = ["secondary", "tertiary"], MINOR = ["minor"];
        // Not street names: bus-line codes, placeholder names and motorway exit numbers.
        const named = ["all"].concat(["BRT", "road_", "Exit", "مخرج"].map(function (junk) {
            return ["!", ["in", junk, ["coalesce", ["get", "name"], ""]]];
        }));
        const halo = { "text-halo-color": tone(975, 0.92), "text-halo-width": 1.7, "text-halo-blur": 0.3 };
        const line = function (id, classes, minzoom, opacity, width) {
            return {
                id: id, type: "line", source: "streets", "source-layer": "transportation", minzoom: minzoom, filter: classIs(classes),
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": "#ffffff", "line-opacity": opacity, "line-width": width }
            };
        };
        const roadName = function (id, classes, minzoom, size, color) {
            return {
                id: id, type: "symbol", source: "streets", "source-layer": "transportation_name", minzoom: minzoom, filter: ["all", classIs(classes), named],
                layout: {
                    "symbol-placement": "line", "symbol-spacing": 300, "text-field": nameField(siteLang()), "text-font": ["Noto Sans Bold"],
                    "text-size": size, "text-max-angle": 50, "text-padding": 4, "text-letter-spacing": 0.02
                },
                paint: Object.assign({ "text-color": color }, halo)
            };
        };
        const place = function (id, classes, minzoom, maxzoom, layout, color) {
            return {
                id: id, type: "symbol", source: "streets", "source-layer": "place", minzoom: minzoom, maxzoom: maxzoom, filter: classIs(classes),
                layout: Object.assign({
                    "text-field": nameField(siteLang()), "text-font": ["Noto Sans Regular"], "text-padding": 6,
                    "symbol-sort-key": ["coalesce", ["get", "rank"], 99]
                }, layout),
                paint: Object.assign({ "text-color": color }, halo)
            };
        };
        return {
            lines: [
                line("street-minor", MINOR, 13.4, 0.3, zoomed(13.4, 0.3, 16, 2.2, 19, 6)),
                line("street-mid", MID, 10.2, 0.42, zoomed(10.2, 0.4, 13, 1.3, 16, 3.6, 19, 8)),
                line("street-major", MAJOR, 5.5, zoomed(6, 0.25, 9, 0.5, 14, 0.58), zoomed(6, 0.4, 9, 0.9, 12, 1.8, 15, 4, 19, 10)),
            ],
            // later layers are placed first, so the biggest roads get their names before anything else
            labels: [
                place("place-area", ["suburb", "quarter", "neighbourhood"], 11.6, 24,
                    { "text-size": zoomed(11.6, 9.5, 15, 12.5), "text-transform": "uppercase", "text-letter-spacing": 0.12 }, tone(100, 0.86)),
                place("place-town", ["town", "village"], 7.6, 12.5, { "text-size": zoomed(7.6, 11, 12, 13.5) }, "rgba(255, 255, 255, 0.92)"),
                roadName("street-name-minor", MINOR, 14.2, zoomed(14.2, 11, 17, 14.5), "rgba(255, 255, 255, 0.92)"),
                roadName("street-name-mid", MID, 11.6, zoomed(11.6, 11.5, 13, 13.5, 16, 17.5), "#ffffff"),
                roadName("street-name-major", MAJOR, 8.5, zoomed(8.5, 12, 11, 15, 13, 17, 16, 21), "#ffffff"),
            ],
        };
    }

    /* ---------------------------------------------------------
       Boot.
    --------------------------------------------------------- */
    function start() {
        const overlay = document.getElementById("locOverlay");
        const hint = document.getElementById("locHint");
        const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        let clouds = { start: function () { }, stop: function () { } };

        // The "Minutes from everywhere" strip — this project's figures (projects.js → prox).
        (function () {
            const list = document.querySelector("#locProx .loc-prox-list");
            if (!list || !PROJECT.prox || !PROJECT.prox.length) return;
            list.innerHTML = PROJECT.prox.map(function (p) {
                return '<li><span class="loc-prox-val">' + escHtml(p.min) + "</span> " + escHtml(p.en) + "</li>";
            }).join("");
        })();
        let level = START_LEVEL;   // current step, 0…3
        let reopen = null;         // set by boot(): readies the map when the overlay comes back

        // ----- enter the 360 viewer -----
        // Wired before the map exists, so "Explore the project" keeps working
        // even if the map library or WebGL is unavailable.
        let entered = false;
        // Hide the location overlay (don't destroy the map, so the Location
        // launcher can re-open it later). First time also reveals the app
        // launchers via the site-entered flag.
        function enterSite() {
            if (OC_LINK && !entered) { window.location.href = OC_LINK; return; }
            if (!entered) {
                entered = true;
                document.body.classList.add("site-entered");
            }
            overlay.classList.add("loc-hidden");
            setTimeout(function () {
                if (overlay.classList.contains("loc-hidden")) {
                    overlay.style.display = "none";
                    clouds.stop();
                }
            }, 650);
        }

        // Re-open the location / directions map from the Location launcher —
        // straight on the project step; Back leads out to the city and the globe.
        function showLocation() {
            overlay.style.display = "";
            void overlay.offsetWidth; // force reflow so the fade-in transitions
            overlay.classList.remove("loc-hidden");
            setTimeout(function () { if (reopen) reopen(); }, 80);
        }

        document.getElementById("locEnterBtn").addEventListener("click", enterSite);
        var locLauncherBtn = document.getElementById("locLauncher");
        if (locLauncherBtn) locLauncherBtn.addEventListener("click", showLocation);

        // Language chip: the site-wide toggle, reachable before the viewer opens.
        const langBtn = document.getElementById("locLang");
        function syncLangChip() { langBtn.textContent = siteLang() === "ar" ? "EN" : "AR"; }
        langBtn.addEventListener("click", function () { if (window.i18n) window.i18n.toggle(); });
        document.addEventListener("i18n:change", syncLangChip);
        syncLangChip();

        function fail(err) {
            if (err) console.warn("[map] unavailable:", err && err.message ? err.message : err);
            overlay.classList.add("loc-nomap", "loc-ready");
        }
        // The library is a blocking script just above; give a slow CDN a few seconds.
        (function waitForLib(tries) {
            if (window.maplibregl) { try { boot(); } catch (e) { fail(e); } return; }
            if (tries <= 0) { fail("map library did not load"); return; }
            setTimeout(function () { waitForLib(tries - 1); }, 150);
        })(40);

        function boot() {
            const mapEl = document.getElementById("locMap");
            const map = new maplibregl.Map({
                container: mapEl,
                style: mapStyle(),
                center: EARTH_CENTER,
                zoom: 1.5,
                attributionControl: false, // credited in .loc-attrib
                dragRotate: false,
                pitchWithRotate: false,
                touchPitch: false,
                pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            });
            map.touchZoomRotate.disableRotation();
            map.keyboard.disableRotation();
            // A tile that fails to load is not fatal — the imagery under it keeps showing.
            map.on("error", function (e) { console.debug("[map]", e && e.error ? e.error.message : e); });

            // ----- drifting clouds + edge vignette (inside the map, under the pins) -----
            clouds = makeCloudLayer(map);
            const vignette = document.createElement("div");
            vignette.className = "loc-vignette";
            map.getCanvasContainer().appendChild(vignette);

            // ----- the globe's size -----
            // MapLibre draws the globe so that its scale at the centre matches
            // Mercator there (radius = world size / 2π / cos φ) and views it in
            // perspective, so a given zoom means a different size at each latitude
            // and on each screen. These turn "this many pixels wide" into a zoom.
            const headerEl = overlay.querySelector(".loc-header"), proxEl = document.getElementById("locProx");
            function size() { return { w: mapEl.clientWidth || 1, h: mapEl.clientHeight || 1 }; }
            function globe() {
                const s = size();
                // as big as the screen allows, but clear of the header and the gesture cue on short ones
                const apparent = Math.max(60, Math.min(s.h * 0.4, s.w * 0.45, (s.h - headerEl.offsetHeight - 64) * 0.54));
                const fov = (map.getVerticalFieldOfView ? map.getVerticalFieldOfView() : 36.87) * Math.PI / 180;
                const d = 0.5 * s.h / Math.tan(fov / 2);       // camera → map centre, px
                const sin = Math.sin(Math.atan(apparent / d));
                const r = d * sin / (1 - sin);                 // true radius, px
                return { r: r, apparent: apparent, horizon: r / (d + r) };
            }
            function globeZoom(lat) {
                return Math.log2(globe().r * 2 * Math.PI * Math.cos(lat * Math.PI / 180) / 512);
            }

            // ----- stars behind the globe -----
            function paintStars() {
                const c = document.getElementById("locStars");
                const w = overlay.clientWidth, h = overlay.clientHeight;
                if (!c || !w || !h) return;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
                const g = c.getContext("2d");
                g.setTransform(dpr, 0, 0, dpr, 0, 0);
                let seed = 20250903; // same sky on every visit
                const rnd = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
                const n = Math.round(Math.min(900, (w * h) / 2400));
                for (let i = 0; i < n; i++) {
                    const x = rnd() * w, y = rnd() * h, m = rnd();
                    g.globalAlpha = 0.16 + rnd() * (m > 0.9 ? 0.8 : 0.45);
                    g.fillStyle = m > 0.97 ? "#cfe0ff" : m < 0.03 ? "#ffe6c4" : "#ffffff";
                    g.beginPath();
                    g.arc(x, y, m > 0.985 ? 1.4 : m > 0.9 ? 1 : 0.6, 0, 6.2832);
                    g.fill();
                }
            }

            // ----- markers -----
            // lv = the step the marker belongs to (CSS fades it in on arrival).
            function marker(lngLat, lv, html, label) {
                const el = document.createElement("div");
                el.className = "loc-mk";
                el.dataset.lv = String(lv);
                if (label) el.setAttribute("aria-label", label); else el.setAttribute("aria-hidden", "true");
                el.innerHTML = html;
                new maplibregl.Marker({ element: el, anchor: "top-left" }).setLngLat(lngLat).addTo(map);
                return el;
            }
            // A marker tap must not also count as a tap on the map underneath.
            function onTap(el, fn) {
                el.addEventListener("click", function (e) { e.stopPropagation(); fn(e); });
            }
            const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
            const logoOf = function (p) { return '<span class="' + (p.logoClass || "brand-logo") + '"><img src="' + encodeURI(p.logo) + '" alt="" draggable="false" /></span>'; };
            const ocLogo = logoOf(OC);

            // Earth: city names + the country chip (hidden while on the far side)
            const globeMarks = WORLD_CITIES.map(function (c) {
                const el = marker(c.at, 0, '<span class="loc-city"><i></i><span>' + c.name + "</span></span>");
                // a name right beside the chip is dropped while the globe is small (see .loc-near)
                if (Math.hypot((c.at[0] - COUNTRY_CHIP[0]) * 0.9, c.at[1] - COUNTRY_CHIP[1]) < 14) el.classList.add("loc-near");
                return { at: c.at, el: el };
            });
            const countryEl = marker(COUNTRY_CHIP, 0,
                '<button class="loc-country" type="button"><span>' + LEVELS[1].label + "</span>" + arrow + "</button>", LEVELS[1].label);
            onTap(countryEl.firstElementChild, function () { goLevel(1); });
            globeMarks.push({ at: COUNTRY_CHIP, el: countryEl });

            // Saudi Arabia: the zone's name
            const zoneEl = marker(ZONE_LABEL, 1,
                '<button class="loc-zone" type="button"><b>' + LEVELS[2].label + "</b><small>Tap to explore</small></button>", LEVELS[2].label);
            onTap(zoneEl.firstElementChild, function () { goLevel(2); });

            // Riyadh: one chip per project (its logo, its name above), a dot on its plot. This project's
            // chip leads on to its map step; another project's reloads the page into that project.
            const projChip = function (p, cls) {
                return '<button class="loc-proj ' + cls + '" type="button"><span class="loc-proj-chip">' + logoOf(p) +
                    '<span class="loc-proj-name">' + escHtml(p.name) + '</span></span><span class="loc-proj-stem"></span><span class="loc-proj-dot"></span></button>';
            };
            const projEl = marker([OC.lng, OC.lat], 2, projChip(OC, "loc-proj-current"), OC.name);
            onTap(projEl.firstElementChild, function () { goLevel(3); });
            OTHER_PROJECTS.forEach(function (p) {
                const el = marker([p.lng, p.lat], 2, projChip(p, "loc-proj-other"), p.name);
                onTap(el.firstElementChild, function () { openProject(p.id); });
            });

            // Khawalid 20: destination markers — round icon badge + slate label chip
            const allPoints = [[OC.lng, OC.lat]];
            const pins = []; // every step-3 pin: where it is + its element (see pinsView)
            DESTS.forEach(function (d) {
                const el = marker([d.lng, d.lat], 3,
                    '<div class="loc-pin" data-id="' + d.id + '"><span class="loc-pin-ico">' +
                    (ICONS[d.icon] || ICONS.pin) + '</span><span class="loc-pin-txt">' + d.name + "</span></div>", d.en);
                onTap(el.firstElementChild, function () { selectDest(d); });
                d._pin = el.firstElementChild;
                pins.push({ lng: d.lng, lat: d.lat, el: d._pin });
                allPoints.push([d.lng, d.lat]);
            });
            // …and the OC anchor marker: the logo tile the routes start from
            const ocEl = marker([OC.lng, OC.lat], 3,
                '<div class="loc-pin loc-oc"><span class="loc-pin-ico">' + ocLogo + "</span></div>", OC.name);
            ocEl.classList.add("loc-mk-oc");
            onTap(ocEl.firstElementChild, enterSite);
            pins.push({ lng: OC.lng, lat: OC.lat, el: ocEl.firstElementChild });

            // ----- framing -----
            const ZONE_BOUNDS = boundsOf(ZONE);
            const HOME_BOUNDS = boundsOf(allPoints);
            // A frame's padding, scaled down where the screen is too small for it.
            function pad(top, right, bottom, left) {
                const s = size();
                const ky = Math.min(1, (s.h * 0.6) / (top + bottom)), kx = Math.min(1, (s.w * 0.6) / (left + right));
                return { top: top * ky, bottom: bottom * ky, left: left * kx, right: right * kx };
            }
            // Keep pins clear of the brand/enter bar (top), the popup card (top)
            // and the proximity panel (bottom) whenever we fit the view.
            function below() { return headerEl.offsetHeight + 4; }                             // the header: one row, two on phones
            function above() { return proxEl.offsetHeight ? proxEl.offsetHeight + 46 : 62; }    // the facts strip — or, on short screens, the hint
            function docked() { return size().h < 560; }                                        // short screen: the card docks right (CSS)
            function routePad() {                                                               // route view: room for the card
                return docked() ? pad(below() + 10, 344, 24, 40) : pad(below() + 250, 90, above(), 40);
            }
            function homePad() { return pad(below() + 22, 72, above(), 20); }                   // overview: header + facts strip

            // A pin is a badge on its place plus a label beside it. On a narrow screen
            // the labels of the eastern pins hang to the left (.loc-flip), so the two
            // groups of pins face each other instead of running off the right edge.
            function layoutPins() {
                const narrow = size().w < 640, mid = (HOME_BOUNDS[0][0] + HOME_BOUNDS[1][0]) / 2;
                pins.forEach(function (p) { p.el.classList.toggle("loc-flip", narrow && p.lng > mid); });
            }
            // The closest view in which every pin — badge and label, not just the
            // point — fits inside the padding. (Web-Mercator maths: the map is flat
            // for all practical purposes at this scale.)
            function pinsView(padding) {
                const s = size(), rad = Math.PI / 180;
                const w = s.w - padding.left - padding.right, h = s.h - padding.top - padding.bottom;
                if (w < 80 || h < 80) return null;
                const boxes = pins.map(function (p) {
                    const sin = Math.sin(p.lat * rad), half = p.el.firstElementChild.offsetWidth / 2;
                    const wide = p.el.offsetWidth, tall = p.el.offsetHeight / 2, flip = p.el.classList.contains("loc-flip");
                    return {
                        x: (p.lng + 180) / 360, y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
                        l: flip ? half - wide : -half, r: flip ? half : wide - half, t: -tall, b: tall
                    };
                });
                const extent = function (world) { // px box around all pins when the whole map is `world` px across
                    const e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
                    boxes.forEach(function (b) {
                        e.x0 = Math.min(e.x0, b.x * world + b.l); e.x1 = Math.max(e.x1, b.x * world + b.r);
                        e.y0 = Math.min(e.y0, b.y * world + b.t); e.y1 = Math.max(e.y1, b.y * world + b.b);
                    });
                    return e;
                };
                let lo = 512 * Math.pow(2, 8), hi = 512 * Math.pow(2, 15.5);
                let e = extent(lo);
                if (e.x1 - e.x0 > w || e.y1 - e.y0 > h) return null;
                for (let i = 0; i < 32; i++) {
                    const mid = Math.sqrt(lo * hi);
                    e = extent(mid);
                    if (e.x1 - e.x0 <= w && e.y1 - e.y0 <= h) lo = mid; else hi = mid;
                }
                e = extent(lo);
                // the middle of that box goes to the middle of the padded area
                const cx = (e.x0 + e.x1) / 2 - (padding.left - padding.right) / 2;
                const cy = (e.y0 + e.y1) / 2 - (padding.top - padding.bottom) / 2;
                return {
                    center: [cx / lo * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * cy / lo))) / rad],
                    zoom: Math.log2(lo / 512),
                };
            }
            function frame(bounds, padding, fallbackZoom) {
                let cam = null;
                // maxZoom: or the answer is capped by the zoom range of the step we are leaving
                try { cam = map.cameraForBounds(bounds, { padding: padding, maxZoom: 22 }); } catch (e) { }
                if (cam && cam.center && isFinite(cam.zoom)) return { center: cam.center, zoom: cam.zoom };
                return { center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2], zoom: fallbackZoom };
            }
            // Where the camera rests at each step.
            function viewFor(lv) {
                const s = size();
                if (lv === 0) return { center: EARTH_CENTER, zoom: globeZoom(EARTH_CENTER[1]) };
                const side = Math.max(24, s.w * 0.14);
                if (lv === 1) return frame(ZONE_BOUNDS, pad(s.h * 0.26, side, s.h * 0.2, side), 9.2);
                if (lv === 2) return frame(CITY_VIEW, pad(below() + 16, 24, 40, 24), 11);
                return pinsView(homePad()) || frame(HOME_BOUNDS, homePad(), 12.8);
            }
            // How far the visitor may zoom away from a step's resting view.
            function setZoomRange(lv, view) {
                map.setMinZoom(null); map.setMaxZoom(null);
                if (lv === 0 || !view) return;
                map.setMinZoom(view.zoom - [0, 1.6, 1.3, 2.2][lv]);
                map.setMaxZoom(lv === 3 ? 19 : view.zoom + [0, 2.2, 3.6][lv]);
            }

            // ----- gestures -----
            // The app can be CSS-rotated 90° (landscape on an upright phone, see the
            // orientation controller, which sets body.ui-rotated). MapLibre reads raw
            // screen coordinates, so its drag would pan sideways: it is switched off
            // there and a one-finger drag is remapped by hand (rotatedPan below);
            // pinch keeps zooming on the centre.
            let rotated = document.body.classList.contains("ui-rotated");
            let flying = false;
            function setGestures(on) {
                const free = on && level > 0; // the Earth step has its own drag-to-rotate
                ["scrollZoom", "boxZoom", "doubleClickZoom", "keyboard"].forEach(function (h) { map[h][free ? "enable" : "disable"](); });
                map.dragPan[free && !rotated ? "enable" : "disable"]();
                if (free) map.touchZoomRotate.enable(rotated ? { around: "center" } : undefined);
                else map.touchZoomRotate.disable();
                map.touchZoomRotate.disableRotation();
            }
            function setRotated(on) {
                rotated = !!on;
                if (!flying) setGestures(true);
            }
            // Screen delta → delta inside the (possibly rotated) app box.
            function appDelta(dx, dy) { return rotated ? [dy, -dx] : [dx, dy]; }
            // Map-space point of a map mouse event, whatever the rotation.
            function pointOf(e) {
                const oe = e.originalEvent;
                return rotated && oe ? [oe.clientY, window.innerWidth - oe.clientX] : e.point;
            }

            // ----- stepping between levels -----
            const navEl = document.getElementById("locNav");
            const backBtn = document.getElementById("locBack");
            const levelBtn = document.getElementById("locLevelBtn");
            const levelName = document.getElementById("locLevelName");
            const levelMenu = document.getElementById("locLevelMenu");
            LEVELS.forEach(function (lv, i) {
                const li = document.createElement("li");
                const b = document.createElement("button");
                b.type = "button";
                b.textContent = lv.label;
                b.addEventListener("click", function () { openMenu(false); goLevel(i); });
                li.appendChild(b);
                levelMenu.appendChild(li);
            });
            function openMenu(open) {
                navEl.classList.toggle("open", open);
                levelBtn.setAttribute("aria-expanded", open ? "true" : "false");
            }
            levelBtn.addEventListener("click", function () { openMenu(!navEl.classList.contains("open")); });
            document.addEventListener("click", function (e) { if (!navEl.contains(e.target)) openMenu(false); });
            document.addEventListener("keydown", function (e) { if (e.key === "Escape") openMenu(false); });
            backBtn.addEventListener("click", function () { openMenu(false); if (level > 0) goLevel(level - 1); });

            function syncChrome() {
                overlay.dataset.level = String(level);
                levelName.textContent = LEVELS[level].label;
                hint.textContent = LEVELS[level].hint;
                hint.style.opacity = "";
                backBtn.disabled = level === 0;
                Array.prototype.forEach.call(levelMenu.querySelectorAll("button"), function (b, i) {
                    if (i === level) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
                });
                sizeGlobe();
            }
            function sizeGlobe() {
                const r = globe().apparent;
                overlay.style.setProperty("--globe-r", r.toFixed(1) + "px");
                overlay.classList.toggle("loc-small-globe", r < 240); // see .loc-near
            }

            // Hide the Earth step's markers as they near the horizon (a name on the
            // very edge would hang out over space) and while they are behind it.
            function hideFarSide() {
                if (level !== 0) return;
                const c = map.getCenter(), rad = Math.PI / 180, edge = Math.max(globe().horizon + 0.04, 0.6);
                globeMarks.forEach(function (m) {
                    const cos = Math.sin(c.lat * rad) * Math.sin(m.at[1] * rad) +
                        Math.cos(c.lat * rad) * Math.cos(m.at[1] * rad) * Math.cos((m.at[0] - c.lng) * rad);
                    m.el.classList.toggle("loc-far", cos < edge);
                });
            }
            map.on("move", hideFarSide);

            // Fade the outlines to the given step: what leaves goes as the camera
            // sets off, what arrives shows up as it settles.
            const shown = {};
            Object.keys(OUTLINES).forEach(function (id) { shown[id] = OUTLINES[id][1][START_LEVEL]; });
            function showOutlines(lv, ms) {
                Object.keys(OUTLINES).forEach(function (id) {
                    const prop = OUTLINES[id][0], to = OUTLINES[id][1][lv];
                    if (shown[id] === to) return;
                    const fade = !ms ? { duration: 0, delay: 0 }
                        : to > shown[id] ? { duration: ms * 0.35, delay: ms * 0.6 }
                            : { duration: Math.min(900, ms * 0.3), delay: 0 };
                    try {
                        map.setPaintProperty(id, prop + "-transition", fade);
                        map.setPaintProperty(id, prop, to);
                        shown[id] = to;
                    } catch (e) { } // style still loading: synced on "style.load" below
                });
            }
            map.once("style.load", function () { showOutlines(level, 0); });

            // Flight time between two steps, ms (anything else: by distance).
            const FLIGHT = { "0>1": 4600, "1>2": 2000, "2>3": 2200, "3>2": 1600, "2>1": 1600, "1>0": 3200 };
            const easeInOut = function (t) { return 0.5 - Math.cos(Math.PI * t) / 2; };
            let flight = 0, landTimer = 0;

            function goLevel(next, opts) {
                opts = opts || {};
                if (flying || next < 0 || next >= LEVELS.length || (next === level && !opts.force)) return;
                const from = level, view = viewFor(next);
                closeCard();
                clearHover();
                level = next;
                syncChrome();
                clouds.stop();
                setZoomRange(0);     // open the range for the trip; the step's own range is set on landing
                setGestures(false);
                const land = function () {
                    clearTimeout(landTimer);
                    flying = false;
                    overlay.classList.remove("loc-flying");
                    setZoomRange(level, view);
                    setGestures(true);
                    hideFarSide();
                    if (level === 3 && overlay.style.display !== "none") clouds.start();
                    map.once("idle", function () { if (!flying && level === next) warm(next + 1); });
                };
                if (opts.instant || reduceMotion) { showOutlines(level, 0); map.jumpTo(view); land(); return; }
                const id = ++flight;
                const ms = FLIGHT[from + ">" + next] || 1400 + 1100 * Math.abs(next - from);
                showOutlines(level, ms);
                const done = function () { if (id === flight && flying) land(); };
                flying = true;
                overlay.classList.add("loc-flying");
                map.flyTo({ center: view.center, zoom: view.zoom, duration: ms, easing: easeInOut, essential: true });
                // listen only now: flyTo first ends any move already under way, and that "moveend" is not ours
                map.once("moveend", done);
                landTimer = setTimeout(done, ms + 1500); // never get stuck mid-air
            }

            // ----- warm the next step -----
            // Once a step has settled, fetch the satellite tiles of the next one in
            // the background (they land in the browser cache), so the camera arrives
            // on a sharp picture instead of a blurry one that sharpens afterwards.
            const warmed = {};
            function warm(lv) {
                if (lv >= LEVELS.length || warmed[lv] || (navigator.connection && navigator.connection.saveData)) return;
                warmed[lv] = true;
                const v = viewFor(lv), s = size(), c = maplibregl.LngLat.convert(v.center);
                const world = 512 * Math.pow(2, v.zoom);              // px across the whole map at that zoom
                const z = Math.min(19, Math.floor(v.zoom) + 1);       // the tile level MapLibre shows there (256 px tiles)
                const n = Math.pow(2, z), tile = world / n;
                const sin = Math.sin(c.lat * Math.PI / 180);
                const x = (c.lng + 180) / 360 * world;
                const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
                const urls = [];
                for (let tx = Math.floor((x - s.w / 2) / tile); tx <= Math.floor((x + s.w / 2) / tile); tx++) {
                    for (let ty = Math.floor((y - s.h / 2) / tile); ty <= Math.floor((y + s.h / 2) / tile); ty++) {
                        if (ty >= 0 && ty < n) urls.push(TILES.satellite.replace("{z}", z).replace("{x}", ((tx % n) + n) % n).replace("{y}", ty));
                    }
                }
                urls.slice(0, 48).forEach(function (u) { fetch(u, { priority: "low" }).catch(function () { }); });
            }

            // ----- the highlighted outlines are buttons too -----
            const HIT = [
                { layer: "country-fill", source: "country" },
                { layer: "zone-fill", source: "zone" },
                { layer: "district-fill", source: "district" },
            ];
            function hits(point) {
                const h = HIT[level];
                if (!h || !map.getLayer(h.layer)) return false;
                try { return map.queryRenderedFeatures(point, { layers: [h.layer] }).length > 0; } catch (e) { return false; }
            }
            let hovered = null;
            function setHover(source) {
                if (hovered === source) return;
                try {
                    if (hovered) map.setFeatureState({ source: hovered, id: 1 }, { hover: false });
                    if (source) map.setFeatureState({ source: source, id: 1 }, { hover: true });
                } catch (e) { }
                hovered = source;
                map.getCanvas().style.cursor = source ? "pointer" : "";
            }
            function clearHover() { setHover(null); }
            map.on("click", function (e) {
                if (!flying && hits(pointOf(e))) goLevel(level + 1);
            });
            map.on("mousemove", function (e) {
                if (flying) return;
                const t = e.originalEvent && e.originalEvent.target;
                if (t && t.closest && t.closest(".loc-mk")) return; // markers light their outline themselves
                setHover(hits(e.point) ? HIT[level].source : null);
            });
            map.on("mouseout", clearHover);
            [[countryEl, "country"], [zoneEl, "zone"], [projEl, "district"]].forEach(function (pair) {
                pair[0].addEventListener("mouseenter", function () { if (!flying) setHover(pair[1]); });
                pair[0].addEventListener("mouseleave", clearHover);
            });

            // ----- Earth: drag to turn the globe -----
            // Our own handler rather than the map's: the globe keeps its size,
            // can't be tipped over the poles, coasts a little, and works rotated.
            (function globeDrag() {
                const el = map.getCanvasContainer();
                let active = false, pid = null, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0, coasting = 0;
                function turn(dx, dy) {
                    const c = map.getCenter(), r = globe().r, deg = 180 / Math.PI;
                    const lat = Math.max(-58, Math.min(68, c.lat + (dy / r) * deg));
                    const lng = c.lng - (dx / (r * Math.cos(c.lat * Math.PI / 180))) * deg;
                    map.jumpTo({ center: [lng, lat], zoom: globeZoom(lat) });
                }
                el.addEventListener("pointerdown", function (e) {
                    if (level !== 0 || flying || (e.pointerType === "mouse" && e.button !== 0)) return;
                    if (e.target.closest && e.target.closest(".loc-country")) return; // the chip is a button
                    active = true; pid = e.pointerId;
                    lx = e.clientX; ly = e.clientY; lt = performance.now(); vx = vy = 0;
                    cancelAnimationFrame(coasting);
                    try { el.setPointerCapture(pid); } catch (err) { }
                    el.classList.add("loc-grabbing");
                });
                el.addEventListener("pointermove", function (e) {
                    if (!active || e.pointerId !== pid) return;
                    const d = appDelta(e.clientX - lx, e.clientY - ly), now = performance.now(), dt = Math.max(1, now - lt);
                    lx = e.clientX; ly = e.clientY; lt = now;
                    vx = 0.6 * vx + 0.4 * (d[0] / dt); vy = 0.6 * vy + 0.4 * (d[1] / dt);
                    turn(d[0], d[1]);
                });
                function release(e) {
                    if (!active || e.pointerId !== pid) return;
                    active = false;
                    el.classList.remove("loc-grabbing");
                    try { el.releasePointerCapture(pid); } catch (err) { }
                    if (reduceMotion || performance.now() - lt > 90) return; // the finger rested first: no throw
                    let last = performance.now();
                    coasting = requestAnimationFrame(function coast(now) {
                        const dt = Math.min(40, now - last); last = now;
                        const k = Math.pow(0.94, dt / 16.7);
                        vx *= k; vy *= k;
                        if (level !== 0 || flying || active || Math.abs(vx) + Math.abs(vy) < 0.012) return;
                        turn(vx * dt, vy * dt);
                        coasting = requestAnimationFrame(coast);
                    });
                }
                el.addEventListener("pointerup", release);
                el.addEventListener("pointercancel", release);
            })();

            // ----- rotated app: one-finger drag pans the map by hand -----
            // appRoot's transform is rotate(90deg) translateY(-100%), so a content
            // point (lx,ly) maps to screen (W-ly, lx). A finger move of screen
            // (dx,dy) therefore shifts the touched content by (dy,-dx); panBy moves
            // the view opposite that, so panBy([-dy, dx]) keeps the point under the
            // finger — the correct, natural drag direction.
            (function rotatedPan() {
                let active = false, lastX = 0, lastY = 0;
                mapEl.addEventListener("touchstart", function (e) {
                    active = rotated && level > 0 && !flying && e.touches.length === 1;
                    if (active) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
                }, { passive: true });
                window.addEventListener("touchmove", function (e) {
                    if (!active || !rotated) return;
                    if (e.touches.length !== 1) { active = false; return; }
                    const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
                    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
                    map.panBy([-dy, dx], { animate: false });
                }, { passive: true });
                window.addEventListener("touchend", function () { active = false; });
                window.addEventListener("touchcancel", function () { active = false; });
            })();

            // ----- right-edge controls -----
            document.getElementById("locZoomIn").addEventListener("click", function () { if (!flying) map.zoomIn(); });
            document.getElementById("locZoomOut").addEventListener("click", function () { if (!flying) map.zoomOut(); });
            document.getElementById("locReset").addEventListener("click", function () {
                if (flying) return;
                closeCard();
                const view = viewFor(level); // framed afresh: the screen may have changed since we landed
                setZoomRange(level, view);
                map.easeTo(Object.assign({ duration: reduceMotion ? 0 : 800 }, view));
            });

            // ----- street lines + names -----
            let labelIds = [];
            function addStreets() {
                const ctl = window.AbortController ? new AbortController() : null;
                const timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
                fetch(TILES.streets, ctl ? { signal: ctl.signal } : undefined)
                    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
                    .then(function (tj) {
                        clearTimeout(timer);
                        if (!tj.tiles || !tj.tiles.length) throw new Error("no tiles in TileJSON");
                        // Arabic names need shaping; the plugin is only fetched when one is drawn.
                        try {
                            if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
                                const p = maplibregl.setRTLTextPlugin(TILES.rtlText, true);
                                if (p && p.catch) p.catch(function () { });
                            }
                        } catch (e) { }
                        map.addSource("streets", { type: "vector", tiles: tj.tiles, minzoom: tj.minzoom || 0, maxzoom: tj.maxzoom || 14 });
                        const s = streetLayers();
                        s.lines.forEach(function (l) { map.addLayer(l, "zone-glow"); });
                        s.labels.forEach(function (l) { map.addLayer(l); });
                        labelIds = s.labels.map(function (l) { return l.id; });
                    })
                    .catch(function (err) {
                        clearTimeout(timer);
                        console.warn("[map] street names:", err && err.message);
                        if (map.getSource("streets")) return; // the tiles are in; only a layer was refused
                        TILES.labelsBackup.forEach(function (url, i) {
                            map.addSource("labels-backup-" + i, { type: "raster", tiles: [url], tileSize: 256, maxzoom: 18 });
                            map.addLayer({ id: "labels-backup-" + i, type: "raster", source: "labels-backup-" + i, minzoom: 7 }, "zone-glow");
                        });
                    });
            }
            map.once("style.load", addStreets);
            document.addEventListener("i18n:change", function () {
                labelIds.forEach(function (id) {
                    if (map.getLayer(id)) map.setLayoutProperty(id, "text-field", nameField(siteLang()));
                });
            });

            // ----- routing state -----
            let current = null;        // selected destination
            let lastRoute = null;      // { distance(m), duration(s) }
            let popup = null;          // destination card

            function setData(source, features) {
                const s = map.getSource(source);
                if (s) s.setData({ type: "FeatureCollection", features: features });
            }
            function lineFeature(coords) {
                return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
            }
            function clearRoute() {
                setData("route", []);
                setData("route-leads", []);
                setData("route-nodes", []);
            }

            function setActivePin(d) {
                document.querySelectorAll("#locMap .loc-pin").forEach(function (el) { el.classList.remove("loc-active"); });
                if (d && d._pin) d._pin.classList.add("loc-active");
            }

            function haversine(a, b) {
                const R = 6371000, toRad = Math.PI / 180;
                const dLat = (b.lat - a.lat) * toRad, dLng = (b.lng - a.lng) * toRad;
                const la1 = a.lat * toRad, la2 = b.lat * toRad;
                const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
                return 2 * R * Math.asin(Math.sqrt(h));
            }

            function fmtKm(m) { return (m / 1000).toFixed(1) + " km"; }
            function fmtMin(s) {
                const min = Math.max(1, Math.round(s / 60));
                if (min < 60) return min + " min";
                const h = Math.floor(min / 60), r = min % 60;
                return h + " h" + (r ? " " + r + "m" : "");
            }

            // Re-render the card with the fetched distance / time. The stats are
            // baked into the HTML (not patched into the DOM) so the card is always
            // rebuilt from one place.
            function renderStats() {
                if (!lastRoute || !current || !popup) return;
                popup.setHTML(cardHtml(current));
            }

            // Frame the route (or, before it arrives, the two ends), leaving room
            // for the card.
            function fitRoute(coords, dest) {
                const b = boundsOf(coords.concat([[OC.lng, OC.lat], [dest.lng, dest.lat]]));
                map.fitBounds(b, { padding: routePad(), duration: reduceMotion ? 0 : 800, maxZoom: 16 });
            }

            // coords: [lng, lat] pairs along the road.
            function drawRoute(coords, dest) {
                setData("route", [lineFeature(coords)]);
                // OSRM snaps both ends to the nearest road, so tie the pins to the
                // road with dotted lead-ins.
                setData("route-leads", [
                    lineFeature([[OC.lng, OC.lat], coords[0]]),
                    lineFeature([coords[coords.length - 1], [dest.lng, dest.lat]]),
                ]);
                const nodes = [], NODES = Math.min(6, coords.length);
                for (let i = 0; i < NODES; i++) {
                    const idx = Math.round((coords.length - 1) * (i / Math.max(1, NODES - 1)));
                    nodes.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coords[idx] } });
                }
                setData("route-nodes", nodes);
                fitRoute(coords, dest);
            }

            // Destination card, anchored above the pin as a map popup.
            function cardHtml(d) {
                const ready = !!(lastRoute && current === d);
                const banner = d.img
                    ? '<img class="loc-pop-img" src="' + d.img + '" alt="" />'
                    : '<div class="loc-pop-img loc-pop-img-ph">' + (ICONS[d.icon] || ICONS.pin) + "</div>";
                return (
                    '<div class="loc-pop-card">' + banner +
                    '<div class="loc-pop-body">' +
                    '<div class="loc-pop-ico">' + (ICONS[d.icon] || ICONS.pin) + "</div>" +
                    '<div class="loc-pop-main">' +
                    '<div class="loc-pop-title">' + d.name + "<small>" + d.en + "</small></div>" +
                    '<div class="loc-pop-chips">' +
                    '<span class="loc-pop-chip"><svg viewBox="0 0 24 24"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><b class="' + (ready ? "" : "loc-loading") + '">' + (ready ? fmtKm(lastRoute.distance) : "…") + "</b></span>" +
                    '<span class="loc-pop-chip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><b class="' + (ready ? "" : "loc-loading") + '">' + (ready ? fmtMin(lastRoute.duration) : "…") + "</b></span>" +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    (d.desc ? '<p class="loc-pop-desc">' + d.desc + "</p>" : "") +
                    "</div>"
                );
            }

            function closeCard() {
                if (popup && popup.isOpen()) popup.remove(); // fires "close" → the route goes too
            }

            function selectDest(d) {
                if (level !== 3 || flying) return;
                current = d;
                lastRoute = null; // stats belong to the previous destination
                setActivePin(d);
                clearRoute();
                if (!popup) {
                    popup = new maplibregl.Popup({
                        className: "loc-pop", closeButton: true, closeOnClick: true, focusAfterOpen: false,
                        anchor: "bottom", offset: 26, maxWidth: "300px",
                    });
                    // Closing the card (× or tapping the map) clears the route too.
                    popup.on("close", function () {
                        clearRoute();
                        setActivePin(null);
                        current = null;
                        overlay.classList.remove("loc-card-open");
                        if (hint) hint.style.opacity = "";
                    });
                }
                popup.setLngLat([d.lng, d.lat]).setHTML(cardHtml(d));
                if (!popup.isOpen()) popup.addTo(map); // (re-adding an open popup would fire "close")
                overlay.classList.add("loc-card-open");
                if (hint) hint.style.opacity = "0";
                fitRoute([], d); // the card must be in view while the route is on its way

                const url = OSRM + OC.lng + "," + OC.lat + ";" + d.lng + "," + d.lat +
                    "?overview=full&geometries=geojson";

                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (json) {
                        if (current !== d) return; // a newer click won
                        if (!json.routes || !json.routes.length) throw new Error("no route");
                        const route = json.routes[0];
                        lastRoute = { distance: route.distance, duration: route.duration };
                        drawRoute(route.geometry.coordinates, d);
                        renderStats();
                    })
                    .catch(function () {
                        if (current !== d) return;
                        // Fallback: straight line + estimated road distance.
                        const straight = haversine(OC, d);
                        lastRoute = { distance: straight * 1.3, duration: (straight * 1.3 / 1000) / 50 * 3600 };
                        drawRoute([[OC.lng, OC.lat], [d.lng, d.lat]], d);
                        renderStats();
                    });
            }

            // ----- sizing -----
            map.on("resize", function () {
                if (!mapEl.clientWidth) return; // overlay hidden behind the 360 viewer
                paintStars();
                sizeGlobe();
                layoutPins();
                if (level === 0 && !flying) map.jumpTo({ zoom: globeZoom(map.getCenter().lat) }); // same globe, new screen
            });
            window.addEventListener("resize", function () {
                // the orientation controller announces a rotated / upright app with a resize event
                setRotated(document.body.classList.contains("ui-rotated"));
                setTimeout(function () { map.resize(); }, 200);
            });
            setTimeout(function () { map.resize(); }, 300);

            // The Location launcher brings the overlay back on the project step.
            reopen = function () {
                try { map.resize(); } catch (e) { }
                if (flying) return;
                if (level !== 3) goLevel(3, { instant: true });
                else clouds.start();
            };

            // ----- first view -----
            paintStars();
            layoutPins();
            goLevel(START_LEVEL, { instant: true, force: true });
            // Fade the map in once its first tiles are on screen (or after a moment, regardless).
            const ready = function () { overlay.classList.add("loc-ready"); };
            map.once("idle", ready);
            setTimeout(ready, 2500);

            // Handy from the console: maazarMap.goLevel(2), maazarMap.map.getZoom() …
            window.maazarMap = { map: map, goLevel: goLevel };
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();