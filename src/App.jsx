import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-campaign-os-fixed-v1";
const FINNHUB_KEY = "finnhub-key";
const THEME_KEY = "campaign-theme";

const defaultRows = [
  { ticker: "NVAX", rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "" },
  { ticker: "UUUU", rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "" },
];

const ui = {
  app: "min-h-screen bg-[#050816] p-4 text-slate-100 lg:p-6",
  card: "rounded-3xl border border-white/25 bg-[#0B1220]/95 shadow-2xl shadow-black/30",
  input: "rounded-2xl border border-slate-700 bg-[#050816] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400",
  button: "rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-50",
  navIdle: "border border-slate-700 bg-[#0F172A] text-slate-300",
  accent: "border border-white bg-white text-slate-950",
};

const tableThemes = {
  dark: { label: "כהה", wrap: "border-white/70 bg-[#07111f] text-white", top: "bg-[#0b1628]", head: "bg-[#0f1c31] text-white", row: "border-slate-700/80 hover:bg-white/5", title: "text-white", sub: "text-slate-300" },
  gray: { label: "אפור בהיר", wrap: "border-white bg-[#d7dce5] text-slate-950", top: "bg-[#c8d0dc]", head: "bg-[#b8c2d0] text-slate-950", row: "border-slate-400/70 hover:bg-white/50", title: "text-slate-950", sub: "text-slate-700" },
  brown: { label: "חום", wrap: "border-white/80 bg-[#2b1d14] text-amber-50", top: "bg-[#3a291f]", head: "bg-[#563d2b] text-amber-50", row: "border-amber-900/50 hover:bg-[#63452f]", title: "text-white", sub: "text-amber-200" },
  white: { label: "לבן", wrap: "border-white bg-white text-slate-950", top: "bg-slate-100", head: "bg-slate-200 text-slate-950", row: "border-slate-300 hover:bg-slate-100", title: "text-slate-950", sub: "text-slate-600" },
};

const playbook = [
  ["Spike", "עלייה חדה במחיר", "לחכות ל־Base קטן אחרי הספייק"],
  ["Pullback", "תיקון נשלט", "מעניין אם המחיר שומר מבנה"],
  ["Base", "תנועה צרה / התכווצות", "לחכות ל־Range High"],
  ["Breakout", "פריצה מעל אזור", "לא לרדוף; לחכות Retest"],
  ["Breakdown", "שבירה מטה", "להימנע עד Reclaim ברור"],
];

function safeNum(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(Number(value) || 0, max));
}

function emptyAnalysis() {
  return {
    setup: "Needs Data",
    aiStatus: "WATCH",
    price: null,
    change1: 0,
    structure: "אין מספיק נתונים לניתוח",
    daily: "—",
    weekly: "—",
    volumeSignal: "Quote Only",
    volumeRatio: 0,
    pressureBuild: "WAIT",
    pressureScore: 0,
    wyckoffPhase: "Needs Data",
    addZone: "—",
    invalidation: "—",
    campaignRank: "D",
    campaignScore: 0,
    decision: "Load Data",
    why: "צריך לטעון דאטה חי",
    dataQuality: "EMPTY",
    dataMessage: "No market data",
  };
}

