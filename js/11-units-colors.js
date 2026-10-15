/* =========================================================
   THREE UNITS STATUS COLORS + FILTER + HIGHLIGHT
========================================================= */

const THREE_STATUS_COLORS = {
    available: 0x22c55e, // green
    reserved: 0xf59e0b, // yellow/orange
    sold: 0xef4444,     // red
};
// Draw an outline around every unit box? false = plain fills.
const UNIT_OUTLINES = true;
// Outline colour: a hex colour (0xffffff = thin white lines), or null for a
// dark shade of the unit's own status colour (THREE_STATUS_EDGE_COLORS).
// WebGL draws lines 1 px wide whatever the material says, so they stay thin.
const UNIT_OUTLINE_COLOR = 0xffffff;
// Outline = a dark shade of the same hue (the "700" step of each colour), so a
// green unit gets a dark-green border, a red one a dark-red border, and so on.
const THREE_STATUS_EDGE_COLORS = {
    available: 0x15803d,
    reserved: 0xb45309,
    sold: 0xb91c1c,
};
const THREE_GHOST_EDGE_COLOR = 0x475569; // dark slate for the grey ghost massing

let highlightedUnitId = null;
let highlightedMesh = null;

function getUnitColor(unit) {
    return THREE_STATUS_COLORS[unit?.status] || THREE_STATUS_COLORS.available;
}
function getUnitEdgeColor(unit) {
    const c = THREE_STATUS_EDGE_COLORS[unit?.status];
    if (c !== undefined) return c;
    // Unknown status: darken its fill colour instead of falling back to white.
    return new THREE.Color(getUnitColor(unit)).multiplyScalar(0.6).getHex();
}

function getUnitMeshKey(mesh) {
    const unit = findUnitFromMesh(mesh);
    return unit?.id || normalizeUnitName(mesh?.name || mesh?.parent?.name || "");
}

/* The exported unit boxes reach ~35 cm past their own floor slab at the top
   and the bottom, so consecutive floors overlap by ~70 cm and neighbours share
   faces — in 3D mode the boxes visibly cut through each other. Once per load:
     · trim every unit to the mid-plane of the overlap with the floor above /
       below (floors come from the sheet, ordered by EX3D_FLOOR_ORDER)
     · shrink each footprint by UNIT_GAP so adjacent boxes stay apart
     · rebuild the outline geometry to match
   Works in world space (the FBX root carries the axis rotation). */
