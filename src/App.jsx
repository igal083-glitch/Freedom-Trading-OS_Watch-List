import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "watchlist-v8-clean-sidebar";
const THEME_KEY = "watchlist-theme";

const defaultRows = [
  { ticker: "NVAX", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "" },
  { ticker: "UUUU", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "" }
];

const themes = {
  black: { name: "שחור", app: "bg-[#050505] text-zinc-100", card: "bg-zinc-950 border-zinc-800", soft: "bg-zinc-900", input: "bg-black border-zinc-700 text-zinc-100", muted: "text-zinc-400", strong: "text-white", head: "bg-black text-zinc-500", row: "border-zinc-800 hover:bg-zinc-900/70", navIdle: "bg-black text-zinc-300 hover:bg-zinc-900", accent: "bg-yellow-500 text-black", accentText: "text-yellow-400", border: "border-zinc-800" },
  gray: { name: "אפור", app: "bg-zinc-200 text-zinc-900", card: "bg-zinc-100 border-zinc-300", soft: "bg-zinc-200", input: "bg-white border-zinc-300 text-zinc-900", muted: "text-zinc-600", strong: "text-zinc-950", head: "bg-zinc-200 text-zinc-600", row: "border-zinc-300 hover:bg-zinc-200", navIdle: "bg-zinc-200 text-zinc-700 hover:bg-zinc-300", accent: "bg-zinc-800 text-white", accentText: "text-zinc-800", border: "border-zinc-300" },
  brown: { name: "חום", app: "bg-stone-950 text-stone-100", card: "bg-stone-900 border-amber-900/50", soft: "bg-stone-800", input: "bg-stone-950 border-amber-900/50 text-stone-100", muted: "text-stone-400", strong: "text-stone-50", head: "bg-stone-950 text-stone-400", row: "border-amber-900/30 hover:bg-stone-800/70", navIdle: "bg-stone-950 text-stone-300 hover:bg-stone-800", accent: "bg-amber-700 text-white", accentText: "text-amber-400", border: "border-amber-900/50" },
  white: { name: "לבן", app: "bg-[#f4f6f8] text-slate-900", card: "bg-white border-slate-200", soft: "bg-slate-50", input: "bg-white border-slate-300 text-slate-900", muted: "text-slate-500", strong: "text-slate-950", head: "bg-slate-50 text-slate-500", row: "border-slate-200 hover:bg-slate-50", navIdle: "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200", accent: "bg-slate-900 text-white", accentText: "text-slate-700", border: "border-slate-200" }
};

const playbook = [
  { mode: "Spike", check: "ווליום חריג + נר חזק", result: "התחלת מהלך", action: "WATCH / READY אם יש המשכיות", traderPosition: "לא כניסה מיידית — סימון למעקב", focus: "לחכות ל־base קטן אחרי הספייק", avoid: "לא לרדוף אחרי גאפ פתיחה" },
  { mode: "Pullback", check: "ירידה במחיר + ירידה בווליום", result: "תיקון בריא", action: "READY", traderPosition: "עמדת כניסה אפשרית אחרי התייצבות", focus: "לחפש Higher Low / נר עצירה / טווח קטן", avoid: "לא לקנות אם התיקון נהיה חד" },
  { mode: "Breakdown", check: "ירידה במחיר + ווליום גבוה", result: "מוכרים שולטים", action: "AVOID", traderPosition: "אין כניסה — הגנה על הון", focus: "לבדוק אם נשבר range low או support", avoid: "להימנע עד reclaim ברור" },
  { mode: "Base", check: "טווח צר + ווליום יורד", result: "מתבשל מהלך", action: "WATCH", traderPosition: "עמדת המתנה — לפני טריגר", focus: "לסמן range high / range low", avoid: "להימנע אם הבסיס נשבר למטה" },
  { mode: "Breakout", check: "פריצה + ווליום עולה", result: "פריצה עם ביקוש", action: "READY", traderPosition: "כניסה רק אם יש אישור ולא גאפ פראי", focus: "לבדוק שהפריצה לא מתוחה מדי", avoid: "להימנע מפריצה בלי ווליום" }
];

function statusClass(status) {
  if (status === "READY") return "text-emerald-700 bg-emerald-50 border-emerald-300";
  if (status === "AVOID") return "text-red-700 bg-red-50 border-red-300";
  return "text-yellow-700 bg-yellow-50 border-yellow-300";
}

function setupClass(setup) {
  if (setup === "Spike") return "text-purple-700 bg-purple-50 border-purple-300";
  if (setup === "Pullback") return "text-emerald-700 bg-emerald-50 border-emerald-300";
  if (setup === "Breakdown") return "text-red-700 bg-red-50 border-red-300";
  if (setup === "Base") return "text-blue-700 bg-blue-50 border-blue-300";
  if (setup === "Breakout") return "text-orange-700 bg-orange-50 border-orange-300";
  return "text-zinc-700 bg-zinc-100 border-zinc-300";
}

function safeNum(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function median(values) {
  const clean = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!clean.length) return 0;
  return clean[Math.floor(clean.length / 2)];
}

