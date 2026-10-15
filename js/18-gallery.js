/* ==========================================================
   GALLERY
========================================================== */

/* Built-in fallback list. At runtime the gallery is loaded from Supabase
   (`gallery` + `gallery_categories`, managed in admin/index.html) — see
   loadGalleryFromSupabase() below. These rows are used only when the
   tables are missing or empty. */
let GALLERY_DATA = [
    /* Local derivatives built by tools/optimize-gallery.py (git-ignored). */
    { id: 1, category: "exterior", subcategory: "Aerial", src: "gallery/images-gallery/_optimized/full/exterior/aerial-day.webp", thumb: "gallery/images-gallery/_optimized/thumb/exterior/aerial-day.webp", title: "Aerial View – Day", title_ar: "منظر جوي – نهارًا" },
    { id: 2, category: "exterior", subcategory: "Aerial", src: "gallery/images-gallery/_optimized/full/exterior/aerial-sunset.webp", thumb: "gallery/images-gallery/_optimized/thumb/exterior/aerial-sunset.webp", title: "Aerial View – Sunset", title_ar: "منظر جوي – عند الغروب" },
    { id: 3, category: "exterior", subcategory: "Street", src: "gallery/images-gallery/_optimized/full/exterior/main-facade.webp", thumb: "gallery/images-gallery/_optimized/thumb/exterior/main-facade.webp", title: "Main Facade", title_ar: "الواجهة الرئيسية" },
    { id: 4, category: "exterior", subcategory: "Street", src: "gallery/images-gallery/_optimized/full/exterior/street-corner.webp", thumb: "gallery/images-gallery/_optimized/thumb/exterior/street-corner.webp", title: "Street Corner", title_ar: "زاوية الشارع" },
    { id: 5, category: "courtyard", subcategory: "Courtyard", src: "gallery/images-gallery/_optimized/full/courtyard/inner-courtyard.webp", thumb: "gallery/images-gallery/_optimized/thumb/courtyard/inner-courtyard.webp", title: "Inner Courtyard", title_ar: "الفناء الداخلي" },
    { id: 6, category: "courtyard", subcategory: "Roof Terrace", src: "gallery/images-gallery/_optimized/full/courtyard/rooftop-terrace.webp", thumb: "gallery/images-gallery/_optimized/thumb/courtyard/rooftop-terrace.webp", title: "Rooftop Terrace", title_ar: "تراس السطح" },
    { id: 7, category: "prototypes", subcategory: "1 Bedroom", src: "gallery/images-gallery/_optimized/full/prototypes/1-bedroom-70.webp", thumb: "gallery/images-gallery/_optimized/thumb/prototypes/1-bedroom-70.webp", title: "Prototype 01 – 1 Bedroom", title_ar: "النموذج ٠١ – غرفة نوم" },
    { id: 8, category: "prototypes", subcategory: "2 Bedrooms", src: "gallery/images-gallery/_optimized/full/prototypes/2-bedroom-105.webp", thumb: "gallery/images-gallery/_optimized/thumb/prototypes/2-bedroom-105.webp", title: "Prototype 02 – 2 Bedrooms", title_ar: "النموذج ٠٢ – غرفتا نوم" },
    { id: 9, category: "prototypes", subcategory: "3 Bedrooms", src: "gallery/images-gallery/_optimized/full/prototypes/3-bedroom-140.webp", thumb: "gallery/images-gallery/_optimized/thumb/prototypes/3-bedroom-140.webp", title: "Prototype 03 – 3 Bedrooms", title_ar: "النموذج ٠٣ – ثلاث غرف نوم" },
    { id: 10, category: "plans", subcategory: "Plans", src: "gallery/images-gallery/_optimized/full/plans/ground-floor.webp", thumb: "gallery/images-gallery/_optimized/thumb/plans/ground-floor.webp", title: "Ground Floor Plan", title_ar: "مخطط الدور الأرضي" },
    { id: 11, category: "elevations", subcategory: "Elevations", src: "gallery/images-gallery/_optimized/full/elevations/main-elevation.webp", thumb: "gallery/images-gallery/_optimized/thumb/elevations/main-elevation.webp", title: "Main Elevation", title_ar: "الواجهة الرئيسية" },
];

