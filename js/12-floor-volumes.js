/* =========================================================
   FLOOR VOLUMES
   The overlay model can carry one mesh per FLOOR instead of one per unit
   (FBX_CAM/FLOORS_SELECT.fbx: GROUND_SELECT, FIRST_SELECT, …). A floor
   mesh stands for every unit on its floor: it takes the colour of the best
   availability there, shows the floor's summary under the pointer, and a
   click opens that floor's units in Unit Search.
========================================================= */

/* Opacity and colour of a floor over the photo. In the 3D view floors are solid, like unit boxes.
   Everything here comes from the dashboard — Settings → Building overlay, i.e. the
   site_settings rows floors_rest / floors_hover / floors_outline (0–100) and, per floor,
   an optional floor_color_<key> ("#rrggbb"; without one a floor is coloured by its
   availability, THREE_STATUS_COLORS). The HOME SCREEN script fetches that table and
   publishes it as the "site:settings" event; every other shade is derived here. */
const FLOOR_LOOK_DEFAULTS = { floors_rest: 0, floors_hover: 30, floors_outline: 55, units_rest: 45, units_hover: 92, units_outline: 70 };
const FLOOR_LOOK = {};
function setFloorLook(settings) {
    const pct = (key) => { const v = parseFloat(settings && settings[key]); return Math.min(100, Math.max(0, isNaN(v) ? FLOOR_LOOK_DEFAULTS[key] : v)) / 100; };
    const rest = pct("floors_rest"), lift = pct("floors_hover"), edge = pct("floors_outline");
    Object.assign(FLOOR_LOOK, {
        rest,                                  // every floor that has units to show
        selected: Math.max(rest, lift * 0.8),  // the floor picked in Unit Search, or the floor of the unit that is open
        lift,                                  // under the pointer
        dim: rest * 0.45,                      // the other floors while one is under the pointer
        ghost: rest * 0.6,                     // a floor none of whose units pass the filters (grey, not clickable)
        edge, edgeSelected: edge > 0 ? Math.min(1, edge + 0.4) : 0, edgeDim: edge * 0.36, edgeGhost: edge * 0.33, // 0 = no outlines in any state
        colors: {},                            // floor key → fixed colour (hex number), only the floors that have one
    });
    for (const key of ["LG", "GF", "1", "2", "3", "RF"]) { // the keys of FLOOR_TITLES (declared further down)
        const m = String((settings && settings["floor_color_" + key]) || "").trim().match(/^#?([0-9a-f]{6})$/i);
        if (m) FLOOR_LOOK.colors[key] = parseInt(m[1], 16);
    }
    // The unit boxes of the floor screens (ground / roof): units_rest / units_hover / units_outline.
    const uRest = pct("units_rest"), uLift = pct("units_hover"), uEdge = pct("units_outline");
    FLOOR_LOOK.units = { rest: uRest, lift: Math.max(uRest, uLift), dim: uRest * 0.27, edge: uEdge, edgeDim: uEdge * 0.13 };
}
// A darker shade of a hex colour (the storey edges of a fixed-coloured floor in the 3D view).
const darkenHex = (hex, f) => (Math.round(((hex >> 16) & 255) * f) << 16) | (Math.round(((hex >> 8) & 255) * f) << 8) | Math.round((hex & 255) * f);
setFloorLook(window.siteSettings);
// A change saved in the dashboard repaints the floors that are on screen.
document.addEventListener("site:settings", (e) => { setFloorLook(e.detail); if (typeof applyThreeUnitsFromSheet === "function") applyThreeUnitsFromSheet(); });
const FLOOR_TITLES = { LG: "Basement", GF: "Ground Floor", "1": "First Floor", "2": "Second Floor", "3": "Third Floor", RF: "Roof" };

// "GROUND_SELECT" → "GF", "SECOND _ SELECT" → "2", "ROOF" → "RF"; "" when the mesh is not a floor
// (tools/bake-camera.js reads the names the same way). A box may also carry the floor's name as
// units.floor stores it — "1st Floor", "Townhouse" (Tower 2's FBX_CAM/TOWER2_FLOORS.fbx) — which goes
// through the same normaliser as the units, accepted when it is one of this project's floors.
const FLOOR_MESH_WORDS = { LOWERGROUND: "LG", BASEMENT: "LG", GROUND: "GF", FIRST: "1", SECOND: "2", THIRD: "3", ROOF: "RF" };
function floorKeyFromMeshName(name) {
    const word = String(name || "").toUpperCase().replace(/SELECT(ION)?|FLOOR/g, "").replace(/[^A-Z]/g, "");
    if (FLOOR_MESH_WORDS[word]) return FLOOR_MESH_WORDS[word];
    const key = normalizeFloor(String(name || "").replace(/SELECT(ION)?/gi, ""));
    return (PROJECT.floors || []).some((f) => String(f.key) === key) ? key : "";
}

/* A floor's outline: the top and bottom loops of its volume. The vertical edge
   at every jog of the footprint is left out — four floors of those hatch the
   whole facade. */
/* The footprint of a DETAILED volume — many boxes unioned in one mesh (Tower 2: the top level, the penthouse with its
   terraces and parapets, ~900 triangles): the boundary of the union of its faces seen from above (all of them, or only
   those at one level when tol is finite), traced on a 10 cm grid. Every box has its own loop and the roof faces are
   islands with gaps, so neither the edges nor a per-level union make one outline; the whole-volume footprint does.
   The building is axis-aligned in the world, so the boundary comes out as straight segments (a rotated one would step
   by the cell). Returns world segments [x1, z1, x2, z2]; footprintAt() places them at a height. */
function unionFootprint(mesh, yLevel, tol) {
    const g = mesh.geometry, pos = g.attributes.position, idx = g.index;
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const tris = []; const n = idx ? idx.count : pos.count;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i + 2 < n; i += 3) {
        for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(mesh.matrixWorld);
        if (Number.isFinite(tol) && v.some((p) => Math.abs(p.y - yLevel) > tol)) continue; // not a face at this level
        if (Math.abs((v[1].x - v[0].x) * (v[2].z - v[0].z) - (v[2].x - v[0].x) * (v[1].z - v[0].z)) < 1) continue; // a vertical face has no footprint
        tris.push([v[0].x, v[0].z, v[1].x, v[1].z, v[2].x, v[2].z]);
        for (const p of v) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    }
    if (!tris.length) return [];
    const cell = 10, x0 = minX - cell, z0 = minZ - cell;
    const W = Math.ceil((maxX - minX) / cell) + 3, H = Math.ceil((maxZ - minZ) / cell) + 3;
    const grid = new Uint8Array(W * H);
    for (const [ax, az, bx, bz, cx, cz] of tris) {
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / cell)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / cell));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / cell)), j1 = Math.min(H - 1, Math.ceil((Math.max(az, bz, cz) - z0) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const px = x0 + (i + 0.5) * cell, pz = z0 + (j + 0.5) * cell; // the cell centre inside the triangle?
            const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz), d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz), d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az);
            if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) grid[j * W + i] = 1;
        }
    }
    // the exterior = what a flood from the margin reaches; holes inside the outline (the core, which the boxes do not cover)
    // and islands in them are not exterior, so only the outer boundary is traced
    const ext = new Uint8Array(W * H), stack = [];
    for (let i = 0; i < W; i++) stack.push(i, 0, i, H - 1);
    for (let j = 0; j < H; j++) stack.push(0, j, W - 1, j);
    while (stack.length) { const j = stack.pop(), i = stack.pop(); if (i < 0 || j < 0 || i >= W || j >= H) continue; const k = j * W + i; if (ext[k] || grid[k]) continue; ext[k] = 1; stack.push(i + 1, j, i - 1, j, i, j + 1, i, j - 1); }
    const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : ext[j * W + i] ? 0 : 1); // 1 = building (or a hole in it)
    const segs = []; // world [x1, z1, x2, z2], boundary cell sides merged into runs
    for (let j = 0; j <= H; j++) { let run = -1; for (let i = 0; i <= W; i++) { const b = i < W && at(i, j) !== at(i, j - 1); if (b && run < 0) run = i; if (!b && run >= 0) { segs.push([x0 + run * cell, z0 + j * cell, x0 + i * cell, z0 + j * cell]); run = -1; } } }
    for (let i = 0; i <= W; i++) { let run = -1; for (let j = 0; j <= H; j++) { const b = j < H && at(i, j) !== at(i - 1, j); if (b && run < 0) run = j; if (!b && run >= 0) { segs.push([x0 + i * cell, z0 + run * cell, x0 + i * cell, z0 + j * cell]); run = -1; } } }
    return segs;
}
// the footprint segments (world x / z) placed at a world height, in the local space of the mesh (what the outline geometry holds)
function footprintAt(mesh, segs, y) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(), out = [], p = new THREE.Vector3();
    for (const [x1, z1, x2, z2] of segs) { p.set(x1, y, z1).applyMatrix4(inv); out.push(p.x, p.y, p.z); p.set(x2, y, z2).applyMatrix4(inv); out.push(p.x, p.y, p.z); }
    return out;
}

