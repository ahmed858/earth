/* =========================================================
 UNITS EXCEL TABLE DRAWER
  ========================================================= */

const TABLE_FILTERS = {
    search: "",
    floor: "",
    status: "",
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    // Multi-select dimensions driven by the left "Unit Search" panel.
    statuses: [],
    types: [],
    // Rooms & features (UNIT_FEATURES): { facing: ["North", "South"], bathrooms: ["2"], maid_room: true, … }
    // — a list of accepted values for a Facing / count group, true for a yes / no feature the unit must have.
    features: {},
};
const UNITS_TABLE_MOBILE_QUERY = window.matchMedia("(max-width: 700px)");
const UNITS_TABLE_HEIGHT_KEY = "unitsTableMobileHeight";

/* Dual-range (price / area) slider controllers */
const RANGE_FILTERS = {};
let rangeBoundsReady = false;

function formatPriceShort(v) {
    v = Number(v) || 0;
    if (v >= 1_000_000) {
        const m = v / 1_000_000;
        return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M";
    }
    if (v >= 1_000) return Math.round(v / 1_000) + "K";
    return String(Math.round(v));
}

function createDualRange({
    minEl,
    maxEl,
    fillEl,
    valMinEl,
    valMaxEl,
    filterMinKey,
    filterMaxKey,
    format,
}) {
    let lo = 0;
    let hi = 100;

    function pct(v) {
        return hi > lo ? ((v - lo) / (hi - lo)) * 100 : 0;
    }

    // Fill + labels from the thumbs (no filter write).
    function paint() {
        const minV = Number(minEl.value);
        const maxV = Number(maxEl.value);

        const a = pct(minV);
        const b = pct(maxV);
        if (fillEl) {
            fillEl.style.left = a + "%";
            fillEl.style.width = Math.max(0, b - a) + "%";
        }

        if (valMinEl) valMinEl.textContent = format(minV);
        if (valMaxEl) valMaxEl.textContent = format(maxV);
    }

    function refresh() {
        paint();
        const minV = Number(minEl.value);
        const maxV = Number(maxEl.value);
        // At an extreme, treat the bound as "unbounded" so units with an unknown
        // (0 / blank) price or area still pass the filter. The max thumb stops on
        // the slider's step grid (hi − lo over 100 steps), up to one step short of
        // hi — that is the end of the slider too, not a maximum just under the
        // dearest unit.
        const step = Number(maxEl.step) || 1;
        TABLE_FILTERS[filterMinKey] = minV <= lo ? "" : String(minV);
        TABLE_FILTERS[filterMaxKey] = maxV >= hi - step ? "" : String(maxV);
    }

    function onInput(e) {
        let minV = Number(minEl.value);
        let maxV = Number(maxEl.value);

        // Keep the two thumbs from crossing each other.
        if (minV > maxV) {
            if (e.target === minEl) {
                minV = maxV;
                minEl.value = minV;
            } else {
                maxV = minV;
                maxEl.value = maxV;
            }
        }

        // Bring the thumb being dragged to the front (helps when they overlap).
        minEl.style.zIndex = e.target === minEl ? 5 : 4;
        maxEl.style.zIndex = e.target === maxEl ? 5 : 4;

        refresh();
        renderUnitsTable();
        applyThreeUnitsFromSheet();
    }

    minEl.addEventListener("input", onInput);
    maxEl.addEventListener("input", onInput);

    return {
        setBounds(newLo, newHi) {
            lo = newLo;
            hi = newHi <= newLo ? newLo + 1 : newHi;
            const step = Math.max(1, Math.round((hi - lo) / 100));
            [minEl, maxEl].forEach((el) => {
                el.min = lo;
                el.max = hi;
                el.step = step;
            });
            this.syncFromFilters(); // thumbs follow the shared state, never overwrite it
        },
        // Show what TABLE_FILTERS holds (the Unit Search panel writes the same keys)
        // without writing anything back.
        syncFromFilters() {
            const mn = TABLE_FILTERS[filterMinKey], mx = TABLE_FILTERS[filterMaxKey];
            minEl.value = mn !== "" && mn != null && !isNaN(Number(mn)) ? Math.min(hi, Math.max(lo, Number(mn))) : lo;
            maxEl.value = mx !== "" && mx != null && !isNaN(Number(mx)) ? Math.min(hi, Math.max(lo, Number(mx))) : hi;
            paint();
        },
        reset() {
            // A reset means no bounds at all: say so in the shared state and show it. (Reading the
            // thumbs back instead stored the step-snapped maximum — 2,484,465 for Tower 2 — and hid
            // the two dearest townhouses after every Reset until a reload.)
            TABLE_FILTERS[filterMinKey] = "";
            TABLE_FILTERS[filterMaxKey] = "";
            this.syncFromFilters();
        },
    };
}

