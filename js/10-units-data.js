/* =========================================================
 PART 2: INTERACTIVE FLOORS + GOOGLE SHEET
  ========================================================= */

const SHEET_ID = "1ZTlMYzdvSB_Hpv15T94J0gFBOE7YzZ5rJyprOKmXuWo";
const SHEET_GID = "0";
// https://docs.google.com/spreadsheets/d/1ZTlMYzdvSB_Hpv15T94J0gFBOE7YzZ5rJyprOKmXuWo/export?format=csv&gid=0
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
const GVIZ_JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}`;

let allUnits = [];
let activeFloor = "";
let activeFloorRaw = "";
let activeVideo = "";
let currentHotspot = null;
let filters = {
    available: true,
    reserved: true,
    sold: true,
};

let currentUnit = null;
let currentMediaTab = "img";
let lastSheetHash = "";
let sheetRefreshTimer = null;

const SHEET_REFRESH_INTERVAL = 15000;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function normalizeHeader(h) {
    return String(h || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "")
        .replace(/[()_\-\/]/g, "");
}

function getVal(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== "") return row[key];
    }

    return "";
}

function normalizeFloor(v) {
    let original = String(v || "")
        .trim()
        .toUpperCase();

    let f = original
        .replace(/\./g, "")
        .replace(/-/g, "")
        .replace(/_/g, "")
        .replace(/\s+/g, "");

    const exactMap = {
        LOWERGROUND: "LG",
        LOWERGROUNDFLOOR: "LG",
        BASEMENT: "LG",
        B1: "LG",
        LG: "LG",

        GROUND: "GF",
        GROUNDFLOOR: "GF",
        G: "GF",
        G0: "GF",
        0: "GF",
        GF: "GF",

        1: "1",
        "01": "1",
        "1ST": "1",
        FIRST: "1",
        FIRSTFLOOR: "1",
        FLOOR1: "1",
        LEVEL1: "1",
        L1: "1",
        F1: "1",
        FL1: "1",

        2: "2",
        "02": "2",
        "2ND": "2",
        SECOND: "2",
        SECONDFLOOR: "2",
        FLOOR2: "2",
        LEVEL2: "2",
        L2: "2",
        F2: "2",
        FL2: "2",

        3: "3",
        "03": "3",
        "3RD": "3",
        THIRD: "3",
        THIRDFLOOR: "3",
        FLOOR3: "3",
        LEVEL3: "3",
        L3: "3",
        F3: "3",
        FL3: "3",

        // upper floors (Khawalid Tower 2: G + 9) and its townhouse level
        4: "4", "4TH": "4", FOURTH: "4",
        5: "5", "5TH": "5", FIFTH: "5",
        6: "6", "6TH": "6", SIXTH: "6",
        7: "7", "7TH": "7", SEVENTH: "7",
        8: "8", "8TH": "8", EIGHTH: "8",
        9: "9", "9TH": "9", NINTH: "9",
        TOWNHOUSE: "TH",
        TOWNHOUSES: "TH",
        TH: "TH",

        ROOF: "RF",
        ROOFTOP: "RF",
        R: "RF",
        RF: "RF",
    };

    if (exactMap[f]) return exactMap[f];

    f = f.replace(/FLOOR/g, "").replace(/LEVEL/g, "");
    if (exactMap[f]) return exactMap[f];

    f = f.replace(/(ST|ND|RD|TH)$/, "");
    if (exactMap[f]) return exactMap[f];

    f = f.replace(/^(FL|F|L)/, "");
    f = f.replace(/(ST|ND|RD|TH)$/, "");

    return exactMap[f] || f;
}

function statusKey(v) {
    const s = String(v || "available")
        .toLowerCase()
        .trim();

    if (s.includes("sold") || s.includes("مباع")) return "sold";
    if (
        s.includes("reserve") ||
        s.includes("reserved") ||
        s.includes("حجز")
    )
        return "reserved";

    return "available";
}

function formatPrice(v) {
    const raw = String(v || "")
        .replace(/,/g, "")
        .trim();
    const n = Number(raw);

    if (!raw) return "—";
    if (Number.isFinite(n)) return n.toLocaleString("en-US") + " SAR";

    return v;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeUnitName(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "")
        .replace(/[-_./]/g, "");
}

function findUnitByName(name) {
    const target = normalizeUnitName(name);

    if (!target) return null;

    return allUnits.find((unit) => {
        return normalizeUnitName(unit.name) === target;
    });
}

function findUnitFromMesh(mesh) {
    if (!mesh) return null;

    const names = [
        mesh.name,
        mesh.parent?.name,
        mesh.parent?.parent?.name,
    ].filter(Boolean);

    for (const name of names) {
        const found = findUnitByName(name);
        if (found) return found;
    }

    return null;
}


