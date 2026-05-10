import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-watchlist-campaign-final-v1";
const FINNHUB_KEY = "finnhub-key";
const COMPACT_KEY = "freedom-compact-mode";
const WATCH_THEME_KEY = "watchlist-theme";

const defaultRows = [
  { ticker: "NVAX", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "", archived: false },
  { ticker: "UUUU", userStatus: "WATCH", rating: 0, alertPrice: "", alertType: "above", thesis: "", thesisDate: "", thesisTitle: "", chartImage: "", archived: false },
];

const theme = {
  app: "bg-[#050816] text-slate-100",
  card: "bg-[#0B1220]/95 border-slate-800/80 shadow-2xl shadow-black/25",
  soft: "bg-[#111827]/80",
  input: "bg-[#050816] border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50",
  muted: "text-slate-400",
  navIdle: "bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-700/80",
  accent: "bg-white text-slate-950 hover:bg-slate-200",
  goldFrame: "border border-yellow-500/25 shadow-[0_0_0_1px_rgba(234,179,8,0.08)]",
};

const watchThemes = {
  "light-gray": { label: "אפור בהיר", wrapper: "bg-[#d8dde6]", top: "bg-[#c9d1dc]", table: "bg-[#e5e7eb] text-slate-900", head: "bg-[#bcc5d1] text-slate-800", row: "border-slate-400/60 hover:bg-white/70", title: "text-slate-950", sub: "text-slate-600", gold: "border-[4px] border-yellow-500 shadow-[0_0_24px_rgba(234,179,8,0.45)]" },
  brown: { label: "חום", wrapper: "bg-[#2a1d14]", top: "bg-[#3b2a1f]", table: "bg-[#4a3728] text-amber-50", head: "bg-[#5c4330] text-amber-100", row: "border-amber-900/40 hover:bg-[#6b4d36]", title: "text-yellow-300", sub: "text-amber-200/80", gold: "border-[4px] border-yellow-400 shadow-[0_0_26px_rgba(250,204,21,0.45)]" },
  white: { label: "לבן", wrapper: "bg-white", top: "bg-[#f3f4f6]", table: "bg-white text-slate-900", head: "bg-[#e5e7eb] text-slate-900", row: "border-slate-300 hover:bg-slate-100", title: "text-slate-950", sub: "text-slate-600", gold: "border-[4px] border-yellow-500 shadow-[0_0_26px_rgba(234,179,8,0.45)]" },
};

const playbook = [
  { mode: "Spike", check: "ווליום חריג + נר חזק", result: "התחלת מהלך", action: "WATCH / READY אם יש המשכיות", focus: "לחכות ל־base קטן אחרי הספייק", avoid: "לא לרדוף אחרי גאפ פתיחה" },
  { mode: "Pullback", check: "ירידה במחיר + ירידה בווליום", result: "תיקון בריא", action: "READY", focus: "Higher Low / נר עצירה / טווח קטן", avoid: "לא לקנות אם התיקון נהיה חד" },
  { mode: "Base", check: "טווח צר + ווליום יורד", result: "מתבשל מהלך", action: "WATCH", focus: "Range High / Range Low", avoid: "בסיס שנשבר למטה" },
  { mode: "Breakout", check: "פריצה + ווליום עולה", result: "פריצה עם ביקוש", action: "READY", focus: "Retest / Mini Base", avoid: "פריצה בלי ווליום" },
  { mode: "Pressure Build", check: "טווח מתכווץ + שיאים קרובים", result: "ביקוש נבנה מתחת להתנגדות", action: "WATCH / READY", focus: "Breakout או Pullback קטן", avoid: "כניסה כשהמחיר מתוח" },
  { mode: "Breakdown", check: "ירידה במחיר + ווליום גבוה", result: "מוכרים שולטים", action: "AVOID", focus: "Reclaim ברור", avoid: "הוספה לפני חזרה מעל התמיכה" },
];

function safeNum(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(Number(n) || 0, max));
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : 0;
}

function maxValue(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : 0;
}

function minValue(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? Math.min(...nums) : 0;
}

function emptyAnalysis(why = "צריך לטעון דאטה חי") {
  return {
    setup: "Needs Data", structure: "אין מספיק נתונים לניתוח", dailyStructure: "—", weeklyStructure: "—", volumeSignal: "Unknown", volumeRatio: 0,
    aiStatus: "WATCH", score: 0, entryZone: "—", invalidation: "—", why, price: null, change1: null, rangePct: null,
    pressureBuild: "WAIT", pressureScore: 0, wyckoffPhase: "Needs Data", addZone: "—", addPlan: "—", riskLine: "—",
    campaignRank: "D", campaignScore: 0, weeklyBias: "Unknown", continuation: "Unknown", decision: "Load Data",
  };
}

function candlesFromFinnhub(data) {
  if (!data || data.s !== "ok" || !Array.isArray(data.c)) return [];
  return data.c.map((close, i) => ({
    close: Number(close), open: Number(data.o?.[i]), high: Number(data.h?.[i]), low: Number(data.l?.[i]), volume: Number(data.v?.[i]), time: Number(data.t?.[i]),
  })).filter((c) => Number.isFinite(c.close) && Number.isFinite(c.high) && Number.isFinite(c.low));
}

function analyzeCandleSet(candles) {
  if (!candles || candles.length < 25) return { ok: false };
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume || 0);
  const last20 = candles.slice(-20);
  const last10 = candles.slice(-10);
  const prev20 = candles.slice(-21, -1);
  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));
  const avgVol20 = average(volumes.slice(-21, -1));
  const volumeRatio = avgVol20 ? (last.volume || 0) / avgVol20 : 0;
  const change1 = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const range20High = maxValue(last20.map((c) => c.high));
  const range20Low = minValue(last20.map((c) => c.low));
  const range10High = maxValue(last10.map((c) => c.high));
  const range10Low = minValue(last10.map((c) => c.low));
  const prev20High = maxValue(prev20.map((c) => c.high));
  const prev20Low = minValue(prev20.map((c) => c.low));
  const range20Pct = range20Low ? ((range20High - range20Low) / range20Low) * 100 : 0;
  const range10Pct = range10Low ? ((range10High - range10Low) / range10Low) * 100 : 0;
  const above20 = last.close >= sma20;
  const above50 = sma50 ? last.close >= sma50 : true;
  const closeNearHigh20 = range20High ? ((range20High - last.close) / range20High) * 100 : 99;
  const closeNearLow20 = range20Low ? ((last.close - range20Low) / range20Low) * 100 : 99;
  const breakout = last.close > prev20High && volumeRatio >= 1.15;
  const spike = change1 >= 5 && volumeRatio >= 1.4;
  const breakdown = last.close < prev20Low || (change1 <= -3 && volumeRatio >= 1.2);
  const controlledPullback = change1 < 0 && change1 >= -4 && above20 && volumeRatio <= 1.15;
  const tightBase = range10Pct > 0 && range10Pct <= 7 && range20Pct <= 14 && closeNearHigh20 <= 8;
  const pressure = tightBase && above20 && volumeRatio <= 1.25;
  const accumulationCandidate = range20Pct <= 18 && closeNearLow20 >= 4 && closeNearHigh20 <= 12 && volumeRatio <= 1.35;

  let setup = "Live Quote";
  let aiStatus = "WATCH";
  let score = 50;
  let why = "Candles loaded.";
  if (breakdown) { setup = "Breakdown"; aiStatus = "AVOID"; score = 25; why = "Breakdown / selling pressure detected."; }
  else if (spike) { setup = "Spike"; aiStatus = "WATCH"; score = 68; why = "Spike with volume expansion. Wait for base/pullback."; }
  else if (breakout) { setup = "Breakout"; aiStatus = "READY"; score = 76; why = "Breakout above recent range with volume."; }
  else if (controlledPullback) { setup = "Pullback"; aiStatus = "READY"; score = 72; why = "Controlled pullback above MA20 with quiet volume."; }
  else if (pressure) { setup = "Base"; aiStatus = "WATCH"; score = 70; why = "Tight base / pressure build near range high."; }
  else if (accumulationCandidate) { setup = "Base"; aiStatus = "WATCH"; score = 62; why = "Range compression / accumulation candidate."; }

  let volumeSignal = "Normal";
  if (volumeRatio >= 2) volumeSignal = "Volume Spike";
  else if (volumeRatio >= 1.35) volumeSignal = "Volume Expansion";
  else if (volumeRatio <= 0.75) volumeSignal = "Quiet Volume";

  let trendBias = "Neutral";
  if (above20 && above50) trendBias = "Above MA20/MA50";
  if (!above20 && !above50) trendBias = "Below MA20/MA50";
  if (above20 && !above50) trendBias = "Trying to Reclaim";

  return { ok: true, setup, aiStatus, score, why, price: last.close, change1, high: last.high, low: last.low, open: last.open, rangePct: last.low ? ((last.high - last.low) / last.low) * 100 : 0, range20High, range20Low, range20Pct, range10Pct, sma20, sma50, avgVol20, volume: last.volume, volumeRatio, volumeSignal, trendBias, breakout, spike, breakdown, controlledPullback, tightBase, pressure, accumulationCandidate, closeNearHigh20, closeNearLow20 };
}

