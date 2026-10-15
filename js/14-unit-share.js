/* =========================================================
   SHARE A UNIT — deep-link (?unit=<name>) + copy-to-clipboard
========================================================= */
function buildUnitShareUrl(unit) {
    if (!unit) return location.href;
    const base = location.origin + location.pathname;
    return `${base}?unit=${encodeURIComponent(unit.name)}`;
}

async function copyUnitShareLink(unit, btn) {
    if (!unit) return;
    const url = buildUnitShareUrl(unit);

    const flash = () => {
        if (!btn) return;
        btn.classList.add("copied");
        btn.title = "Link copied!";
        setTimeout(() => {
            btn.classList.remove("copied");
            btn.title = "Copy share link";
        }, 1600);
    };

    try {
        await navigator.clipboard.writeText(url);
        flash();
    } catch (_) {
        // Fallback for non-secure contexts / older browsers.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            flash();
        } catch (e) { }
        ta.remove();
    }
}

// Open the unit named in the URL (?unit=...) once, after data has loaded.
let deepLinkHandled = false;
function maybeOpenUnitFromUrl() {
    if (deepLinkHandled) return;
    if (!allUnits || !allUnits.length) return;

    const wanted = new URLSearchParams(location.search).get("unit");
    if (!wanted) {
        deepLinkHandled = true;
        return;
    }

    const target =
        allUnits.find((u) => u.name === wanted) ||
        allUnits.find((u) => u.id === wanted);

    deepLinkHandled = true;
    if (!target) return;

    // Light up the unit in 3D too, mirroring the table-row open behaviour.
    // The 3D scene may not be ready on first load, so fail soft.
    try {
        if (typeof highlightUnitInThree === "function") highlightUnitInThree(target);
    } catch (e) { }
    openUnit(target);
}

function openFirstAvailableMedia() {
    if (!currentUnit) return;

    const mediaOrder = [
        ["img", currentUnit.imgSource],
        ["brochure", currentUnit.brochure],
        ["tour", currentUnit.tour],
        ["3d", currentUnit.view3d],
        ["balcony", currentUnit.balcony],
        ["plan", currentUnit.plans],
    ];

    const first = mediaOrder.find((item) => item[1] && item[1].trim() !== "");

    if (first) {
        openMedia(first[0]);
    }
}

function setMediaBtn(id, url, label) {
    const btn = $("#" + id);
    if (!btn) return;

    const icon =
        btn.dataset.icon ||
        (btn.querySelector(".icon")
            ? btn.querySelector(".icon").textContent
            : "");
    btn.dataset.icon = icon;

    if (url && url.trim() !== "") {
        btn.disabled = false;
        btn.title = "Open " + label;
        btn.innerHTML = `<span class="icon">${icon}</span> ${label}`;
    } else {
        btn.disabled = true;
        btn.title = label + " not available";
        btn.innerHTML = `<span class="icon">${icon}</span> ${label} <span style="font-size:10px;opacity:.5">(N/A)</span>`;
    }
}

const MEDIA_LABELS = {
    img: "Image",
    brochure: "Brochure",
    tour: "Apartment Tour",
    "3d": "3D View",
    balcony: "Balcony View",
    plan: "Floor Plans",
};

const MEDIA_ICONS = {
    img: "🖼️",
    brochure: "📄",
    tour: "🎥",
    "3d": "🧊",
    balcony: "🌅",
    plan: "📐",
};

// Convert Google Drive / Docs sharing links into their embeddable
// "/preview" form. A raw /view or /edit link rendered in an iframe shows
// the full Drive UI (and a "You need access" wall), whereas /preview
// shows a clean embedded viewer.
function toEmbeddableUrl(url) {
    if (!url) return url;
    const u = url.trim();

    // drive.google.com/file/d/FILE_ID/view  ->  /preview
    let m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

    // drive.google.com/open?id=FILE_ID  or  ...?id=FILE_ID  ->  /preview
    m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&#]+)/i);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

    // docs.google.com/(document|presentation|spreadsheets)/d/ID/...  ->  /preview
    m = u.match(
        /docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([^/]+)/i
    );
    if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;

    return u;
}

