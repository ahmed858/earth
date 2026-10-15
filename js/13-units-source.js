/* =========================================================
   UNITS DATA SOURCE — Supabase `units` table (REST)
========================================================= */
const UNITS_TABLE = "units";
// This project's rows only (projects.js; the `project` column of SQL section 8). A database that
// has not run that section has no such column: the default project then reads the whole table
// (its rows), any other project nothing — readSheetUnits falls back.
const UNITS_REST_URL = `${SUPABASE_URL}/rest/v1/${UNITS_TABLE}?select=*&project=eq.${encodeURIComponent(PROJECT_ID)}`;
const UNITS_REST_URL_LEGACY = `${SUPABASE_URL}/rest/v1/${UNITS_TABLE}?select=*`;
let unitsLegacyTable = false; // true once the `project` column was found missing

/* Rooms & features — the `units` columns of SQL section 9 (Khawalid Tower 2's workbook through
   tools/upload-tower2-units.js, or the dashboard's Edit unit → Rooms & features). The Unit Search
   panel offers a chip for each one the project's units vary in, and the unit panel lists them.
   kind: "choice" (one of `values`), "count" (a number), "bool" (yes / no). `label` is the English
   text — the Arabic comes from the i18n dictionary. */
const UNIT_FEATURES = [
    { key: "facing", kind: "choice", label: "Facing", values: ["North", "South", "East", "West"] },
    { key: "master_bedrooms", kind: "count", label: "Master bedrooms" },
    { key: "bathrooms", kind: "count", label: "Bathrooms" },
    { key: "dressing_rooms", kind: "count", label: "Dressing rooms" },
    { key: "maid_room", kind: "bool", label: "Maid's room" },
    { key: "maid_bath", kind: "bool", label: "Maid's bath" },
    { key: "kitchen", kind: "bool", label: "Kitchen" },
    { key: "dining_room", kind: "bool", label: "Dining room" },
    { key: "living_room", kind: "bool", label: "Living room" },
    { key: "laundry_room", kind: "bool", label: "Laundry room" },
    { key: "balcony_terrace", kind: "bool", label: "Balcony / Terrace" },
];
// { facing: "North", bathrooms: 2, maid_room: true, … } from a row — null for an empty or missing
// column, and null altogether when the row has none of them (Khawalid 20, a database without section 9).
function unitFeaturesFromRow(row) {
    const out = {};
    let any = false;
    for (const f of UNIT_FEATURES) {
        const raw = row[f.key];
        let v = null;
        if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
            const s = String(raw).trim();
            if (f.kind === "choice") v = s;
            else if (f.kind === "count") { const n = Number(s); v = Number.isFinite(n) ? n : /^(true|yes)$/i.test(s) ? 1 : /^(false|no)$/i.test(s) ? 0 : null; }
            else v = raw === true || /^(true|yes|1)$/i.test(s) ? true : raw === false || /^(false|no|0)$/i.test(s) ? false : null;
        }
        out[f.key] = v;
        if (v !== null) any = true;
    }
    return any ? out : null;
}

/* Map one Supabase row to the internal unit model.
   col_g..col_l are media columns — reorder this block if their meaning
   differs from the assumed order below. */
function mapSupabaseUnit(row, index) {
    const name = String(row.unit_name || "").trim();
    const floorRaw = String(row.floor || "").trim();
    if (!name || !floorRaw) return null;

    const areaRaw = String(row.area || "").trim();
    const priceRaw = String(row.price || "").trim();
    const availability = String(row.availability || "").trim();

    return {
        id: name + "-" + index,
        name,
        floorRaw,
        floor: normalizeFloor(floorRaw),
        area: areaRaw ? areaRaw + " m²" : "—",
        price: formatPrice(priceRaw),
        priceRaw: Number(priceRaw.replace(/,/g, "")) || 0,
        status: statusKey(availability),
        availability: availability || "Available",
        type: row.type || "—",
        model: row.model || "", // the unit's prototype name ("Model A"), when the project has them (SQL section 8)
        bedrooms: row.bedrooms ?? null, // the areas sheet's BR column (section 2b of the SQL), when present
        features: unitFeaturesFromRow(row), // rooms & features (section 9), null when the row has none
        phase: row.phase || "",

        points: "",
        x: null,
        y: null,
        w: null,
        h: null,

        imgSource: row.col_g || "", // unit photo
        brochure: row.col_h || "", // brochure / PDF
        tour: row.col_i || "", // virtual tour
        balcony: row.col_j || "", // balcony / view
        view3d: row.col_k || "", // 3D walkthrough
        plans: row.col_l || "", // floor plan image
    };
}