function analyzeAlert(row, price) {
  const target = Number(row.alertPrice);
  const current = Number(price);
  if (!target || !current) return { state: "NO ALERT", triggered: false, label: "אין אלרט", dot: "bg-zinc-300", className: "text-zinc-600 bg-zinc-100 border-zinc-300" };
  const type = row.alertType || "above";
  const triggered = type === "above" ? current >= target : current <= target;
  const distancePct = type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100;
  const absDistance = Math.abs(distancePct);
  if (triggered) return { state: "TRIGGERED", triggered: true, label: "מוכנה", dot: "bg-emerald-500", className: "text-emerald-800 bg-emerald-100 border-emerald-400" };
  if (absDistance <= 3) return { state: "NEAR", triggered: false, label: `מתקרבת ${safeNum(absDistance, 1)}%`, dot: "bg-yellow-400", className: "text-yellow-800 bg-yellow-100 border-yellow-400" };
  return { state: "WAIT", triggered: false, label: `ממתין ${safeNum(absDistance, 1)}%`, dot: "bg-zinc-400", className: "text-zinc-700 bg-zinc-100 border-zinc-300" };
}

function priorityScore(row) {
  const alertScore = row.alert.state === "NEAR" ? 40 : row.isReadyToTrade ? 38 : row.alert.state === "TRIGGERED" ? 30 : row.alert.state === "WAIT" ? 10 : 0;
  const ratingScore = (row.rating || 0) * 8;
  const aiScore = row.analysis.aiStatus === "READY" ? 20 : row.analysis.aiStatus === "WATCH" ? 10 : -15;
  const setupScore = row.analysis.setup === "Pullback" ? 15 : row.analysis.setup === "Breakout" ? 12 : row.analysis.setup === "Base" ? 8 : row.analysis.setup === "Spike" ? 5 : row.analysis.setup === "Breakdown" ? -25 : 0;
  const raw = alertScore + ratingScore + aiScore + setupScore + Math.round((row.analysis.score || 0) / 10);
  return Math.max(0, Math.min(raw, 100));
}

function priorityLabel(score) {
  if (score >= 80) return { text: "TOP PRIORITY", className: "bg-emerald-600 text-white" };
  if (score >= 60) return { text: "HIGH", className: "bg-yellow-500 text-black" };
  if (score >= 40) return { text: "MEDIUM", className: "bg-blue-500 text-white" };
  return { text: "LOW", className: "bg-zinc-300 text-zinc-800" };
}

function analyzeCandles(candles = []) {
  if (!Array.isArray(candles) || candles.length < 15) {
    return { setup: "Needs Data", structure: "אין מספיק נרות לניתוח", volumeSignal: "Unknown", aiStatus: "WATCH", score: 0, entryZone: "—", invalidation: "—", why: "צריך לטעון דאטה חי", price: null, change1: null };
  }
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const last10 = candles.slice(-10);
  const prev20 = candles.slice(-30, -10);
  const avgVol20 = prev20.reduce((s, c) => s + c.volume, 0) / Math.max(prev20.length, 1);
  const volRatio = avgVol20 ? last.volume / avgVol20 : 1;
  const recent20 = candles.slice(-20);
  const high20 = Math.max(...recent20.map(c => c.high));
  const low20 = Math.min(...recent20.map(c => c.low));
  const rangePct = ((high20 - low20) / Math.max(last.close, 0.01)) * 100;
  const change1 = ((last.close - prev.close) / Math.max(prev.close, 0.01)) * 100;
  const change5 = ((last.close - candles[candles.length - 6].close) / Math.max(candles[candles.length - 6].close, 0.01)) * 100;
  const downDays = last10.filter((c, i) => i > 0 && c.close < last10[i - 1].close);
  const downVolMedian = median(downDays.map(c => c.volume));
  const pullbackHealthy = change5 < 0 && downVolMedian < avgVol20 * 0.9;
  const breakdown = change1 < -3 && volRatio > 1.6;
  const spike = change1 > 8 && volRatio > 2;
  const breakout = last.close >= high20 * 0.98 && change1 > 2 && volRatio > 1.3;
  const base = rangePct < 18 && volRatio < 1.1;

  let setup = "Base", aiStatus = "WATCH", score = 45, volumeSignal = "Volume Neutral", why = "טווח מעקב — צריך טריגר ברור";
  if (spike) { setup = "Spike"; aiStatus = "WATCH"; score = 62; volumeSignal = "Volume Spike"; why = "ווליום חריג + תנועה חדה. לא לרדוף, לחכות לבסיס קטן."; }
  if (pullbackHealthy) { setup = "Pullback"; aiStatus = "READY"; score = 76; volumeSignal = "Volume Falling on Pullback"; why = "התיקון יורד בווליום — סימן שאין לחץ מכירות חזק."; }
  if (breakdown) { setup = "Breakdown"; aiStatus = "AVOID"; score = 18; volumeSignal = "High Volume Down"; why = "ירידה עם ווליום גבוה — מוכרים שולטים."; }
  if (base) { setup = "Base"; aiStatus = "WATCH"; score = Math.max(score, 55); volumeSignal = "Volume Drying"; why = "הטווח מצטמצם והווליום נרגע — מצב מעקב לפני טריגר."; }
  if (breakout) { setup = "Breakout"; aiStatus = "READY"; score = 82; volumeSignal = "Breakout Volume"; why = "פריצה קרובה לגבוה 20 נרות עם ווליום עולה."; }

  const entryLow = last.close * 0.96;
  const entryHigh = last.close * 1.02;
  const invalid = Math.min(...last10.map(c => c.low));
  return { setup, structure: `${setup} | 20D Range ${safeNum(rangePct, 1)}% | 5D ${safeNum(change5, 1)}%`, volumeSignal, aiStatus, score, entryZone: `${safeNum(entryLow)}–${safeNum(entryHigh)}`, invalidation: `Below ${safeNum(invalid)}`, why, price: last.close, change1 };
}