function deriveCampaignFields(base, row = {}) {
  const a = { ...emptyAnalysis(), ...(base || {}) };
  const change = Number(a.change1) || 0;
  const price = Number(a.price) || 0;
  const range20Pct = Number(a.range20Pct) || Number(a.rangePct) || 0;
  const volumeRatio = Number(a.volumeRatio) || 0;
  const rating = Number(row.rating || 0);

  let pressureScore = 25;
  if (a.setup === "Base") pressureScore += 24;
  if (a.setup === "Pullback") pressureScore += 20;
  if (a.setup === "Breakout") pressureScore += 14;
  if (a.setup === "Spike") pressureScore += 8;
  if (a.setup === "Breakdown") pressureScore -= 35;
  if (a.pressure) pressureScore += 22;
  if (a.tightBase) pressureScore += 18;
  if (a.accumulationCandidate) pressureScore += 14;
  if (a.controlledPullback) pressureScore += 12;
  if (Math.abs(change) <= 1.2) pressureScore += 10;
  if (range20Pct > 0 && range20Pct <= 14) pressureScore += 10;
  if (volumeRatio > 0 && volumeRatio <= 1.15) pressureScore += 8;
  if (rating >= 4) pressureScore += 8;
  pressureScore = clamp(pressureScore);

  let pressureBuild = "WAIT";
  if (pressureScore >= 78) pressureBuild = "STRONG";
  else if (pressureScore >= 58) pressureBuild = "BUILDING";
  else if (pressureScore >= 40) pressureBuild = "EARLY";
  else if (a.setup === "Breakdown") pressureBuild = "WEAK";

  let wyckoffPhase = "Phase B / Watch";
  if (a.accumulationCandidate && pressureScore >= 58) wyckoffPhase = "Phase C→D";
  if (a.controlledPullback) wyckoffPhase = "D — Backup / LPS";
  if (a.breakout) wyckoffPhase = "Phase D — Markup";
  if (a.spike) wyckoffPhase = "Post Spike / Test";
  if (a.breakdown || a.setup === "Breakdown") wyckoffPhase = "Distribution Risk";
  if (a.setup === "Needs Data") wyckoffPhase = "Needs Data";

  let weeklyBias = a.weeklyTrend || a.weeklyBias || "Neutral";
  if (a.setup === "Breakdown" || a.aiStatus === "AVOID") weeklyBias = "Weak / Avoid";

  let addZone = a.entryZone || "—";
  let addPlan = "Starter only אחרי אישור מבנה";
  let riskLine = a.invalidation || "—";
  if (price) {
    const low = Number(a.low) || price * 0.97;
    const rangeLow = Number(a.range20Low) || low;
    const rangeHigh = Number(a.range20High) || price * 1.03;
    if (a.setup === "Pullback") { addZone = `${safeNum(price * 0.96)}–${safeNum(price * 1.01)}`; addPlan = "Add #1 רק אם התיקון נשאר Controlled Pullback"; riskLine = `Below ${safeNum(Math.min(low, rangeLow))}`; }
    else if (a.setup === "Base") { addZone = `${safeNum(rangeHigh * 0.99)}–${safeNum(rangeHigh * 1.03)}`; addPlan = "Add על Reclaim / Range High, לא באמצע הטווח"; riskLine = `Below range low ${safeNum(rangeLow)}`; }
    else if (a.setup === "Breakout") { addZone = `${safeNum(price * 0.97)}–${safeNum(price * 1.01)}`; addPlan = "לא לרדוף; לחכות Retest / Mini Base"; riskLine = `Failed breakout below ${safeNum(price * 0.97)}`; }
    else if (a.setup === "Spike") { addZone = `${safeNum(price * 0.9)}–${safeNum(price * 0.96)}`; addPlan = "Add רק אחרי Base קטן אחרי הספייק"; riskLine = `Spike low / ${safeNum(Math.min(low, rangeLow))}`; }
    else if (a.setup === "Breakdown") { addZone = "No Add"; addPlan = "אין הוספה עד Reclaim ברור"; riskLine = `Weak below ${safeNum(price * 0.98)}`; }
  }

  let campaignScore = 0;
  campaignScore += a.aiStatus === "READY" ? 24 : a.aiStatus === "WATCH" ? 14 : -20;
  campaignScore += a.setup === "Pullback" ? 24 : a.setup === "Base" ? 22 : a.setup === "Breakout" ? 18 : a.setup === "Spike" ? 10 : a.setup === "Breakdown" ? -30 : 5;
  campaignScore += Math.round(pressureScore * 0.32);
  campaignScore += rating * 7;
  campaignScore += a.weeklyTrend === "Bullish Weekly" || a.weeklyTrend === "Weekly Breakout" ? 10 : a.weeklyTrend === "Weak Weekly" ? -12 : 0;
  campaignScore += a.volumeSignal === "Volume Expansion" || a.volumeSignal === "Volume Spike" ? 5 : 0;
  campaignScore += Math.round((Number(a.score) || 0) * 0.14);
  campaignScore = clamp(campaignScore);

  let campaignRank = "D";
  if (campaignScore >= 85) campaignRank = "A+";
  else if (campaignScore >= 72) campaignRank = "A";
  else if (campaignScore >= 58) campaignRank = "B";
  else if (campaignScore >= 40) campaignRank = "C";

  const continuation = campaignScore >= 72 ? "High" : campaignScore >= 55 ? "Medium" : "Low";
  let decision = "WATCH";
  if (campaignRank === "A+" || campaignRank === "A") decision = "CAMPAIGN READY";
  if (campaignRank === "B") decision = "WATCH FOR ADD";
  if (campaignRank === "C") decision = "WAIT";
  if (campaignRank === "D" || a.setup === "Breakdown") decision = "AVOID / NO ADD";
  return { ...a, pressureScore, pressureBuild, wyckoffPhase, addZone, addPlan, riskLine, campaignScore, campaignRank, weeklyBias, continuation, decision };
}