let rangeBoundsSig = "";
function syncRangeFilterBounds() {
    if (!RANGE_FILTERS.price || !RANGE_FILTERS.area) return;
    if (!allUnits || !allUnits.length) return;

    const prices = allUnits
        .map((u) => Number(u.priceRaw) || 0)
        .filter((v) => v > 0);
    const areas = allUnits.map(getAreaNumber).filter((v) => v > 0);

    // Re-derive only when the data changed (rows added, prices filled in).
    const sig = allUnits.length + "|" + prices.length + "|" + areas.length;
    if (sig === rangeBoundsSig) return;
    rangeBoundsSig = sig;

    // Each slider follows its own column. No prices yet → the Price block is
    // hidden rather than left as a 0 – 100 slider that filters every unit out.
    // (#priceRange is also the id of a text line in the floor overlay — anchor on the slider input instead)
    const priceBlock = document.getElementById("tableMinPrice")?.closest(".range-filter");
    if (priceBlock) priceBlock.style.display = prices.length ? "" : "none";
    if (prices.length) {
        RANGE_FILTERS.price.setBounds(
            Math.floor(Math.min(...prices)),
            Math.ceil(Math.max(...prices)),
        );
    } else {
        TABLE_FILTERS.minPrice = "";
        TABLE_FILTERS.maxPrice = "";
    }
    if (areas.length) {
        RANGE_FILTERS.area.setBounds(
            Math.floor(Math.min(...areas)),
            Math.ceil(Math.max(...areas)),
        );
    }

    rangeBoundsReady = prices.length > 0 || areas.length > 0;
}

function isMobileUnitsTable() {
    return UNITS_TABLE_MOBILE_QUERY.matches;
}

function getUnitsTableHeightBounds() {
    // Use the app's layout-box height. When the UI is CSS-rotated 90° for
    // landscape mode the visual viewport is portrait, so the box height equals
    // the visual viewport WIDTH, not its height.
    const viewportHeight = document.body.classList.contains("ui-rotated")
        ? window.innerWidth
        : window.innerHeight || document.documentElement.clientHeight;
    // Allow dragging to (almost) any height: from just the grab handle up to the
    // full screen height.
    const min = 56;
    const max = viewportHeight;

    return {
        min,
        max,
        initial: Math.round(viewportHeight * 0.52),
    };
}

function setUnitsTableMobileHeight(height, options = {}) {
    const { persist = false } = options;
    const bounds = getUnitsTableHeightBounds();
    const nextHeight = Math.min(bounds.max, Math.max(bounds.min, Math.round(height)));

    document.documentElement.style.setProperty(
        "--units-table-drawer-height",
        `${nextHeight}px`,
    );

    // Once the drawer covers most of the screen, hide the floating controls so
    // the table stands alone (see body.units-table-tall in CSS).
    const drawerOpen = !!document.querySelector("#unitsTableDrawer.show");
    const tall = isMobileUnitsTable() && drawerOpen && nextHeight >= bounds.max * 0.8;
    document.body.classList.toggle("units-table-tall", tall);

    if (persist) {
        localStorage.setItem(UNITS_TABLE_HEIGHT_KEY, String(nextHeight));
    }

    requestAnimationFrame(() => {
        if (typeof resizeThreeOverlay === "function") resizeThreeOverlay();
    });
}