function enrichAnalysis(base, row = {}) {
  const a = { ...emptyAnalysis(), ...(base || {}) };
  const rating = Number(row.rating || 0);
  const price = Number(a.price) || 0;
  let pressureScore = 25;

  if (a.setup === "Base") pressureScore += 26;
  if (a.setup === "Breakout") pressureScore += 14;
  if (a.setup === "Spike") pressureScore += 8;
  if (a.setup === "Breakdown") pressureScore -= 35;
  if (Math.abs(Number(a.change1) || 0) <= 1.2) pressureScore += 10;
  if (rating >= 4) pressureScore += 8;

  if (a.dataQuality === "ERROR" || a.dataQuality === "EMPTY") pressureScore -= 20;
  if (a.dataQuality === "LIMITED") pressureScore -= 8;

  pressureScore = clamp(pressureScore);

  let pressureBuild = "WAIT";
  if (pressureScore >= 78) pressureBuild = "STRONG";
  else if (pressureScore >= 58) pressureBuild = "BUILDING";
  else if (pressureScore >= 40) pressureBuild = "EARLY";
  if (a.setup === "Breakdown") pressureBuild = "WEAK";

  let wyckoffPhase = "Phase B / Watch";
  if (a.setup === "Base" && pressureScore >= 58) wyckoffPhase = "Phase C→D";
  if (a.setup === "Breakout") wyckoffPhase = "Phase D — Markup";
  if (a.setup === "Spike") wyckoffPhase = "Post Spike / Test";
  if (a.setup === "Breakdown") wyckoffPhase = "Distribution Risk";
  if (a.setup === "Needs Data") wyckoffPhase = "Needs Data";

  let addZone = "—";
  let invalidation = "—";
  if (price) {
    if (a.setup === "Breakdown") {
      addZone = "No Add";
      invalidation = `Weak below ${safeNum(price * 0.98)}`;
    } else if (a.setup === "Spike") {
      addZone = `${safeNum(price * 0.9)}–${safeNum(price * 0.96)}`;
      invalidation = `Spike low / ${safeNum(price * 0.9)}`;
    } else {
      addZone = `${safeNum(price * 0.97)}–${safeNum(price * 1.02)}`;
      invalidation = `Below ${safeNum(price * 0.94)}`;
    }
  }

  let campaignScore = 0;
  campaignScore += a.aiStatus === "READY" ? 24 : a.aiStatus === "WATCH" ? 14 : -20;
  campaignScore += a.setup === "Base" ? 22 : a.setup === "Breakout" ? 18 : a.setup === "Spike" ? 10 : a.setup === "Breakdown" ? -30 : 5;
  campaignScore += Math.round(pressureScore * 0.32);
  campaignScore += rating * 7;

  if (a.dataQuality === "ERROR" || a.dataQuality === "EMPTY") campaignScore -= 30;
  if (a.dataQuality === "LIMITED") campaignScore -= 12;

  campaignScore = clamp(campaignScore);

  let campaignRank = "D";
  if (campaignScore >= 85) campaignRank = "A+";
  else if (campaignScore >= 72) campaignRank = "A";
  else if (campaignScore >= 58) campaignRank = "B";
  else if (campaignScore >= 40) campaignRank = "C";

  if (a.dataQuality === "ERROR" || a.dataQuality === "EMPTY") campaignRank = "D";
  if (a.dataQuality === "LIMITED" && (campaignRank === "A+" || campaignRank === "A")) campaignRank = "B";

  const decision = campaignRank === "A+" || campaignRank === "A" ? "CAMPAIGN READY" : campaignRank === "B" ? "WATCH FOR ADD" : campaignRank === "C" ? "WAIT" : "AVOID / NO ADD";
  return { ...a, pressureScore, pressureBuild, wyckoffPhase, addZone, invalidation, campaignScore, campaignRank, decision };
}

function buildQuoteAnalysis(quote, row) {
  const price = Number(quote?.c) || null;
  const previousClose = Number(quote?.pc) || price;
  const high = Number(quote?.h) || price;
  const low = Number(quote?.l) || price;
  const open = Number(quote?.o) || previousClose;
  const change1 = price && previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  const dayRange = low ? ((high - low) / low) * 100 : 0;

  let setup = "Live Quote";
  let aiStatus = "WATCH";
  let why = "Quote live loaded";

  if (change1 >= 7) {
    setup = "Spike";
    aiStatus = "WATCH";
    why = "Sharp daily move — wait for base / retest";
  } else if (change1 >= 3) {
    setup = "Breakout";
    aiStatus = "READY";
    why = "Positive price expansion from quote data";
  } else if (change1 <= -4) {
    setup = "Breakdown";
    aiStatus = "AVOID";
    why = "Weak daily move / selling pressure";
  } else if (Math.abs(change1) <= 1 && dayRange <= 5) {
    setup = "Base";
    aiStatus = "WATCH";
    why = "Quiet quote action / possible base";
  }

  return enrichAnalysis({
    ...emptyAnalysis(),
    setup,
    aiStatus,
    price,
    change1,
    high,
    low,
    open,
    structure: `Quote Live | O ${safeNum(open)} | H ${safeNum(high)} | L ${safeNum(low)} | PC ${safeNum(previousClose)}`,
    daily: `Price ${safeNum(price)} | 1D ${safeNum(change1, 1)}% | Range ${safeNum(dayRange, 1)}%`,
    weekly: "Quote only — candles are optional",
    volumeSignal: "Quote Only",
    volumeRatio: 0,
    dataQuality: "QUOTE",
    dataMessage: "Live quote loaded",
    why,
  }, row);
}

