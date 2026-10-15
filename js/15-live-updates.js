/* =========================================================
   LIVE UPDATES — Supabase Realtime, no page reload
   The admin dashboard (and tools/*.js) broadcast { table } on the
   "mazaar-live" channel after every write; the viewer refetches that
   table at once. A second channel asks for Postgres row changes as
   well, so edits made straight in Supabase also arrive once section 6
   of admin/supabase-setup.sql has been run — until then that channel
   just reports "not enabled" and stays quiet. Polling remains as a
   fallback: every 60 s while the socket is up, every 15 s when down.
   Plain WebSocket + the Phoenix channel protocol (no client library).
========================================================= */
const LIVE_CHANNEL = "mazaar-live";
const LIVE_TABLES = ["units", "gallery", "gallery_categories", "site_settings"];
let liveConnected = false;
const liveTimers = {};

function onLiveChange(table) {
    if (!table) return;
    clearTimeout(liveTimers[table]);
    liveTimers[table] = setTimeout(() => {
        if (table === "units") {
            Promise.resolve(loadSheet({ silent: true })).then(() => {
                // keep an open unit panel in step with its row
                const menu = $("#unitSideMenu");
                if (typeof currentUnit !== "undefined" && currentUnit && menu && menu.classList.contains("show") && typeof openUnit === "function") {
                    const fresh = allUnits.find((u) => u.name === currentUnit.name);
                    if (fresh) openUnit(fresh);
                }
            });
        } else if (table === "gallery" || table === "gallery_categories") {
            if (typeof loadGalleryFromSupabase === "function") loadGalleryFromSupabase();
        } else if (table === "site_settings") {
            if (window.introHero) window.introHero.refresh();
        }
    }, 350);
}

function startLiveUpdates() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || typeof WebSocket === "undefined") return;
    const wsUrl = SUPABASE_URL.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(SUPABASE_ANON_KEY) + "&vsn=1.0.0";
    let ws = null, ref = 0, heartbeat = null, retry = 1000, pending = null;
    const send = (topic, event, payload) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref) })); };
    const setConnected = (on) => {
        if (liveConnected === on) return;
        liveConnected = on;
        startSheetAutoRefresh(on ? SHEET_REFRESH_INTERVAL * 4 : SHEET_REFRESH_INTERVAL);
        console.info("[live] " + (on ? "connected — dashboard changes arrive without a reload" : "disconnected — polling every 15 s until it is back"));
    };
    const schedule = () => { clearTimeout(pending); pending = setTimeout(connect, retry); retry = Math.min(retry * 2, 30000); };
    function connect() {
        clearTimeout(pending);
        try { ws = new WebSocket(wsUrl); } catch (e) { schedule(); return; }
        ws.onopen = () => {
            retry = 1000;
            send("realtime:" + LIVE_CHANNEL, "phx_join", { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [] }, access_token: SUPABASE_ANON_KEY });
            send("realtime:mazaar-db", "phx_join", { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: LIVE_TABLES.map((table) => ({ event: "*", schema: "public", table })) }, access_token: SUPABASE_ANON_KEY });
            clearInterval(heartbeat);
            heartbeat = setInterval(() => send("phoenix", "heartbeat", {}), 25000);
        };
        ws.onmessage = (e) => {
            let m; try { m = JSON.parse(e.data); } catch (_) { return; }
            const p = m.payload || {};
            if (m.event === "phx_reply" && m.topic === "realtime:" + LIVE_CHANNEL && p.status === "ok") {
                setConnected(true);
                onLiveChange("units"); onLiveChange("gallery"); // catch up on anything missed while offline
            } else if (m.event === "broadcast" && p.event === "change") {
                onLiveChange(p.payload && p.payload.table);
            } else if (m.event === "postgres_changes" && p.data) {
                onLiveChange(p.data.table);
            } else if (m.event === "system" && p.status === "error" && m.topic === "realtime:mazaar-db") {
                console.info("[live] row-change feed not enabled on the project (section 6 of admin/supabase-setup.sql) — dashboard broadcasts still arrive");
            }
        };
        ws.onclose = () => { clearInterval(heartbeat); setConnected(false); schedule(); };
        ws.onerror = () => { /* onclose follows and reconnects */ };
    }
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (!ws || ws.readyState === 3) { retry = 1000; connect(); }
        onLiveChange("units"); // a tab that was asleep refetches regardless
    });
    connect();
}
startLiveUpdates();