async function readSheetUnits() {
    if (!SUPABASE_URL) return []; // config.js not filled in yet — nothing to fetch
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY };
    const isDefault = PROJECT_ID === window.MAAZAR_DEFAULT_PROJECT;
    if (unitsLegacyTable && !isDefault) return []; // (no `project` column: the table is the default project's — see below)
    let res = await fetch(unitsLegacyTable ? UNITS_REST_URL_LEGACY : UNITS_REST_URL, { headers, cache: "no-store" });
    if (res.status === 400 && !unitsLegacyTable) {
        // No `project` column yet (section 8 of admin/supabase-setup.sql not run): the table holds the default project's units.
        unitsLegacyTable = true;
        console.warn("[units] the units table has no `project` column yet — run admin/supabase-setup.sql (section 8). " +
            (isDefault ? "Showing the whole table as " + PROJECT_ID + "." : "No units for " + PROJECT_ID + " until then."));
        if (!isDefault) return [];
        res = await fetch(UNITS_REST_URL_LEGACY, { headers, cache: "no-store" });
    }

    if (!res.ok) {
        throw new Error(`Supabase HTTP ${res.status} ${res.statusText}`.trim());
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) {
        throw new Error("Supabase returned an unexpected (non-array) response");
    }

    return rows.map(mapSupabaseUnit).filter(Boolean);
}

async function loadSheet(options = {}) {
    const { silent = false } = options;

    try {
        if (!silent) $("#sheetLoading").classList.remove("hide");

        const newUnits = await readSheetUnits();

        if (!newUnits.length) {
            // Al Maazar has no unit data yet — an empty table is expected, not
            // an error. The lists simply render empty until rows are added
            // from admin/index.html.
            console.warn("[units] the `units` table is empty — add units from admin/index.html");
        }

        const newHash = JSON.stringify(newUnits);

        if (newHash !== lastSheetHash) {
            lastSheetHash = newHash;
            allUnits = newUnits;

            console.log("Sheet updated:", allUnits.length, allUnits);

            if (activeFloor) {
                renderFloor();
            }

            if (typeof renderUnitsTable === "function") {
                renderUnitsTable();
                renderCompare();
                applyThreeUnitsFromSheet();
            }

            if (typeof maybeOpenUnitFromUrl === "function") {
                maybeOpenUnitFromUrl();
            }
        }
    } catch (e) {
        console.error(e);

        if (!silent) {
            alert(
                `Could not load units from Supabase. Make sure the \`units\` table has a public read (RLS) policy for the anon role.\n\nDetails: ${e.message}`,
            );
        }
    } finally {
        if (!silent) {
            $("#sheetLoading").classList.add("hide");
            initFloors();
        }
    }
}

function startSheetAutoRefresh(ms = SHEET_REFRESH_INTERVAL) {
    if (sheetRefreshTimer) clearInterval(sheetRefreshTimer);

    sheetRefreshTimer = setInterval(() => {
        loadSheet({ silent: true });
    }, ms);
}

function floorUnits() {
    const q = $("#unitSearch").value.toLowerCase().trim();

    return allUnits.filter((unit) => {
        if (unit.floor !== activeFloor) return false;
        if (!filters[unit.status]) return false;
        if (q && !unit.name.toLowerCase().includes(q)) return false;

        return true;
    });
}