function statusClass(value) {
  if (value === "READY") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (value === "AVOID") return "border-red-500/30 bg-red-500/15 text-red-300";
  return "border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
}

function setupClass(value) {
  if (value === "Spike") return "border-purple-500/30 bg-purple-500/15 text-purple-300";
  if (value === "Breakout") return "border-orange-500/30 bg-orange-500/15 text-orange-300";
  if (value === "Base") return "border-blue-500/30 bg-blue-500/15 text-blue-300";
  if (value === "Breakdown") return "border-red-500/30 bg-red-500/15 text-red-300";
  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function pressureClass(value) {
  if (value === "STRONG") return "border-cyan-400/40 bg-cyan-500/15 text-cyan-200";
  if (value === "BUILDING") return "border-yellow-400/40 bg-yellow-500/15 text-yellow-200";
  if (value === "EARLY") return "border-blue-400/40 bg-blue-500/15 text-blue-200";
  if (value === "WEAK") return "border-red-400/40 bg-red-500/15 text-red-200";
  return "border-orange-400/40 bg-orange-500/15 text-orange-200";
}

function rankClass(value) {
  if (value === "A+" || value === "A") return "border-emerald-400/50 bg-emerald-500/20 text-emerald-200";
  if (value === "B") return "border-yellow-400/50 bg-yellow-500/20 text-yellow-200";
  if (value === "C") return "border-blue-400/50 bg-blue-500/20 text-blue-200";
  return "border-red-400/50 bg-red-500/20 text-red-200";
}

function dataQualityClass(value) {
  if (value === "LIVE") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (value === "QUOTE") return "border-yellow-500/40 bg-yellow-500/15 text-yellow-300";
  if (value === "LIMITED") return "border-orange-500/40 bg-orange-500/15 text-orange-300";
  if (value === "ERROR") return "border-red-500/40 bg-red-500/15 text-red-300";
  return "border-slate-500/40 bg-slate-500/15 text-slate-300";
}

function alertState(row, price) {
  const target = Number(row.alertPrice);
  const current = Number(price);
  if (!target || !current) return { state: "NO ALERT", label: "אין אלרט", triggered: false, cls: "border-slate-500/30 bg-slate-500/15 text-slate-300" };

  const type = row.alertType || "above";
  const triggered = type === "above" ? current >= target : current <= target;
  const distance = Math.abs(type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100);

  if (triggered) return { state: "TRIGGERED", label: "מוכנה", triggered: true, cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" };
  if (distance <= 3) return { state: "NEAR", label: `מתקרבת ${safeNum(distance, 1)}%`, triggered: false, cls: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300" };
  return { state: "WAIT", label: `ממתין ${safeNum(distance, 1)}%`, triggered: false, cls: "border-slate-500/30 bg-slate-500/15 text-slate-300" };
}

function priorityScore(row) {
  const a = row.analysis;
  const alert = row.alert;
  let score = 0;
  score += alert.state === "NEAR" ? 40 : alert.state === "TRIGGERED" ? 30 : 0;
  score += Number(row.rating || 0) * 8;
  score += a.aiStatus === "READY" ? 20 : a.aiStatus === "WATCH" ? 10 : -15;
  score += a.campaignRank === "A+" ? 16 : a.campaignRank === "A" ? 12 : a.campaignRank === "B" ? 8 : 0;
  score += Math.round((a.pressureScore || 0) / 12);

  if (a.dataQuality === "ERROR" || a.dataQuality === "EMPTY") score -= 35;
  if (a.dataQuality === "LIMITED") score -= 15;

  return clamp(score);
}

function priorityLabel(score) {
  if (score >= 80) return { text: "TOP", cls: "bg-emerald-500/25 text-emerald-200 border-emerald-500/40" };
  if (score >= 60) return { text: "HIGH", cls: "bg-yellow-500/25 text-yellow-200 border-yellow-500/40" };
  if (score >= 40) return { text: "MED", cls: "bg-blue-500/25 text-blue-200 border-blue-500/40" };
  return { text: "LOW", cls: "bg-slate-500/25 text-slate-200 border-slate-500/40" };
}

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`${ui.button} ${className}`}>{children}</button>;
}

export default function App() {
  const viteKey = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_FINNHUB_API_KEY || "" : "";
  const [apiKey, setApiKey] = useState(() => viteKey || localStorage.getItem(FINNHUB_KEY) || "");
  const [rows, setRows] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "") || defaultRows;
    } catch {
      return defaultRows;
    }
  });

  const [newTicker, setNewTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [drawerTicker, setDrawerTicker] = useState("");
  const [tab, setTab] = useState("main");
  const [filter, setFilter] = useState("ALL");
  const [tableTheme, setTableTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [manualOpen, setManualOpen] = useState(false);
  const [deleteTicker, setDeleteTicker] = useState(null);
  const [archiveModal, setArchiveModal] = useState({ open: false, ticker: "", reason: "" });

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)), [rows]);
  useEffect(() => localStorage.setItem(FINNHUB_KEY, apiKey || ""), [apiKey]);
  useEffect(() => localStorage.setItem(THEME_KEY, tableTheme), [tableTheme]);

  function updateRow(ticker, patch) {
    setRows((prev) => prev.map((row) => (row.ticker === ticker ? { ...row, ...patch } : row)));
  }

  function addTicker() {
    const ticker = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!ticker) return;

    setRows((prev) => {
      const exists = prev.some((row) => row.ticker === ticker);
      if (exists) return prev.map((row) => (row.ticker === ticker ? { ...row, archived: false } : row));
      return [...prev, { ticker, rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "", thesisDate: today }];
    });

    setNewTicker("");
  }

  function openChart(ticker) {
    window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank");
  }

  async function loadTicker(row) {
    const key = (viteKey || apiKey || "").trim();
    if (!key) {
      setLastError("חסר Finnhub API Key");
      return {
        ...row,
        analysis: enrichAnalysis({
          ...emptyAnalysis(),
          dataQuality: "ERROR",
          dataMessage: "Missing Finnhub API Key",
          why: "Missing Finnhub API Key",
        }, row),
      };
    }

    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${key}`);
      const quote = await response.json();

      if (quote?.error) {
        setLastError(`שגיאת Finnhub: ${quote.error}`);

        return {
          ...row,
          analysis: enrichAnalysis({
            ...emptyAnalysis(),
            dataQuality: "ERROR",
            dataMessage: quote.error,
            why: `Quote error: ${quote.error}`,
          }, row),
        };
      }

      if (!quote || !quote.c || quote.c === 0) {
        setLastError(`לא התקבל מחיר חי עבור ${row.ticker}`);

        return {
          ...row,
          analysis: enrichAnalysis({
            ...emptyAnalysis(),
            dataQuality: "EMPTY",
            dataMessage: "No live price",
            why: "No live price returned from Finnhub",
          }, row),
        };
      }

      return { ...row, analysis: buildQuoteAnalysis(quote, row), alertNotified: false, lastLoadedAt: new Date().toISOString() };
    } catch (error) {
      setLastError("טעינת Quote נכשלה — בדוק API / חיבור");
      return {
        ...row,
        analysis: enrichAnalysis({
          ...emptyAnalysis(),
          dataQuality: "ERROR",
          dataMessage: error?.message || "Fetch failed",
          why: "Quote fetch failed",
        }, row),
      };
    }
  }

  async function loadAllLive() {
    setLoading(true);
    setLastError("");
    try {
      const updated = [];
      for (const row of rows) updated.push(await loadTicker(row));
      setRows(updated);
      setLastRefresh(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  const analyzedRows = useMemo(() => {
    return rows
      .filter((row) => !row.archived)
      .map((row) => {
        const analysis = enrichAnalysis(row.analysis || emptyAnalysis(), row);
        const alert = alertState(row, analysis.price);
        const isReadyToTrade = alert.triggered && analysis.aiStatus === "READY" && Number(row.rating || 0) >= 3;
        const enriched = { ...row, analysis, alert, isReadyToTrade };
        return { ...enriched, priority: priorityScore(enriched) };
      })
      .sort((a, b) => b.priority - a.priority);
  }, [rows]);

  const archivedRows = useMemo(() => rows.filter((row) => row.archived), [rows]);

  const visibleRows = useMemo(() => {
    let data = analyzedRows;
    if (filter === "READY") data = data.filter((row) => row.isReadyToTrade);
    if (filter === "A") data = data.filter((row) => ["A+", "A"].includes(row.analysis.campaignRank));
    if (filter === "PRESSURE") data = data.filter((row) => ["STRONG", "BUILDING"].includes(row.analysis.pressureBuild));
    if (filter === "HIGH") data = data.filter((row) => Number(row.rating || 0) >= 4);
    return data;
  }, [analyzedRows, filter]);

  const counts = analyzedRows.reduce((acc, row) => {
    acc[row.userStatus || "WATCH"] = (acc[row.userStatus || "WATCH"] || 0) + 1;
    return acc;
  }, { READY: 0, WATCH: 0, AVOID: 0 });

  const readyCount = analyzedRows.filter((row) => row.isReadyToTrade).length;
  const campaignACount = analyzedRows.filter((row) => ["A+", "A"].includes(row.analysis.campaignRank)).length;
  const pressureCount = analyzedRows.filter((row) => ["STRONG", "BUILDING"].includes(row.analysis.pressureBuild)).length;

  return (
    <div dir="rtl" className={ui.app}>
      <style>{`.scroll-white::-webkit-scrollbar{height:10px}.scroll-white::-webkit-scrollbar-thumb{background:rgba(255,255,255,.55);border-radius:999px}`}</style>
      <div className="mx-auto w-full max-w-[96vw] space-y-5">
        <Header counts={counts} readyCount={readyCount} campaignACount={campaignACount} pressureCount={pressureCount} lastRefresh={lastRefresh} setManualOpen={setManualOpen} apiReady={Boolean(viteKey || apiKey)} />
        <ControlPanel apiKey={apiKey} setApiKey={setApiKey} loadAllLive={loadAllLive} loading={loading} />
        <Nav tab={tab} setTab={setTab} archivedCount={archivedRows.length} />
        {tab === "main" && <Toolbar filter={filter} setFilter={setFilter} readyCount={readyCount} campaignACount={campaignACount} pressureCount={pressureCount} />}
        {lastError && <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-bold text-red-300">{lastError}</div>}
        {tab === "main" && <PriorityPanel rows={analyzedRows.slice(0, 2)} />}
        {tab === "guide" && <Guide />}
        {tab === "archive" && <Archive rows={archivedRows} updateRow={updateRow} />}
        {tab === "main" && (
          <WatchTable
            rows={visibleRows}
            drawerTicker={drawerTicker}
            setDrawerTicker={setDrawerTicker}
            updateRow={updateRow}
            openChart={openChart}
            setArchiveModal={setArchiveModal}
            setDeleteTicker={setDeleteTicker}
            loadTicker={loadTicker}
            setRows={setRows}
            setLoading={setLoading}
            setLastError={setLastError}
            setLastRefresh={setLastRefresh}
            loading={loading}
            newTicker={newTicker}
            setNewTicker={setNewTicker}
            addTicker={addTicker}
            tableTheme={tableTheme}
            setTableTheme={setTableTheme}
          />
        )}
      </div>

      {manualOpen && <ManualDrawer setManualOpen={setManualOpen} />}
      {deleteTicker && <DeleteModal ticker={deleteTicker} setTicker={setDeleteTicker} setRows={setRows} />}
      {archiveModal.open && <ArchiveModal archiveModal={archiveModal} setArchiveModal={setArchiveModal} updateRow={updateRow} />}
    </div>
  );
}

function Header({ counts, readyCount, campaignACount, pressureCount, lastRefresh, setManualOpen, apiReady }) {
  return (
    <header className={`${ui.card} p-6`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.35em] text-cyan-300">FREEDOM TRADING OS</div>
          <h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">Campaign Intelligence — Watch List</h1>
          <p className="mt-2 text-sm text-slate-400">Quote Live / Data Health / Pressure / Wyckoff / Add Zone / Rank</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${apiReady ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-red-500/40 bg-red-500/15 text-red-300"}`}>{apiReady ? "🟢 API מוכן" : "🔴 חסר API"}</span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-black text-slate-300">עדכון אחרון: {lastRefresh || "—"}</span>
            <button onClick={() => setManualOpen(true)} className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-black text-white">📘 הוראות יצרן</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-6">
          <Metric label="READY" value={counts.READY || 0} color="text-emerald-300" />
          <Metric label="WATCH" value={counts.WATCH || 0} color="text-yellow-300" />
          <Metric label="AVOID" value={counts.AVOID || 0} color="text-red-300" />
          <Metric label="READY TRADE" value={readyCount} color="text-cyan-300" />
          <Metric label="CAMPAIGN A" value={campaignACount} color="text-orange-300" />
          <Metric label="PRESSURE" value={pressureCount} color="text-purple-300" />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function ControlPanel({ apiKey, setApiKey, loadAllLive, loading }) {
  return (
    <section className={`${ui.card} p-4`}>
      <div className="grid gap-3 lg:grid-cols-2">
        <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Finnhub API Key" className={ui.input} />
        <Button onClick={loadAllLive} disabled={loading} className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
          {loading ? "טוען..." : "טען דאטה חי"}
        </Button>
      </div>
    </section>
  );
}