export default function WatchListDashboard() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultRows;
  });
  const [newTicker, setNewTicker] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("finnhub-key") || "");
  const [themeName, setThemeName] = useState(() => localStorage.getItem(THEME_KEY) || "white");
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

  const today = new Date().toISOString().slice(0, 10);
  const theme = themes[themeName] || themes.white;
  const sizeClass = buttonSize === "sm" ? "px-2 py-1 text-xs" : buttonSize === "lg" ? "px-6 py-4 text-base" : "px-4 py-2 text-sm";
  const shadowClass = buttonShadow === "strong" ? "shadow-xl" : buttonShadow === "none" ? "" : "shadow";
  const buttonDepth = buttonStyle === "btn-3d" ? `rounded-xl shadow-[0_5px_0_rgba(0,0,0,0.25)] active:translate-y-[3px] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] transition-all ${sizeClass}` : `${buttonStyle} ${sizeClass} ${shadowClass}`;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);
  useEffect(() => { localStorage.setItem("finnhub-key", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem(THEME_KEY, themeName); }, [themeName]);
  useEffect(() => { localStorage.setItem("telegram-bot-token", telegramBotToken); }, [telegramBotToken]);
  useEffect(() => { localStorage.setItem("telegram-chat-id", telegramChatId); }, [telegramChatId]);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setShowSidebar(false); };
    if (showSidebar) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [showSidebar]);

  const analyzedRows = useMemo(() => {
    return rows.filter(r => !r.archived).map(row => {
      const analysis = row.analysis || analyzeCandles(row.candles || []);
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
      const diffRating = (b.rating || 0) - (a.rating || 0);
      if (diffRating !== 0) return diffRating;
      const statusRank = { READY: 3, WATCH: 2, AVOID: 1 };
      const diffStatus = (statusRank[b.analysis.aiStatus] || 0) - (statusRank[a.analysis.aiStatus] || 0);
      if (diffStatus !== 0) return diffStatus;
      return (b.analysis.score || 0) - (a.analysis.score || 0);
    });
  }, [rows]);


  async function sendTelegramAlert(message) {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message
        })
      });
    } catch (e) {
      console.log("Telegram alert failed", e);
    }
  }

  // 🔔 ALERT SOUND — חייב להיות אחרי analyzedRows
  useEffect(() => {
    analyzedRows.forEach(r => {
      if (r.alert.triggered && !r.alertNotified) {
        try {
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.play();
        } catch (e) {}
        updateRow(r.ticker, { alertNotified: true });
        sendTelegramAlert(`🚨 ${r.ticker}\n${r.alert.label}\nSetup: ${r.analysis.setup}\nAI: ${r.analysis.aiStatus}\nPriority: ${r.priority}/100\nPrice: ${safeNum(r.analysis.price)}`);
      }
    });
  }, [analyzedRows]);

  const archivedRows = useMemo(() => rows.filter(r => r.archived).map(row => {
    const analysis = row.analysis || analyzeCandles(row.candles || []);
    return { ...row, analysis, alert: analyzeAlert(row, analysis.price) };
  }), [rows]);

  const visibleRows = useMemo(() => {
    let filtered = analyzedRows;

    if (watchFilter === "READY_TO_TRADE") filtered = filtered.filter(r => r.isReadyToTrade);
    if (watchFilter === "NEAR") filtered = filtered.filter(r => r.alert.state === "NEAR");
    if (watchFilter === "TRIGGERED") filtered = filtered.filter(r => r.alert.state === "TRIGGERED");
    if (watchFilter === "HIGH_RATING") filtered = filtered.filter(r => (r.rating || 0) >= 4);

    if (focusMode) {
      filtered = filtered.filter(r => r.isReadyToTrade || r.alert.state === "NEAR");
    }

    return filtered;
  }, [analyzedRows, watchFilter, focusMode]);

  const selectedRow = analyzedRows.find(r => r.ticker === drawerTicker);
  const counts = analyzedRows.reduce((acc, r) => { acc[r.userStatus || "WATCH"] += 1; return acc; }, { READY: 0, WATCH: 0, AVOID: 0 });
  const readyToTradeCount = analyzedRows.filter(r => r.isReadyToTrade).length;
  const topPriorityRows = analyzedRows.slice(0, 3);

  const updateRow = (ticker, patch) => setRows(prev => prev.map(r => r.ticker === ticker ? { ...r, ...patch } : r));
  const addTicker = () => {
    const t = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!t) { setLastError("תכניס טיקר תקין לפני הוספה"); return; }
    setRows(prev => {
      const existing = prev.find(r => r.ticker === t);
      if (existing) return prev.map(r => r.ticker === t ? { ...r, archived: false } : r);
      return [...prev, { ticker: t, rating: 0, alertPrice: "", alertType: "above", userStatus: "WATCH", thesis: "", thesisDate: today, thesisTitle: "", chartImage: "", archived: false, analysis: analyzeCandles([]) }];
    });
    setNewTicker("");
    setLastError("");
    setActivePanel("main");
  };

  const removeTicker = ticker => setConfirmDeleteModal({ open: true, ticker });
  const archiveTicker = ticker => setArchiveModal({ open: true, ticker, reason: "" });
  const restoreTicker = ticker => setRows(prev => prev.map(r => r.ticker === ticker ? { ...r, archived: false } : r));
  const openChart = ticker => window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank");
  const handleImageUpload = (ticker, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => updateRow(ticker, { chartImage: event.target.result });
    reader.readAsDataURL(file);
  };

  async function loadTicker(row) {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setLastError("חסר Finnhub API Key");
      return row;
    }

    try {
      // שלב 1: קודם טוענים Quote — זה endpoint יציב יותר ועובד גם בחינם
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${cleanKey}`;
      const quoteRes = await fetch(quoteUrl);
      const quote = await quoteRes.json();

      if (quote.error) {
        return {
          ...row,
          analysis: {
            ...analyzeCandles([]),
            why: `שגיאת API: ${quote.error}`
          }
        };
      }

      if (!quote || !quote.c || quote.c === 0) {
        return {
          ...row,
          analysis: {
            ...analyzeCandles([]),
            why: "לא התקבל מחיר חי — בדוק טיקר / API"
          }
        };
      }

      const price = quote.c;
      const prevClose = quote.pc || quote.c;
      const change1 = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const high = quote.h || price;
      const low = quote.l || price;

      // ניתוח בסיסי לפי Quote בלבד
      let setup = "Live Quote";
      let aiStatus = "WATCH";
      let score = 50;
      let volumeSignal = "Quote Loaded";
      let why = "מחיר חי נטען בהצלחה. לניתוח מבנה עמוק נדרש דאטה של נרות.";

      if (change1 > 3) {
        setup = "Breakout";
        aiStatus = "READY";
        score = 72;
        why = "מחיר חי עולה חזק ביחס לסגירה קודמת — לבדוק גרף לפני כניסה.";
      } else if (change1 < -3) {
        setup = "Breakdown";
        aiStatus = "AVOID";
        score = 25;
        why = "מחיר חי יורד חזק ביחס לסגירה קודמת — זהירות.";
      }

      const analysis = {
        setup,
        structure: `Live Quote | H ${safeNum(high)} | L ${safeNum(low)}`,
        volumeSignal,
        aiStatus,
        score,
        entryZone: `${safeNum(price * 0.98)}–${safeNum(price * 1.02)}`,
        invalidation: `Below ${safeNum(low)}`,
        why,
        price,
        change1
      };

      return {
        ...row,
        analysis,
        lastLoadedAt: new Date().toISOString(),
        alertNotified: false
      };
    } catch (e) {
      return {
        ...row,
        analysis: {
          ...analyzeCandles([]),
          why: "טעינת Quote נכשלה — בדוק חיבור / API / CORS"
        }
      };
    }
  }

  async function loadAllLive() {
    setLoading(true); setLastError("");
    try {
      const updated = [];
      for (const row of rows) updated.push(await loadTicker(row));
      setRows(updated);
    } catch (e) {
      setLastError("טעינת API נכשלה. בדוק Key / חיבור / מגבלת API.");
    } finally {
      setLoading(false);
    }
  }

  const Button = ({ children, className = "", ...props }) => <button {...props} className={`${buttonDepth} font-black ${className}`}>{children}</button>;

  return (
    <div dir="rtl" className={`min-h-screen p-6 ${theme.app}`}>
      <button onClick={() => setShowSidebar(true)} className="fixed bottom-6 left-6 z-40 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-xl ring-1 ring-slate-300 hover:bg-slate-700">⚙️ הגדרות</button>

      <div className="mx-auto w-full max-w-[96vw] space-y-5">
        <header className={`rounded-2xl border p-5 shadow-lg ${theme.card}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className={`text-xs font-black tracking-[0.3em] ${theme.accentText}`}>LIVE API · SMART ALERTS</div>
              <h1 className={`mt-2 text-3xl font-black ${theme.strong}`}>WATCH LIST — Smart Alert Mode</h1>
              <p className={`mt-2 text-sm ${theme.muted}`}>מיון לפי Alert, קרבה לאלרט, דירוג אישי, סטטוס AI ו־Score.</p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3"><div className="text-2xl font-black text-emerald-700">{counts.READY}</div><div className="text-xs text-zinc-500">READY</div></div>
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3"><div className="text-2xl font-black text-yellow-700">{counts.WATCH}</div><div className="text-xs text-zinc-500">WATCH</div></div>
              <div className="rounded-xl border border-red-300 bg-red-50 p-3"><div className="text-2xl font-black text-red-700">{counts.AVOID}</div><div className="text-xs text-zinc-500">AVOID</div></div>
              <div className="rounded-xl border border-emerald-500 bg-emerald-100 p-3"><div className="text-2xl font-black text-emerald-800">{readyToTradeCount}</div><div className="text-xs text-emerald-700">READY TO TRADE</div></div>
            </div>
          </div>
        </header>

        <section className={`rounded-2xl border p-3 ${theme.card}`}>
          <div className="grid gap-3 lg:grid-cols-2">
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Finnhub API Key" className={`rounded-xl border px-4 py-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`} />
            <div className="flex gap-2">
              <input value={newTicker} onChange={e => setNewTicker(e.target.value)} onKeyDown={e => e.key === "Enter" && addTicker()} placeholder="הוסף טיקר" className={`w-full rounded-xl border px-4 py-3 text-sm uppercase outline-none focus:border-yellow-500 ${theme.input}`} />
              <Button onClick={addTicker} className={theme.accent}>הוסף</Button>
            </div>
            <Button onClick={loadAllLive} disabled={loading} className="border border-emerald-300 bg-emerald-50 text-emerald-700 disabled:opacity-50">{loading ? "טוען..." : "Load Live Data"}</Button>
            <Button onClick={() => setActivePanel("guide")} className="border border-yellow-300 bg-yellow-50 text-yellow-700">פירוט מבנים</Button>
            <input value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} placeholder="Telegram Bot Token" className={`rounded-xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
            <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className={`rounded-xl border px-4 py-3 text-sm outline-none ${theme.input}`} />
          </div>
        </section>

        <nav className={`flex flex-wrap gap-2 rounded-2xl border p-2 ${theme.card}`}>
          {[["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedRows.length})`]].map(([key, label]) => <Button key={key} onClick={() => setActivePanel(key)} className={activePanel === key ? theme.accent : theme.navIdle}>{label}</Button>)}
        </nav>

        {activePanel === "main" && (
          <section className={`rounded-2xl border p-2 ${theme.card}`}>
            <div className="flex flex-wrap gap-2 items-center">{[["ALL", "הכל"], ["READY_TO_TRADE", `READY TO TRADE (${readyToTradeCount})`], ["TRIGGERED", "מוכנות"], ["NEAR", "מתקרבות"], ["HIGH_RATING", "דירוג גבוה ⭐4+"]].map(([key, label]) => <Button key={key} onClick={() => setWatchFilter(key)} className={watchFilter === key ? theme.accent : theme.navIdle}>{label}</Button>)}</div>
            <button onClick={() => setFocusMode(!focusMode)} className={`ml-2 px-3 py-2 rounded-full text-xs font-black ${focusMode ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>
              🎯 Focus Mode
            </button>
          </section>
        )}

        {lastError && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{lastError}</div>}

        {activePanel === "main" && (
          <section className={`rounded-2xl border p-4 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={`text-xl font-black ${theme.strong}`}>🔥 Priority Engine — Top Opportunities</h2>
              <span className={`text-sm ${theme.muted}`}>הכי חשוב עכשיו לפי Alert + Rating + AI + Setup</span>
            </div>
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {topPriorityRows.map(row => {
                const p = priorityLabel(row.priority || 0);
                return (
                  <div key={row.ticker} className={`rounded-2xl border p-4 ${theme.soft} ${theme.border}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button onClick={() => setDrawerTicker(row.ticker)} className={`text-xl font-black hover:underline ${theme.strong}`}>{row.ticker}</button>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${p.className}`}>{p.text}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div><span className={theme.muted}>Priority:</span> <b>{row.priority}</b></div>
                      <div><span className={theme.muted}>Alert:</span> <b>{row.alert.label}</b></div>
                      <div><span className={theme.muted}>Setup:</span> <b>{row.analysis.setup}</b></div>
                      <div><span className={theme.muted}>AI:</span> <b>{row.analysis.aiStatus}</b></div>
                    </div>
                    <p className={`mt-3 text-xs ${theme.muted}`}>{row.analysis.why}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activePanel === "guide" && (
          <section className={`rounded-2xl border p-4 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className={`text-xl font-black ${theme.accentText}`}>מדריך זיהוי Setup + Volume</h2><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">מצב</th><th className="p-3">מה לבדוק</th><th className="p-3">פירוש</th><th className="p-3">תוצאה</th><th className="p-3">עמדת טריידר</th><th className="p-3">מה לשים לב</th><th className="p-3">ממה להימנע</th></tr></thead><tbody>{playbook.map(item => <tr key={item.mode} className={`border-b ${theme.row}`}><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(item.mode)}`}>{item.mode}</span></td><td className={`p-3 ${theme.strong}`}>{item.check}</td><td className={`p-3 ${theme.muted}`}>{item.result}</td><td className="p-3 font-bold text-yellow-700">{item.action}</td><td className="p-3 text-emerald-700">{item.traderPosition}</td><td className="p-3 text-cyan-700">{item.focus}</td><td className="p-3 text-red-700">{item.avoid}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {activePanel === "archive" && (
          <section className={`rounded-2xl border p-4 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className={`text-xl font-black ${theme.strong}`}>מסך ארכיון</h2><p className={`mt-1 text-sm ${theme.muted}`}>מניות שהועברו לארכיון.</p></div><Button onClick={() => setActivePanel("main")} className={theme.accent}>חזור למסך ראשי</Button></div>
            {archivedRows.length === 0 ? <div className={`rounded-xl border p-4 text-sm ${theme.border} ${theme.soft} ${theme.muted}`}>אין כרגע מניות בארכיון.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className={`border-b ${theme.border} ${theme.muted}`}><tr><th className="p-3">Ticker</th><th className="p-3">Alert</th><th className="p-3">Setup</th><th className="p-3">AI</th><th className="p-3">סיבה</th><th className="p-3">Actions</th></tr></thead><tbody>{archivedRows.map(row => <tr key={row.ticker} className={`border-b ${theme.row}`}><td className={`p-3 font-black ${theme.strong}`}>{row.ticker}</td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(row.analysis.setup)}`}>{row.analysis.setup}</span></td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(row.analysis.aiStatus)}`}>{row.analysis.aiStatus}</span></td><td className={`p-3 ${theme.muted}`}>{row.archiveReason || "—"}</td><td className="p-3"><div className="flex gap-2"><Button onClick={() => restoreTicker(row.ticker)} className="border border-emerald-300 text-emerald-700">החזר</Button><Button onClick={() => removeTicker(row.ticker)} className="border border-red-300 text-red-700">מחק לצמיתות</Button></div></td></tr>)}</tbody></table></div>}
          </section>
        )}

        {activePanel === "main" && selectedRow && (
          <section className={`rounded-2xl border p-4 ${theme.card}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className={`text-xl font-black ${theme.strong}`}>מגירה — {selectedRow.ticker}</h2><p className={`mt-1 text-sm ${theme.muted}`}>תזה אישית, תאריך, סטאפ ותמונת גרף.</p></div><Button onClick={() => setDrawerTicker("")} className={theme.accent}>סגור מגירה</Button></div>
            <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800">📌 הוראות: תכניס Alert Price ואז לחץ על "טען מניה" → נטען LOAD LIVE DATA עבור המניה הזאת בלבד והאלרט מופעל.</div>
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]"><div><div className="mb-3 grid gap-3 lg:grid-cols-[180px_1fr_160px]"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>Alert Price</label><input type="number" value={selectedRow.alertPrice || ""} onChange={e => updateRow(selectedRow.ticker, { alertPrice: e.target.value })} placeholder="לדוגמה 8.50" className={`w-full rounded-xl border p-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>סוג אלרט</label><select value={selectedRow.alertType || "above"} onChange={e => updateRow(selectedRow.ticker, { alertType: e.target.value })} className={`w-full rounded-xl border p-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`}><option value="above">Above — מעל מחיר</option><option value="below">Below — מתחת מחיר</option></select></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>מצב אלרט</label><span className={`inline-flex w-full items-center justify-center rounded-xl border p-3 text-sm font-black ${selectedRow.alert.className}`}>{selectedRow.alert.label}</span><Button onClick={async () => { setLoading(true); setLastError(""); try { const updated = await loadTicker(selectedRow); setRows(prev => prev.map(r => r.ticker === selectedRow.ticker ? updated : r)); } catch { setLastError("בדיקת מניה נכשלה. בדוק API Key / חיבור / טיקר."); } finally { setLoading(false); } }} className="mt-2 w-full border border-emerald-300 bg-emerald-50 text-emerald-700">{loading ? "טוען..." : "טען מניה"}</Button></div></div><div className="mb-3 grid gap-3 lg:grid-cols-[180px_1fr]"><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תאריך תזה</label><input type="date" value={selectedRow.thesisDate || today} onChange={e => updateRow(selectedRow.ticker, { thesisDate: e.target.value })} className={`w-full rounded-xl border p-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>כותרת קצרה</label><select value={selectedRow.thesisTitle || ""} onChange={e => updateRow(selectedRow.ticker, { thesisTitle: e.target.value })} className={`w-full rounded-xl border p-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`}><option value="">בחר תבנית</option><option value="Spike + Wait Base">Spike + Wait Base</option><option value="Pullback Continuation">Pullback Continuation</option><option value="Base Before Breakout">Base Before Breakout</option><option value="Breakout Setup">Breakout Setup</option><option value="Range / Accumulation">Range / Accumulation</option><option value="Weak / Avoid">Weak / Avoid</option></select></div></div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תזה / מה ראיתי</label><textarea value={selectedRow.thesis || ""} onChange={e => updateRow(selectedRow.ticker, { thesis: e.target.value })} placeholder="לדוגמה: מחכה לפריצה מעל אלרט, לא נכנס לפני base." className={`min-h-[180px] w-full rounded-xl border p-3 text-sm outline-none focus:border-yellow-500 ${theme.input}`} /></div><div><label className={`mb-2 block text-sm font-black ${theme.muted}`}>תמונת גרף</label><input type="file" accept="image/*" onChange={e => handleImageUpload(selectedRow.ticker, e.target.files && e.target.files[0])} className={`w-full rounded-xl border p-3 text-sm ${theme.input}`} />{selectedRow.chartImage ? <div className="mt-3 overflow-hidden rounded-xl border border-zinc-300 bg-black"><img src={selectedRow.chartImage} alt={`chart-${selectedRow.ticker}`} className="max-h-[280px] w-full object-contain" /></div> : <div className={`mt-3 rounded-xl border p-4 text-sm ${theme.border} ${theme.soft} ${theme.muted}`}>עדיין לא הועלתה תמונת גרף.</div>}</div></div>
          </section>
        )}

        {activePanel === "main" && (
          <section className={`overflow-hidden rounded-2xl border shadow-lg ${theme.card}`}>
            <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-right text-xs xl:text-sm"><thead className={`${theme.head} text-xs uppercase tracking-wider`}><tr><th className="p-3">Ticker</th><th className="p-3">Price</th><th className="p-3">1D%</th><th className="p-3">Priority</th><th className="p-3">Rating</th><th className="p-3">Alert Status</th><th className="p-3">Your Status</th><th className="p-3">AI</th><th className="p-3">Score</th><th className="p-3">Setup</th><th className="p-3">Structure</th><th className="p-3">Entry</th><th className="p-3">Invalidation</th><th className="p-3">Why</th><th className="p-3">Actions</th></tr></thead><tbody>{visibleRows.map(row => { const a = row.analysis; return <tr key={row.ticker} className={`border-t ${theme.row} ${row.alert.state === "NEAR" ? "bg-yellow-100 ring-2 ring-yellow-400" : row.isReadyToTrade ? "bg-emerald-100 ring-2 ring-emerald-500" : row.alert.triggered ? "ring-2 ring-emerald-400" : ""}`}><td className="p-3"><div className="flex items-center gap-2"><span title={row.alert.label} className={`h-3 w-3 rounded-full ${row.alert.dot || "bg-zinc-300"} ${row.alert.state === "NEAR" ? "animate-pulse scale-125" : ""}`} /><button onClick={() => openChart(row.ticker)} className={`font-black hover:underline ${theme.strong}`}>{row.ticker} ↗ {row.isReadyToTrade && <span className="ml-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">READY TO TRADE</span>}</button></div></td><td className="p-3 font-bold">{safeNum(a.price)}</td><td className={`p-3 font-bold ${a.change1 >= 0 ? "text-emerald-600" : "text-red-600"}`}>{safeNum(a.change1, 1)}%</td><td className="p-3"><span className={`rounded-lg px-2 py-1 text-xs font-black ${priorityLabel(row.priority || 0).className}`}>{row.priority}</span></td><td className="p-3"><select value={row.rating || 0} onChange={e => updateRow(row.ticker, { rating: Number(e.target.value) })} className="rounded-lg border px-2 py-1 font-bold"><option value={0}>⭐</option><option value={1}>⭐ 1</option><option value={2}>⭐ 2</option><option value={3}>⭐ 3</option><option value={4}>⭐ 4</option><option value={5}>⭐ 5</option></select></td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className} ${row.alert.state === "NEAR" ? "shadow-md" : ""}`}>{row.alert.label}</span></td><td className="p-3"><select value={row.userStatus || "WATCH"} onChange={e => updateRow(row.ticker, { userStatus: e.target.value })} className={`rounded-lg border px-2 py-1 font-bold ${statusClass(row.userStatus || "WATCH")}`}><option value="READY">READY</option><option value="WATCH">WATCH</option><option value="AVOID">AVOID</option></select></td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></td><td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-zinc-300"><div className="h-2 rounded-full bg-yellow-500" style={{ width: `${a.score}%` }} /></div><b>{a.score}</b></div></td><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(a.setup)}`}>{a.setup}</span></td><td className={`p-3 ${theme.strong}`}>{a.structure}</td><td className="p-3 font-bold text-emerald-600">{a.entryZone}</td><td className="p-3 font-bold text-red-600">{a.invalidation}</td><td className={`max-w-[300px] p-3 ${theme.muted}`}>{a.why}</td><td className="p-3"><div className="flex gap-2"><Button onClick={() => setDrawerTicker(row.ticker)} className="border border-blue-300 text-blue-600">מגירה</Button><Button onClick={() => setConfirmAiModal({ open: true, ticker: row.ticker })} className="border border-emerald-300 text-emerald-600">אשר</Button><Button onClick={() => archiveTicker(row.ticker)} className="border border-yellow-300 text-yellow-600">ארכיון</Button><Button onClick={() => removeTicker(row.ticker)} className="border border-red-300 text-red-600">מחק</Button></div></td></tr>; })}</tbody></table></div>
          </section>
        )}

        <div className={`rounded-xl border p-3 text-xs ${theme.card} ${theme.muted}`}>Smart Alert: אם המחיר עבר את היעד — השורה תעלה למעלה ותסומן. אם המחיר קרוב עד 3% — תקבל סימון קרוב.</div>
        {showSidebar && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4" onClick={() => setShowSidebar(false)}>
            <section className={`w-full max-w-6xl rounded-3xl border p-5 shadow-2xl ${theme.card}`} onClick={e => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-black ${theme.strong}`}>⚙️ הגדרות עיצוב</h3>
                  <p className={`mt-1 text-sm ${theme.muted}`}>שינוי כפתורים, צל, צורה ורקע. לחיצה מחוץ לחלון סוגרת.</p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  סגור
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  <div className={`mb-2 text-xs font-black ${theme.muted}`}>גודל כפתורים</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[["sm", "קטן"], ["md", "רגיל"], ["lg", "גדול"]].map(([s, label]) => (
                      <button key={s} onClick={() => setButtonSize(s)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonSize === s ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  <div className={`mb-2 text-xs font-black ${theme.muted}`}>עומק / צל</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[["none", "שטוח"], ["normal", "עדין"], ["strong", "חזק"]].map(([s, label]) => (
                      <button key={s} onClick={() => setButtonShadow(s)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonShadow === s ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  <div className={`mb-2 text-xs font-black ${theme.muted}`}>צורת כפתור</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[["rounded-xl", "מעוגל"], ["rounded-full", "עגול"], ["rounded-none", "חד"], ["btn-3d", "תלת ממד"]].map(([style, label]) => (
                      <button key={style} onClick={() => setButtonStyle(style)} className={`rounded-full px-3 py-2 text-xs font-black transition ${buttonStyle === style ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  <div className={`mb-2 text-xs font-black ${theme.muted}`}>רקע</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(themes).map(([key, item]) => (
                      <button key={key} onClick={() => setThemeName(key)} className={`rounded-full px-3 py-2 text-xs font-black transition ${themeName === key ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{item.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {confirmAiModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`w-[420px] rounded-2xl border p-4 ${theme.card}`}>
            <h3 className={`text-lg font-black ${theme.strong}`}>אישור אימוץ סטאפ</h3>
            <p className={`mt-1 text-sm ${theme.muted}`}>האם אתה מאמץ את הסטאפ של ה-AI עבור {confirmAiModal.ticker}?</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setConfirmAiModal({ open: false, ticker: null })} className="rounded-lg border px-3 py-1 text-sm">בטל</button>
              <button
                onClick={() => {
                  setRows(prev => prev.map(r => {
                    if (r.ticker !== confirmAiModal.ticker) return r;
                    const aiStatus = r.analysis?.aiStatus || analyzeCandles(r.candles || []).aiStatus;
                    return { ...r, userStatus: aiStatus };
                  }));
                  setConfirmAiModal({ open: false, ticker: null });
                }}
                className="rounded-lg border border-emerald-300 px-3 py-1 text-sm font-bold text-emerald-700"
              >
                כן, מאשר
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`w-[420px] rounded-2xl border p-4 ${theme.card}`}>
            <h3 className={`text-lg font-black ${theme.strong}`}>מחיקה לצמיתות</h3>
            <p className={`mt-1 text-sm ${theme.muted}`}>המניה תימחק לצמיתות — אתה בטוח?</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteModal({ open: false, ticker: null })} className="rounded-lg border px-3 py-1 text-sm">בטל</button>
              <button
                onClick={() => {
                  setRows(prev => prev.filter(r => r.ticker !== confirmDeleteModal.ticker));
                  setConfirmDeleteModal({ open: false, ticker: null });
                }}
                className="rounded-lg border border-red-300 px-3 py-1 text-sm font-bold text-red-700"
              >
                כן, מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`w-[420px] rounded-2xl border p-4 ${theme.card}`}>
            <h3 className={`text-lg font-black ${theme.strong}`}>העברה לארכיון</h3>
            <p className={`mt-1 text-sm ${theme.muted}`}>למה אתה מעביר את {archiveModal.ticker} לארכיון?</p>
            <textarea
              value={archiveModal.reason}
              onChange={e => setArchiveModal(s => ({ ...s, reason: e.target.value }))}
              placeholder="לא חובה אבל מומלץ"
              className={`mt-3 w-full rounded-xl border p-3 text-sm ${theme.input}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setArchiveModal({ open: false, ticker: null, reason: "" })} className="rounded-lg border px-3 py-1 text-sm">בטל</button>
              <button
                onClick={() => {
                  setRows(prev => prev.map(r => r.ticker === archiveModal.ticker ? { ...r, archived: true, archiveReason: archiveModal.reason || "" } : r));
                  setArchiveModal({ open: false, ticker: null, reason: "" });
                }}
                className="rounded-lg border border-yellow-300 px-3 py-1 text-sm font-bold text-yellow-700"
              >
                אשר ארכיון
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