/* The Floor Plans tab with several drawings (a townhouse's levels): side by side, each fitted to its column
   (stacked on a narrow screen); a click on one shows it alone, zoomable like a single drawing, and the
   "All plans" button brings them all back. */
function renderPlanBody(list, focus) {
    const body = $("#mediaBody");
    body.innerHTML = "";
    body.classList.remove("zoomed");
    body.classList.toggle("multi", focus == null);
    if (focus == null) {
        list.forEach((u, i) => {
            const fig = document.createElement("figure");
            fig.className = "media-multi-item";
            const img = document.createElement("img");
            img.src = u; img.alt = `${MEDIA_LABELS.plan} ${i + 1}`; img.draggable = false; img.loading = "lazy"; img.title = "Click to enlarge";
            img.addEventListener("click", () => renderPlanBody(list, i));
            const cap = document.createElement("figcaption"); cap.textContent = `${i + 1} / ${list.length}`;
            fig.appendChild(img); fig.appendChild(cap); body.appendChild(fig);
        });
    } else {
        const img = document.createElement("img");
        img.src = list[focus]; img.alt = `${MEDIA_LABELS.plan} ${focus + 1}`; img.className = "media-zoomable"; img.title = "Click to zoom"; img.draggable = false;
        img.addEventListener("click", (e) => toggleMediaZoom(e, img));
        body.appendChild(img);
        const back = document.createElement("button");
        back.type = "button"; back.className = "media-back"; back.textContent = "◂ All plans";
        back.addEventListener("click", () => renderPlanBody(list, null));
        body.appendChild(back);
    }
}

function openMedia(tab) {
    if (!currentUnit) return;

    currentMediaTab = tab;

    const modal = $("#mediaModal");
    const title = $("#mediaTitle");
    const sub = $("#mediaSub");
    const body = $("#mediaBody");

    title.textContent = MEDIA_LABELS[tab] || "Media";
    sub.textContent = `${currentUnit.name} — ${currentUnit.type} — ${currentUnit.area}`;

    $$(".media-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.tab === tab);
    });

    const urlMap = {
        img: currentUnit.imgSource,
        brochure: currentUnit.brochure,
        tour: currentUnit.tour,
        "3d": currentUnit.view3d,
        balcony: currentUnit.balcony,
        plan: currentUnit.plans,
    };

    // Tabs mirror the side panel: no link → no tab.
    $$("#mediaTabs .media-tab").forEach((t) => {
        const u = urlMap[t.dataset.tab];
        t.style.display = u && String(u).trim() !== "" ? "" : "none";
    });

    // the plan tab may hold several drawings (planUrls); the other tabs one link
    const list = (tab === "plan" ? planUrls(currentUnit) : [urlMap[tab]]).map(toEmbeddableUrl).filter((u) => u && String(u).trim() !== "");
    const url = list[0] || "";
    const multi = list.length > 1 && list.every(isImageUrl);

    body.innerHTML = "";
    body.classList.remove("zoomed");
    body.classList.toggle("is-plan", tab === "plan");
    body.classList.toggle("multi", multi);

    if (url && url.trim() !== "") {
        const isImage = isImageUrl(url);
        const isPDF = /\.pdf(\?.*)?$/i.test(url);

        if (tab === "tour" || tab === "3d") {
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.title = MEDIA_LABELS[tab];
            iframe.allow =
                "fullscreen; autoplay; clipboard-write; gyroscope; accelerometer";
            iframe.loading = "lazy";
            iframe.sandbox =
                "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation";
            body.appendChild(iframe);
        } else if (isImage && multi) {
            renderPlanBody(list, null); // several drawings (a townhouse's levels): side by side, each a click from its own zoom
        } else if (isImage) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = MEDIA_LABELS[tab];
            img.className = "media-zoomable";
            img.title = "Click to zoom";
            img.draggable = false;
            img.addEventListener("click", (e) => toggleMediaZoom(e, img));

            img.onerror = () => {
                body.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:14px;">
Failed to load image
  </div>
`;
            };

            body.appendChild(img);
        } else if (isPDF) {
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.title = MEDIA_LABELS[tab];
            body.appendChild(iframe);
        } else {
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.title = MEDIA_LABELS[tab];
            iframe.allow = "fullscreen; autoplay; clipboard-write";
            body.appendChild(iframe);
        }
    } else {
        body.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:var(--muted);">
<div style="font-size:40px;opacity:.3">${MEDIA_ICONS[tab]}</div>
<div style="font-size:14px">No ${MEDIA_LABELS[tab].toLowerCase()} available for this unit.</div>
  </div>
`;
    }

    modal.classList.add("show");
}

