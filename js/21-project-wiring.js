(function () {
    // ⚠️ REPLACE with the sales WhatsApp number: country code first, digits
    // only — no +, spaces or dashes. KSA example: 966 + number → "9665XXXXXXXX".
    const WHATSAPP_NUMBER = (window.MAAZAR_CONFIG && window.MAAZAR_CONFIG.WHATSAPP_NUMBER) || "";

    const PROJECT_TITLE = (window.MAAZAR_PROJECT && (window.MAAZAR_PROJECT.title || window.MAAZAR_PROJECT.name)) || "Khawalid 20 Residential";
    const GENERAL_MSG = "Hello, I would like to inquire about available units at " + PROJECT_TITLE + ".";

    const launcher = document.getElementById("waLauncher");
    const panel = document.getElementById("waPanel");
    const closeBtn = document.getElementById("waClose");
    const bubble = document.getElementById("waBubble");
    const timeEl = document.getElementById("waTime");
    const openBtn = document.getElementById("waOpenBtn");
    const copyBtn = document.getElementById("waCopyBtn");
    if (!launcher || !panel) return;

    let currentMsg = GENERAL_MSG;

    function setMessage(msg) {
        currentMsg = msg;
        if (bubble) bubble.textContent = msg;
        if (timeEl)
            timeEl.textContent = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
    }

    function buildUnitMsg(u) {
        const floor = u.floorRaw || u.floor || "—";
        const price = Number(u.priceRaw) > 0 ? u.price || "—" : "On request";
        return [
            "Hello, I'm interested in the following unit at " + PROJECT_TITLE + ":",
            "",
            "🏢 " + PROJECT_TITLE + " — Unit Details",
            "",
            "📋 Unit: " + (u.name || "—"),
            "🏷️ Type: " + (u.type || "—"),
            "✅ Status: " + (u.availability || u.status || "—"),
            "📐 Area: " + (u.area || "—"),
            "🏬 Floor: " + floor,
            "💰 Price: " + price,
            "",
            "Please provide more information.",
        ].join("\n");
    }

    function openPanel() {
        panel.classList.add("wa-open");
        launcher.classList.add("wa-hidden");
    }
    function closePanel() {
        panel.classList.remove("wa-open");
        launcher.classList.remove("wa-hidden");
    }

    function openWhatsApp() {
        const url =
            "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(currentMsg);
        window.open(url, "_blank", "noopener");
    }

    async function copyMsg() {
        const flash = (txt) => {
            if (!copyBtn) return;
            const b = copyBtn.querySelector("b");
            const old = b.textContent;
            b.textContent = txt;
            setTimeout(() => (b.textContent = old), 1500);
        };
        try {
            await navigator.clipboard.writeText(currentMsg);
            flash("Copied!");
        } catch (_) {
            const ta = document.createElement("textarea");
            ta.value = currentMsg;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy");
                flash("Copied!");
            } catch (e) { }
            ta.remove();
        }
    }

    launcher.addEventListener("click", () => {
        setMessage(GENERAL_MSG);
        openPanel();
    });
    closeBtn && closeBtn.addEventListener("click", closePanel);
    openBtn && openBtn.addEventListener("click", openWhatsApp);
    copyBtn && copyBtn.addEventListener("click", copyMsg);

    // Open the panel pre-filled with a specific unit's details.
    window.openWaForUnit = function (unit) {
        if (!unit) return;
        setMessage(buildUnitMsg(unit));
        openPanel();
    };

    // "Contact Sales on WhatsApp" button inside the unit detail panel.
    const sideBtn = document.getElementById("sideWhatsApp");
    if (sideBtn) {
        sideBtn.addEventListener("click", () => {
            try {
                if (typeof currentUnit !== "undefined" && currentUnit) {
                    if (typeof closeUnitSideMenu === "function") closeUnitSideMenu();
                    window.openWaForUnit(currentUnit);
                } else {
                    setMessage(GENERAL_MSG);
                    openPanel();
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    setMessage(GENERAL_MSG);
})();