function floorOutlineGeometry(mesh) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
    const pos = edges.attributes.position, keep = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), wa = new THREE.Vector3(), wb = new THREE.Vector3();
    mesh.updateWorldMatrix(true, false);
    // A detailed volume (Tower 2: the top level — the penthouse, terraces and parapets as many boxes in one mesh, ~900
    // triangles, where the other floors are ~100-triangle prisms) would hatch the roof with every box of its own loop:
    // it gets the outline of its whole footprint at its bottom and its top instead (unionFootprint). Prisms are unaffected.
    const g = mesh.geometry, tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    const detailed = tris > 300;
    if (detailed) {
        g.computeBoundingBox(); const bb = g.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        const fp = unionFootprint(mesh, 0, Infinity); // the whole volume seen from above: one loop at the bottom and at the top, like the other floors
        keep.push(...footprintAt(mesh, fp, bb.min.y), ...footprintAt(mesh, fp, bb.max.y));
    } else {
        for (let i = 0; i + 1 < pos.count; i += 2) {
            a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1);
            wa.copy(a).applyMatrix4(mesh.matrixWorld); wb.copy(b).applyMatrix4(mesh.matrixWorld);
            if (Math.abs(wa.y - wb.y) < 1) keep.push(a.x, a.y, a.z, b.x, b.y, b.z); // level in the world = part of a loop
        }
    }
    edges.dispose();
    const outline = new THREE.BufferGeometry();
    outline.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
    return outline;
}