function applyStoredUnitsTableMobileHeight() {
    const bounds = getUnitsTableHeightBounds();
    const saved = Number(localStorage.getItem(UNITS_TABLE_HEIGHT_KEY));

    setUnitsTableMobileHeight(Number.isFinite(saved) && saved > 0 ? saved : bounds.initial);
}

function syncUnitsTableMobileLayout() {
    const isMobile = isMobileUnitsTable();

    document.body.classList.toggle("units-mobile-drawer-open", isMobile);

    if (isMobile) {
        applyStoredUnitsTableMobileHeight();
    }

    requestAnimationFrame(() => {
        if (typeof resizeThreeOverlay === "function") resizeThreeOverlay();
    });
}

function openUnitsTable() {
    // Desktop: the drawer covers the Unit Search panel, so only one of them is
    // open at a time. (On phones the table is a permanent bottom sheet and the
    // panel is layered above it instead — see the .usp mobile rule.)
    if (!isMobileUnitsTable() && typeof window.closeUnitSearch === "function") window.closeUnitSearch();
    $("#unitsTableDrawer").classList.add("show");
    $("#unitsTableBackdrop").classList.add("show");
    syncUnitsTableMobileLayout();
    renderUnitsTable();
    applyThreeUnitsFromSheet();
}

function closeUnitsTable() {
    $("#unitsTableDrawer").classList.remove("show");
    $("#unitsTableBackdrop").classList.remove("show");
    document.body.classList.remove("units-table-tall");
    syncUnitsTableMobileLayout();
}

function getAreaNumber(unit) {
    const raw = String(unit.area || "").replace(/[^\d.]/g, "");
    return Number(raw) || 0;
}

function getUniqueFloors() {
    const map = new Map();

    allUnits.forEach((unit) => {
        const key = unit.floor || "";
        const label = unit.floorRaw || unit.floor || "";
        if (key && !map.has(key)) {
            map.set(key, label);
        }
    });

    return Array.from(map.entries());
}

function fillTableFloorFilter() {
    const select = $("#tableFloorFilter");
    if (!select) return;

    const floors = getUniqueFloors();

    select.innerHTML = `<option value="">All Floors</option>`;

    floors.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    });

    select.value = TABLE_FILTERS.floor || "";
}

/* The Unit Search panel's rooms & features selection (TABLE_FILTERS.features) against one unit:
   every selected group must be satisfied — a value group by one of its values, a yes / no feature
   by true (a count of 1 or more counts as yes). A unit without the data never matches a selection. */
function unitMatchesFeatures(unit, sel) {
    if (!sel) return true;
    const f = unit.features || null;
    for (const key of Object.keys(sel)) {
        const want = sel[key];
        const v = f ? f[key] : null;
        if (want === true) {
            if (!(v === true || (typeof v === "number" && v >= 1))) return false;
        } else if (Array.isArray(want) && want.length) {
            if (v === null || v === undefined || !want.map(String).includes(String(v))) return false;
        }
    }
    return true;
}