function initFloors() {
    const tt = $("#tooltip");

    $$(".floor-hotspot").forEach((hs) => {
        hs.addEventListener("mousemove", (e) => {
            const floor = normalizeFloor(hs.dataset.floor);
            const arr = allUnits.filter((unit) => unit.floor === floor);
            const av = arr.filter((unit) => unit.status === "available").length;

            tt.textContent = `${hs.dataset.title || hs.dataset.floor} · ${av} available of ${arr.length}`;
            tt.style.left = e.clientX + "px";
            tt.style.top = e.clientY + "px";
            tt.classList.add("show");
        });

        hs.addEventListener("mouseleave", () => {
            tt.classList.remove("show");
        });

        hs.addEventListener("click", () => {
            openFloor(hs);
        });
    });
}

function openFloor(hs) {
    if (currentHotspot) currentHotspot.classList.remove("active");

    currentHotspot = hs;
    hs.classList.add("active");

    activeFloorRaw = hs.dataset.floor;
    activeFloor = normalizeFloor(activeFloorRaw);
    activeVideo = hs.dataset.video || "";

    $("#floorTitle").textContent =
        hs.dataset.title || `Floor ${activeFloorRaw}`;
    $("#floorSub").textContent =
        `Floor: ${activeFloorRaw} · Units from Google Sheet`;
    $("#unitSearch").value = "";

    loadFloorVideo(activeVideo);

    $("#floorOverlay").classList.add("show");
    renderFloor();
}

function loadFloorVideo(videoUrl) {
    const video = $("#floorVideo");
    const fallback = $("#videoFallback");

    fallback.classList.remove("show");
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (!videoUrl) {
        fallback.classList.add("show");
        return;
    }

    video.src = videoUrl;
    video.load();

    video.oncanplay = () => {
        fallback.classList.remove("show");
        video.play().catch(() => { });
    };

    video.onerror = () => {
        console.warn("Floor video failed to load:", videoUrl);
        fallback.classList.add("show");
    };
}

function closeFloor() {
    $("#floorOverlay").classList.remove("show");

    const video = $("#floorVideo");
    video.pause();

    if (currentHotspot) currentHotspot.classList.remove("active");
    currentHotspot = null;
}

function renderFloor() {
    const units = floorUnits();

    renderStats(units);
    renderUnitShapes(units);
    renderCards(units);
}

function renderStats(units) {
    const allOnFloor = allUnits.filter(
        (unit) => unit.floor === activeFloor,
    );

    $("#stAvailable").textContent = allOnFloor.filter(
        (unit) => unit.status === "available",
    ).length;
    $("#stReserved").textContent = allOnFloor.filter(
        (unit) => unit.status === "reserved",
    ).length;
    $("#stSold").textContent = allOnFloor.filter(
        (unit) => unit.status === "sold",
    ).length;

    const prices = allOnFloor.map((unit) => unit.priceRaw).filter(Boolean);

    $("#priceRange").textContent = prices.length
        ? `Price range: ${formatPrice(Math.min(...prices))} — ${formatPrice(Math.max(...prices))}`
        : "Price range: —";
}

function autoRect(i, total) {
    const cols = Math.ceil(Math.sqrt(total * 1.5));
    const gap = 10;
    const w = (1000 - gap * (cols + 1)) / cols;
    const rows = Math.ceil(total / cols);
    const h = Math.min(70, (650 - gap * (rows + 1)) / rows);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (w + gap);
    const y = gap + row * (h + gap);

    return { x, y, w, h };
}