/* Materials for one floor volume.
   The volumes are closed and overlap in view (a wing in front of a courtyard
   wall, one floor behind another), so see-through fills would stack up into
   darker patches. Two things keep it to exactly one layer per pixel:
     · only the faces turned to the camera are drawn (FrontSide)
     · a depth-only copy is drawn first, so of those faces only the nearest
       survives the depth test — whichever floor it belongs to
   Both use the same polygon offset, which also lets the outline sit on top. */
function setupFloorMesh(mesh) {
    const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    mesh.material = new THREE.MeshBasicMaterial(Object.assign({
        color: THREE_STATUS_COLORS.available,
        transparent: true,
        opacity: FLOOR_LOOK.rest,
        depthWrite: false,
        depthTest: true,
        side: THREE.FrontSide,
    }, offset));
    mesh.userData.restOpacity = FLOOR_LOOK.rest;

    const depth = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial(Object.assign({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.FrontSide,
    }, offset)));
    depth.renderOrder = 0.5; // after the building shell (0), before the fills (1)
    depth.raycast = function () { }; // the pointer is for the floor itself
    mesh.add(depth);

    if (UNIT_OUTLINES) {
        const edgeLine = new THREE.LineSegments(
            floorOutlineGeometry(mesh),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: FLOOR_LOOK.edge, depthTest: true, depthWrite: false }),
        );
        edgeLine.renderOrder = 2;
        edgeLine.userData.isUnitEdge = true;
        edgeLine.raycast = function () { };
        mesh.add(edgeLine);
        mesh.userData.edgeLine = edgeLine;
        mesh.userData.restEdgeOpacity = FLOOR_LOOK.edge;
    }
}

/* What the floors need to know from the sheet: every floor's units, those of
   them that pass the filters — all filters EXCEPT the floor one, or picking a
   floor would make the other floors unpickable — and which floor is selected. */
