import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-watchlist-v1";
const THEME_KEY = "freedom-watchlist-theme";

const defaultRows = [
  {
    ticker: "NVAX",
    userStatus: "WATCH",
    rating: 0,
    alertPrice: "",
    alertType: "above",
    thesis: "",
    thesisDate: "",
    thesisTitle: "",
    chartImage: "",
    archived: false,
  },
  {
    ticker: "UUUU",
    userStatus: "WATCH",
    rating: 0,
    alertPrice: "",
    alertType: "above",
    thesis: "",
    thesisDate: "",
    thesisTitle: "",
    chartImage: "",
    archived: false,
  },
];

const themes = {
  black: {
    name: "שחור מקצועי",
    app: "bg-[#050816] text-slate-100",
    card: "bg-[#0B1220]/95 border-slate-800/80 shadow-2xl shadow-black/25",
    soft: "bg-[#111827]/80",
    input: "bg-[#050816] border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50",
    muted: "text-slate-400",
    strong: "text-white",
    head: "bg-[#111827] text-slate-400",
    row: "border-slate-800/80 hover:bg-slate-800/35",
    navIdle: "bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-700/80",
    accent: "bg-white text-slate-950 hover:bg-slate-200",
    accentText: "text-cyan-300",
    border: "border-slate-800/80",
  },
  gray: {
    name: "אפור",
    app: "bg-zinc-200 text-zinc-900",
    card: "bg-zinc-100 border-zinc-300",
    soft: "bg-zinc-200",
    input: "bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-500",
    muted: "text-zinc-600",
    strong: "text-zinc-950",
    head: "bg-zinc-200 text-zinc-600",
    row: "border-zinc-300 hover:bg-zinc-200",
    navIdle: "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 border border-zinc-300",
    accent: "bg-zinc-800 text-white",
    accentText: "text-zinc-800",
    border: "border-zinc-300",
  },
  brown: {
    name: "חום",
    app: "bg-stone-950 text-stone-100",
    card: "bg-stone-900 border-amber-900/50",
    soft: "bg-stone-800",
    input: "bg-stone-950 border-amber-900/50 text-stone-100 placeholder:text-stone-500",
    muted: "text-stone-400",
    strong: "text-stone-50",
    head: "bg-stone-950 text-stone-400",
    row: "border-amber-900/30 hover:bg-stone-800/70",
    navIdle: "bg-stone-950 text-stone-300 hover:bg-stone-800 border border-amber-900/50",
    accent: "bg-amber-700 text-white",
    accentText: "text-amber-400",
    border: "border-amber-900/50",
  },
  white: {
    name: "לבן",
    app: "bg-[#f4f6f8] text-slate-900",
    card: "bg-white border-slate-200",
    soft: "bg-slate-50",
    input: "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400",
    muted: "text-slate-500",
    strong: "text-slate-950",
    head: "bg-slate-50 text-slate-500",
    row: "border-slate-200 hover:bg-slate-50",
    navIdle: "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200",
    accent: "bg-slate-900 text-white",
    accentText: "text-slate-700",
    border: "border-slate-200",
  },
};

const playbook = [
  { mode: "Spike", check: "ווליום חריג + נר חזק", result: "התחלת מהלך", action: "WATCH / READY אם יש המשכיות", traderPosition: "לא כניסה מיידית — סימון למעקב", focus: "לחכות ל־base קטן אחרי הספייק", avoid: "לא לרדוף אחרי גאפ פתיחה" },
  { mode: "Pullback", check: "ירידה במחיר + ירידה בווליום", result: "תיקון בריא", action: "READY", traderPosition: "עמדת כניסה אפשרית אחרי התייצבות", focus: "לחפש Higher Low / נר עצירה / טווח קטן", avoid: "לא לקנות אם התיקון נהיה חד" },
  { mode: "Breakdown", check: "ירידה במחיר + ווליום גבוה", result: "מוכרים שולטים", action: "AVOID", traderPosition: "אין כניסה — הגנה על הון", focus: "לבדוק אם נשבר range low או support", avoid: "להימנע עד reclaim ברור" },
  { mode: "Base", check: "טווח צר + ווליום יורד", result: "מתבשל מהלך", action: "WATCH", traderPosition: "עמדת המתנה — לפני טריגר", focus: "לסמן range high / range low", avoid: "להימנע אם הבסיס נשבר למטה" },
  { mode: "Breakout", check: "פריצה + ווליום עולה", result: "פריצה עם ביקוש", action: "READY", traderPosition: "כניסה רק אם יש אישור ולא גאפ פראי", focus: "לבדוק שהפריצה לא מתוחה מדי", avoid: "להימנע מפריצה בלי ווליום" },
];

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