function renderUnitShapes(units) {
    const svg = $("#unitSvg");
    svg.innerHTML = "";

    units.forEach((unit, i) => {
        let shape;
        let cx;
        let cy;

        if (unit.points) {
            shape = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "polygon",
            );
            shape.setAttribute("points", unit.points);

            const nums = unit.points.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
            const xs = nums.filter((_, i) => i % 2 === 0);
            const ys = nums.filter((_, i) => i % 2 === 1);

            cx = xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
            cy = ys.reduce((a, b) => a + b, 0) / Math.max(ys.length, 1);
        } else {
            const r =
                unit.x && unit.y && unit.w && unit.h
                    ? unit
                    : autoRect(i, units.length);

            shape = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect",
            );
            shape.setAttribute("x", r.x);
            shape.setAttribute("y", r.y);
            shape.setAttribute("width", r.w);
            shape.setAttribute("height", r.h);
            shape.setAttribute("rx", 8);

            cx = r.x + r.w / 2;
            cy = r.y + r.h / 2;
        }

        shape.classList.add("unit-shape", unit.status);

        shape.addEventListener("mousemove", (e) => {
            showUnitHoverCard(unit, e);
        });

        shape.addEventListener("mouseleave", () => {
            hideUnitHoverCard();
        });

        shape.addEventListener("click", () => openUnit(unit));

        svg.appendChild(shape);

        const label = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
        );
        label.classList.add("unit-label");
        label.setAttribute("x", cx);
        label.setAttribute("y", cy);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.textContent = unit.name;
        svg.appendChild(label);
    });
}

function renderCards(units) {
    const grid = $("#cardsGrid");
    grid.innerHTML = "";

    if (!units.length) {
        grid.innerHTML = `<div class="empty">No units match this floor/filter.</div>`;
        return;
    }

    units.forEach((unit) => {
        const div = document.createElement("div");
        div.className = `unit-card ${unit.status}`;

        div.innerHTML = `
  <strong>${unit.name}</strong>
  <span>${unit.area}</span>
  <span>${unit.price}</span>
  <span class="badge ${unit.status}">${unit.availability}</span>
`;

        div.addEventListener("mousemove", (e) => {
            showUnitHoverCard(unit, e);
        });

        div.addEventListener("mouseleave", () => {
            hideUnitHoverCard();
        });

        div.addEventListener("click", () => openUnit(unit));

        grid.appendChild(div);
    });
}

/* The unit panel's Rooms & features block (UNIT_FEATURES): Facing and the counts as detail
   rows, the yes / no features the unit HAS as pills; hidden for a unit without the data
   (Khawalid 20) and for an amenity. */
function renderSideFeatures(unit) {
    const section = $("#sideFeaturesSection");
    if (!section) return;
    const f = unit.features;
    if (!f || isAmenityUnit(unit)) { section.style.display = "none"; return; }
    const tr = (s) => (window.i18n ? window.i18n.t(s) : s);
    const rows = [], pills = [];
    for (const def of UNIT_FEATURES) {
        const v = f[def.key];
        if (v === null || v === undefined) continue;
        if (def.kind === "choice") rows.push([def.label, tr(String(v))]);
        else if (def.kind === "count") rows.push([def.label, String(v)]);
        else if (v === true) pills.push(def.label);
    }
    if (!rows.length && !pills.length) { section.style.display = "none"; return; }
    $("#sideFeatureRows").innerHTML = rows
        .map(([k, v]) => '<div class="unit-side-detail"><span>' + escapeHtml(tr(k)) + "</span><b>" + escapeHtml(v) + "</b></div>")
        .join("");
    $("#sideFeatureChips").innerHTML = pills
        .map((p) => '<span class="unit-side-feature">' + escapeHtml(tr(p)) + "</span>")
        .join("");
    section.style.display = "";
}