const UNIT_GAP = 8; // cm between neighbouring boxes (4 cm off each side)
// (the once-only flag lives on the model — unitsModel.userData.tidied — because a scene can swap the overlay model)
function tidyUnitGeometry() {
    if (!unitsModel || unitsModel.userData.tidied || typeof THREE === "undefined") return;
    // Unit boxes learn their floor from the sheet; floor volumes carry it in their name.
    if (!overlayHasFloors && !allUnits?.length) return;
    // Floor volumes are also capped at the building shell (step 2b) — wait until it is in.
    if (overlayHasFloors && THREE_ASSETS.occluder && !occluderSettled) return;
    unitsModel.updateMatrixWorld(true);

    // 1. world-space extents per mesh + per floor
    const info = new Map(); // mesh -> { floor, minY, maxY, cx, cz, sx, sz }
    const floors = new Map(); // floor key -> { bottom, top }
    const v = new THREE.Vector3();
    forEachUnitMesh((mesh) => {
        const floorKey = mesh.userData.floorKey || "";
        const unit = floorKey ? null : findUnitFromMesh(mesh);
        const pos = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
        if ((!unit && !floorKey) || !pos) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
            if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
        }
        const floor = floorKey || String(unit.floor || "");
        // gap: a floor volume meets its neighbours exactly (one shared outline); boxes keep UNIT_GAP between them
        info.set(mesh, { floor, gap: floorKey ? 0 : UNIT_GAP, minY, maxY, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, sx: maxX - minX, sz: maxZ - minZ });
        const f = floors.get(floor) || { bottom: Infinity, top: -Infinity };
        f.bottom = Math.min(f.bottom, minY); f.top = Math.max(f.top, maxY);
        floors.set(floor, f);
    });
    if (!info.size) return;

    // 2. one boundary plane between each pair of consecutive floors (mid-overlap;
    //    if the floors already clear each other, nothing moves)
    const order = EX3D_FLOOR_ORDER.filter((k) => floors.has(k)).concat([...floors.keys()].filter((k) => !EX3D_FLOOR_ORDER.includes(k)));
    const below = new Map(), above = new Map(); // floor key -> boundary y
    for (let i = 0; i + 1 < order.length; i++) {
        const lo = floors.get(order[i]), hi = floors.get(order[i + 1]);
        if (lo.top > hi.bottom) { const y = (lo.top + hi.bottom) / 2; above.set(order[i], y); below.set(order[i + 1], y); }
    }

    // 2b. no floor volume rises above the building shell. The selection volumes are a
    //     full storey tall whatever the roof does, and over the photo the extra metre
    //     on the top floor would tint a strip of sky.
    const shellTop = occluderModel ? new THREE.Box3().setFromObject(occluderModel).max.y : Infinity;
    // 2c. the project's own fit of the floor volumes to what the renders show (projects.js → models.floorFit, cm):
    //     `grow` widens every floor's footprint by that much on each side (facade fins that project past the
    //     structural volume the boxes were modelled from), `groundLevel` lifts the lowest floor's bottom to the
    //     plinth the building stands on, `roofLevel` caps the top floor at the penthouse roof. Measured against the
    //     renders (README section 5); absent = the boxes as delivered.
    const fit = (PROJECT.models && PROJECT.models.floorFit) || {};
    const growCm = Number(fit.grow) || 0, groundLevel = Number(fit.groundLevel), roofLevel = Number(fit.roofLevel);
    const lowestFloor = order[0], highestFloor = order[order.length - 1];

    // 3. move the vertices: top / bottom planes onto the boundaries, footprint inset
    const inv = new THREE.Matrix4();
    const EPS = 1.5;
    info.forEach((d, mesh) => {
        const pos = mesh.geometry.attributes.position;
        inv.copy(mesh.matrixWorld).invert();
        let yBottom = below.has(d.floor) ? Math.max(d.minY, below.get(d.floor) + d.gap / 2) : d.minY;
        let yTop = above.has(d.floor) ? Math.min(d.maxY, above.get(d.floor) - d.gap / 2) : d.maxY;
        if (!d.gap && shellTop > yBottom + 100) yTop = Math.min(yTop, shellTop); // floor volumes only (2b)
        if (!d.gap && d.floor === lowestFloor && Number.isFinite(groundLevel) && groundLevel < yTop - 100) yBottom = Math.max(yBottom, groundLevel); // 2c
        if (!d.gap && d.floor === highestFloor && Number.isFinite(roofLevel) && roofLevel > yBottom + 100) yTop = Math.min(yTop, roofLevel); // 2c
        let kx = d.gap && d.sx > d.gap * 4 ? (d.sx - d.gap) / d.sx : 1;
        let kz = d.gap && d.sz > d.gap * 4 ? (d.sz - d.gap) / d.sz : 1;
        if (!d.gap && growCm) { kx = (d.sx + 2 * growCm) / d.sx; kz = (d.sz + 2 * growCm) / d.sz; } // 2c
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            if (Math.abs(v.y - d.maxY) < EPS) v.y = yTop;
            else if (Math.abs(v.y - d.minY) < EPS) v.y = yBottom;
            v.x = d.cx + (v.x - d.cx) * kx;
            v.z = d.cz + (v.z - d.cz) * kz;
            v.applyMatrix4(inv);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        const edge = mesh.userData.edgeLine;
        if (edge) { const old = edge.geometry; edge.geometry = mesh.userData.floorKey ? floorOutlineGeometry(mesh) : new THREE.EdgesGeometry(mesh.geometry, 20); if (old) old.dispose(); }
    });
    unitsModel.userData.tidied = true;
    console.info(`[3d] overlay tidied: ${info.size} ${overlayHasFloors ? "floor volumes" : "boxes"}, floor boundaries at ${[...above.values()].map((y) => Math.round(y)).join(" / ")} cm${overlayHasFloors ? "" : ", gap " + UNIT_GAP + " cm"}${growCm || Number.isFinite(groundLevel) || Number.isFinite(roofLevel) ? ` — floorFit: grow ${growCm} cm, ground ${Number.isFinite(groundLevel) ? groundLevel : "–"}, roof ${Number.isFinite(roofLevel) ? roofLevel : "–"}` : ""}`);
}

function forEachUnitMesh(callback) {
    if (!unitsModel) return;

    unitsModel.traverse((child) => {
        if (child.isMesh && child.userData.isUnit) {
            callback(child);
        }
    });
}