let GALLERY_CATEGORIES = [
    { key: "all", label: "All", label_ar: "الكل", hasChildren: true },
    { key: "exterior", label: "Exterior", label_ar: "الواجهات الخارجية", hasChildren: true },
    { key: "courtyard", label: "Courtyard & Roof", label_ar: "الفناء والسطح", hasChildren: true },
    { key: "prototypes", label: "Unit Prototypes", label_ar: "نماذج الوحدات", hasChildren: true },
    { key: "plans", label: "Floor Plans", label_ar: "المخططات", hasChildren: false },
    { key: "elevations", label: "Elevations", label_ar: "الواجهات والقطاعات", hasChildren: false },
];

let galleryActiveCategory = "all";
let galleryActiveSubcategory = null;
let galleryExpandedCategories = new Set(["all"]);
let galleryLbIndex = 0;
let galleryLbItems = [];

/* ---- Supabase-backed gallery (edited from admin/index.html) ---- */
async function loadGalleryFromSupabase() {
    if (!SUPABASE_URL) return; // config.js not filled in yet — keep the built-in list
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY };
    const get = async (path) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };
    try {
        // This project's images (projects.js; the `project` column of SQL section 8). Without that column
        // (section 8 not run yet) the default project shows the whole table, any other project nothing.
        const itemsOfProject = async () => {
            try { return await get(`gallery?select=*&project=eq.${encodeURIComponent(PROJECT_ID)}&order=sort_order.asc,id.asc&limit=5000`); }
            catch (e) {
                if (!/HTTP 400/.test(e.message)) throw e;
                console.warn("[gallery] the gallery table has no `project` column yet — run admin/supabase-setup.sql (section 8).");
                return PROJECT_ID === window.MAAZAR_DEFAULT_PROJECT ? get("gallery?select=*&order=sort_order.asc,id.asc&limit=5000") : [];
            }
        };
        const [cats, items] = await Promise.all([
            get("gallery_categories?select=*&order=sort_order.asc,key.asc"),
            itemsOfProject(),
        ]);
        if (!Array.isArray(items)) return;
        GALLERY_DATA = items;
        // Categories are shared by every project: list the ones this project has images in.
        const used = new Set(items.map((i) => i.category));
        GALLERY_CATEGORIES = [{ key: "all", label: "All", label_ar: "الكل", hasChildren: true }]
            .concat((cats || []).filter((c) => used.has(c.key)).map(c => ({ ...c, hasChildren: true })));
        if (document.getElementById("galleryOverlay")?.classList.contains("show")) {
            renderGallerySidebar();
            renderGalleryGrid();
        }
        document.dispatchEvent(new CustomEvent("gallery:loaded")); // the unit panel's 3D images strip listens
    } catch (e) {
        console.warn("[gallery] Supabase gallery unavailable, using the built-in list:", e.message);
    }
}
const galleryIsAr = () => window.i18n?.lang === "ar";
/* Grid tiles use the small `thumb` derivative when the row has one (rows
   uploaded before the thumb column, or from the admin dashboard, don't —
   they fall back to the full image). The lightbox always uses item.src. */
const galleryTileSrc = item => item.thumb || item.src;
const galleryCatLabel = cat => (galleryIsAr() && cat.label_ar) ? cat.label_ar : cat.label;
const galleryItemTitle = item => ((galleryIsAr() && item.title_ar) ? item.title_ar : item.title) || "";
function gallerySubLabel(catKey, sub) {
    if (!galleryIsAr()) return sub;
    const hit = GALLERY_DATA.find(i => i.category === catKey && i.subcategory === sub && i.subcategory_ar);
    return hit ? hit.subcategory_ar : sub;
}
loadGalleryFromSupabase();
document.addEventListener("i18n:change", () => {
    if (document.getElementById("galleryOverlay")?.classList.contains("show")) {
        renderGallerySidebar();
        renderGalleryGrid();
    }
});