function getFilteredTableUnits() {
    const q = TABLE_FILTERS.search.toLowerCase().trim();

    const minPrice = Number(TABLE_FILTERS.minPrice) || 0;
    const maxPrice = Number(TABLE_FILTERS.maxPrice) || Infinity;
    const minArea = Number(TABLE_FILTERS.minArea) || 0;
    const maxArea = Number(TABLE_FILTERS.maxArea) || Infinity;

    return allUnits.filter((unit) => {
        const name = String(unit.name || "").toLowerCase();
        const type = String(unit.type || "").toLowerCase();
        const status = String(unit.availability || unit.status || "").toLowerCase();
        const floorRaw = String(unit.floorRaw || unit.floor || "").toLowerCase();

        const price = Number(unit.priceRaw) || 0;
        const area = getAreaNumber(unit);

        const searchMatch =
            !q ||
            name.includes(q) ||
            type.includes(q) ||
            status.includes(q) ||
            floorRaw.includes(q);

        const floorMatch =
            !TABLE_FILTERS.floor || unit.floor === TABLE_FILTERS.floor;

        const statusMatch =
            !TABLE_FILTERS.status || unit.status === TABLE_FILTERS.status;

        // Multi-select availability / type from the Unit Search panel (empty = all).
        const statusesMatch =
            !TABLE_FILTERS.statuses ||
            !TABLE_FILTERS.statuses.length ||
            TABLE_FILTERS.statuses.includes(unit.status);

        const typesMatch =
            !TABLE_FILTERS.types ||
            !TABLE_FILTERS.types.length ||
            TABLE_FILTERS.types.includes(String(unit.type));

        const priceMatch = price >= minPrice && price <= maxPrice;
        const areaMatch = area >= minArea && area <= maxArea;
        const featuresMatch = unitMatchesFeatures(unit, TABLE_FILTERS.features);

        return (
            searchMatch &&
            floorMatch &&
            statusMatch &&
            statusesMatch &&
            typesMatch &&
            priceMatch &&
            areaMatch &&
            featuresMatch
        );
    });
}

function renderUnitsTable() {
    const body = $("#unitsTableBody");
    const count = $("#unitsTableCount");

    if (!body) return;

    fillTableFloorFilter();
    syncRangeFilterBounds();
    // Thumbs mirror the shared state (the Unit Search panel may have moved it).
    if (RANGE_FILTERS.area) RANGE_FILTERS.area.syncFromFilters();
    if (RANGE_FILTERS.price) RANGE_FILTERS.price.syncFromFilters();
    if (typeof refreshUnitSearchPanel === "function") refreshUnitSearchPanel();

    const rows = getFilteredTableUnits();

    if (count) {
        count.textContent = `${rows.length} of ${allUnits.length} units`;
    }

    // Perf: building 600+ rows is costly. Only do it while the drawer is
    // actually visible; filters still update the 3D overlay + Unit Search panel.
    if (!document.querySelector("#unitsTableDrawer.show")) return;

    if (!rows.length) {
        body.innerHTML = `
  <tr>
<td colspan="7" class="table-empty">
  No units found. Try changing filters.
</td>
  </tr>
`;
        return;
    }

    body.innerHTML = rows
        .map((unit) => {
            const isActive = highlightedUnitId === unit.id ? "active-table-unit" : "";
            const isCompared = isUnitCompared(unit.id);

            return `
<tr class="${isActive}" onclick="openUnitSideMenuFromTable('${escapeHtml(unit.id)}')">
  <td>
${isAmenityUnit(unit) ? "" : `<button
  class="compare-heart-btn ${isCompared ? "active" : ""}"
  type="button"
  title="${isCompared ? "Remove from compare" : "Add to compare"}"
  onclick="toggleCompareUnit('${escapeHtml(unit.id)}', event)"
>
  ${isCompared ? "♥" : "♡"}
</button>`}
  </td>

  <td>${escapeHtml(unit.name)}</td>
  <td>${escapeHtml(unit.floorRaw || unit.floor || "—")}</td>
  <td>
<span class="table-status ${escapeHtml(unit.status)}">
  ${escapeHtml(unit.availability || unit.status)}
</span>
  </td>
  <td>${escapeHtml(unit.area || "—")}</td>
  <td>${escapeHtml(unit.price || "—")}</td>
  <td>${escapeHtml(unit.type || "—")}</td>
</tr>
  `;
        })
        .join("");
}