function getFilteredUnitIdsForThree() {
    /*
      نفس فلاتر الجدول بالظبط:
      search + floor + status + price + area
    */
    if (typeof getFilteredTableUnits !== "function") {
        return new Set(allUnits.map((unit) => unit.id));
    }

    return new Set(getFilteredTableUnits().map((unit) => unit.id));
}

/* The prototype (type) filter reads differently from the others in 3D.
   Hiding every non-Admin unit leaves a building with holes in it — you lose
   the massing that makes the highlight meaningful. So units excluded ONLY by
   the prototype filter are ghosted rather than hidden: the chosen prototype
   keeps its availability colours at full strength and the rest fall back to a
   faint grey. Every other filter (floor, status, price, area) still hides. */
function getThreeUnitSets() {
    const visible = getFilteredUnitIdsForThree();
    const ghost = new Set();

    const types = (typeof TABLE_FILTERS !== "undefined" && TABLE_FILTERS.types) || [];
    if (types.length && typeof getFilteredTableUnits === "function") {
        TABLE_FILTERS.types = [];
        try {
            getFilteredTableUnits().forEach((u) => {
                if (!visible.has(u.id)) ghost.add(u.id);
            });
        } finally {
            TABLE_FILTERS.types = types; // restore before anything else can read it
        }
    }
    return { visible, ghost };
}

function paintUnitMesh(mesh, unit, options = {}) {
    if (!mesh || !mesh.material) return;

    const { highlighted = false, visible = true, ghosted = false } = options;

    mesh.visible = visible || ghosted;
    // Ghosts are context, not targets — hover and click skip them.
    mesh.userData.ghosted = ghosted && !visible;

    mesh.material.transparent = true;
    // Overlay: see-through fills over the photo, so no depth writes (boxes
    // blend). 3D mode: the fills are solid, so they must occlude the boxes and
    // outlines behind them — without this every edge showed through every box.
    mesh.material.depthWrite = !!(is3DMode && visible);
    mesh.material.depthTest = true;

    const edge = mesh.userData.edgeLine;
    if (edge) edge.visible = visible || ghosted;

    if (!visible && !ghosted) {
        mesh.material.opacity = 0;
        mesh.userData.restOpacity = 0;
        return;
    }

    if (!visible) {
        // Faint grey massing: enough to read the building's shape, not enough to
        // compete with the prototype being shown.
        mesh.material.color.set(0x8d97a3);
        const ghostRest = is3DMode ? 0.16 : 0.09;
        mesh.material.opacity = ghostRest;
        mesh.userData.restOpacity = ghostRest;
        if (edge) {
            edge.material.color.set(UNIT_OUTLINE_COLOR ?? THREE_GHOST_EDGE_COLOR);
            const ghostEdge = is3DMode ? 0.22 : 0.16;
            edge.material.opacity = ghostEdge;
            mesh.userData.restEdgeOpacity = ghostEdge;
        }
        return;
    }

    if (highlighted) {
        mesh.material.color.set(0xffffff);
        mesh.material.opacity = 0.95;
        mesh.userData.restOpacity = 0.95;
        if (edge) {
            // dark outline in the unit's own hue so the border still reads on the
            // white highlight fill
            edge.material.color.set(getUnitEdgeColor(unit));
            edge.material.opacity = 1;
            mesh.userData.restEdgeOpacity = 1;
        }
        return;
    }

    mesh.material.color.set(getUnitColor(unit));
    /* Over a photo the fill is the dashboard's "units at rest" (45 % by default: the render
       shows through and supplies the detail). In 3D mode the units ARE the building (the
       shell is the same volumes plus slabs), so at 0.45 the massing dissolves into a haze
       of overlapping edges. Solid reads as architecture; ghosted reads as noise. */
    const rest = is3DMode ? 1 : FLOOR_LOOK.units.rest;
    mesh.material.opacity = rest;
    mesh.userData.restOpacity = rest;
    if (edge) {
        edge.material.color.set(UNIT_OUTLINE_COLOR ?? getUnitEdgeColor(unit));
        // Soft enough not to clutter the photo; in 3D mode the fill is solid, so
        // the lines read at a lower value still.
        const edgeRest = is3DMode ? 0.45 : FLOOR_LOOK.units.edge; // the dashboard's "unit outlines"
        edge.material.opacity = edgeRest;
        mesh.userData.restEdgeOpacity = edgeRest;
    }
}