function getThreeFloorSets() {
    const group = (rows) => {
        const map = new Map();
        rows.forEach((u) => { if (!map.has(u.floor)) map.set(u.floor, []); map.get(u.floor).push(u); });
        return map;
    };
    const units = allUnits || [];
    let rows = units, picked = "";
    if (typeof getFilteredTableUnits === "function") {
        picked = TABLE_FILTERS.floor || "";
        TABLE_FILTERS.floor = "";
        try { rows = getFilteredTableUnits(); } finally { TABLE_FILTERS.floor = picked; } // restore before anything else can read it
    }
    const open = highlightedUnitId ? units.find((u) => u.id === highlightedUnitId) : null;
    return { all: group(units), matching: group(rows), picked, opened: open ? open.floor : "" };
}

// A floor is as available as its best unit.
function floorStatus(units) {
    if (!units.length || units.some((u) => u.status === "available")) return "available";
    return units.some((u) => u.status === "reserved") ? "reserved" : "sold";
}

function paintFloorMesh(mesh, sets) {
    if (!mesh.material) return;
    const key = mesh.userData.floorKey;
    const units = sets.matching.get(key) || [];
    // Once the sheet is in: a floor with nothing to show goes grey and stops answering the pointer.
    const ghost = sets.all.size > 0 && !units.length;
    const selected = !ghost && (key === sets.picked || key === sets.opened);
    const edge = mesh.userData.edgeLine;

    mesh.visible = true;
    mesh.userData.ghosted = ghost;
    mesh.userData.status = floorStatus(units);
    // Overlay: see-through over the photo. 3D view: solid, so it must occlude what is behind it.
    mesh.material.depthWrite = !!(is3DMode && !ghost);

    const rest = ghost ? (is3DMode ? 0.16 : FLOOR_LOOK.ghost) : is3DMode ? 1 : selected ? FLOOR_LOOK.selected : FLOOR_LOOK.rest;
    const own = FLOOR_LOOK.colors && FLOOR_LOOK.colors[key]; // the fixed colour picked for this floor in the dashboard, if any
    mesh.material.color.set(ghost ? 0x8d97a3 : own != null ? own : THREE_STATUS_COLORS[mesh.userData.status]);
    mesh.material.opacity = rest;
    mesh.userData.restOpacity = rest;
    if (edge) {
        const edgeRest = ghost ? FLOOR_LOOK.edgeGhost : is3DMode ? 0.9 : selected ? FLOOR_LOOK.edgeSelected : FLOOR_LOOK.edge;
        edge.visible = true;
        // Over the photo a white line reads on anything. On the solid plates of the 3D
        // view it is a dark shade of the floor's own colour that separates the storeys.
        const darkEdge = own != null ? darkenHex(own, 0.6) : THREE_STATUS_EDGE_COLORS[mesh.userData.status];
        edge.material.color.set(is3DMode && !ghost ? darkEdge : (UNIT_OUTLINE_COLOR ?? darkEdge));
        edge.material.opacity = edgeRest;
        mesh.userData.restEdgeOpacity = edgeRest;
    }
}