function closeMediaModal() {
    $("#mediaModal").classList.remove("show");

    setTimeout(() => {
        $("#mediaBody").innerHTML = "";
        $("#mediaBody").classList.remove("zoomed", "is-plan", "multi");
    }, 400);
}

/* Click an image in the modal: 1:1 pixels with the clicked point kept
   under the cursor (scroll or drag to pan); click again to fit. */
let mediaDrag = null;
let mediaDragMoved = false;

function toggleMediaZoom(e, img) {
    const body = $("#mediaBody");
    if (mediaDragMoved) { mediaDragMoved = false; return; } // a pan ended on the image, not a click
    if (body.classList.contains("zoomed")) {
        body.classList.remove("zoomed");
        return;
    }
    // Where on the picture (not the letterboxed element) was clicked
    const r = img.getBoundingClientRect();
    const nw = img.naturalWidth || r.width, nh = img.naturalHeight || r.height;
    const scale = Math.min(r.width / nw, r.height / nh);
    const cw = nw * scale, ch = nh * scale;
    const fx = Math.min(1, Math.max(0, (e.clientX - (r.left + (r.width - cw) / 2)) / cw));
    const fy = Math.min(1, Math.max(0, (e.clientY - (r.top + (r.height - ch) / 2)) / ch));

    body.classList.add("zoomed");
    const b = body.getBoundingClientRect();
    body.scrollLeft = fx * img.offsetWidth - (e.clientX - b.left);
    body.scrollTop = fy * img.offsetHeight - (e.clientY - b.top);
}

(function () {
    const body = $("#mediaBody");
    if (!body) return;
    body.addEventListener("pointerdown", (e) => {
        if (!body.classList.contains("zoomed") || e.pointerType === "touch" || e.button !== 0) return;
        mediaDrag = { x: e.clientX, y: e.clientY, left: body.scrollLeft, top: body.scrollTop };
        mediaDragMoved = false;
        body.classList.add("dragging");
    });
    body.addEventListener("pointermove", (e) => {
        if (!mediaDrag) return;
        const dx = e.clientX - mediaDrag.x, dy = e.clientY - mediaDrag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) mediaDragMoved = true;
        body.scrollLeft = mediaDrag.left - dx;
        body.scrollTop = mediaDrag.top - dy;
    });
    const end = () => { mediaDrag = null; body.classList.remove("dragging"); };
    body.addEventListener("pointerup", end);
    body.addEventListener("pointercancel", end);
    body.addEventListener("pointerleave", end);
})();

function switchMediaTab(tab) {
    if (!currentUnit) return;

    currentMediaTab = tab;
    openMedia(tab);
}

$("#mediaModal").addEventListener("click", function (e) {
    if (e.target === this) closeMediaModal();
});
$("#closeUnitSide").addEventListener("click", closeUnitSideMenu);

$("#shareUnitBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    copyUnitShareLink(currentUnit, e.currentTarget);
});

$("#unitSideBackdrop").addEventListener("click", closeUnitSideMenu);
$("#closeFloor").addEventListener("click", closeFloor);

$("#floorOverlay").addEventListener("click", (e) => {
    if (e.target.id === "floorOverlay") closeFloor();
});

$("#closeUnit").addEventListener("click", () => {
    $("#unitModal").classList.remove("show");
});

$("#unitModal").addEventListener("click", (e) => {
    if (e.target.id === "unitModal") {
        $("#unitModal").classList.remove("show");
    }
});

$("#unitSearch").addEventListener("input", renderFloor);

$$(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;

        filters[filter] = !filters[filter];
        btn.classList.toggle("active", filters[filter]);

        renderFloor();
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if ($("#mediaModal").classList.contains("show")) {
            closeMediaModal();
            return;
        }

        if ($("#unitModal").classList.contains("show")) {
            $("#unitModal").classList.remove("show");
            return;
        }

        closeFloor();
    }
});

loadSheet().then(() => {
    startSheetAutoRefresh();
});