function openUnit(unit) {
    if (!unit) return;

    currentUnit = unit;
    hideUnitHoverCard();

    const sideMenu = $("#unitSideMenu");

    if (!sideMenu) {
        console.error("Unit side menu element was not found");
        return;
    }

    $("#unitSideBackdrop")?.classList.add("show");
    sideMenu.classList.add("show");

    updateSideCompareButton(unit);

    const amenity = isAmenityUnit(unit); // a shared space (projects.js floors → amenities): no bedrooms, price, Compare or sales button
    $("#sideUnitName").textContent = unit.name || "Unit";
    $("#sideUnitSub").textContent = amenity ? (unit.area || "—") : `${unit.model ? unit.model + " · " : ""}${unit.type || "—"} · ${unit.area || "—"}`;

    $("#sideUnitFloor").textContent = unit.floorRaw || unit.floor || "—";
    $("#sideUnitRooms").textContent = unitBedrooms(unit) || unit.type || "—";
    $("#sideUnitArea").textContent = unit.area || "—";
    $("#sideUnitPrice").textContent = unit.price || "—";
    $("#sideUnitRooms").closest(".unit-side-detail").style.display = amenity ? "none" : "";
    $("#sideUnitPrice").closest(".unit-side-detail").style.display = amenity ? "none" : "";
    renderSideFeatures(unit);
    const sideActions = $("#sideWhatsApp").closest(".unit-side-section"); // the WhatsApp + Compare buttons
    if (sideActions) sideActions.style.display = amenity ? "none" : "";

    const planOnTop = renderSideUnitImage(unit);
    const renders = renderSide3d(unit);
    // What the cards above already show needs no button in the Media grid.
    setSideMediaBtn("sideImg", renders ? "" : unit.imgSource, "Open image");
    setSideMediaBtn("sideBrochure", unit.brochure, "Open brochure");
    setSideMediaBtn("sideTour", unit.tour, "Open tour");
    setSideMediaBtn("side3D", unit.view3d, "Open 3D");
    setSideMediaBtn("sideBalcony", unit.balcony, "Open view");
    setSideMediaBtn("sidePlan", planOnTop ? "" : unit.plans, "Open plans");
    syncSideMediaBlock();

    $("#unitSideBackdrop").classList.add("show");
    $("#unitSideMenu").classList.add("show");
}

// No media buttons left → drop the whole Media block (title + grid).
function syncSideMediaBlock() {
    const mediaGrid = $("#unitSideMenu .unit-side-media-grid");
    if (!mediaGrid) return;
    const anyMedia = [...mediaGrid.querySelectorAll(".unit-side-media")].some((b) => b.style.display !== "none");
    mediaGrid.style.display = anyMedia ? "" : "none";
    const title = mediaGrid.previousElementSibling;
    if (title && title.classList.contains("unit-side-section-title")) title.style.display = anyMedia ? "" : "none";
}

function openUnitSideMenu(unit) {
    openUnit(unit);
}

