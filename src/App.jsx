import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-watchlist-v1";

const defaultRows = [
  { ticker: "NVAX", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "", archived: false },
  { ticker: "UUUU", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "", archived: false },
];

const theme = {
  app: "bg-[#050816] text-slate-100",
  card: "bg-[#0B1220]/95 border-slate-800/80 shadow-2xl shadow-black/25",
  soft: "bg-[#111827]/80",
  drawer: "bg-[#0a0f1d] border-slate-700/60",
  drawerInner: "bg-gradient-to-l from-[#111827] via-[#0b1220] to-[#050816]",
  input: "bg-[#050816] border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50",
  muted: "text-slate-400",
  strong: "text-white",
  head: "bg-[#111827] text-slate-400",
  row: "border-slate-800/80 hover:bg-slate-800/35",
  navIdle: "bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-700/80",
  accent: "bg-white text-slate-950 hover:bg-slate-200",
  accentText: "text-cyan-300",
  border: "border-slate-800/80",
};

const playbook = [
  { mode: "Spike", check: "ווליום חריג + נר חזק", result: "התחלת מהלך", action: "WATCH / READY אם יש המשכיות", traderPosition: "לא כניסה מיידית — סימון למעקב", focus: "לחכות ל־base קטן אחרי הספייק", avoid: "לא לרדוף אחרי גאפ פתיחה" },
  { mode: "Pullback", check: "ירידה במחיר + ירידה בווליום", result: "תיקון בריא", action: "READY", traderPosition: "עמדת כניסה אפשרית אחרי התייצבות", focus: "לחפש Higher Low / נר עצירה / טווח קטן", avoid: "לא לקנות אם התיקון נהיה חד" },
  { mode: "Breakdown", check: "ירידה במחיר + ווליום גבוה", result: "מוכרים שולטים", action: "AVOID", traderPosition: "אין כניסה — הגנה על הון", focus: "לבדוק אם נשבר range low או support", avoid: "להימנע עד reclaim ברור" },
  { mode: "Base", check: "טווח צר + ווליום יורד", result: "מתבשל מהלך", action: "WATCH", traderPosition: "עמדת המתנה — לפני טריגר", focus: "לסמן range high / range low", avoid: "להימנע אם הבסיס נשבר למטה" },
  { mode: "Breakout", check: "פריצה + ווליום עולה", result: "פריצה עם ביקוש", action: "READY", traderPosition: "כניסה רק אם יש אישור ולא גאפ פראי", focus: "לבדוק שהפריצה לא מתוחה מדי", avoid: "להימנע מפריצה בלי ווליום" },
];