function openUnitSideMenuFromTable(unitId) {
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return;

    // خلي الـ unit تنور في 3D
    highlightUnitInThree(unit);

    closeUnitsTable();

    if (typeof openUnitSideMenu === "function") {
        openUnitSideMenu(unit);
    } else if (typeof openUnit === "function") {
        openUnit(unit);
    }
}

function bindUnitsTableEvents() {
    $("#unitsTableToggle").addEventListener("click", openUnitsTable);
    $("#closeUnitsTable").addEventListener("click", closeUnitsTable);
    $("#unitsTableBackdrop").addEventListener("click", closeUnitsTable);
    bindUnitsTableResizeEvents();

    $("#tableSearch").addEventListener("input", (e) => {
        TABLE_FILTERS.search = e.target.value;
        renderUnitsTable();
        applyThreeUnitsFromSheet();
    });

    $("#tableFloorFilter").addEventListener("change", (e) => {
        TABLE_FILTERS.floor = e.target.value;
        // On a floor plan, picking another floor opens that floor's plan (or the building view for a
        // floor that has none / "all floors") — the same rule as the Unit Search chips. On the building
        // only a plan marked openFromFilter (the basement) opens from here.
        const planNow = e.target.value && floorSceneFor(e.target.value);
        if (typeof sceneIsStill === "function" && sceneIsStill()) {
            const target = planNow || window.buildingScene();
            if (target !== currentScene) { setScene(target); return; } // setScene re-filters and repaints
        } else if (planNow && SCENES[planNow].openFromFilter && planNow !== currentScene) {
            setScene(planNow); return;
        }
        renderUnitsTable();
        applyThreeUnitsFromSheet();
    });

    $("#tableStatusFilter").addEventListener("change", (e) => {
        // One state for both UIs: the panel's Availability chips read `statuses`.
        TABLE_FILTERS.status = "";
        TABLE_FILTERS.statuses = e.target.value ? [e.target.value] : [];
        renderUnitsTable();
        applyThreeUnitsFromSheet();
    });

    RANGE_FILTERS.price = createDualRange({
        minEl: $("#tableMinPrice"),
        maxEl: $("#tableMaxPrice"),
        fillEl: $("#priceFill"),
        valMinEl: $("#priceValMin"),
        valMaxEl: $("#priceValMax"),
        filterMinKey: "minPrice",
        filterMaxKey: "maxPrice",
        format: formatPriceShort,
    });

    RANGE_FILTERS.area = createDualRange({
        minEl: $("#tableMinArea"),
        maxEl: $("#tableMaxArea"),
        fillEl: $("#areaFill"),
        valMinEl: $("#areaValMin"),
        valMaxEl: $("#areaValMax"),
        filterMinKey: "minArea",
        filterMaxKey: "maxArea",
        format: (v) => `${Math.round(v)} m²`,
    });

    syncRangeFilterBounds();

    $("#resetTableFilters").addEventListener("click", () => {
        TABLE_FILTERS.search = "";
        TABLE_FILTERS.floor = "";
        TABLE_FILTERS.status = "";
        TABLE_FILTERS.statuses = [];
        TABLE_FILTERS.types = [];
        TABLE_FILTERS.minPrice = "";
        TABLE_FILTERS.maxPrice = "";
        TABLE_FILTERS.minArea = "";
        TABLE_FILTERS.maxArea = "";
        TABLE_FILTERS.features = {};

        $("#tableSearch").value = "";
        $("#tableFloorFilter").value = "";
        $("#tableStatusFilter").value = "";

        RANGE_FILTERS.price?.reset();
        RANGE_FILTERS.area?.reset();

        renderUnitsTable();
        applyThreeUnitsFromSheet();
    });
}