function applyThreeUnitsFromSheet() {
    if (!unitsModel) return;
    if (!overlayHasFloors && !allUnits?.length) return; // unit boxes are nothing without their rows
    tidyUnitGeometry(); // no-op after the first pass

    const { visible: filteredIds, ghost: ghostIds } = getThreeUnitSets();
    const floorSets = overlayHasFloors ? getThreeFloorSets() : null;

    forEachUnitMesh((mesh) => {
        if (mesh.userData.floorKey) {
            paintFloorMesh(mesh, floorSets);
            return;
        }

        const unit = findUnitFromMesh(mesh);

        // لو مفيش unit matching في الشيت اخفيه عشان ميظهرش غلط
        if (!unit) {
            mesh.visible = false;
            if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = false;
            return;
        }

        const isVisibleByFilter = filteredIds.has(unit.id);
        const isHighlighted = highlightedUnitId && unit.id === highlightedUnitId;

        mesh.userData.unitId = unit.id;
        mesh.userData.status = unit.status;

        paintUnitMesh(mesh, unit, {
            visible: isVisibleByFilter,
            ghosted: ghostIds.has(unit.id),
            highlighted: isHighlighted,
        });
    });
}

function clearThreeHighlight() {
    highlightedUnitId = null;
    highlightedMesh = null;
    applyThreeUnitsFromSheet();
}

function highlightUnitInThree(unit) {
    if (!unit || !unitsModel) return;

    highlightedUnitId = unit.id;
    highlightedMesh = null;

    forEachUnitMesh((mesh) => {
        const meshUnit = findUnitFromMesh(mesh);

        if (meshUnit?.id === unit.id) {
            highlightedMesh = mesh;
        }
    });

    applyThreeUnitsFromSheet();
}

function showUnitHoverCard(unit, event) {
    if (!unit) return;

    const card = document.getElementById("unitHoverCard");
    const imgBox = document.getElementById("unitHoverImg");
    const name = document.getElementById("unitHoverName");
    const type = document.getElementById("unitHoverType");
    const status = document.getElementById("unitHoverStatus");
    const floor = document.getElementById("unitHoverFloor");
    const area = document.getElementById("unitHoverArea");
    const price = document.getElementById("unitHoverPrice");

    if (!card) return;

    const amenity = typeof isAmenityUnit === "function" && isAmenityUnit(unit); // a shared space: no type line, no price row
    name.textContent = unit.name || "Unit";
    type.textContent = unit.type || "—";
    type.style.display = amenity ? "none" : "";

    status.className = `unit-hover-status ${unit.status}`;
    status.textContent = unit.availability || unit.status || "Available";

    floor.textContent = unit.floorRaw || unit.floor || "—";
    area.textContent = unit.area || "—";
    price.textContent = unit.price || "—";
    const priceRow = price.closest(".unit-hover-row");
    if (priceRow) priceRow.style.display = amenity ? "none" : "";

    // The floor plan, not the photo: that is what a box on a floor screen stands for (the photo when a unit has none).
    const plan = planUrls(unit)[0] || "";
    const hoverSrc = plan || String(unit.imgSource || "").trim();
    imgBox.classList.toggle("plan", !!plan);
    if (hoverSrc) {
        imgBox.innerHTML = `
  <img 
src="${escapeHtml(hoverSrc)}"
alt="${escapeHtml(unit.name)}"
onerror="this.parentElement.innerHTML='<div class=&quot;unit-hover-no-img&quot;>Image failed to load</div>'"
  />
`;
    } else {
        imgBox.innerHTML = `<div class="unit-hover-no-img">No image available</div>`;
    }

    moveUnitHoverCard(event);
    card.classList.add("show");
}

function moveUnitHoverCard(event, card) {
    card = card || document.getElementById("unitHoverCard");
    if (!card || !event) return;

    const padding = 14;
    const offsetX = 18;
    const offsetY = 18;

    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;

    const rect = card.getBoundingClientRect();

    if (x + rect.width > window.innerWidth - padding) {
        x = event.clientX - rect.width - offsetX;
    }

    if (y + rect.height > window.innerHeight - padding) {
        y = event.clientY - rect.height - offsetY;
    }

    x = Math.max(padding, x);
    y = Math.max(padding, y);

    card.style.left = x + "px";
    card.style.top = y + "px";
}

function hideUnitHoverCard() {
    hideFloorHoverCard();
    const card = document.getElementById("unitHoverCard");
    if (!card) return;

    card.classList.remove("show");
}