function safeNum(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function emptyAnalysis(why = "צריך לטעון דאטה חי") {
  return { setup: "Needs Data", structure: "אין מספיק נתונים לניתוח", volumeSignal: "Unknown", aiStatus: "WATCH", score: 0, entryZone: "—", invalidation: "—", why, price: null, change1: null };
}

function statusClass(status) {
  if (status === "READY") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (status === "AVOID") return "text-red-300 bg-red-500/10 border-red-500/30";
  return "text-yellow-300 bg-yellow-500/10 border-yellow-500/30";
}

function setupClass(setup) {
  if (setup === "Spike") return "text-purple-300 bg-purple-500/10 border-purple-500/30";
  if (setup === "Pullback") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (setup === "Breakdown") return "text-red-300 bg-red-500/10 border-red-500/30";
  if (setup === "Base") return "text-blue-300 bg-blue-500/10 border-blue-500/30";
  if (setup === "Breakout") return "text-orange-300 bg-orange-500/10 border-orange-500/30";
  if (setup === "Live Quote") return "text-slate-300 bg-slate-500/10 border-slate-500/30";
  return "text-zinc-300 bg-zinc-500/10 border-zinc-500/30";
}

function analyzeAlert(row, price) {
  const target = Number(row.alertPrice);
  const current = Number(price);
  if (!target || !current) return { state: "NO ALERT", triggered: false, label: "אין אלרט", dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" };
  const type = row.alertType || "above";
  const triggered = type === "above" ? current >= target : current <= target;
  const distancePct = type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100;
  const absDistance = Math.abs(distancePct);
  if (triggered) return { state: "TRIGGERED", triggered: true, label: "מוכנה", dot: "bg-emerald-400", className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" };
  if (absDistance <= 3) return { state: "NEAR", triggered: false, label: `מתקרבת ${safeNum(absDistance, 1)}%`, dot: "bg-yellow-400", className: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30" };
  return { state: "WAIT", triggered: false, label: `ממתין ${safeNum(absDistance, 1)}%`, dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" };
}

function priorityScore(row) {
  const alertScore = row.alert.state === "NEAR" ? 40 : row.isReadyToTrade ? 38 : row.alert.state === "TRIGGERED" ? 30 : row.alert.state === "WAIT" ? 10 : 0;
  const ratingScore = (row.rating || 0) * 8;
  const aiScore = row.analysis.aiStatus === "READY" ? 20 : row.analysis.aiStatus === "WATCH" ? 10 : -15;
  const setupScore = row.analysis.setup === "Pullback" ? 15 : row.analysis.setup === "Breakout" ? 12 : row.analysis.setup === "Base" ? 8 : row.analysis.setup === "Spike" ? 5 : row.analysis.setup === "Breakdown" ? -25 : row.analysis.setup === "Live Quote" ? 5 : 0;
  return Math.max(0, Math.min(alertScore + ratingScore + aiScore + setupScore + Math.round((row.analysis.score || 0) / 10), 100));
}

function priorityLabel(score) {
  if (score >= 80) return { text: "TOP PRIORITY", className: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" };
  if (score >= 60) return { text: "HIGH", className: "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30" };
  if (score >= 40) return { text: "MEDIUM", className: "bg-blue-500/20 text-blue-200 border border-blue-500/30" };
  return { text: "LOW", className: "bg-slate-500/20 text-slate-300 border border-slate-500/30" };
}

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`rounded-xl px-4 py-2 text-sm font-black transition ${className}`}>{children}</button>;
}

export default function WatchListDashboard() {
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultRows;
    try { return JSON.parse(saved); } catch { return defaultRows; }
  });
  const [newTicker, setNewTicker] = useState("");
  const viteFinnhubKey = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_FINNHUB_API_KEY : "";
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("finnhub-key") || viteFinnhubKey || "");
  const [activePanel, setActivePanel] = useState("main");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [drawerTicker, setDrawerTicker] = useState("");
  const [watchFilter, setWatchFilter] = useState("ALL");
  const [focusMode, setFocusMode] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ open: false, ticker: null });
  const [archiveModal, setArchiveModal] = useState({ open: false, ticker: null, reason: "" });
  const [confirmAiModal, setConfirmAiModal] = useState({ open: false, ticker: null });
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem("telegram-bot-token") || "");
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem("telegram-chat-id") || "");
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [apiConnected, setApiConnected] = useState(Boolean(apiKey));
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);
  useEffect(() => { localStorage.setItem("finnhub-key", apiKey || ""); }, [apiKey]);
  useEffect(() => { localStorage.setItem("telegram-bot-token", telegramBotToken || ""); }, [telegramBotToken]);
  useEffect(() => { localStorage.setItem("telegram-chat-id", telegramChatId || ""); }, [telegramChatId]);

  const analyzedRows = useMemo(() => {
    return rows.filter((row) => !row.archived).map((row) => {
      const analysis = row.analysis || emptyAnalysis();
      const alert = analyzeAlert(row, analysis.price);
      const isReadyToTrade = alert.triggered && (row.rating || 0) >= 3 && analysis.aiStatus === "READY";
      const enriched = { ...row, analysis, alert, isReadyToTrade };
      return { ...enriched, priority: priorityScore(enriched) };
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [rows]);

  const archivedRows = useMemo(() => rows.filter((row) => row.archived).map((row) => ({ ...row, analysis: row.analysis || emptyAnalysis(), alert: analyzeAlert(row, (row.analysis || emptyAnalysis()).price) })), [rows]);

  const visibleRows = useMemo(() => {
    let filtered = analyzedRows;
    if (watchFilter === "READY_TO_TRADE") filtered = filtered.filter((r) => r.isReadyToTrade);
    if (watchFilter === "NEAR") filtered = filtered.filter((r) => r.alert.state === "NEAR");
    if (watchFilter === "TRIGGERED") filtered = filtered.filter((r) => r.alert.state === "TRIGGERED");
    if (watchFilter === "HIGH_RATING") filtered = filtered.filter((r) => (r.rating || 0) >= 4);
    if (focusMode) filtered = filtered.filter((r) => r.isReadyToTrade || r.alert.state === "NEAR");
    return filtered;
  }, [analyzedRows, watchFilter, focusMode]);

  const counts = analyzedRows.reduce((acc, row) => { acc[row.userStatus || "WATCH"] += 1; return acc; }, { READY: 0, WATCH: 0, AVOID: 0 });
  const readyToTradeCount = analyzedRows.filter((r) => r.isReadyToTrade).length;
  const topPriorityRows = analyzedRows.slice(0, 3);

  function updateRow(ticker, patch) { setRows((prev) => prev.map((row) => row.ticker === ticker ? { ...row, ...patch } : row)); }
  function addTicker() {
    const ticker = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!ticker) { setLastError("תכניס טיקר תקין לפני הוספה"); return; }
    setRows((prev) => {
      const existing = prev.find((row) => row.ticker === ticker);
      if (existing) return prev.map((row) => row.ticker === ticker ? { ...row, archived: false } : row);
      return [...prev, { ticker, rating: 0, alertPrice: "", alertType: "above", userStatus: "WATCH", thesis: "", thesisDate: today, thesisTitle: "", chartImage: "", archived: false, analysis: emptyAnalysis() }];
    });
    setNewTicker("");
    setLastError("");
    setActivePanel("main");
  }
  function removeTicker(ticker) { setConfirmDeleteModal({ open: true, ticker }); }
  function archiveTicker(ticker) { setArchiveModal({ open: true, ticker, reason: "" }); }
  function restoreTicker(ticker) { setRows((prev) => prev.map((row) => row.ticker === ticker ? { ...row, archived: false } : row)); }
  function openChart(ticker) { window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank"); }
  function handleImageUpload(ticker, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => updateRow(ticker, { chartImage: event.target.result });
    reader.readAsDataURL(file);
  }

  async function sendTelegramAlert(message) {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramChatId, text: message }) });
    } catch (error) { console.log("Telegram alert failed", error); }
  }

  async function loadTicker(row) {
    const cleanKey = apiKey.trim();
    if (!cleanKey) { setApiConnected(false); setLastError("חסר Finnhub API Key"); return row; }
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${cleanKey}`);
      const quote = await response.json();
      if (quote.error) { setApiConnected(false); return { ...row, analysis: emptyAnalysis(`שגיאת API: ${quote.error}`) }; }
      if (!quote || !quote.c || quote.c === 0) return { ...row, analysis: emptyAnalysis("לא התקבל מחיר חי — בדוק טיקר / API") };
      const price = quote.c;
      const prevClose = quote.pc || quote.c;
      const change1 = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const high = quote.h || price;
      const low = quote.l || price;
      let setup = "Live Quote";
      let aiStatus = "WATCH";
      let score = 50;
      let why = "מחיר חי נטען בהצלחה. לניתוח מבנה עמוק נדרש דאטה של נרות.";
      if (change1 > 3) { setup = "Breakout"; aiStatus = "READY"; score = 72; why = "מחיר חי עולה חזק ביחס לסגירה קודמת — לבדוק גרף לפני כניסה."; }
      else if (change1 < -3) { setup = "Breakdown"; aiStatus = "AVOID"; score = 25; why = "מחיר חי יורד חזק ביחס לסגירה קודמת — זהירות."; }
      const analysis = { setup, structure: `Live Quote | H ${safeNum(high)} | L ${safeNum(low)}`, volumeSignal: "Quote Loaded", aiStatus, score, entryZone: `${safeNum(price * 0.98)}–${safeNum(price * 1.02)}`, invalidation: `Below ${safeNum(low)}`, why, price, change1 };
      return { ...row, analysis, lastLoadedAt: new Date().toISOString(), alertNotified: false };
    } catch (error) {
      setApiConnected(false);
      return { ...row, analysis: emptyAnalysis("טעינת Quote נכשלה — בדוק חיבור / API / CORS") };
    }
  }

  async function loadAllLive() {
    setLoading(true);
    setLastError("");
    try {
      const updated = [];
      for (const row of rows) updated.push(await loadTicker(row));
      setRows(updated);
      setApiConnected(true);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (error) {
      setApiConnected(false);
      setLastError("טעינת API נכשלה. בדוק Key / חיבור / מגבלת API.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    analyzedRows.forEach((row) => {
      if (row.alert.triggered && !row.alertNotified) {
        try { new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); } catch {}
        updateRow(row.ticker, { alertNotified: true });
        sendTelegramAlert(`🚨 ${row.ticker}
${row.alert.label}
Setup: ${row.analysis.setup}
AI: ${row.analysis.aiStatus}
Priority: ${row.priority}/100
Price: ${safeNum(row.analysis.price)}`);
      }
    });
  }, [analyzedRows]);

  return (
    <div dir="rtl" className={`min-h-screen p-4 lg:p-6 ${theme.app}`}>
      <div className="mx-auto w-full max-w-[96vw] space-y-5">
        <header className={`rounded-3xl border p-6 ${theme.card}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className={`text-xs font-black tracking-[0.35em] ${theme.accentText}`}>FREEDOM TRADING OS</div>
              <h1 className={`mt-2 text-3xl font-black tracking-tight lg:text-4xl ${theme.strong}`}>מרכז שליטה — Watch List</h1>
              <p className={`mt-2 text-sm ${theme.muted}`}>מערכת מקצועית לניהול קמפיינים — נקי, ממוקד, בלי לרדוף.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${apiConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{apiConnected ? "🟢 API מחובר" : "🔴 API לא מחובר"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${theme.navIdle}`}>עדכון אחרון: {lastRefreshTime || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="text-3xl font-black text-emerald-300">{counts.READY}</div><div className="text-xs text-slate-400">READY</div></div>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4"><div className="text-3xl font-black text-yellow-300">{counts.WATCH}</div><div className="text-xs text-slate-400">WATCH</div></div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"><div className="text-3xl font-black text-red-300">{counts.AVOID}</div><div className="text-xs text-slate-400">AVOID</div></div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4"><div className="text-3xl font-black text-cyan-300">{readyToTradeCount}</div><div className="text-xs text-slate-400">READY TO TRADE</div></div>
            </div>
          </div>
        </header>

        <section className={`rounded-3xl border p-4 ${theme.card}`}>
          <div className="grid gap-3 lg:grid-cols-2">
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Finnhub API Key" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
            <div className="flex gap-2"><input value={newTicker} onChange={(e) => setNewTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTicker()} placeholder="הוסף טיקר" className={`w-full rounded-2xl border px-4 py-3 text-sm uppercase outline-none ${theme.input}`} /><Button onClick={addTicker} className={theme.accent}>הוסף</Button></div>
            <Button onClick={loadAllLive} disabled={loading} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 disabled:opacity-50">{loading ? "טוען..." : "טען דאטה חי"}</Button>
            <Button onClick={() => setActivePanel("guide")} className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">פירוט מבנים</Button>
            <input value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="Telegram Bot Token" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
            <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
          </div>
        </section>

        <nav className={`flex flex-wrap gap-2 rounded-3xl border p-3 ${theme.card}`}>
          {[["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedRows.length})`]].map(([key, label]) => <Button key={key} onClick={() => setActivePanel(key)} className={activePanel === key ? theme.accent : theme.navIdle}>{label}</Button>)}
        </nav>

        {activePanel === "main" && <section className={`rounded-3xl border p-3 ${theme.card}`}><div className="flex flex-wrap items-center gap-2">{[["ALL", "הכל"], ["READY_TO_TRADE", `READY TO TRADE (${readyToTradeCount})`], ["TRIGGERED", "מוכנות"], ["NEAR", "מתקרבות"], ["HIGH_RATING", "דירוג גבוה ⭐4+"]].map(([key, label]) => <Button key={key} onClick={() => setWatchFilter(key)} className={watchFilter === key ? theme.accent : theme.navIdle}>{label}</Button>)}<button onClick={() => setFocusMode(!focusMode)} className={`rounded-full px-3 py-2 text-xs font-black ${focusMode ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-300"}`}>🎯 מצב פוקוס</button></div></section>}

        {lastError && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{lastError}</div>}

        {activePanel === "main" && topPriorityRows.length > 0 && <section className={`rounded-3xl border p-5 ${theme.card}`}><div className="mb-4 flex items-center justify-between"><h2 className={`text-xl font-black ${theme.strong}`}>🔥 מנוע עדיפות — ההזדמנויות החשובות עכשיו</h2><span className={`text-sm ${theme.muted}`}>לפי Alert + Rating + AI + Setup</span></div><div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">{topPriorityRows.map((row) => { const p = priorityLabel(row.priority || 0); return <button key={row.ticker} onClick={() => setDrawerTicker(row.ticker)} className={`rounded-3xl border p-4 text-right ${theme.soft} ${theme.border}`}><div className="flex items-center justify-between gap-3"><span className={`text-xl font-black ${theme.strong}`}>{row.ticker}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${p.className}`}>{p.text}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><span className={theme.muted}>עדיפות:</span> <b>{row.priority}</b></div><div><span className={theme.muted}>אלרט:</span> <b>{row.alert.label}</b></div><div><span className={theme.muted}>סטאפ:</span> <b>{row.analysis.setup}</b></div><div><span className={theme.muted}>AI:</span> <b>{row.analysis.aiStatus}</b></div></div></button>; })}</div></section>}

        {activePanel === "guide" && <section className={`rounded-3xl border p-5 ${theme.card}`}><div className="mb-3 flex items-center justify-between gap-3"><h2 className={`text-xl font-black ${theme.accentText}`}>מדריך זיהוי Setup + Volume</h2><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">מצב</th><th className="p-3">מה לבדוק</th><th className="p-3">פירוש</th><th className="p-3">תוצאה</th><th className="p-3">עמדת טריידר</th><th className="p-3">מה לשים לב</th><th className="p-3">ממה להימנע</th></tr></thead><tbody>{playbook.map((item) => <tr key={item.mode} className={`border-b ${theme.row}`}><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(item.mode)}`}>{item.mode}</span></td><td className={`p-3 ${theme.strong}`}>{item.check}</td><td className={`p-3 ${theme.muted}`}>{item.result}</td><td className="p-3 font-bold text-yellow-300">{item.action}</td><td className="p-3 text-emerald-300">{item.traderPosition}</td><td className="p-3 text-cyan-300">{item.focus}</td><td className="p-3 text-red-300">{item.avoid}</td></tr>)}</tbody></table></div></section>}

        {activePanel === "archive" && <section className={`rounded-3xl border p-5 ${theme.card}`}><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className={`text-xl font-black ${theme.strong}`}>מסך ארכיון</h2><p className={`mt-1 text-sm ${theme.muted}`}>מניות שהועברו לארכיון.</p></div><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div>{archivedRows.length === 0 ? <div className={`rounded-2xl border p-4 text-sm ${theme.border} ${theme.soft} ${theme.muted}`}>אין כרגע מניות בארכיון.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">טיקר</th><th className="p-3">אלרט</th><th className="p-3">סטאפ</th><th className="p-3">AI</th><th className="p-3">סיבה</th><th className="p-3">פעולות</th></tr></thead><tbody>{archivedRows.map((row) => <tr key={row.ticker} className={`border-b ${theme.row}`}><td className={`p-3 font-black ${theme.strong}`}>{row.ticker}</td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(row.analysis.setup)}`}>{row.analysis.setup}</span></td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(row.analysis.aiStatus)}`}>{row.analysis.aiStatus}</span></td><td className={`p-3 ${theme.muted}`}>{row.archiveReason || "—"}</td><td className="p-3"><div className="flex gap-2"><Button onClick={() => restoreTicker(row.ticker)} className="border border-emerald-500/30 text-emerald-300">החזר</Button><Button onClick={() => removeTicker(row.ticker)} className="border border-red-500/30 text-red-300">מחק לצמיתות</Button></div></td></tr>)}</tbody></table></div>}</section>}

        {activePanel === "main" && <section className={`overflow-hidden rounded-3xl border ${theme.card}`}><div className="border-b border-slate-800/80 bg-[#07111f]/80 px-5 py-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><h2 className={`text-lg font-black ${theme.strong}`}>רשימת מעקב חכמה</h2><p className={`mt-1 text-xs ${theme.muted}`}>לחיצה על כל שורת מניה פותחת מגירה מתחת לשורה.</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">סה״כ: {visibleRows.length}</span><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">READY: {counts.READY}</span><span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-300">WATCH: {counts.WATCH}</span></div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1320px] border-collapse text-right text-xs xl:text-sm"><thead className={`${theme.head} sticky top-0 z-10 text-xs uppercase tracking-wider`}><tr><th className="p-4">טיקר</th><th className="p-4">מחיר</th><th className="p-4">1D%</th><th className="p-4">עדיפות</th><th className="p-4">דירוג</th><th className="p-4">מצב אלרט</th><th className="p-4">סטטוס שלך</th><th className="p-4">AI</th><th className="p-4">ציון</th><th className="p-4">סטאפ</th><th className="p-4">מבנה</th><th className="p-4">כניסה</th><th className="p-4">פסילה</th><th className="p-4">למה</th><th className="p-4">פעולות</th></tr></thead><tbody>{visibleRows.map((row) => { const a = row.analysis; const priority = priorityLabel(row.priority || 0); const isOpen = drawerTicker === row.ticker; return <React.Fragment key={row.ticker}><tr onClick={() => setDrawerTicker(isOpen ? "" : row.ticker)} className={`cursor-pointer border-t transition ${theme.row} ${isOpen ? "bg-slate-700/30 ring-1 ring-slate-500/40" : row.alert.state === "NEAR" ? "bg-yellow-500/10 ring-1 ring-yellow-500/40" : row.isReadyToTrade ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : row.alert.triggered ? "ring-1 ring-emerald-500/40" : ""}`}><td className="p-4"><div className="flex items-center gap-2"><span title={row.alert.label} className={`h-3 w-3 rounded-full ${row.alert.dot || "bg-slate-500"} ${row.alert.state === "NEAR" ? "animate-pulse scale-125" : ""}`} /><button onClick={(e) => { e.stopPropagation(); openChart(row.ticker); }} className={`font-black hover:underline ${theme.strong}`}>{row.ticker} ↗</button></div></td><td className="p-4 font-bold">{safeNum(a.price)}</td><td className={`p-4 font-bold ${Number(a.change1) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{safeNum(a.change1, 1)}%</td><td className="p-4"><span className={`rounded-lg px-2 py-1 text-xs font-black ${priority.className}`}>{row.priority}</span></td><td className="p-4"><select onClick={(e) => e.stopPropagation()} value={row.rating || 0} onChange={(e) => updateRow(row.ticker, { rating: Number(e.target.value) })} className={`rounded-lg border px-2 py-1 font-bold ${theme.input}`}><option value={0}>⭐</option><option value={1}>⭐ 1</option><option value={2}>⭐ 2</option><option value={3}>⭐ 3</option><option value={4}>⭐ 4</option><option value={5}>⭐ 5</option></select></td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td><td className="p-4"><select onClick={(e) => e.stopPropagation()} value={row.userStatus || "WATCH"} onChange={(e) => updateRow(row.ticker, { userStatus: e.target.value })} className={`rounded-lg border px-2 py-1 font-bold ${statusClass(row.userStatus || "WATCH")}`}><option value="READY">READY</option><option value="WATCH">WATCH</option><option value="AVOID">AVOID</option></select></td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></td><td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-cyan-300" style={{ width: `${a.score}%` }} /></div><b>{a.score}</b></div></td><td className="p-4"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(a.setup)}`}>{a.setup}</span></td><td className={`p-4 ${theme.strong}`}>{a.structure}</td><td className="p-4 font-bold text-emerald-300">{a.entryZone}</td><td className="p-4 font-bold text-red-300">{a.invalidation}</td><td className={`max-w-[300px] p-4 ${theme.muted}`}>{a.why}</td><td className="p-4"><div className="flex gap-2"><Button onClick={(e) => { e.stopPropagation(); setDrawerTicker(isOpen ? "" : row.ticker); }} className="border border-blue-500/30 text-blue-300">מגירה</Button><Button onClick={(e) => { e.stopPropagation(); setConfirmAiModal({ open: true, ticker: row.ticker }); }} className="border border-emerald-500/30 text-emerald-300">אשר</Button><Button onClick={(e) => { e.stopPropagation(); archiveTicker(row.ticker); }} className="border border-yellow-500/30 text-yellow-300">ארכיון</Button><Button onClick={(e) => { e.stopPropagation(); removeTicker(row.ticker); }} className="border border-red-500/30 text-red-300">מחק</Button></div></td></tr>{isOpen && <tr className={`border-t ${theme.drawer}`}><td colSpan={15} className="p-0"><div className={`border-t border-slate-700/60 px-5 py-5 ${theme.drawerInner}`}><div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-3"><span className="rounded-2xl border border-slate-600 bg-slate-900 px-4 py-2 text-2xl font-black text-white">{row.ticker}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${priority.className}`}>{priority.text}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${row.alert.className}`}>{row.alert.label}</span></div><p className={`mt-2 text-xs ${theme.muted}`}>מגירת עבודה — תזה, אלרט, מבנה, אזור כניסה ופסילת טרייד.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => openChart(row.ticker)} className="border border-slate-500/40 bg-slate-800 text-slate-200">פתח גרף ↗</Button><Button onClick={() => setConfirmAiModal({ open: true, ticker: row.ticker })} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">אשר AI</Button><Button onClick={() => setDrawerTicker("")} className={theme.accent}>סגור</Button></div></div><div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_360px]"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs font-black ${theme.muted}`}>Priority</div><div className="mt-2 text-3xl font-black text-white">{row.priority}</div><div className={`mt-1 text-xs ${theme.muted}`}>מתוך 100</div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs font-black ${theme.muted}`}>AI Status</div><div className="mt-3"><span className={`rounded-xl border px-3 py-2 text-sm font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs font-black ${theme.muted}`}>Entry Zone</div><div className="mt-2 text-lg font-black text-emerald-300">{a.entryZone}</div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs font-black ${theme.muted}`}>Invalidation</div><div className="mt-2 text-lg font-black text-red-300">{a.invalidation}</div></div></div><div className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}><div className="mb-3 flex items-center justify-between"><h4 className={`text-base font-black ${theme.strong}`}>מבנה והחלטת טרייד</h4><span className={`rounded-xl border px-3 py-1 text-xs font-black ${setupClass(a.setup)}`}>{a.setup}</span></div><div className="grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className={`text-xs ${theme.muted}`}>Structure</div><div className="mt-2 text-sm font-bold text-slate-100">{a.structure}</div></div><div className="rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className={`text-xs ${theme.muted}`}>Why</div><div className="mt-2 text-sm text-slate-300">{a.why}</div></div><div className="rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className={`text-xs ${theme.muted}`}>Score</div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-cyan-300" style={{ width: `${a.score}%` }} /></div><b className="text-white">{a.score}</b></div></div></div></div><div className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}><h4 className={`mb-3 text-base font-black ${theme.strong}`}>תזה אישית</h4><div className="grid gap-3 lg:grid-cols-[180px_1fr]"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תאריך תזה</label><input type="date" value={row.thesisDate || today} onChange={(e) => updateRow(row.ticker, { thesisDate: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>כותרת קצרה</label><select value={row.thesisTitle || ""} onChange={(e) => updateRow(row.ticker, { thesisTitle: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="">בחר תבנית</option><option value="Spike + Wait Base">Spike + Wait Base</option><option value="Pullback Continuation">Pullback Continuation</option><option value="Base Before Breakout">Base Before Breakout</option><option value="Breakout Setup">Breakout Setup</option><option value="Range / Accumulation">Range / Accumulation</option><option value="Weak / Avoid">Weak / Avoid</option></select></div></div><div className="mt-3"><label className={`mb-2 block text-sm font-black ${theme.muted}`}>מה ראיתי / תוכנית פעולה</label><textarea value={row.thesis || ""} onChange={(e) => updateRow(row.ticker, { thesis: e.target.value })} placeholder="לדוגמה: מחכה לפריצה מעל אלרט, לא נכנס לפני base, פסילה מתחת לנר מבני." className={`min-h-[150px] w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div></div></div><div className="space-y-4"><div className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}><h4 className={`mb-3 text-base font-black ${theme.strong}`}>אלרט ובדיקה</h4><div className="space-y-3"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>Alert Price</label><input type="number" value={row.alertPrice || ""} onChange={(e) => updateRow(row.ticker, { alertPrice: e.target.value })} placeholder="לדוגמה 8.50" className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>סוג אלרט</label><select value={row.alertType || "above"} onChange={(e) => updateRow(row.ticker, { alertType: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="above">Above — מעל מחיר</option><option value="below">Below — מתחת מחיר</option></select></div><div className={`rounded-2xl border p-3 ${row.alert.className}`}><div className="text-xs font-black">מצב אלרט</div><div className="mt-1 text-lg font-black">{row.alert.label}</div></div><Button onClick={async () => { setLoading(true); setLastError(""); try { const updated = await loadTicker(row); setRows((prev) => prev.map((item) => item.ticker === row.ticker ? updated : item)); setLastRefreshTime(new Date().toLocaleTimeString()); } catch { setLastError("בדיקת מניה נכשלה. בדוק API Key / חיבור / טיקר."); } finally { setLoading(false); } }} className="w-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{loading ? "טוען..." : "טען מניה"}</Button></div></div><div className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}><h4 className={`mb-3 text-base font-black ${theme.strong}`}>ניהול מהיר</h4><div className="grid gap-2"><Button onClick={() => setConfirmAiModal({ open: true, ticker: row.ticker })} className="border border-emerald-500/30 text-emerald-300">אשר סטאפ AI</Button><Button onClick={() => archiveTicker(row.ticker)} className="border border-yellow-500/30 text-yellow-300">העבר לארכיון</Button><Button onClick={() => removeTicker(row.ticker)} className="border border-red-500/30 text-red-300">מחק מהרשימה</Button></div></div></div><div className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}><h4 className={`mb-3 text-base font-black ${theme.strong}`}>תמונת גרף</h4><input type="file" accept="image/*" onChange={(e) => handleImageUpload(row.ticker, e.target.files && e.target.files[0])} className={`w-full rounded-2xl border p-3 text-sm ${theme.input}`} />{row.chartImage ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-black"><img src={row.chartImage} alt={`chart-${row.ticker}`} className="max-h-[420px] w-full object-contain" /></div> : <div className={`mt-3 rounded-2xl border p-5 text-center text-sm ${theme.border} bg-black/20 ${theme.muted}`}>עדיין לא הועלתה תמונת גרף.</div>}</div></div></div></td></tr>}</React.Fragment>; })}</tbody></table></div></section>}

        <div className={`rounded-2xl border p-3 text-xs ${theme.card} ${theme.muted}`}>Smart Alert: אם המחיר עבר את היעד — השורה תעלה למעלה ותסומן. אם המחיר קרוב עד 3% — תקבל סימון קרוב.</div>
      </div>

      {confirmDeleteModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={`w-full max-w-md rounded-3xl border p-6 ${theme.card}`}><h3 className={`text-xl font-black ${theme.strong}`}>מחיקת מניה</h3><p className={`mt-2 text-sm ${theme.muted}`}>האם למחוק את {confirmDeleteModal.ticker} מהרשימה?</p><div className="mt-5 flex gap-3"><Button onClick={() => { setRows((prev) => prev.filter((row) => row.ticker !== confirmDeleteModal.ticker)); setConfirmDeleteModal({ open: false, ticker: null }); }} className="border border-red-500/30 bg-red-500/10 text-red-300">מחק</Button><Button onClick={() => setConfirmDeleteModal({ open: false, ticker: null })} className={theme.navIdle}>ביטול</Button></div></div></div>}
      {archiveModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={`w-full max-w-lg rounded-3xl border p-6 ${theme.card}`}><h3 className={`text-xl font-black ${theme.strong}`}>העבר לארכיון</h3><textarea value={archiveModal.reason} onChange={(e) => setArchiveModal((prev) => ({ ...prev, reason: e.target.value }))} placeholder="למה המניה עוברת לארכיון?" className={`mt-4 min-h-[120px] w-full rounded-2xl border p-3 ${theme.input}`} /><div className="mt-5 flex gap-3"><Button onClick={() => { setRows((prev) => prev.map((row) => row.ticker === archiveModal.ticker ? { ...row, archived: true, archiveReason: archiveModal.reason } : row)); setArchiveModal({ open: false, ticker: null, reason: "" }); }} className="border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">העבר</Button><Button onClick={() => setArchiveModal({ open: false, ticker: null, reason: "" })} className={theme.navIdle}>ביטול</Button></div></div></div>}
      {confirmAiModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={`w-full max-w-md rounded-3xl border p-6 ${theme.card}`}><h3 className={`text-xl font-black ${theme.strong}`}>אישור סטאפ AI</h3><p className={`mt-2 text-sm ${theme.muted}`}>לאשר את {confirmAiModal.ticker} כ־READY?</p><div className="mt-5 flex gap-3"><Button onClick={() => { setRows((prev) => prev.map((row) => row.ticker === confirmAiModal.ticker ? { ...row, analysis: { ...(row.analysis || emptyAnalysis()), aiStatus: "READY" } } : row)); setConfirmAiModal({ open: false, ticker: null }); }} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">אשר</Button><Button onClick={() => setConfirmAiModal({ open: false, ticker: null })} className={theme.navIdle}>ביטול</Button></div></div></div>}
    </div>
  );
}