function safeNum(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function analyzeAlert(row, price) {
  const target = Number(row.alertPrice);
  const current = Number(price);
  if (!target || !current) {
    return { state: "NO ALERT", triggered: false, label: "אין אלרט", dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" };
  }
  const type = row.alertType || "above";
  const triggered = type === "above" ? current >= target : current <= target;
  const distancePct = type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100;
  const absDistance = Math.abs(distancePct);
  if (triggered) return { state: "TRIGGERED", triggered: true, label: "מוכנה", dot: "bg-emerald-400", className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" };
  if (absDistance <= 3) return { state: "NEAR", triggered: false, label: `מתקרבת ${safeNum(absDistance, 1)}%`, dot: "bg-yellow-400", className: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30" };
  return { state: "WAIT", triggered: false, label: `ממתין ${safeNum(absDistance, 1)}%`, dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" };
}

function emptyAnalysis(why = "צריך לטעון דאטה חי") {
  return { setup: "Needs Data", structure: "אין מספיק נתונים לניתוח", volumeSignal: "Unknown", aiStatus: "WATCH", score: 0, entryZone: "—", invalidation: "—", why, price: null, change1: null };
}

function priorityScore(row) {
  const alertScore = row.alert.state === "NEAR" ? 40 : row.isReadyToTrade ? 38 : row.alert.state === "TRIGGERED" ? 30 : row.alert.state === "WAIT" ? 10 : 0;
  const ratingScore = (row.rating || 0) * 8;
  const aiScore = row.analysis.aiStatus === "READY" ? 20 : row.analysis.aiStatus === "WATCH" ? 10 : -15;
  const setupScore = row.analysis.setup === "Pullback" ? 15 : row.analysis.setup === "Breakout" ? 12 : row.analysis.setup === "Base" ? 8 : row.analysis.setup === "Spike" ? 5 : row.analysis.setup === "Breakdown" ? -25 : row.analysis.setup === "Live Quote" ? 5 : 0;
  const raw = alertScore + ratingScore + aiScore + setupScore + Math.round((row.analysis.score || 0) / 10);
  return Math.max(0, Math.min(raw, 100));
}

function priorityLabel(score) {
  if (score >= 80) return { text: "TOP PRIORITY", className: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" };
  if (score >= 60) return { text: "HIGH", className: "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30" };
  if (score >= 40) return { text: "MEDIUM", className: "bg-blue-500/20 text-blue-200 border border-blue-500/30" };
  return { text: "LOW", className: "bg-slate-500/20 text-slate-300 border border-slate-500/30" };
}

export default function WatchListDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultRows;
    try { return JSON.parse(saved); } catch { return defaultRows; }
  });
  const [newTicker, setNewTicker] = useState("");
  const viteFinnhubKey = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_FINNHUB_API_KEY : "";
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("finnhub-key") || viteFinnhubKey || "");
  const [themeName, setThemeName] = useState(() => localStorage.getItem(THEME_KEY) || "black");
  const [activePanel, setActivePanel] = useState("main");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [drawerTicker, setDrawerTicker] = useState("");
  const [watchFilter, setWatchFilter] = useState("ALL");
  const [focusMode, setFocusMode] = useState(false);
  const [buttonStyle, setButtonStyle] = useState("rounded-xl");
  const [buttonSize, setButtonSize] = useState("md");
  const [buttonShadow, setButtonShadow] = useState("normal");
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ open: false, ticker: null });
  const [archiveModal, setArchiveModal] = useState({ open: false, ticker: null, reason: "" });
  const [confirmAiModal, setConfirmAiModal] = useState({ open: false, ticker: null });
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem("telegram-bot-token") || "");
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem("telegram-chat-id") || "");
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [apiConnected, setApiConnected] = useState(Boolean(apiKey));

  const today = new Date().toISOString().slice(0, 10);
  const theme = themes[themeName] || themes.black;
  const sizeClass = buttonSize === "sm" ? "px-2 py-1 text-xs" : buttonSize === "lg" ? "px-6 py-4 text-base" : "px-4 py-2 text-sm";
  const shadowClass = buttonShadow === "strong" ? "shadow-xl" : buttonShadow === "none" ? "" : "shadow";
  const buttonDepth = buttonStyle === "btn-3d" ? `rounded-xl shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[3px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] transition-all ${sizeClass}` : `${buttonStyle} ${sizeClass} ${shadowClass}`;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);
  useEffect(() => { localStorage.setItem("finnhub-key", apiKey || ""); }, [apiKey]);
  useEffect(() => { localStorage.setItem(THEME_KEY, themeName); }, [themeName]);
  useEffect(() => { localStorage.setItem("telegram-bot-token", telegramBotToken || ""); }, [telegramBotToken]);
  useEffect(() => { localStorage.setItem("telegram-chat-id", telegramChatId || ""); }, [telegramChatId]);

  const analyzedRows = useMemo(() => rows.filter(row => !row.archived).map(row => {
    const analysis = row.analysis || emptyAnalysis();
    const alert = analyzeAlert(row, analysis.price);
    const isReadyToTrade = alert.triggered && (row.rating || 0) >= 3 && analysis.aiStatus === "READY";
    const enriched = { ...row, analysis, alert, isReadyToTrade };
    return { ...enriched, priority: priorityScore(enriched) };
  }).sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    const flowRank = row => row.alert.state === "NEAR" ? 4 : row.isReadyToTrade ? 3 : row.alert.state === "TRIGGERED" ? 2 : 1;
    const flowDiff = flowRank(b) - flowRank(a);
    if (flowDiff !== 0) return flowDiff;
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    const statusRank = { READY: 3, WATCH: 2, AVOID: 1 };
    return (statusRank[b.analysis.aiStatus] || 0) - (statusRank[a.analysis.aiStatus] || 0);
  }), [rows]);

  const archivedRows = useMemo(() => rows.filter(row => row.archived).map(row => {
    const analysis = row.analysis || emptyAnalysis();
    return { ...row, analysis, alert: analyzeAlert(row, analysis.price) };
  }), [rows]);

  const visibleRows = useMemo(() => {
    let filtered = analyzedRows;
    if (watchFilter === "READY_TO_TRADE") filtered = filtered.filter(r => r.isReadyToTrade);
    if (watchFilter === "NEAR") filtered = filtered.filter(r => r.alert.state === "NEAR");
    if (watchFilter === "TRIGGERED") filtered = filtered.filter(r => r.alert.state === "TRIGGERED");
    if (watchFilter === "HIGH_RATING") filtered = filtered.filter(r => (r.rating || 0) >= 4);
    if (focusMode) filtered = filtered.filter(r => r.isReadyToTrade || r.alert.state === "NEAR");
    return filtered;
  }, [analyzedRows, watchFilter, focusMode]);

  const selectedRow = analyzedRows.find(row => row.ticker === drawerTicker);
  const counts = analyzedRows.reduce((acc, row) => { acc[row.userStatus || "WATCH"] += 1; return acc; }, { READY: 0, WATCH: 0, AVOID: 0 });
  const readyToTradeCount = analyzedRows.filter(r => r.isReadyToTrade).length;
  const topPriorityRows = analyzedRows.slice(0, 3);

  const updateRow = (ticker, patch) => setRows(prev => prev.map(row => row.ticker === ticker ? { ...row, ...patch } : row));

  const addTicker = () => {
    const ticker = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!ticker) { setLastError("תכניס טיקר תקין לפני הוספה"); return; }
    setRows(prev => {
      const existing = prev.find(row => row.ticker === ticker);
      if (existing) return prev.map(row => row.ticker === ticker ? { ...row, archived: false } : row);
      return [...prev, { ticker, rating: 0, alertPrice: "", alertType: "above", userStatus: "WATCH", thesis: "", thesisDate: today, thesisTitle: "", chartImage: "", archived: false, analysis: emptyAnalysis() }];
    });
    setNewTicker("");
    setLastError("");
    setActivePanel("main");
  };

  const removeTicker = ticker => setConfirmDeleteModal({ open: true, ticker });
  const archiveTicker = ticker => setArchiveModal({ open: true, ticker, reason: "" });
  const restoreTicker = ticker => setRows(prev => prev.map(row => row.ticker === ticker ? { ...row, archived: false } : row));
  const openChart = ticker => window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank");
  const stop = fn => e => { e.stopPropagation(); fn?.(e); };

  const handleImageUpload = (ticker, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => updateRow(ticker, { chartImage: event.target.result });
    reader.readAsDataURL(file);
  };

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
    analyzedRows.forEach(row => {
      if (row.alert.triggered && !row.alertNotified) {
        try { new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); } catch {}
        updateRow(row.ticker, { alertNotified: true });
        sendTelegramAlert(`🚨 ${row.ticker}\n${row.alert.label}\nSetup: ${row.analysis.setup}\nAI: ${row.analysis.aiStatus}\nPriority: ${row.priority}/100\nPrice: ${safeNum(row.analysis.price)}`);
      }
    });
  }, [analyzedRows]);

  const Button = ({ children, className = "", ...props }) => <button {...props} className={`${buttonDepth} font-black transition ${className}`}>{children}</button>;

  return (
    <div dir="rtl" className={`min-h-screen p-4 lg:p-6 ${theme.app}`}>
      <button onClick={() => setShowSettings(true)} className="fixed bottom-6 left-6 z-40 rounded-full border border-slate-700 bg-[#111827] px-4 py-2 text-sm font-black text-white shadow-xl hover:bg-slate-800">⚙️ הגדרות</button>

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
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Finnhub API Key" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
            <div className="flex gap-2">
              <input value={newTicker} onChange={e => setNewTicker(e.target.value)} onKeyDown={e => e.key === "Enter" && addTicker()} placeholder="הוסף טיקר" className={`w-full rounded-2xl border px-4 py-3 text-sm uppercase outline-none ${theme.input}`} />
              <Button onClick={addTicker} className={theme.accent}>הוסף</Button>
            </div>
            <Button onClick={loadAllLive} disabled={loading} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 disabled:opacity-50">{loading ? "טוען..." : "טען דאטה חי"}</Button>
            <Button onClick={() => setActivePanel("guide")} className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">פירוט מבנים</Button>
            <input value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} placeholder="Telegram Bot Token" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
            <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
          </div>
        </section>

        <nav className={`flex flex-wrap gap-2 rounded-3xl border p-3 ${theme.card}`}>
          {[["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedRows.length})`]].map(([key, label]) => <Button key={key} onClick={() => setActivePanel(key)} className={activePanel === key ? theme.accent : theme.navIdle}>{label}</Button>)}
        </nav>

        {activePanel === "main" && (
          <section className={`rounded-3xl border p-3 ${theme.card}`}>
            <div className="flex flex-wrap items-center gap-2">
              {[["ALL", "הכל"], ["READY_TO_TRADE", `READY TO TRADE (${readyToTradeCount})`], ["TRIGGERED", "מוכנות"], ["NEAR", "מתקרבות"], ["HIGH_RATING", "דירוג גבוה ⭐4+"]].map(([key, label]) => <Button key={key} onClick={() => setWatchFilter(key)} className={watchFilter === key ? theme.accent : theme.navIdle}>{label}</Button>)}
              <button onClick={() => setFocusMode(!focusMode)} className={`rounded-full px-3 py-2 text-xs font-black ${focusMode ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-300"}`}>🎯 מצב פוקוס</button>
            </div>
          </section>
        )}

        {lastError && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{lastError}</div>}

        {activePanel === "main" && topPriorityRows.length > 0 && (
          <section className={`rounded-3xl border p-5 ${theme.card}`}>
            <div className="mb-4 flex items-center justify-between"><h2 className={`text-xl font-black ${theme.strong}`}>🔥 מנוע עדיפות — ההזדמנויות החשובות עכשיו</h2><span className={`text-sm ${theme.muted}`}>לפי Alert + Rating + AI + Setup</span></div>
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {topPriorityRows.map(row => {
                const p = priorityLabel(row.priority || 0);
                return <div key={row.ticker} className={`rounded-3xl border p-4 ${theme.soft} ${theme.border}`}>
                  <div className="flex items-center justify-between gap-3"><button onClick={() => setDrawerTicker(row.ticker)} className={`text-xl font-black hover:underline ${theme.strong}`}>{row.ticker}</button><span className={`rounded-full px-3 py-1 text-xs font-black ${p.className}`}>{p.text}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><span className={theme.muted}>עדיפות:</span> <b>{row.priority}</b></div><div><span className={theme.muted}>אלרט:</span> <b>{row.alert.label}</b></div><div><span className={theme.muted}>סטאפ:</span> <b>{row.analysis.setup}</b></div><div><span className={theme.muted}>AI:</span> <b>{row.analysis.aiStatus}</b></div></div>
                  <p className={`mt-3 text-xs ${theme.muted}`}>{row.analysis.why}</p>
                </div>;
              })}
            </div>
          </section>
        )}

        {activePanel === "guide" && (
          <section className={`rounded-3xl border p-5 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className={`text-xl font-black ${theme.accentText}`}>מדריך זיהוי Setup + Volume</h2><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">מצב</th><th className="p-3">מה לבדוק</th><th className="p-3">פירוש</th><th className="p-3">תוצאה</th><th className="p-3">עמדת טריידר</th><th className="p-3">מה לשים לב</th><th className="p-3">ממה להימנע</th></tr></thead><tbody>{playbook.map(item => <tr key={item.mode} className={`border-b ${theme.row}`}><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(item.mode)}`}>{item.mode}</span></td><td className={`p-3 ${theme.strong}`}>{item.check}</td><td className={`p-3 ${theme.muted}`}>{item.result}</td><td className="p-3 font-bold text-yellow-300">{item.action}</td><td className="p-3 text-emerald-300">{item.traderPosition}</td><td className="p-3 text-cyan-300">{item.focus}</td><td className="p-3 text-red-300">{item.avoid}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {activePanel === "archive" && (
          <section className={`rounded-3xl border p-5 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className={`text-xl font-black ${theme.strong}`}>מסך ארכיון</h2><p className={`mt-1 text-sm ${theme.muted}`}>מניות שהועברו לארכיון.</p></div><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div>
            {archivedRows.length === 0 ? <div className={`rounded-2xl border p-4 text-sm ${theme.border} ${theme.soft} ${theme.muted}`}>אין כרגע מניות בארכיון.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">טיקר</th><th className="p-3">אלרט</th><th className="p-3">סטאפ</th><th className="p-3">AI</th><th className="p-3">סיבה</th><th className="p-3">פעולות</th></tr></thead><tbody>{archivedRows.map(row => <tr key={row.ticker} className={`border-b ${theme.row}`}><td className={`p-3 font-black ${theme.strong}`}>{row.ticker}</td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(row.analysis.setup)}`}>{row.analysis.setup}</span></td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(row.analysis.aiStatus)}`}>{row.analysis.aiStatus}</span></td><td className={`p-3 ${theme.muted}`}>{row.archiveReason || "—"}</td><td className="p-3"><div className="flex gap-2"><Button onClick={() => restoreTicker(row.ticker)} className="border border-emerald-500/30 text-emerald-300">החזר</Button><Button onClick={() => removeTicker(row.ticker)} className="border border-red-500/30 text-red-300">מחק לצמיתות</Button></div></td></tr>)}</tbody></table></div>}
          </section>
        )}

        {activePanel === "main" && (
          <section className={`overflow-hidden rounded-3xl border ${theme.card}`}>
            <div className="border-b border-slate-800/80 bg-[#07111f]/80 px-5 py-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><h2 className={`text-lg font-black ${theme.strong}`}>רשימת מעקב חכמה</h2><p className={`mt-1 text-xs ${theme.muted}`}>לחיצה על כל שורת מניה פותחת מגירה מתחת לשורה.</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">סה״כ: {visibleRows.length}</span><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">READY: {counts.READY}</span><span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-300">WATCH: {counts.WATCH}</span></div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] border-collapse text-right text-xs xl:text-sm">
                <thead className={`${theme.head} sticky top-0 z-10 text-xs uppercase tracking-wider`}><tr><th className="p-4">טיקר</th><th className="p-4">מחיר</th><th className="p-4">1D%</th><th className="p-4">עדיפות</th><th className="p-4">דירוג</th><th className="p-4">מצב אלרט</th><th className="p-4">סטטוס שלך</th><th className="p-4">AI</th><th className="p-4">ציון</th><th className="p-4">סטאפ</th><th className="p-4">מבנה</th><th className="p-4">כניסה</th><th className="p-4">פסילה</th><th className="p-4">למה</th><th className="p-4">פעולות</th></tr></thead>
                <tbody>
                  {visibleRows.map(row => {
                    const a = row.analysis;
                    const priority = priorityLabel(row.priority || 0);
                    const isOpen = drawerTicker === row.ticker;
                    return (
                      <React.Fragment key={row.ticker}>
                        <tr onClick={() => setDrawerTicker(isOpen ? "" : row.ticker)} className={`cursor-pointer border-t transition ${theme.row} ${isOpen ? "bg-cyan-500/10 ring-1 ring-cyan-500/30" : row.alert.state === "NEAR" ? "bg-yellow-500/10 ring-1 ring-yellow-500/40" : row.isReadyToTrade ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : row.alert.triggered ? "ring-1 ring-emerald-500/40" : ""}`}>
                          <td className="p-4"><div className="flex items-center gap-2"><span title={row.alert.label} className={`h-3 w-3 rounded-full ${row.alert.dot || "bg-slate-500"} ${row.alert.state === "NEAR" ? "animate-pulse scale-125" : ""}`} /><button onClick={stop(() => openChart(row.ticker))} className={`font-black hover:underline ${theme.strong}`}>{row.ticker} ↗</button></div></td>
                          <td className="p-4 font-bold">{safeNum(a.price)}</td>
                          <td className={`p-4 font-bold ${Number(a.change1) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{safeNum(a.change1, 1)}%</td>
                          <td className="p-4"><span className={`rounded-lg px-2 py-1 text-xs font-black ${priority.className}`}>{row.priority}</span></td>
                          <td className="p-4"><select onClick={e => e.stopPropagation()} value={row.rating || 0} onChange={e => updateRow(row.ticker, { rating: Number(e.target.value) })} className={`rounded-lg border px-2 py-1 font-bold ${theme.input}`}><option value={0}>⭐</option><option value={1}>⭐ 1</option><option value={2}>⭐ 2</option><option value={3}>⭐ 3</option><option value={4}>⭐ 4</option><option value={5}>⭐ 5</option></select></td>
                          <td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td>
                          <td className="p-4"><select onClick={e => e.stopPropagation()} value={row.userStatus || "WATCH"} onChange={e => updateRow(row.ticker, { userStatus: e.target.value })} className={`rounded-lg border px-2 py-1 font-bold ${statusClass(row.userStatus || "WATCH")}`}><option value="READY">READY</option><option value="WATCH">WATCH</option><option value="AVOID">AVOID</option></select></td>
                          <td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></td>
                          <td className="p-4"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-cyan-300" style={{ width: `${a.score}%` }} /></div><b>{a.score}</b></div></td>
                          <td className="p-4"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(a.setup)}`}>{a.setup}</span></td>
                          <td className={`p-4 ${theme.strong}`}>{a.structure}</td>
                          <td className="p-4 font-bold text-emerald-300">{a.entryZone}</td>
                          <td className="p-4 font-bold text-red-300">{a.invalidation}</td>
                          <td className={`max-w-[300px] p-4 ${theme.muted}`}>{a.why}</td>
                          <td className="p-4"><div className="flex gap-2"><Button onClick={stop(() => setDrawerTicker(isOpen ? "" : row.ticker))} className="border border-blue-500/30 text-blue-300">מגירה</Button><Button onClick={stop(() => setConfirmAiModal({ open: true, ticker: row.ticker }))} className="border border-emerald-500/30 text-emerald-300">אשר</Button><Button onClick={stop(() => archiveTicker(row.ticker))} className="border border-yellow-500/30 text-yellow-300">ארכיון</Button><Button onClick={stop(() => removeTicker(row.ticker))} className="border border-red-500/30 text-red-300">מחק</Button></div></td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-cyan-500/20 bg-[#07111f]/80">
                            <td colSpan={15} className="p-5">
                              <div className="mb-4 flex items-center justify-between"><div><h3 className={`text-xl font-black ${theme.strong}`}>מגירה — {row.ticker}</h3><p className={`mt-1 text-xs ${theme.muted}`}>תזה אישית, אלרט, סטאפ ותמונת גרף.</p></div><Button onClick={() => setDrawerTicker("")} className={theme.accent}>סגור</Button></div>
                              <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                                <div className="space-y-4">
                                  <div className="grid gap-3 lg:grid-cols-4"><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs ${theme.muted}`}>Priority</div><div className="mt-1 text-2xl font-black">{row.priority}/100</div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs ${theme.muted}`}>Alert</div><div className="mt-1 font-black">{row.alert.label}</div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs ${theme.muted}`}>Entry</div><div className="mt-1 font-black text-emerald-300">{a.entryZone}</div></div><div className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}><div className={`text-xs ${theme.muted}`}>Invalidation</div><div className="mt-1 font-black text-red-300">{a.invalidation}</div></div></div>
                                  <div className="grid gap-3 lg:grid-cols-[180px_1fr_160px]"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>Alert Price</label><input onClick={e => e.stopPropagation()} type="number" value={row.alertPrice || ""} onChange={e => updateRow(row.ticker, { alertPrice: e.target.value })} placeholder="לדוגמה 8.50" className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>סוג אלרט</label><select onClick={e => e.stopPropagation()} value={row.alertType || "above"} onChange={e => updateRow(row.ticker, { alertType: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="above">Above — מעל מחיר</option><option value="below">Below — מתחת מחיר</option></select></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>בדיקה</label><Button onClick={async () => { setLoading(true); setLastError(""); try { const updated = await loadTicker(row); setRows(prev => prev.map(item => item.ticker === row.ticker ? updated : item)); setLastRefreshTime(new Date().toLocaleTimeString()); } catch { setLastError("בדיקת מניה נכשלה. בדוק API Key / חיבור / טיקר."); } finally { setLoading(false); } }} className="w-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{loading ? "טוען..." : "טען מניה"}</Button></div></div>
                                  <div className="grid gap-3 lg:grid-cols-[180px_1fr]"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תאריך תזה</label><input type="date" value={row.thesisDate || today} onChange={e => updateRow(row.ticker, { thesisDate: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>כותרת קצרה</label><select value={row.thesisTitle || ""} onChange={e => updateRow(row.ticker, { thesisTitle: e.target.value })} className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="">בחר תבנית</option><option value="Spike + Wait Base">Spike + Wait Base</option><option value="Pullback Continuation">Pullback Continuation</option><option value="Base Before Breakout">Base Before Breakout</option><option value="Breakout Setup">Breakout Setup</option><option value="Range / Accumulation">Range / Accumulation</option><option value="Weak / Avoid">Weak / Avoid</option></select></div></div>
                                  <div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תזה / מה ראיתי</label><textarea value={row.thesis || ""} onChange={e => updateRow(row.ticker, { thesis: e.target.value })} placeholder="לדוגמה: מחכה לפריצה מעל אלרט, לא נכנס לפני base." className={`min-h-[150px] w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div>
                                </div>
                                <div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תמונת גרף</label><input type="file" accept="image/*" onChange={e => handleImageUpload(row.ticker, e.target.files && e.target.files[0])} className={`w-full rounded-2xl border p-3 text-sm ${theme.input}`} />{row.chartImage ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-black"><img src={row.chartImage} alt={`chart-${row.ticker}`} className="max-h-[300px] w-full object-contain" /></div> : <div className={`mt-3 rounded-2xl border p-4 text-sm ${theme.border} ${theme.soft} ${theme.muted}`}>עדיין לא הועלתה תמונת גרף.</div>}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className={`rounded-2xl border p-3 text-xs ${theme.card} ${theme.muted}`}>Smart Alert: אם המחיר עבר את היעד — השורה תעלה למעלה ותסומן. אם המחיר קרוב עד 3% — תקבל סימון קרוב.</div>
      </div>

      {showSettings && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setShowSettings(false)}><section className={`w-full max-w-6xl rounded-3xl border p-5 ${theme.card}`} onClick={event => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><h3 className={`text-xl font-black ${theme.strong}`}>⚙️ הגדרות עיצוב</h3><p className={`mt-1 text-sm ${theme.muted}`}>שינוי כפתורים, צל, צורה ורקע.</p></div><button onClick={() => setShowSettings(false)} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">סגור</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3"><div className={`mb-2 text-xs font-black ${theme.muted}`}>גודל כפתורים</div><div className="grid grid-cols-3 gap-2">{[["sm", "קטן"], ["md", "רגיל"], ["lg", "גדול"]].map(([value, label]) => <button key={value} onClick={() => setButtonSize(value)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonSize === value ? "bg-white text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{label}</button>)}</div></div><div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3"><div className={`mb-2 text-xs font-black ${theme.muted}`}>עומק / צל</div><div className="grid grid-cols-3 gap-2">{[["none", "שטוח"], ["normal", "עדין"], ["strong", "חזק"]].map(([value, label]) => <button key={value} onClick={() => setButtonShadow(value)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonShadow === value ? "bg-white text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{label}</button>)}</div></div><div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3"><div className={`mb-2 text-xs font-black ${theme.muted}`}>צורת כפתור</div><div className="grid grid-cols-2 gap-2">{[["rounded-xl", "מעוגל"], ["rounded-full", "עגול"], ["rounded-none", "חד"], ["btn-3d", "תלת ממד"]].map(([value, label]) => <button key={value} onClick={() => setButtonStyle(value)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonStyle === value ? "bg-white text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{label}</button>)}</div></div><div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3"><div className={`mb-2 text-xs font-black ${theme.muted}`}>רקע</div><div className="grid grid-cols-2 gap-2">{Object.entries(themes).map(([key, item]) => <button key={key} onClick={() => setThemeName(key)} className={`rounded-full px-3 py-2 text-xs font-black transition ${themeName === key ? "bg-white text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{item.name}</button>)}</div></div></div></section></div>}

      {confirmAiModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className={`w-[420px] rounded-3xl border p-5 ${theme.card}`}><h3 className={`text-lg font-black ${theme.strong}`}>אישור אימוץ סטאפ</h3><p className={`mt-1 text-sm ${theme.muted}`}>האם אתה מאמץ את הסטאפ של ה-AI עבור {confirmAiModal.ticker}?</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmAiModal({ open: false, ticker: null })} className="rounded-xl border border-slate-700 px-3 py-2 text-sm">בטל</button><button onClick={() => { setRows(prev => prev.map(row => row.ticker === confirmAiModal.ticker ? { ...row, userStatus: row.analysis?.aiStatus || "WATCH" } : row)); setConfirmAiModal({ open: false, ticker: null }); }} className="rounded-xl border border-emerald-500/30 px-3 py-2 text-sm font-bold text-emerald-300">כן, מאשר</button></div></div></div>}

      {confirmDeleteModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className={`w-[420px] rounded-3xl border p-5 ${theme.card}`}><h3 className={`text-lg font-black ${theme.strong}`}>מחיקה לצמיתות</h3><p className={`mt-1 text-sm ${theme.muted}`}>המניה תימחק לצמיתות — אתה בטוח?</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmDeleteModal({ open: false, ticker: null })} className="rounded-xl border border-slate-700 px-3 py-2 text-sm">בטל</button><button onClick={() => { setRows(prev => prev.filter(row => row.ticker !== confirmDeleteModal.ticker)); setConfirmDeleteModal({ open: false, ticker: null }); }} className="rounded-xl border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300">כן, מחק</button></div></div></div>}

      {archiveModal.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className={`w-[420px] rounded-3xl border p-5 ${theme.card}`}><h3 className={`text-lg font-black ${theme.strong}`}>העברה לארכיון</h3><p className={`mt-1 text-sm ${theme.muted}`}>למה אתה מעביר את {archiveModal.ticker} לארכיון?</p><textarea value={archiveModal.reason} onChange={e => setArchiveModal(prev => ({ ...prev, reason: e.target.value }))} placeholder="לא חובה אבל מומלץ" className={`mt-3 w-full rounded-2xl border p-3 text-sm ${theme.input}`} /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setArchiveModal({ open: false, ticker: null, reason: "" })} className="rounded-xl border border-slate-700 px-3 py-2 text-sm">בטל</button><button onClick={() => { setRows(prev => prev.map(row => row.ticker === archiveModal.ticker ? { ...row, archived: true, archiveReason: archiveModal.reason || "" } : row)); setArchiveModal({ open: false, ticker: null, reason: "" }); }} className="rounded-xl border border-yellow-500/30 px-3 py-2 text-sm font-bold text-yellow-300">אשר ארכיון</button></div></div></div>}
    </div>
  );
}