function Nav({ tab, setTab, archivedCount }) {
  const items = [["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedCount})`]];
  return (
    <nav className={`${ui.card} flex flex-wrap gap-2 p-3`}>
      {items.map(([key, label]) => (
        <Button key={key} onClick={() => setTab(key)} className={tab === key ? ui.accent : ui.navIdle}>{label}</Button>
      ))}
    </nav>
  );
}

function Toolbar({ filter, setFilter, readyCount, campaignACount, pressureCount }) {
  const items = [["ALL", "הכל"], ["READY", `READY TO TRADE (${readyCount})`], ["A", `Campaign A (${campaignACount})`], ["PRESSURE", `Pressure (${pressureCount})`], ["HIGH", "דירוג גבוה ⭐4+"]];
  return (
    <section className={`${ui.card} flex flex-wrap gap-2 p-3`}>
      {items.map(([key, label]) => (
        <Button key={key} onClick={() => setFilter(key)} className={filter === key ? ui.accent : ui.navIdle}>{label}</Button>
      ))}
    </section>
  );
}

function PriorityPanel({ rows }) {
  if (!rows.length) return null;
  return (
    <section className={`${ui.card} p-5`}>
      <h2 className="mb-4 text-xl font-black text-white">🔥 מנוע עדיפות — ההזדמנויות החשובות עכשיו</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const label = priorityLabel(row.priority);
          return (
            <div key={row.ticker} className="rounded-3xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-white">{row.ticker}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${label.cls}`}>{label.text}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>Rank: <b>{row.analysis.campaignRank}</b></div>
                <div>Pressure: <b>{row.analysis.pressureBuild}</b></div>
                <div>Wyckoff: <b>{row.analysis.wyckoffPhase}</b></div>
                <div>Data: <b>{row.analysis.dataQuality}</b></div>
                <div>Priority: <b>{row.priority}</b></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WatchTable(props) {
  const { rows, drawerTicker, setDrawerTicker, updateRow, openChart, setArchiveModal, setDeleteTicker, loadTicker, setRows, setLoading, setLastError, setLastRefresh, loading, newTicker, setNewTicker, addTicker, tableTheme, setTableTheme } = props;
  const table = tableThemes[tableTheme] || tableThemes.dark;

  async function loadSingle(row) {
    setLoading(true);
    setLastError("");
    try {
      const updated = await loadTicker(row);
      setRows((prev) => prev.map((item) => (item.ticker === row.ticker ? updated : item)));
      setLastRefresh(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`overflow-hidden rounded-3xl border-4 ${table.wrap}`}>
      <div className={`${table.top} border-b border-white/40 px-5 py-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className={`text-2xl font-black ${table.title}`}>רשימת מעקב חכמה</h2>
            <p className={`mt-1 text-base font-bold ${table.sub}`}>לחיצה על שורה פותחת מגירה. המסגרת לבנה וברורה.</p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-[760px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-white drop-shadow">בחר צבע טאב:</span>
              {Object.entries(tableThemes).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setTableTheme(key)}
                  className={`rounded-xl border-2 px-4 py-2 text-base font-black ${tableTheme === key ? "border-white bg-white text-black" : "border-white/40 bg-black/30 text-white"}`}
                >
                  {value.label}
                </button>
              ))}
            </div>
            <input value={newTicker} onChange={(event) => setNewTicker(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTicker()} placeholder="הוסף טיקר ולחץ Enter" className={ui.input} />
          </div>
        </div>
      </div>

      <div className="scroll-white overflow-x-auto">
        <table className="w-full min-w-[1950px] border-collapse text-right text-sm">
          <thead className={`${table.head} text-sm font-black uppercase`}>
            <tr>{["טיקר", "מחיר", "%1D", "DATA", "Priority", "Campaign Rank", "Structure", "Pressure Build", "Wyckoff", "Add Zone", "דירוג", "סטטוס", "AI", "סטאפ", "אלרט", "פעולות"].map((header) => <th key={header} className="p-4">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const analysis = row.analysis;
              const label = priorityLabel(row.priority);
              const isOpen = drawerTicker === row.ticker;
              return (
                <React.Fragment key={row.ticker}>
                  <tr onClick={() => setDrawerTicker(isOpen ? "" : row.ticker)} className={`cursor-pointer border-t ${table.row} ${
  row.isReadyToTrade
    ? "bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]"
    : ""
}`} >
                    <td className="p-4"><button onClick={(event) => { event.stopPropagation(); openChart(row.ticker); }} className="text-lg font-black text-blue-500 hover:underline">↗ {row.ticker}</button></td>
                    <td className="p-4 text-lg font-black">{safeNum(analysis.price)}</td>
                    <td className={`p-4 text-lg font-black ${Number(analysis.change1) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{safeNum(analysis.change1, 1)}%</td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${dataQualityClass(analysis.dataQuality)}`}>{analysis.dataQuality}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-3 py-2 font-black ${label.cls}`}>{row.priority}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${rankClass(analysis.campaignRank)}`}>{analysis.campaignRank}</span></td>
                    <td className="max-w-[300px] p-4 font-bold">{analysis.structure}</td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${pressureClass(analysis.pressureBuild)}`}>{analysis.pressureBuild}</span></td>
                    <td className="p-4"><span className="font-black text-yellow-400">{analysis.wyckoffPhase}</span></td>
                    <td className="p-4 font-black text-emerald-400">{analysis.addZone}</td>
                    <td className="p-4">
                      <select value={row.rating || 0} onClick={(event) => event.stopPropagation()} onChange={(event) => updateRow(row.ticker, { rating: Number(event.target.value) })} className={ui.input}>
                        <option value={0}>⭐</option>
                        <option value={1}>⭐ 1</option>
                        <option value={2}>⭐ 2</option>
                        <option value={3}>⭐ 3</option>
                        <option value={4}>⭐ 4</option>
                        <option value={5}>⭐ 5</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select value={row.userStatus || "WATCH"} onClick={(event) => event.stopPropagation()} onChange={(event) => updateRow(row.ticker, { userStatus: event.target.value })} className={`rounded-xl border px-3 py-2 font-black ${statusClass(row.userStatus || "WATCH")}`}>
                        <option value="READY">READY</option>
                        <option value="WATCH">WATCH</option>
                        <option value="AVOID">AVOID</option>
                      </select>
                    </td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${statusClass(analysis.aiStatus)}`}>{analysis.aiStatus}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${setupClass(analysis.setup)}`}>{analysis.setup}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${row.alert.cls}`}>{row.alert.label}</span></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button onClick={(event) => { event.stopPropagation(); loadSingle(row); }} className="border border-emerald-500/40 text-emerald-300">{loading ? "טוען" : "טען"}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); setArchiveModal({ open: true, ticker: row.ticker, reason: "" }); }} className="border border-yellow-500/40 text-yellow-300">ארכיון</Button>
                        <Button onClick={(event) => { event.stopPropagation(); setDeleteTicker(row.ticker); }} className="border border-red-500/40 text-red-300">מחק</Button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && <Drawer row={row} updateRow={updateRow} />}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Drawer({ row, updateRow }) {
  const analysis = row.analysis;
  return (
    <tr className="bg-[#07111f] text-white">
      <td colSpan={16} className="p-5">
        <div className="grid gap-4 xl:grid-cols-3">
          <Info label="DATA HEALTH" value={`${analysis.dataQuality} | ${analysis.dataMessage}`} />
          <Info label="Daily" value={analysis.daily} />
          <Info label="Weekly" value={analysis.weekly} />
          <Info label="Volume" value={`${analysis.volumeSignal} | ${safeNum(analysis.volumeRatio, 2)}x`} />
          <Info label="Decision" value={analysis.decision} />
          <Info label="Invalidation" value={analysis.invalidation} />
          <Info label="Why" value={analysis.why} />
        </div>
        <textarea value={row.thesis || ""} onChange={(event) => updateRow(row.ticker, { thesis: event.target.value })} placeholder="תזה אישית / תוכנית פעולה" className={`${ui.input} mt-4 min-h-[120px] w-full`} />
      </td>
    </tr>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-2 font-bold text-white">{value || "—"}</div>
    </div>
  );
}