function normalizeAnalysis(row) { return deriveCampaignFields(row.analysis || emptyAnalysis(), row); }
function statusClass(status) { if (status === "READY") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"; if (status === "AVOID") return "text-red-300 bg-red-500/10 border-red-500/30"; return "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"; }
function setupClass(setup) { if (setup === "Spike") return "text-purple-300 bg-purple-500/10 border-purple-500/30"; if (setup === "Pullback") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"; if (setup === "Breakdown") return "text-red-300 bg-red-500/10 border-red-500/30"; if (setup === "Base") return "text-blue-300 bg-blue-500/10 border-blue-500/30"; if (setup === "Breakout") return "text-orange-300 bg-orange-500/10 border-orange-500/30"; if (setup === "Live Quote") return "text-slate-300 bg-slate-500/10 border-slate-500/30"; return "text-zinc-300 bg-zinc-500/10 border-zinc-500/30"; }
function pressureClass(value) { if (value === "STRONG") return "text-cyan-200 bg-cyan-500/10 border-cyan-400/30"; if (value === "BUILDING") return "text-yellow-200 bg-yellow-500/10 border-yellow-400/30"; if (value === "EARLY") return "text-blue-200 bg-blue-500/10 border-blue-400/30"; if (value === "WEAK") return "text-red-200 bg-red-500/10 border-red-400/30"; return "text-slate-300 bg-slate-500/10 border-slate-500/30"; }
function wyckoffClass(value = "") { if (value.includes("C→D") || value.includes("LPS")) return "text-emerald-200 bg-emerald-500/10 border-emerald-400/30"; if (value.includes("Markup")) return "text-cyan-200 bg-cyan-500/10 border-cyan-400/30"; if (value.includes("Risk")) return "text-red-200 bg-red-500/10 border-red-400/30"; if (value.includes("Post")) return "text-purple-200 bg-purple-500/10 border-purple-400/30"; return "text-slate-300 bg-slate-500/10 border-slate-500/30"; }
function rankClass(rank) { if (rank === "A+" || rank === "A") return "text-emerald-200 bg-emerald-500/15 border-emerald-400/40"; if (rank === "B") return "text-yellow-200 bg-yellow-500/15 border-yellow-400/40"; if (rank === "C") return "text-blue-200 bg-blue-500/15 border-blue-400/40"; return "text-red-200 bg-red-500/15 border-red-400/40"; }
function analyzeAlert(row, price) { const target = Number(row.alertPrice); const current = Number(price); if (!target || !current) return { state: "NO ALERT", triggered: false, label: "אין אלרט", dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" }; const type = row.alertType || "above"; const triggered = type === "above" ? current >= target : current <= target; const distancePct = type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100; const absDistance = Math.abs(distancePct); if (triggered) return { state: "TRIGGERED", triggered: true, label: "מוכנה", dot: "bg-emerald-400", className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" }; if (absDistance <= 3) return { state: "NEAR", triggered: false, label: `מתקרבת ${safeNum(absDistance, 1)}%`, dot: "bg-yellow-400", className: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30" }; return { state: "WAIT", triggered: false, label: `ממתין ${safeNum(absDistance, 1)}%`, dot: "bg-slate-500", className: "text-slate-300 bg-slate-500/10 border-slate-500/30" }; }
function priorityScore(row) { const alertScore = row.alert.state === "NEAR" ? 40 : row.isReadyToTrade ? 38 : row.alert.state === "TRIGGERED" ? 30 : row.alert.state === "WAIT" ? 10 : 0; const ratingScore = (row.rating || 0) * 8; const aiScore = row.analysis.aiStatus === "READY" ? 20 : row.analysis.aiStatus === "WATCH" ? 10 : -15; const setupScore = row.analysis.setup === "Pullback" ? 15 : row.analysis.setup === "Breakout" ? 12 : row.analysis.setup === "Base" ? 8 : row.analysis.setup === "Spike" ? 5 : row.analysis.setup === "Breakdown" ? -25 : 5; const campaignBonus = row.analysis.campaignRank === "A+" ? 16 : row.analysis.campaignRank === "A" ? 12 : row.analysis.campaignRank === "B" ? 8 : row.analysis.campaignRank === "C" ? 3 : 0; return clamp(alertScore + ratingScore + aiScore + setupScore + campaignBonus + Math.round((row.analysis.pressureScore || 0) / 12)); }
function priorityLabel(score) { if (score >= 80) return { text: "TOP", className: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" }; if (score >= 60) return { text: "HIGH", className: "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30" }; if (score >= 40) return { text: "MED", className: "bg-blue-500/20 text-blue-200 border border-blue-500/30" }; return { text: "LOW", className: "bg-slate-500/20 text-slate-300 border border-slate-500/30" }; }
function Button({ children, className = "", ...props }) { return <button {...props} className={`rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>; }

export default function WatchListDashboard() {
  const [rows, setRows] = useState(() => { const saved = localStorage.getItem(STORAGE_KEY); if (!saved) return defaultRows; try { return JSON.parse(saved); } catch { return defaultRows; } });
  const viteFinnhubKey = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_FINNHUB_API_KEY : "";
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(FINNHUB_KEY) || viteFinnhubKey || "");
  const [newTicker, setNewTicker] = useState("");
  const [activePanel, setActivePanel] = useState("main");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [drawerTicker, setDrawerTicker] = useState("");
  const [watchFilter, setWatchFilter] = useState("ALL");
  const [focusMode, setFocusMode] = useState(false);
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem(COMPACT_KEY) === "true");
  const [deleteTicker, setDeleteTicker] = useState(null);
  const [archiveModal, setArchiveModal] = useState({ open: false, ticker: null, reason: "" });
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem("telegram-bot-token") || "");
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem("telegram-chat-id") || "");
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [apiConnected, setApiConnected] = useState(Boolean(apiKey));
  const [manualOpen, setManualOpen] = useState(false);
  const [watchListTheme, setWatchListTheme] = useState(() => localStorage.getItem(WATCH_THEME_KEY) || "light-gray");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);
  useEffect(() => { localStorage.setItem(FINNHUB_KEY, apiKey || ""); setApiConnected(Boolean(apiKey)); }, [apiKey]);
  useEffect(() => { localStorage.setItem(COMPACT_KEY, compactMode ? "true" : "false"); }, [compactMode]);
  useEffect(() => { localStorage.setItem("telegram-bot-token", telegramBotToken || ""); }, [telegramBotToken]);
  useEffect(() => { localStorage.setItem("telegram-chat-id", telegramChatId || ""); }, [telegramChatId]);
  useEffect(() => { localStorage.setItem(WATCH_THEME_KEY, watchListTheme); }, [watchListTheme]);

  const analyzedRows = useMemo(() => rows.filter((row) => !row.archived).map((row) => { const analysis = normalizeAnalysis(row); const alert = analyzeAlert(row, analysis.price); const isReadyToTrade = alert.triggered && (row.rating || 0) >= 3 && analysis.aiStatus === "READY"; const enriched = { ...row, analysis, alert, isReadyToTrade }; return { ...enriched, priority: priorityScore(enriched) }; }).sort((a, b) => (b.priority || 0) - (a.priority || 0)), [rows]);
  const archivedRows = useMemo(() => rows.filter((row) => row.archived).map((row) => { const analysis = normalizeAnalysis(row); return { ...row, analysis, alert: analyzeAlert(row, analysis.price) }; }), [rows]);
  const visibleRows = useMemo(() => { let filtered = analyzedRows; if (watchFilter === "READY_TO_TRADE") filtered = filtered.filter((r) => r.isReadyToTrade); if (watchFilter === "NEAR") filtered = filtered.filter((r) => r.alert.state === "NEAR"); if (watchFilter === "TRIGGERED") filtered = filtered.filter((r) => r.alert.state === "TRIGGERED"); if (watchFilter === "HIGH_RATING") filtered = filtered.filter((r) => (r.rating || 0) >= 4); if (watchFilter === "CAMPAIGN_A") filtered = filtered.filter((r) => ["A+", "A"].includes(r.analysis.campaignRank)); if (watchFilter === "PRESSURE") filtered = filtered.filter((r) => ["STRONG", "BUILDING"].includes(r.analysis.pressureBuild)); if (focusMode) filtered = filtered.filter((r) => r.isReadyToTrade || r.alert.state === "NEAR" || ["A+", "A"].includes(r.analysis.campaignRank)); return filtered; }, [analyzedRows, watchFilter, focusMode]);
  const counts = analyzedRows.reduce((acc, row) => { acc[row.userStatus || "WATCH"] += 1; return acc; }, { READY: 0, WATCH: 0, AVOID: 0 });
  const readyToTradeCount = analyzedRows.filter((r) => r.isReadyToTrade).length;
  const campaignACount = analyzedRows.filter((r) => ["A+", "A"].includes(r.analysis.campaignRank)).length;
  const pressureCount = analyzedRows.filter((r) => ["STRONG", "BUILDING"].includes(r.analysis.pressureBuild)).length;
  const topPriorityRows = analyzedRows.slice(0, 3);

  function updateRow(ticker, patch) { setRows((prev) => prev.map((row) => (row.ticker === ticker ? { ...row, ...patch } : row))); }
  function addTicker() { const ticker = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, ""); if (!ticker) { setLastError("תכניס טיקר תקין לפני הוספה"); return; } setRows((prev) => { const existing = prev.find((row) => row.ticker === ticker); if (existing) return prev.map((row) => (row.ticker === ticker ? { ...row, archived: false } : row)); return [...prev, { ticker, rating: 0, alertPrice: "", alertType: "above", userStatus: "WATCH", thesis: "", thesisDate: today, thesisTitle: "", chartImage: "", archived: false, analysis: emptyAnalysis() }]; }); setNewTicker(""); setLastError(""); setActivePanel("main"); }
  function openChart(ticker) { window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank"); }
  function handleImageUpload(ticker, file) { if (!file) return; const reader = new FileReader(); reader.onload = (event) => updateRow(ticker, { chartImage: event.target.result }); reader.readAsDataURL(file); }
  async function sendTelegramAlert(message) { if (!telegramBotToken || !telegramChatId) return; try { await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramChatId, text: message }) }); } catch (error) { console.log("Telegram alert failed", error); } }

  async function loadTicker(row) {
    const cleanKey = apiKey.trim();
    if (!cleanKey) { setApiConnected(false); setLastError("חסר Finnhub API Key"); return row; }
    try {
      const now = Math.floor(Date.now() / 1000);
      const dayFrom = now - 60 * 60 * 24 * 170;
      const weekFrom = now - 60 * 60 * 24 * 900;
      const [quoteRes, dailyRes, weeklyRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${cleanKey}`),
        fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${row.ticker}&resolution=D&from=${dayFrom}&to=${now}&token=${cleanKey}`),
        fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${row.ticker}&resolution=W&from=${weekFrom}&to=${now}&token=${cleanKey}`),
      ]);
      const quote = await quoteRes.json();
      const dailyJson = await dailyRes.json();
      const weeklyJson = await weeklyRes.json();
      if (quote.error || dailyJson.error || weeklyJson.error) { const err = quote.error || dailyJson.error || weeklyJson.error; setApiConnected(false); return { ...row, analysis: deriveCampaignFields(emptyAnalysis(`שגיאת API: ${err}`), row) }; }
      const daily = analyzeCandleSet(candlesFromFinnhub(dailyJson));
      const weekly = analyzeCandleSet(candlesFromFinnhub(weeklyJson));
      if (!daily.ok) {
        if (!quote || !quote.c || quote.c === 0) return { ...row, analysis: deriveCampaignFields(emptyAnalysis("לא התקבלו נרות או מחיר חי — בדוק טיקר / API"), row) };
        const price = quote.c; const prevClose = quote.pc || quote.c; const change1 = prevClose ? ((price - prevClose) / prevClose) * 100 : 0; const high = quote.h || price; const low = quote.l || price; const open = quote.o || prevClose || price; const rangePct = low ? ((high - low) / low) * 100 : 0;
        const baseAnalysis = { ...emptyAnalysis("Quote only — candles unavailable"), setup: change1 > 3 ? "Breakout" : change1 < -3 ? "Breakdown" : "Live Quote", aiStatus: change1 < -3 ? "AVOID" : change1 > 3 ? "READY" : "WATCH", score: change1 > 3 ? 68 : change1 < -3 ? 25 : 50, structure: `Quote Only | O ${safeNum(open)} | H ${safeNum(high)} | L ${safeNum(low)} | Range ${safeNum(rangePct, 1)}%`, volumeSignal: "No candles", price, change1, high, low, open, rangePct, entryZone: `${safeNum(price * 0.98)}–${safeNum(price * 1.02)}`, invalidation: `Below ${safeNum(low)}` };
        return { ...row, analysis: deriveCampaignFields(baseAnalysis, row), lastLoadedAt: new Date().toISOString(), alertNotified: false };
      }
      let weeklyTrend = "Neutral Weekly";
      if (weekly.ok) { if (weekly.trendBias === "Above MA20/MA50") weeklyTrend = "Bullish Weekly"; if (weekly.trendBias === "Below MA20/MA50") weeklyTrend = "Weak Weekly"; if (weekly.setup === "Breakout") weeklyTrend = "Weekly Breakout"; if (weekly.setup === "Breakdown") weeklyTrend = "Weak Weekly"; }
      const baseAnalysis = { setup: daily.setup, aiStatus: daily.aiStatus, score: daily.score, why: `${daily.why} | Daily volume: ${daily.volumeSignal} (${safeNum(daily.volumeRatio, 2)}x) | Weekly: ${weeklyTrend}`, structure: `D: ${daily.trendBias} | Range20 ${safeNum(daily.range20Pct, 1)}% | Near High ${safeNum(daily.closeNearHigh20, 1)}%`, dailyStructure: `Price ${safeNum(daily.price)} | SMA20 ${safeNum(daily.sma20)} | SMA50 ${safeNum(daily.sma50)} | Range20 ${safeNum(daily.range20Low)}–${safeNum(daily.range20High)}`, weeklyStructure: weekly.ok ? `W: ${weekly.trendBias} | Setup ${weekly.setup} | Range20 ${safeNum(weekly.range20Pct, 1)}%` : "Weekly candles unavailable", volumeSignal: daily.volumeSignal, volumeRatio: daily.volumeRatio, avgVolume20: daily.avgVol20, volume: daily.volume, trendBias: daily.trendBias, weeklyTrend, price: daily.price, change1: daily.change1, high: daily.high, low: daily.low, open: daily.open, rangePct: daily.rangePct, range20High: daily.range20High, range20Low: daily.range20Low, range20Pct: daily.range20Pct, range10Pct: daily.range10Pct, closeNearHigh20: daily.closeNearHigh20, closeNearLow20: daily.closeNearLow20, breakout: daily.breakout, spike: daily.spike, breakdown: daily.breakdown, controlledPullback: daily.controlledPullback, tightBase: daily.tightBase, pressure: daily.pressure, accumulationCandidate: daily.accumulationCandidate, entryZone: `${safeNum(daily.price * 0.98)}–${safeNum(daily.price * 1.02)}`, invalidation: `Below ${safeNum(Math.min(daily.low, daily.range20Low || daily.low))}` };
      return { ...row, analysis: deriveCampaignFields(baseAnalysis, row), lastLoadedAt: new Date().toISOString(), alertNotified: false };
    } catch (error) { setApiConnected(false); return { ...row, analysis: deriveCampaignFields(emptyAnalysis("טעינת דאטה נכשלה — בדוק חיבור / API / CORS / מגבלת API"), row) }; }
  }

  async function loadAllLive() { setLoading(true); setLastError(""); try { const updated = []; for (const row of rows) updated.push(await loadTicker(row)); setRows(updated); setApiConnected(true); setLastRefreshTime(new Date().toLocaleTimeString()); } catch (error) { setApiConnected(false); setLastError("טעינת API נכשלה. בדוק Key / חיבור / מגבלת API."); } finally { setLoading(false); } }

  useEffect(() => { analyzedRows.forEach((row) => { if (row.alert.triggered && !row.alertNotified) { try { const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"); audio.play(); } catch {} updateRow(row.ticker, { alertNotified: true }); sendTelegramAlert(`🚨 ${row.ticker}
${row.alert.label}
Setup: ${row.analysis.setup}
Wyckoff: ${row.analysis.wyckoffPhase}
Campaign Rank: ${row.analysis.campaignRank}
Priority: ${row.priority}/100
Price: ${safeNum(row.analysis.price)}`); } }); }, [analyzedRows]);

  return <div dir="rtl" className={`min-h-screen p-4 lg:p-6 ${theme.app}`}><style>{`.ft-compact td,.ft-compact th{padding:.45rem .65rem!important}.ft-actions{opacity:.35;transition:opacity .18s ease,transform .18s ease}tr:hover .ft-actions{opacity:1;transform:translateX(-2px)}.ft-row-glow-ready{box-shadow:inset 4px 0 0 rgba(16,185,129,.65)}.ft-row-glow-near{box-shadow:inset 4px 0 0 rgba(234,179,8,.65)}.ft-row-glow-open{box-shadow:inset 4px 0 0 rgba(148,163,184,.7)}.ft-row-glow-campaign{box-shadow:inset 4px 0 0 rgba(34,211,238,.72)}.ft-gold-scroll::-webkit-scrollbar{height:10px}.ft-gold-scroll::-webkit-scrollbar-thumb{background:rgba(234,179,8,.45);border-radius:999px}`}</style><div className="mx-auto w-full max-w-[96vw] space-y-5"><Header apiConnected={apiConnected} lastRefreshTime={lastRefreshTime} setManualOpen={setManualOpen} counts={counts} readyToTradeCount={readyToTradeCount} campaignACount={campaignACount} pressureCount={pressureCount} /><ApiPanel apiKey={apiKey} setApiKey={setApiKey} loading={loading} loadAllLive={loadAllLive} telegramBotToken={telegramBotToken} setTelegramBotToken={setTelegramBotToken} telegramChatId={telegramChatId} setTelegramChatId={setTelegramChatId} /><Nav activePanel={activePanel} setActivePanel={setActivePanel} archivedCount={archivedRows.length} />{activePanel === "main" && <Toolbar watchFilter={watchFilter} setWatchFilter={setWatchFilter} readyToTradeCount={readyToTradeCount} campaignACount={campaignACount} pressureCount={pressureCount} compactMode={compactMode} setCompactMode={setCompactMode} focusMode={focusMode} setFocusMode={setFocusMode} />}{lastError && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{lastError}</div>}{activePanel === "main" && topPriorityRows.length > 0 && <PriorityPanel rows={topPriorityRows} setDrawerTicker={setDrawerTicker} />}{activePanel === "guide" && <Guide />}{activePanel === "archive" && <Archive rows={archivedRows} updateRow={updateRow} />}{activePanel === "main" && <WatchTable rows={visibleRows} compactMode={compactMode} drawerTicker={drawerTicker} setDrawerTicker={setDrawerTicker} updateRow={updateRow} openChart={openChart} setArchiveModal={setArchiveModal} setDeleteTicker={setDeleteTicker} loadTicker={loadTicker} setRows={setRows} setLoading={setLoading} setLastError={setLastError} setLastRefreshTime={setLastRefreshTime} loading={loading} handleImageUpload={handleImageUpload} today={today} newTicker={newTicker} setNewTicker={setNewTicker} addTicker={addTicker} watchListTheme={watchListTheme} setWatchListTheme={setWatchListTheme} />}<div className={`rounded-2xl border p-3 text-xs ${theme.card} ${theme.muted}`}>Smart Alert: אם המחיר עבר את היעד — השורה תעלה למעלה ותסומן. Campaign Rank הוא דירוג עזר בלבד — החלטה סופית לפי גרף שבועי/יומי.</div></div>{deleteTicker && <DeleteModal ticker={deleteTicker} setTicker={setDeleteTicker} setRows={setRows} />}{archiveModal.open && <ArchiveModal archiveModal={archiveModal} setArchiveModal={setArchiveModal} updateRow={updateRow} />}{manualOpen && <ManualDrawer setManualOpen={setManualOpen} />}</div>;
}

function Header({ apiConnected, lastRefreshTime, setManualOpen, counts, readyToTradeCount, campaignACount, pressureCount }) { return <header className={`rounded-3xl border p-6 ${theme.card}`}><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-black tracking-[0.35em] text-cyan-300">FREEDOM TRADING OS</div><h1 className="mt-2 text-3xl font-black tracking-tight text-white lg:text-4xl">Campaign Intelligence — Watch List</h1><p className="mt-2 text-sm text-slate-400">מערכת לניהול קמפיינים — Structure / Pressure / Wyckoff / Add Zone / Rank.</p><div className="mt-4 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${apiConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{apiConnected ? "🟢 API מחובר" : "🔴 API לא מחובר"}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${theme.navIdle}`}>עדכון אחרון: {lastRefreshTime || "—"}</span><button type="button" onClick={() => setManualOpen(true)} className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300 hover:bg-yellow-500/20">📘 הוראות יצרן</button></div></div><div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-6"><Metric label="READY" value={counts.READY} color="text-emerald-300" /><Metric label="WATCH" value={counts.WATCH} color="text-yellow-300" /><Metric label="AVOID" value={counts.AVOID} color="text-red-300" /><Metric label="READY TRADE" value={readyToTradeCount} color="text-cyan-300" /><Metric label="CAMPAIGN A" value={campaignACount} color="text-emerald-300" /><Metric label="PRESSURE" value={pressureCount} color="text-yellow-300" /></div></div></header>; }
function ApiPanel({ apiKey, setApiKey, loading, loadAllLive, telegramBotToken, setTelegramBotToken, telegramChatId, setTelegramChatId }) { return <section className={`rounded-3xl border p-4 ${theme.card}`}><div className="grid gap-3 lg:grid-cols-2"><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Finnhub API Key" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} /><Button onClick={loadAllLive} disabled={loading} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{loading ? "טוען..." : "טען דאטה חי"}</Button><input value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="Telegram Bot Token" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} /><input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className={`rounded-2xl border px-4 py-3 text-sm outline-none ${theme.input}`} /></div></section>; }
function Nav({ activePanel, setActivePanel, archivedCount }) { return <nav className={`flex flex-wrap gap-2 rounded-3xl border p-3 ${theme.card}`}>{[["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedCount})`]].map(([key, label]) => <Button key={key} onClick={() => setActivePanel(key)} className={activePanel === key ? theme.accent : theme.navIdle}>{label}</Button>)}</nav>; }
function Metric({ label, value, color }) { return <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4"><div className={`text-3xl font-black ${color}`}>{value}</div><div className="text-xs text-slate-400">{label}</div></div>; }
function Toolbar({ watchFilter, setWatchFilter, readyToTradeCount, campaignACount, pressureCount, compactMode, setCompactMode, focusMode, setFocusMode }) { const filters = [["ALL", "הכל"], ["READY_TO_TRADE", `READY TO TRADE (${readyToTradeCount})`], ["CAMPAIGN_A", `Campaign A (${campaignACount})`], ["PRESSURE", `Pressure (${pressureCount})`], ["TRIGGERED", "מוכנות"], ["NEAR", "מתקרבות"], ["HIGH_RATING", "דירוג גבוה ⭐4+"]]; return <section className={`rounded-3xl border p-3 ${theme.card}`}><div className="flex flex-wrap items-center gap-2">{filters.map(([key, label]) => <Button key={key} onClick={() => setWatchFilter(key)} className={watchFilter === key ? theme.accent : theme.navIdle}>{label}</Button>)}<button type="button" onClick={() => setCompactMode(!compactMode)} className={`rounded-full px-3 py-2 text-xs font-black ${compactMode ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300"}`}>↔️ מצב קומפקטי</button><button type="button" onClick={() => setFocusMode(!focusMode)} className={`rounded-full px-3 py-2 text-xs font-black ${focusMode ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-300"}`}>🎯 מצב פוקוס</button></div></section>; }
function PriorityPanel({ rows, setDrawerTicker }) { return <section className={`rounded-3xl border p-5 ${theme.card}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-white">🔥 מנוע עדיפות — ההזדמנויות החשובות עכשיו</h2><span className="text-sm text-slate-400">לפי Alert + Rating + AI + Setup + Campaign Rank</span></div><div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">{rows.map((row) => { const p = priorityLabel(row.priority || 0); return <button key={row.ticker} type="button" onClick={() => setDrawerTicker(row.ticker)} className={`rounded-3xl border p-4 text-right ${theme.soft} border-slate-800`}><div className="flex items-center justify-between gap-3"><span className="text-xl font-black text-white">{row.ticker}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${p.className}`}>{p.text}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><span className="text-slate-400">עדיפות:</span> <b>{row.priority}</b></div><div><span className="text-slate-400">Rank:</span> <b>{row.analysis.campaignRank}</b></div><div><span className="text-slate-400">Pressure:</span> <b>{row.analysis.pressureBuild}</b></div><div><span className="text-slate-400">Wyckoff:</span> <b>{row.analysis.wyckoffPhase}</b></div></div></button>; })}</div></section>; }
function Guide() { return <section className={`rounded-3xl border p-5 ${theme.card}`}><h2 className="mb-4 text-xl font-black text-cyan-300">מדריך זיהוי Setup + Campaign</h2><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="p-3">מצב</th><th className="p-3">מה לבדוק</th><th className="p-3">פירוש</th><th className="p-3">תוצאה</th><th className="p-3">מה לשים לב</th><th className="p-3">ממה להימנע</th></tr></thead><tbody>{playbook.map((item) => <tr key={item.mode} className="border-b border-slate-800"><td className="p-3"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(item.mode)}`}>{item.mode}</span></td><td className="p-3 text-white">{item.check}</td><td className="p-3 text-slate-400">{item.result}</td><td className="p-3 font-bold text-yellow-300">{item.action}</td><td className="p-3 text-cyan-300">{item.focus}</td><td className="p-3 text-red-300">{item.avoid}</td></tr>)}</tbody></table></div></section>; }
function Archive({ rows, updateRow }) { if (rows.length === 0) return <section className={`rounded-3xl border p-5 ${theme.card}`}><h2 className="text-xl font-black text-white">מסך ארכיון</h2><div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">אין כרגע מניות בארכיון.</div></section>; return <section className={`rounded-3xl border p-5 ${theme.card}`}><h2 className="text-xl font-black text-white">מסך ארכיון</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><tbody>{rows.map((row) => <tr key={row.ticker} className="border-b border-slate-800"><td className="p-3 font-black text-white">{row.ticker}</td><td className="p-3"><span className={`rounded-lg border px-2 py-1 font-black ${rankClass(row.analysis.campaignRank)}`}>{row.analysis.campaignRank}</span></td><td className="p-3 text-slate-400">{row.archiveReason || "—"}</td><td className="p-3"><Button onClick={() => updateRow(row.ticker, { archived: false })} className="border border-emerald-500/30 text-emerald-300">החזר</Button></td></tr>)}</tbody></table></div></section>; }

function WatchTable(props) { const { rows, compactMode, drawerTicker, setDrawerTicker, updateRow, openChart, setArchiveModal, setDeleteTicker, setRows, setLoading, setLastError, setLastRefreshTime, loadTicker, loading, handleImageUpload, today, newTicker, setNewTicker, addTicker, watchListTheme, setWatchListTheme } = props; const currentTheme = watchThemes[watchListTheme] || watchThemes["light-gray"]; const themeButtons = Object.entries(watchThemes).map(([key, value]) => [key, value.label]); return <section className={`overflow-hidden rounded-3xl ${currentTheme.gold} ${currentTheme.wrapper}`}><div className={`border-b border-yellow-500/40 px-5 py-4 ${currentTheme.top}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className={`text-lg font-black ${currentTheme.title}`}>רשימת מעקב חכמה</h2><p className={`mt-1 text-xs ${currentTheme.sub}`}>לחיצה על כל שורת מניה פותחת מגירה מתחת לשורה.</p></div><div className="flex w-full flex-col gap-3 lg:max-w-[650px]"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-yellow-500">בחר צבע טאב:</span>{themeButtons.map(([key, label]) => <button key={key} type="button" onClick={() => setWatchListTheme(key)} className={`rounded-xl border-2 px-3 py-2 text-xs font-black transition ${watchListTheme === key ? "border-yellow-500 bg-yellow-500/20 text-yellow-500" : "border-slate-500/40 bg-black/20 text-slate-300 hover:border-yellow-500/60"}`}>{label}</button>)}</div><input value={newTicker} onChange={(e) => setNewTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTicker()} placeholder="הוסף טיקר ולחץ Enter" className={`w-full rounded-2xl border px-4 py-3 text-sm uppercase outline-none ${theme.input}`} /></div></div></div><div className={`overflow-x-auto ft-gold-scroll ${currentTheme.table}`}><table className={`w-full min-w-[1900px] border-collapse text-right text-xs xl:text-sm ${compactMode ? "ft-compact" : ""}`}><thead className={`${currentTheme.head} sticky top-0 z-10 text-xs uppercase tracking-wider`}><tr>{["טיקר","מחיר","1D%","Priority","Campaign Rank","Structure","Pressure Build","Wyckoff","Add Zone","דירוג","סטטוס","AI","סטאפ","אלרט","פעולות"].map((h) => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{rows.map((row) => { const a = row.analysis; const priority = priorityLabel(row.priority || 0); const isOpen = drawerTicker === row.ticker; const rowGlow = isOpen ? "bg-slate-700/30 ft-row-glow-open" : row.alert.state === "NEAR" ? "bg-yellow-500/10 ft-row-glow-near" : row.isReadyToTrade ? "bg-emerald-500/10 ft-row-glow-ready" : ["A+", "A"].includes(a.campaignRank) ? "bg-cyan-500/5 ft-row-glow-campaign" : ""; return <React.Fragment key={row.ticker}><tr onClick={() => setDrawerTicker(isOpen ? "" : row.ticker)} className={`cursor-pointer border-t transition ${currentTheme.row} ${rowGlow}`}><td className="p-4"><button type="button" onClick={(e) => { e.stopPropagation(); openChart(row.ticker); }} className="font-black hover:underline">{row.ticker} ↗</button></td><td className="p-4 font-bold">{safeNum(a.price)}</td><td className={`p-4 font-bold ${Number(a.change1) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{safeNum(a.change1, 1)}%</td><td className="p-4"><span className={`rounded-lg px-2 py-1 text-xs font-black ${priority.className}`}>{row.priority}</span></td><td className="p-4"><span className={`rounded-xl border px-3 py-1 font-black ${rankClass(a.campaignRank)}`}>{a.campaignRank}</span></td><td className="max-w-[260px] p-4 opacity-85">{a.structure}</td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${pressureClass(a.pressureBuild)}`}>{a.pressureBuild}</span></td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${wyckoffClass(a.wyckoffPhase)}`}>{a.wyckoffPhase}</span></td><td className="p-4 font-bold text-emerald-400">{a.addZone}</td><td className="p-4"><select onClick={(e) => e.stopPropagation()} value={row.rating || 0} onChange={(e) => updateRow(row.ticker, { rating: Number(e.target.value) })} className={`rounded-lg border px-2 py-1 font-bold ${theme.input}`}><option value={0}>⭐</option><option value={1}>⭐ 1</option><option value={2}>⭐ 2</option><option value={3}>⭐ 3</option><option value={4}>⭐ 4</option><option value={5}>⭐ 5</option></select></td><td className="p-4"><select onClick={(e) => e.stopPropagation()} value={row.userStatus || "WATCH"} onChange={(e) => updateRow(row.ticker, { userStatus: e.target.value })} className={`rounded-lg border px-2 py-1 font-bold ${statusClass(row.userStatus || "WATCH")}`}><option value="READY">READY</option><option value="WATCH">WATCH</option><option value="AVOID">AVOID</option></select></td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></td><td className="p-4"><span className={`rounded-lg border px-3 py-1 font-black ${setupClass(a.setup)}`}>{a.setup}</span></td><td className="p-4"><span className={`rounded-lg border px-2 py-1 font-black ${row.alert.className}`}>{row.alert.label}</span></td><td className="p-4"><div className="ft-actions flex gap-2"><Button onClick={(e) => { e.stopPropagation(); setDrawerTicker(isOpen ? "" : row.ticker); }} className="border border-blue-500/30 text-blue-300">מגירה</Button><Button onClick={(e) => { e.stopPropagation(); setArchiveModal({ open: true, ticker: row.ticker, reason: "" }); }} className="border border-yellow-500/30 text-yellow-300">ארכיון</Button><Button onClick={(e) => { e.stopPropagation(); setDeleteTicker(row.ticker); }} className="border border-red-500/30 text-red-300">מחק</Button></div></td></tr>{isOpen && <Drawer row={row} a={a} priority={priority} updateRow={updateRow} openChart={openChart} setDrawerTicker={setDrawerTicker} setArchiveModal={setArchiveModal} setDeleteTicker={setDeleteTicker} loadTicker={loadTicker} setRows={setRows} setLoading={setLoading} setLastError={setLastError} setLastRefreshTime={setLastRefreshTime} loading={loading} handleImageUpload={handleImageUpload} today={today} />}</React.Fragment>; })}</tbody></table></div></section>; }

function Drawer({ row, a, priority, updateRow, openChart, setDrawerTicker, setArchiveModal, setDeleteTicker, loadTicker, setRows, setLoading, setLastError, setLastRefreshTime, loading, handleImageUpload, today }) { async function loadSingle() { setLoading(true); setLastError(""); try { const updated = await loadTicker(row); setRows((prev) => prev.map((item) => (item.ticker === row.ticker ? updated : item))); setLastRefreshTime(new Date().toLocaleTimeString()); } catch { setLastError("בדיקת מניה נכשלה."); } finally { setLoading(false); } } return <tr className="border-t border-slate-700/60 bg-[#0a0f1d]"><td colSpan={15} className="p-0"><div className="border-t border-yellow-500/25 bg-gradient-to-l from-[#111827] via-[#0b1220] to-[#050816] px-5 py-5"><div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-2xl bg-slate-900 px-4 py-2 text-2xl font-black text-white ${theme.goldFrame}`}>{row.ticker}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${priority.className}`}>{priority.text}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${rankClass(a.campaignRank)}`}>Campaign {a.campaignRank}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${pressureClass(a.pressureBuild)}`}>{a.pressureBuild}</span></div><p className="mt-2 text-xs text-slate-400">מגירת עבודה — תזה, אלרט, Wyckoff, Add Zone, Risk Line ופסילת טרייד.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => openChart(row.ticker)} className="border border-slate-500/40 bg-slate-800 text-slate-200">פתח גרף ↗</Button><Button onClick={() => setDrawerTicker("")} className={theme.accent}>סגור</Button></div></div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_360px]"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><InfoCard label="Campaign Rank" value={`${a.campaignRank} / ${a.campaignScore}`} color="text-emerald-300" /><InfoCard label="Wyckoff" value={a.wyckoffPhase} color="text-cyan-300" /><InfoCard label="Add Zone" value={a.addZone} color="text-emerald-300" /><InfoCard label="Risk Line" value={a.riskLine} color="text-red-300" /></div><div className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h4 className="mb-3 text-base font-black text-white">Campaign Intelligence</h4><div className="grid gap-3 lg:grid-cols-3"><Box title="Structure" text={a.structure} /><Box title="Daily" text={a.dailyStructure || "—"} /><Box title="Weekly" text={a.weeklyStructure || a.weeklyBias} /><Box title="Volume" text={`${a.volumeSignal || "—"} | ${safeNum(a.volumeRatio, 2)}x avg20`} /><Box title="Decision" text={a.decision} /><Box title="Add Plan" text={a.addPlan} /><Box title="Continuation" text={a.continuation} /><ScoreBox title="Pressure Score" score={a.pressureScore} /></div></div><div className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h4 className="mb-3 text-base font-black text-white">תזה אישית</h4><div className="grid gap-3 lg:grid-cols-[180px_1fr]"><input type="date" value={row.thesisDate || today} onChange={(e) => updateRow(row.ticker, { thesisDate: e.target.value })} className={`rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /><select value={row.thesisTitle || ""} onChange={(e) => updateRow(row.ticker, { thesisTitle: e.target.value })} className={`rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="">בחר תבנית</option><option value="Spike + Wait Base">Spike + Wait Base</option><option value="Pullback Continuation">Pullback Continuation</option><option value="Base Before Breakout">Base Before Breakout</option><option value="Pressure Build">Pressure Build</option><option value="Wyckoff Phase C-D">Wyckoff Phase C-D</option><option value="Range / Accumulation">Range / Accumulation</option><option value="Weak / Avoid">Weak / Avoid</option></select></div><textarea value={row.thesis || ""} onChange={(e) => updateRow(row.ticker, { thesis: e.target.value })} placeholder="מה ראיתי / תוכנית פעולה / איפה מוסיף / איפה פסילה" className={`mt-3 min-h-[140px] w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /></div></div><div className="space-y-4"><div className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h4 className="mb-3 text-base font-black text-white">אלרט ובדיקה</h4><input type="number" value={row.alertPrice || ""} onChange={(e) => updateRow(row.ticker, { alertPrice: e.target.value })} placeholder="Alert Price" className={`w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /><select value={row.alertType || "above"} onChange={(e) => updateRow(row.ticker, { alertType: e.target.value })} className={`mt-3 w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`}><option value="above">Above — מעל מחיר</option><option value="below">Below — מתחת מחיר</option></select><div className={`mt-3 rounded-2xl border p-3 ${row.alert.className}`}><div className="text-xs font-black">מצב אלרט</div><div className="mt-1 text-lg font-black">{row.alert.label}</div></div><Button onClick={loadSingle} className="mt-3 w-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{loading ? "טוען..." : "טען מניה"}</Button></div><div className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h4 className="mb-3 text-base font-black text-white">ניהול מהיר</h4><div className="grid gap-2"><Button onClick={() => updateRow(row.ticker, { analysis: deriveCampaignFields({ ...a, aiStatus: "READY" }, row) })} className="border border-emerald-500/30 text-emerald-300">אשר סטאפ AI</Button><Button onClick={() => updateRow(row.ticker, { analysis: deriveCampaignFields({ ...a, setup: "Pullback", aiStatus: "READY", why: "עודכן ידנית: Pullback Continuation" }, row) })} className="border border-cyan-500/30 text-cyan-300">סמן Pullback Continuation</Button><Button onClick={() => updateRow(row.ticker, { analysis: deriveCampaignFields({ ...a, setup: "Base", aiStatus: "WATCH", why: "עודכן ידנית: Base / Pressure Build" }, row) })} className="border border-yellow-500/30 text-yellow-300">סמן Pressure Build</Button><Button onClick={() => setArchiveModal({ open: true, ticker: row.ticker, reason: "" })} className="border border-yellow-500/30 text-yellow-300">העבר לארכיון</Button><Button onClick={() => setDeleteTicker(row.ticker)} className="border border-red-500/30 text-red-300">מחק מהרשימה</Button></div></div></div><div className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h4 className="mb-3 text-base font-black text-white">תמונת גרף</h4><input type="file" accept="image/*" onChange={(e) => handleImageUpload(row.ticker, e.target.files && e.target.files[0])} className={`w-full rounded-2xl border p-3 text-sm ${theme.input}`} />{row.chartImage ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-black"><img src={row.chartImage} alt={`chart-${row.ticker}`} className="max-h-[420px] w-full object-contain" /></div> : <div className={`mt-3 rounded-2xl border border-slate-800 bg-black/20 p-5 text-center text-sm ${theme.muted}`}>עדיין לא הועלתה תמונת גרף.</div>}</div></div></div></td></tr>; }
function InfoCard({ label, value, color }) { return <div className={`rounded-2xl p-4 ${theme.soft} ${theme.goldFrame}`}><div className="text-xs font-black text-slate-400">{label}</div><div className={`mt-2 text-lg font-black ${color}`}>{value}</div></div>; }
function Box({ title, text }) { return <div className="rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className="text-xs text-slate-400">{title}</div><div className="mt-2 text-sm font-bold text-slate-100">{text}</div></div>; }
function ScoreBox({ title, score }) { return <div className="rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className="text-xs text-slate-400">{title}</div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-cyan-300" style={{ width: `${clamp(score)}%` }} /></div><b className="text-white">{clamp(score)}</b></div></div>; }
function ManualDrawer({ setManualOpen }) { const sections = [{ title: "עמודות ראשיות בטבלה", items: [["Ticker", "שם המניה. לחיצה על הטיקר פותחת גרף TradingView."], ["Price / 1D%", "מחיר חי ושינוי יומי."], ["Priority", "דירוג תפעולי שמעלה מניות שקרובות לפעולה."], ["Campaign Rank", "A+/A = הכי מעניין. B = מעקב טוב. C = לחכות. D = חלש או חסר מידע."], ["Structure", "תיאור המבנה הנוכחי."], ["Pressure Build", "בודק אם נבנה לחץ לפני תנועה."], ["Wyckoff", "תרגום המבנה לשפת Wyckoff."], ["Add Zone", "אזור הוספה לבדיקה בלבד."]] }, { title: "כללי עבודה", items: [["לא רודפים", "גם אם Rank גבוה — לא קונים אם המחיר מתוח מדי."], ["מחכים ל־Base", "אחרי Spike עדיף לחכות להתכווצות/בסיס קטן."], ["Weekly First", "החלטה מבנית לפי שבועי, ביצוע לפי יומי."]] }]; return <div className="fixed inset-0 z-50 bg-black/70 p-4"><div className="ml-auto h-full w-full max-w-4xl overflow-y-auto rounded-3xl border border-yellow-500/25 bg-[#0B1220] p-5"><div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-slate-800 bg-[#0B1220]/95 pb-4"><h2 className="text-2xl font-black text-white">📘 הוראות יצרן</h2><Button onClick={() => setManualOpen(false)} className={theme.accent}>סגור</Button></div><div className="space-y-4">{sections.map((section) => <div key={section.title} className={`rounded-3xl p-4 ${theme.soft} ${theme.goldFrame}`}><h3 className="mb-3 text-lg font-black text-yellow-300">{section.title}</h3>{section.items.map(([name, text]) => <div key={name} className="mb-2 rounded-2xl border border-slate-700/70 bg-black/20 p-3"><div className="font-black text-white">{name}</div><div className="mt-1 text-sm text-slate-300">{text}</div></div>)}</div>)}</div></div></div>; }
function DeleteModal({ ticker, setTicker, setRows }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={`w-full max-w-md rounded-3xl border p-6 ${theme.card}`}><h3 className="text-xl font-black text-white">מחיקת מניה</h3><p className="mt-2 text-sm text-slate-400">האם למחוק את {ticker} מהרשימה?</p><div className="mt-5 flex gap-3"><Button onClick={() => { setRows((prev) => prev.filter((row) => row.ticker !== ticker)); setTicker(null); }} className="border border-red-500/30 bg-red-500/10 text-red-300">מחק</Button><Button onClick={() => setTicker(null)} className={theme.navIdle}>ביטול</Button></div></div></div>; }
function ArchiveModal({ archiveModal, setArchiveModal, updateRow }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={`w-full max-w-lg rounded-3xl border p-6 ${theme.card}`}><h3 className="text-xl font-black text-white">העבר לארכיון</h3><textarea value={archiveModal.reason} onChange={(e) => setArchiveModal((prev) => ({ ...prev, reason: e.target.value }))} placeholder="סיבה להעברה לארכיון — אופציונלי" className={`mt-4 min-h-[120px] w-full rounded-2xl border p-3 text-sm outline-none ${theme.input}`} /><div className="mt-5 flex gap-3"><Button onClick={() => { if (archiveModal.ticker) updateRow(archiveModal.ticker, { archived: true, archiveReason: archiveModal.reason || "" }); setArchiveModal({ open: false, ticker: null, reason: "" }); }} className="border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">העבר</Button><Button onClick={() => setArchiveModal({ open: false, ticker: null, reason: "" })} className={theme.navIdle}>ביטול</Button></div></div></div>; }