function galleryCategoryCount(catKey) {
    if (catKey === "all") return GALLERY_DATA.length;
    return GALLERY_DATA.filter(i => i.category === catKey).length;
}

function gallerySubcategories(catKey) {
    const subs = [...new Set(
        GALLERY_DATA.filter(i => i.category === catKey).map(i => i.subcategory).filter(Boolean)
    )];
    return subs;
}

function gallerySubcategoryCount(catKey, sub) {
    return GALLERY_DATA.filter(i => i.category === catKey && i.subcategory === sub).length;
}

function galleryFilteredItems() {
    if (galleryActiveSubcategory) {
        return GALLERY_DATA.filter(i => i.subcategory === galleryActiveSubcategory);
    }
    if (galleryActiveCategory === "all") return GALLERY_DATA;
    return GALLERY_DATA.filter(i => i.category === galleryActiveCategory);
}

function renderGallerySidebar() {
    const nav = document.getElementById("gallerySidebar");
    if (!nav) return;

    let html = "";

    GALLERY_CATEGORIES.forEach(cat => {
        const count = galleryCategoryCount(cat.key);
        const isActive = galleryActiveCategory === cat.key && !galleryActiveSubcategory;
        const isExpanded = galleryExpandedCategories.has(cat.key);
        const subs = cat.hasChildren ? gallerySubcategories(cat.key) : [];

        html += `
  <div class="gallery-cat-row${isActive ? " active" : ""}" data-cat="${cat.key}">
${subs.length ? `<span class="gallery-cat-toggle-icon${isExpanded ? " open" : ""}">▶</span>` : `<span style="width:18px;display:inline-block;"></span>`}
<span class="gallery-cat-label">${escapeHtml(galleryCatLabel(cat))}</span>
<span class="gallery-cat-count">${count}</span>
  </div>
`;

        if (isExpanded && subs.length) {
            subs.forEach(sub => {
                const subCount = gallerySubcategoryCount(cat.key, sub);
                const subActive = galleryActiveSubcategory === sub;
                html += `
  <div class="gallery-subcat-row${subActive ? " active" : ""}" data-cat="${cat.key}" data-sub="${escapeHtml(sub)}">
<span class="gallery-cat-label">${escapeHtml(gallerySubLabel(cat.key, sub))}</span>
<span class="gallery-cat-count">${subCount}</span>
  </div>
`;
            });
        }
    });

    nav.innerHTML = html;

    nav.querySelectorAll(".gallery-cat-row").forEach(row => {
        row.addEventListener("click", () => {
            const catKey = row.dataset.cat;
            if (galleryExpandedCategories.has(catKey)) {
                galleryExpandedCategories.delete(catKey);
            } else {
                galleryExpandedCategories.add(catKey);
            }
            galleryActiveCategory = catKey;
            galleryActiveSubcategory = null;
            renderGallerySidebar();
            renderGalleryGrid();
        });
    });

    nav.querySelectorAll(".gallery-subcat-row").forEach(row => {
        row.addEventListener("click", e => {
            e.stopPropagation();
            galleryActiveCategory = row.dataset.cat;
            galleryActiveSubcategory = row.dataset.sub;
            renderGallerySidebar();
            renderGalleryGrid();
        });
    });
}