function Guide() {
  return (
    <section className={`${ui.card} p-5`}>
      <h2 className="mb-4 text-xl font-black text-cyan-300">מדריך זיהוי Setup + Campaign</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="p-3">מצב</th>
              <th className="p-3">מה לבדוק</th>
              <th className="p-3">פעולה</th>
            </tr>
          </thead>
          <tbody>
            {playbook.map(([mode, check, action]) => (
              <tr key={mode} className="border-b border-slate-800">
                <td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(mode)}`}>{mode}</span></td>
                <td className="p-3 text-white">{check}</td>
                <td className="p-3 font-black text-yellow-300">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Archive({ rows, updateRow }) {
  return (
    <section className={`${ui.card} p-5`}>
      <h2 className="text-2xl font-black text-white">מסך ארכיון</h2>
      {!rows.length ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-400">אין מניות בארכיון.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.ticker} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div>
                <div className="text-xl font-black text-white">{row.ticker}</div>
                <div className="text-sm text-slate-400">{row.archiveReason || "ללא סיבה"}</div>
              </div>
              <Button onClick={() => updateRow(row.ticker, { archived: false })} className="border border-emerald-500/40 text-emerald-300">החזר</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ManualDrawer({ setManualOpen }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4">
      <div className="mr-auto h-full w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/20 bg-[#0B1220] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-3xl font-black text-white">📘 הוראות יצרן</h2>
          <Button onClick={() => setManualOpen(false)} className={ui.accent}>סגור</Button>
        </div>
        <div className="space-y-4 text-sm">
          <Info label="Campaign Rank" value="A/A+ = חזקה ומעניינת | B = מעקב טוב | C = מוקדם | D = חלש" />
          <Info label="Pressure Build" value="מודד אם נבנה לחץ לפני תנועה. STRONG / BUILDING עדיפים." />
          <Info label="Add Zone" value="אזור תיאורטי לבדיקה להוספה. לא כניסה אוטומטית." />
          <Info label="Data Health" value="QUOTE = מחיר חי בלבד | ERROR/EMPTY = לא להשתמש בהחלטת מסחר עד תיקון הדאטה." />
          <Info label="Quote Only" value="אם Finnhub חוסם candles, המערכת תמשיך לעבוד עם מחיר חי בלבד." />
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ ticker, setTicker, setRows }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`${ui.card} w-full max-w-md p-6`}>
        <h3 className="text-2xl font-black text-white">מחיקת מניה</h3>
        <p className="mt-3 text-slate-400">האם למחוק את {ticker}?</p>
        <div className="mt-5 flex gap-3">
          <Button onClick={() => { setRows((prev) => prev.filter((row) => row.ticker !== ticker)); setTicker(null); }} className="border border-red-500/40 bg-red-500/10 text-red-300">מחק</Button>
          <Button onClick={() => setTicker(null)} className={ui.navIdle}>ביטול</Button>
        </div>
      </div>
    </div>
  );
}

function ArchiveModal({ archiveModal, setArchiveModal, updateRow }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`${ui.card} w-full max-w-lg p-6`}>
        <h3 className="text-2xl font-black text-white">העבר לארכיון</h3>
        <textarea
          value={archiveModal.reason}
          onChange={(event) => setArchiveModal((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder="סיבה להעברה לארכיון"
          className={`${ui.input} mt-4 min-h-[120px] w-full`}
        />
        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => {
              updateRow(archiveModal.ticker, { archived: true, archiveReason: archiveModal.reason });
              setArchiveModal({ open: false, ticker: "", reason: "" });
            }}
            className="border border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
          >
            העבר
          </Button>
          <Button onClick={() => setArchiveModal({ open: false, ticker: "", reason: "" })} className={ui.navIdle}>ביטול</Button>
        </div>
      </div>
    </div>
  );
}
