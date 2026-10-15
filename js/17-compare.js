/* =========================================================
   COMPARE SYSTEM
========================================================= */

const COMPARE_STORAGE_KEY = "unitCompareList";
let compareUnitIds = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || "[]");

function saveCompare() {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareUnitIds));
}

function isUnitCompared(unitId) {
    return compareUnitIds.includes(unitId);
}

function getCompareUnits() {
    return compareUnitIds
        .map((id) => allUnits.find((unit) => unit.id === id))
        .filter(Boolean);
}

function toggleCompareUnit(unitId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit || isAmenityUnit(unit)) return; // a shared space (the basement) is not compared

    if (isUnitCompared(unitId)) {
        compareUnitIds = compareUnitIds.filter((id) => id !== unitId);
    } else {
        compareUnitIds.push(unitId);
    }

    saveCompare();
    renderCompare();
    renderUnitsTable();

    if (currentUnit && currentUnit.id === unitId) {
        updateSideCompareButton(currentUnit);
    }
}

function removeCompareUnit(unitId) {
    compareUnitIds = compareUnitIds.filter((id) => id !== unitId);
    saveCompare();
    renderCompare();
    renderUnitsTable();

    if (currentUnit && currentUnit.id === unitId) {
        updateSideCompareButton(currentUnit);
    }
}

function clearCompareUnits() {
    compareUnitIds = [];
    saveCompare();
    renderCompare();
    renderUnitsTable();
    closeCompareDrawer();

    if (currentUnit) {
        updateSideCompareButton(currentUnit);
    }
}

function openCompareDrawer() {
    $("#compareDrawer")?.classList.add("show");
    $("#compareBackdrop")?.classList.add("show");
    renderCompare();
}

/* Drag the compare cards sideways with the mouse — touch scrolls natively.
   The drag only starts after a few pixels, so the buttons inside the cards
   still click; a drag that did scroll swallows the click it would end with. */
(function () {
    const strip = document.getElementById("compareCards");
    if (!strip) return;
    let down = null, dragged = false;
    strip.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        down = { x: e.clientX, left: strip.scrollLeft };
        dragged = false;
    });
    strip.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - down.x;
        if (!dragged && Math.abs(dx) < 5) return;
        if (!dragged) {
            dragged = true;
            strip.classList.add("dragging");
            try { strip.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
        }
        strip.scrollLeft = down.left - dx;
        e.preventDefault();
    });
    const end = () => {
        if (!down) return;
        down = null;
        if (!dragged) return;
        dragged = false;
        strip.classList.remove("dragging");
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        strip.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => strip.removeEventListener("click", swallow, { capture: true }), 0);
    };
    strip.addEventListener("pointerup", end);
    strip.addEventListener("pointercancel", end);
    strip.addEventListener("pointerleave", end);
})();

function closeCompareDrawer() {
    $("#compareDrawer")?.classList.remove("show");
    $("#compareBackdrop")?.classList.remove("show");
}

function updateCompareFloatingButton() {
    const count = compareUnitIds.length;
    const countEl = $("#compareCount");
    const btn = $("#compareToggle");

    if (countEl) countEl.textContent = count;

    // يظهر فقط لما يكون فيه وحدات في المقارنة
    if (btn) {
        btn.classList.toggle("show", count > 0);
    }

    const sub = $("#compareSub");
    if (sub) {
        sub.textContent = `${count} unit${count === 1 ? "" : "s"} selected`;
    }

    // لو فضيت المقارنة وهي مفتوحة، اقفلها
    if (count === 0) {
        closeCompareDrawer?.();
    }
}

function updateSideCompareButton(unit) {
    const btn = $("#sideCompareBtn");
    if (!btn || !unit) return;

    const active = isUnitCompared(unit.id);
    btn.classList.toggle("active", active);
    btn.textContent = active ? "♥ Compared" : "♡ Compare";

    btn.onclick = (event) => toggleCompareUnit(unit.id, event);
}