function renderGalleryGrid() {
    const grid = document.getElementById("galleryMasonry");
    if (!grid) return;

    const items = galleryFilteredItems();
    galleryLbItems = items;

    if (!items.length) {
        grid.innerHTML = `<div style="padding:40px;text-align:center;color:#999;font-size:14px;">No images in this category.</div>`;
        return;
    }

    grid.innerHTML = items.map((item, idx) => `
<div class="gallery-item" data-idx="${idx}">
  <div class="gallery-item-loading" id="gload-${item.id}">
<div class="gallery-item-spinner"></div>
Loading preview...
  </div>
  <img
decoding="async"
src="${escapeHtml(galleryTileSrc(item))}"
alt="${escapeHtml(galleryItemTitle(item))}"
style="display:none;"
id="gimg-${item.id}"
  />
</div>
  `).join("");

    items.forEach(item => {
        const img = document.getElementById(`gimg-${item.id}`);
        const loader = document.getElementById(`gload-${item.id}`);
        if (!img || !loader) return;

        const showImg = () => {
            loader.style.display = "none";
            img.style.display = "block";
        };
        const showErr = () => {
            loader.innerHTML = `<span style="font-size:12px;color:var(--muted);">Image not found</span>`;
        };

        img.addEventListener("load", showImg);
        img.addEventListener("error", showErr);

        // Handle already-cached images where load fired before the listener
        if (img.complete) {
            img.naturalWidth > 0 ? showImg() : showErr();
        }
    });

    grid.querySelectorAll(".gallery-item").forEach(el => {
        el.addEventListener("click", () => {
            openGalleryLightbox(parseInt(el.dataset.idx, 10));
        });
    });
}

function openGalleryLightbox(idx) {
    galleryLbIndex = idx;
    updateGalleryLightbox();
    document.getElementById("galleryLightbox").classList.add("show");
}

function updateGalleryLightbox() {
    const item = galleryLbItems[galleryLbIndex];
    if (!item) return;
    const img = document.getElementById("galleryLbImg");
    const cap = document.getElementById("galleryLbCaption");
    img.src = item.src;
    img.alt = galleryItemTitle(item);
    cap.textContent = `${galleryItemTitle(item)}  (${galleryLbIndex + 1} / ${galleryLbItems.length})`;
}

function closeGalleryLightbox() {
    document.getElementById("galleryLightbox").classList.remove("show");
}

function openGallery() {
    document.getElementById("galleryOverlay").classList.add("show");
    renderGallerySidebar();
    renderGalleryGrid();
}

function closeGallery() {
    document.getElementById("galleryOverlay").classList.remove("show");
}

document.getElementById("galleryToggle")?.addEventListener("click", openGallery);
document.getElementById("galleryClose")?.addEventListener("click", closeGallery);
document.getElementById("galleryCloseX")?.addEventListener("click", closeGallery);

document.getElementById("galleryLbClose")?.addEventListener("click", closeGalleryLightbox);
document.getElementById("galleryLbPrev")?.addEventListener("click", () => {
    galleryLbIndex = (galleryLbIndex - 1 + galleryLbItems.length) % galleryLbItems.length;
    updateGalleryLightbox();
});
document.getElementById("galleryLbNext")?.addEventListener("click", () => {
    galleryLbIndex = (galleryLbIndex + 1) % galleryLbItems.length;
    updateGalleryLightbox();
});

document.getElementById("galleryLightbox")?.addEventListener("click", e => {
    if (e.target === document.getElementById("galleryLightbox")) closeGalleryLightbox();
});

document.addEventListener("keydown", e => {
    if (document.getElementById("galleryLightbox")?.classList.contains("show")) {
        if (e.key === "ArrowLeft") { galleryLbIndex = (galleryLbIndex - 1 + galleryLbItems.length) % galleryLbItems.length; updateGalleryLightbox(); }
        if (e.key === "ArrowRight") { galleryLbIndex = (galleryLbIndex + 1) % galleryLbItems.length; updateGalleryLightbox(); }
        if (e.key === "Escape") closeGalleryLightbox();
    }
    if (document.getElementById("galleryOverlay")?.classList.contains("show") && e.key === "Escape") {
        closeGallery();
    }
});