const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|svg|bmp|avif)(\?[^#]*)?(#.*)?$/i.test(String(url || "").trim());
/* units.col_l may hold several plan links (a townhouse: one drawing per level), separated by spaces, commas or new
   lines — tools/upload-plans.js writes them so. The cards show the first; the Floor Plans modal shows all of them. */
function planUrls(unit) { return String((unit && unit.plans) || "").split(/[\s,]+/).map((u) => u.trim()).filter(Boolean); }

/* "2 Bedrooms" → "2" (the sheet's bedrooms column when the row has it). */
function unitBedrooms(unit) {
    if (unit.bedrooms != null && String(unit.bedrooms).trim() !== "") return String(unit.bedrooms).trim();
    const m = String(unit.type || "").match(/\d+/);
    return m ? m[0] : "";
}

/* The top card: the unit's floor plan when the link is an image (a PDF or a
   web page stays behind the "Open plans" button), else the unit photo.
   Returns true when the plan is the card. */
function renderSideUnitImage(unit) {
    const box = $("#sideUnitImage");
    if (!box) return false;

    const statusText = escapeHtml(unit.availability || unit.status || "Available");
    const statusClass = escapeHtml(unit.status || "available");
    const badge = `<span class="unit-side-badge ${statusClass}">${statusText}</span>`;
    const plans = planUrls(unit);
    const plan = plans[0] || "";
    const isPlan = isImageUrl(plan);
    const src = isPlan ? plan : String(unit.imgSource || "").trim();

    box.classList.toggle("is-plan", isPlan);
    box.onclick = isPlan ? () => openMedia("plan") : null;
    box.title = isPlan ? "Open plans" : "";

    if (src) {
        box.innerHTML = `
  <img
src="${escapeHtml(src)}"
alt="${escapeHtml(isPlan ? "Floor plan" : unit.name)}"
onerror="this.parentElement.innerHTML='<div class=&quot;unit-side-image-empty&quot;>Image failed to load</div>'"
  />
  ${badge}
  ${isPlan ? `<span class="unit-side-image-zoom">${plans.length > 1 ? "⤢ View all plans" : "⤢ View full size"}</span>` : ""}
`;
    } else {
        box.innerHTML = `<div class="unit-side-image-empty">No image available</div>${badge}`;
    }
    return isPlan;
}

/* The 3D renders of this unit's type: the gallery's "Unit Prototypes" rows
   whose subcategory is the type (the brochure's plan pages, titled
   "Prototype 0n …", are not renders and are left out). Falls back to the
   unit's own photo. */
function unit3dImages(unit) {
    const data = typeof GALLERY_DATA !== "undefined" ? GALLERY_DATA : [];
    // An amenity (projects.js floors → amenities) has no type: its 3D images are the gallery rows whose subcategory is
    // the unit's name (the amenities brochure through tools/upload-prototypes.js --catalog tools/amenities-catalog.json,
    // or any image given that subcategory in the dashboard).
    if (typeof isAmenityUnit === "function" && isAmenityUnit(unit)) {
        const key = normalizeUnitName(unit.name);
        const mine = data.filter((i) => i.src && normalizeUnitName(i.subcategory) === key);
        if (mine.length) return mine;
    }
    const type = String(unit.type || "").trim();
    const renders = data
        .filter((i) => i.category === "prototypes" && i.subcategory === type && i.src && !/^prototype\s*\d/i.test(i.title || ""));
    if (renders.length) return renders;
    const hero = String(unit.imgSource || "").trim();
    return hero && isImageUrl(hero) ? [{ src: hero, thumb: hero, title: unit.name, title_ar: unit.name }] : [];
}

/* Returns the number of renders shown (0 hides the section). */
function renderSide3d(unit) {
    const section = $("#side3dSection");
    const strip = $("#side3dStrip");
    if (!section || !strip) return 0;

    const items = unit3dImages(unit);
    strip.innerHTML = "";
    section.style.display = items.length ? "" : "none";
    $("#side3dCount").textContent = items.length > 1 ? `· ${items.length}` : "";

    items.forEach((item, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "unit-side-3d-item";
        const title = (typeof galleryItemTitle === "function" ? galleryItemTitle(item) : item.title) || "";
        btn.title = title;
        btn.innerHTML = `<img src="${escapeHtml(item.thumb || item.src)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" />${title ? `<span>${escapeHtml(title)}</span>` : ""}`;
        btn.addEventListener("click", () => {
            // Browse this unit's renders in the gallery lightbox (prev / next, captions)
            galleryLbItems = items;
            openGalleryLightbox(idx);
        });
        strip.appendChild(btn);
    });
    return items.length;
}

// The gallery rows arrive from Supabase after the page has loaded — refresh a panel that is already open
document.addEventListener("gallery:loaded", () => {
    if (currentUnit && $("#unitSideMenu")?.classList.contains("show")) {
        const renders = renderSide3d(currentUnit);
        setSideMediaBtn("sideImg", renders ? "" : currentUnit.imgSource, "Open image");
        syncSideMediaBlock();
    }
});

function setSideMediaBtn(id, url, availableText) {
    const btn = $("#" + id);
    if (!btn) return;

    const status = btn.querySelector(".unit-side-media-status");
    const has = !!(url && String(url).trim() !== "");

    // A unit shows only the media it actually has: slots without a link are
    // hidden (inline style, so it wins over the button's own display rule).
    btn.style.display = has ? "" : "none";
    btn.disabled = !has;
    if (status) status.textContent = has ? (availableText || "Open") : "Not available";
}

function closeUnitSideMenu() {
    $("#unitSideBackdrop")?.classList.remove("show");
    $("#unitSideMenu")?.classList.remove("show");
}