function renderCompare() {
    const container = $("#compareCards");
    if (!container) return;

    const units = getCompareUnits();

    updateCompareFloatingButton();

    if (!units.length) {
        container.innerHTML = `
  <div class="compare-empty">
No units selected yet. Press the heart beside any unit.
  </div>
`;
        return;
    }

    container.innerHTML = units
        .map((unit) => {
            const imageHtml =
                unit.imgSource && unit.imgSource.trim() !== ""
                    ? `<img src="${escapeHtml(unit.imgSource)}" alt="${escapeHtml(unit.name)}" />`
                    : `<div class="compare-card-no-img">No image</div>`;

            return `
<article class="compare-card">
  <div class="compare-card-img">
${imageHtml}
<span class="compare-card-status ${escapeHtml(unit.status)}">
  ${escapeHtml(unit.availability || unit.status)}
</span>
  </div>

  <div class="compare-card-body">
<div>
  <div class="compare-card-title">${escapeHtml(unit.name)}</div>
  <div class="compare-card-type">${escapeHtml(unit.type || "—")}</div>
</div>

<div class="compare-row">
  <span>Floor</span>
  <b>${escapeHtml(unit.floorRaw || unit.floor || "—")}</b>
</div>

<div class="compare-row">
  <span>Area</span>
  <b>${escapeHtml(unit.area || "—")}</b>
</div>

<div class="compare-row">
  <span>Price</span>
  <b>${escapeHtml(unit.price || "—")}</b>
</div>

<div class="compare-row">
  <span>Status</span>
  <b>${escapeHtml(unit.availability || unit.status || "—")}</b>
</div>
  </div>

  <div class="compare-card-actions">
<button class="compare-open-btn" type="button" onclick="openCompareUnit('${escapeHtml(unit.id)}')">
  Open Details
</button>

<button class="compare-remove-btn" type="button" onclick="removeCompareUnit('${escapeHtml(unit.id)}')">
  Remove
</button>
  </div>
</article>
  `;
        })
        .join("");
}

function openCompareUnit(unitId) {
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return;

    closeCompareDrawer();

    if (typeof highlightUnitInThree === "function") {
        highlightUnitInThree(unit);
    }

    openUnit(unit);
}

function bindCompareEvents() {
    $("#compareToggle")?.addEventListener("click", openCompareDrawer);
    $("#closeCompare")?.addEventListener("click", closeCompareDrawer);
    $("#compareBackdrop")?.addEventListener("click", closeCompareDrawer);
    $("#clearCompare")?.addEventListener("click", clearCompareUnits);
}

bindCompareEvents();
renderCompare();

bindUnitsTableEvents();

/* Auto-open table on mobile and apply stored height */
if (window.innerWidth <= 700) {
    $("#unitsTableDrawer")?.classList.add("show");
    syncUnitsTableMobileLayout();
}

/* Table head icon buttons (mobile) */
document.getElementById("tableHeadGallery")?.addEventListener("click", () => {
    if (typeof openGallery === "function") openGallery();
});

document.getElementById("tableHeadFavourites")?.addEventListener("click", () => {
    if (typeof openCompareDrawer === "function") openCompareDrawer();
});

/* Keep favourites badge in sync with compare count */
function syncTableHeadFavBadge() {
    const badge = document.getElementById("tableHeadFavBadge");
    const count = document.getElementById("compareCount");
    if (!badge || !count) return;
    const n = parseInt(count.textContent, 10) || 0;
    badge.textContent = n;
    badge.classList.toggle("show", n > 0);
}

const _favBadgeObserver = new MutationObserver(syncTableHeadFavBadge);
const _compareCountEl = document.getElementById("compareCount");
if (_compareCountEl) _favBadgeObserver.observe(_compareCountEl, { childList: true, characterData: true, subtree: true });
syncTableHeadFavBadge();