function bindUnitsTableResizeEvents() {
    const handle = $("#unitsTableResizeHandle");
    if (!handle) return;

    let isResizing = false;

    // Reads clientX/clientY off either a PointerEvent/MouseEvent or a Touch.
    function updateFromPoint(point, options = {}) {
        let nextHeight;
        if (document.body.classList.contains("ui-rotated")) {
            // App is CSS-rotated 90°: the drawer's bottom edge maps to the screen's
            // left edge, so its height grows with the pointer's X position.
            nextHeight = point.clientX;
        } else {
            const boxH = window.innerHeight || document.documentElement.clientHeight;
            nextHeight = boxH - point.clientY;
        }
        setUnitsTableMobileHeight(nextHeight, options);
    }

    /* ---- Mouse / stylus via Pointer Events ----------------------------
       Touch is handled by the native touch listeners below instead. Pointer
       capture is unreliable for touch pointers inside the CSS-rotated
       (landscape) container, which left the drag handle dead on touch. */
    handle.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") return;
        if (!isMobileUnitsTable()) return;

        isResizing = true;
        document.body.classList.add("is-units-table-resizing");
        handle.setPointerCapture(event.pointerId);
        updateFromPoint(event);
        event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        if (!isResizing) return;

        updateFromPoint(event);
        event.preventDefault();
    });

    function stopResize(event) {
        if (event.pointerType === "touch") return;
        if (!isResizing) return;

        isResizing = false;
        document.body.classList.remove("is-units-table-resizing");
        updateFromPoint(event, { persist: true });

        if (handle.hasPointerCapture(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
        }
    }

    handle.addEventListener("pointerup", stopResize);
    handle.addEventListener("pointercancel", stopResize);

    /* ---- Touch via native touch events --------------------------------
       Consistent with the frame-viewer and map drag elsewhere in this file.
       Works in both portrait and the rotated landscape layout, where Pointer
       Events fail. The handle already has `touch-action: none`, so calling
       preventDefault keeps the page from scrolling/competing during a drag. */
    function resizeTouchPoint(event) {
        return (
            (event.touches && event.touches[0]) ||
            (event.changedTouches && event.changedTouches[0]) ||
            null
        );
    }

    handle.addEventListener(
        "touchstart",
        (event) => {
            if (!isMobileUnitsTable()) return;
            const point = resizeTouchPoint(event);
            if (!point) return;

            isResizing = true;
            document.body.classList.add("is-units-table-resizing");
            updateFromPoint(point);
            event.preventDefault();
        },
        { passive: false },
    );

    handle.addEventListener(
        "touchmove",
        (event) => {
            if (!isResizing) return;
            const point = resizeTouchPoint(event);
            if (!point) return;

            updateFromPoint(point);
            event.preventDefault();
        },
        { passive: false },
    );

    function stopResizeTouch(event) {
        if (!isResizing) return;

        isResizing = false;
        document.body.classList.remove("is-units-table-resizing");
        const point = resizeTouchPoint(event);
        if (point) updateFromPoint(point, { persist: true });
    }

    handle.addEventListener("touchend", stopResizeTouch);
    handle.addEventListener("touchcancel", stopResizeTouch);

    handle.addEventListener("keydown", (event) => {
        if (!isMobileUnitsTable()) return;

        const current = Number(
            getComputedStyle(document.documentElement)
                .getPropertyValue("--units-table-drawer-height")
                .replace("px", ""),
        );
        const fallback = getUnitsTableHeightBounds().initial;
        const baseHeight = Number.isFinite(current) ? current : fallback;
        let nextHeight = baseHeight;

        if (event.key === "ArrowUp") nextHeight += 32;
        if (event.key === "ArrowDown") nextHeight -= 32;
        if (event.key === "Home") nextHeight = getUnitsTableHeightBounds().min;
        if (event.key === "End") nextHeight = getUnitsTableHeightBounds().max;

        if (nextHeight !== baseHeight) {
            setUnitsTableMobileHeight(nextHeight, { persist: true });
            event.preventDefault();
        }
    });

    UNITS_TABLE_MOBILE_QUERY.addEventListener("change", syncUnitsTableMobileLayout);
    window.addEventListener("resize", syncUnitsTableMobileLayout);
}