// The floor's summary, next to the pointer. Rebuilt only when another floor comes under it.
let floorCardKey = "";
function showFloorHoverCard(floorKey, event) {
    const card = document.getElementById("floorHoverCard");
    if (!card) return;
    document.getElementById("unitHoverCard")?.classList.remove("show");

    if (floorCardKey !== floorKey) {
        floorCardKey = floorKey;
        const units = getThreeFloorSets().matching.get(floorKey) || [];
        const count = (status) => units.filter((u) => u.status === status).length;

        // the floor's title: the project's own name when it is a full title ("3rd Floor", projects.js → floors), else the
        // classic names (Khawalid 20 names its floors "Ground", "First" — those stay "Ground Floor", "First Floor"), else the name
        const ownFloorName = ((PROJECT.floors || []).find((f) => String(f.key) === floorKey) || {}).name || "";
        document.getElementById("floorHoverName").textContent = (/floor/i.test(ownFloorName) ? ownFloorName : "") || FLOOR_TITLES[floorKey] || ownFloorName || floorKey;
        document.getElementById("floorHoverCount").textContent = units.length + (units.length === 1 ? " apartment" : " apartments");
        document.getElementById("floorHoverStats").innerHTML = [["available", "Available"], ["reserved", "Reserved"], ["sold", "Sold"]]
            .filter(([status]) => count(status))
            .map(([status, label]) => `<span class="floor-hover-stat ${status}"><b>${count(status)}</b><span>${label}</span></span>`)
            .join("");

        // one row per apartment type, then the span of areas and prices on the floor
        const types = new Map();
        units.forEach((u) => { const t = String(u.type || "").trim(); if (t && t !== "—") types.set(t, (types.get(t) || 0) + 1); });
        const rows = [...types.entries()]
            .sort((a, b) => (parseInt(a[0], 10) || 0) - (parseInt(b[0], 10) || 0) || a[0].localeCompare(b[0]))
            .map(([type, n]) => [type, n + (n === 1 ? " unit" : " units")]);
        const span = (values, format) => {
            const lo = Math.min(...values), hi = Math.max(...values);
            return lo === hi ? format(lo) : format(lo) + " – " + format(hi);
        };
        const areas = units.map(getAreaNumber).filter((v) => v > 0);
        const prices = units.map((u) => Number(u.priceRaw) || 0).filter((v) => v > 0);
        if (areas.length) rows.push(["Area", span(areas, (v) => String(Math.round(v))) + " m²"]);
        if (prices.length) rows.push(["Price", span(prices, formatPriceShort) + " SAR"]);
        document.getElementById("floorHoverInfo").innerHTML = rows
            .map(([label, value]) => `<div class="unit-hover-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`)
            .join("");
    }

    moveUnitHoverCard(event, card);
    card.classList.add("show");
}

function hideFloorHoverCard() {
    document.getElementById("floorHoverCard")?.classList.remove("show");
    floorCardKey = ""; // the numbers may have changed by the next hover
}

// A click on a floor: pick it and show its units.
function selectFloorFromOverlay(floorKey) {
    hideUnitHoverCard();
    if (typeof window.showFloorUnits === "function") { window.showFloorUnits(floorKey); return; }
    // no Unit Search panel on the page: the table drawer does the same job
    TABLE_FILTERS.floor = floorKey;
    openUnitsTable();
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let quote = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const n = text[i + 1];

        if (c === '"' && quote && n === '"') {
            cur += '"';
            i++;
            continue;
        }

        if (c === '"') {
            quote = !quote;
            continue;
        }

        if (c === "," && !quote) {
            row.push(cur);
            cur = "";
            continue;
        }

        if ((c === "\n" || c === "\r") && !quote) {
            if (c === "\r" && n === "\n") i++;
            row.push(cur);
            rows.push(row);
            row = [];
            cur = "";
            continue;
        }

        cur += c;
    }

    row.push(cur);
    rows.push(row);

    return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function findHeaderRow(rows) {
    return rows.findIndex(
        (r) =>
            r.some((c) => /row name|unit|name/i.test(c)) &&
            r.some((c) => /floor/i.test(c)),
    );
}

function parseSheetRows(rows) {
    let headerIndex = findHeaderRow(rows);
    if (headerIndex < 0) headerIndex = 0;

    const headers = rows[headerIndex].map(normalizeHeader);

    return rows
        .slice(headerIndex + 1)
        .map((cols, index) => {
            const row = {};

            headers.forEach((header, i) => {
                if (header) row[header] = String(cols[i] || "").trim();
            });

            const name = getVal(row, [
                "rowname",
                "name",
                "unit",
                "unitname",
                "unitnumber",
                "code",
            ]);
            const floorRaw = getVal(row, ["floor", "floornumber", "level"]);

            if (!name || !floorRaw) return null;

            const priceRaw = getVal(row, ["price", "totalprice", "unitprice"]);
            const areaRaw = getVal(row, ["indoorarea", "area", "sqm", "m2"]);
            const availability = getVal(row, [
                "availability",
                "available",
                "status",
            ]);
            const type = getVal(row, ["type", "unittype"]);

            const imgSource = getVal(row, [
                "imgsource",
                "image",
                "imagesource",
                "img",
                "unitimage",
            ]);
            const brochure = getVal(row, [
                "brochure",
                "brochureurl",
                "brochurelink",
                "pdf",
            ]);
            const tour = getVal(row, [
                "apartmenttour",
                "tour",
                "virtualtour",
                "toururl",
                "apttour",
            ]);
            const view3d = getVal(row, [
                "apartment3dview",
                "3dview",
                "3d",
                "threedview",
                "threed",
            ]);
            const balcony = getVal(row, [
                "balconyview",
                "balcony",
                "balconyurl",
            ]);
            const plans = getVal(row, [
                "plans",
                "plan",
                "floorplan",
                "planurl",
                "floorplanurl",
            ]);

            return {
                id: name + "-" + index,
                name,
                floorRaw,
                floor: normalizeFloor(floorRaw),
                area: areaRaw ? areaRaw + " m²" : "—",
                price: formatPrice(priceRaw),
                priceRaw: Number(String(priceRaw).replace(/,/g, "")) || 0,
                status: statusKey(availability),
                availability: availability || "Available",
                type: type || "—",

                points: getVal(row, [
                    "points",
                    "polygon",
                    "coords",
                    "coordinates",
                ]),
                x: Number(getVal(row, ["x", "left"])) || null,
                y: Number(getVal(row, ["y", "top"])) || null,
                w: Number(getVal(row, ["w", "width"])) || null,
                h: Number(getVal(row, ["h", "height"])) || null,

                imgSource,
                brochure,
                tour,
                view3d,
                balcony,
                plans,
            };
        })
        .filter(Boolean);
}

function parseSheet(text) {
    return parseSheetRows(parseCSV(text));
}

function cacheBustUrl(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${Date.now()}`;
}

function assertSheetText(text, sourceName) {
    const trimmed = String(text || "").trim();

    if (!trimmed) {
        throw new Error(`${sourceName} returned an empty response`);
    }

    if (trimmed.startsWith("<")) {
        throw new Error(
            `${sourceName} returned HTML instead of sheet data`,
        );
    }

    return text;
}

async function fetchSheetCsv() {
    const urls = [
        { name: "Google Visualization CSV", url: GVIZ_CSV_URL },
        { name: "Google CSV export", url: CSV_URL },
    ];
    const errors = [];

    for (const source of urls) {
        try {
            const res = await fetch(cacheBustUrl(source.url), {
                cache: "no-store",
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
            }

            return assertSheetText(await res.text(), source.name);
        } catch (error) {
            errors.push(`${source.name}: ${error.message}`);
        }
    }

    throw new Error(errors.join(" | "));
}

function googleTableToRows(table) {
    if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) {
        throw new Error("Google Visualization returned no table data");
    }

    const headers = table.cols.map((col) => col?.label || col?.id || "");
    const rows = table.rows.map((row) =>
        headers.map((_, index) => {
            const cell = row.c?.[index];
            const value = cell?.f ?? cell?.v ?? "";

            return value == null ? "" : String(value);
        }),
    );

    return [headers, ...rows];
}

function fetchSheetRowsJsonp() {
    return new Promise((resolve, reject) => {
        const callbackName = `__sheetJsonp_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;
        const script = document.createElement("script");
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Google Visualization JSONP timed out"));
        }, 12000);

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            script.remove();
        }

        window[callbackName] = (response) => {
            cleanup();

            if (response?.status === "error") {
                const message =
                    response.errors
                        ?.map(
                            (error) =>
                                error.detailed_message || error.message || error.reason,
                        )
                        .filter(Boolean)
                        .join("; ") || "Google Visualization returned an error";

                reject(new Error(message));
                return;
            }

            try {
                resolve(googleTableToRows(response?.table));
            } catch (error) {
                reject(error);
            }
        };

        script.onerror = () => {
            cleanup();
            reject(new Error("Google Visualization JSONP script failed"));
        };

        const tqx = encodeURIComponent(
            `out:json;responseHandler:${callbackName}`,
        );
        script.src = cacheBustUrl(`${GVIZ_JSON_URL}&tqx=${tqx}`);
        document.head.appendChild(script);
    });
}
