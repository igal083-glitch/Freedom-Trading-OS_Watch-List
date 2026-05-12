import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-watchlist-clean-stable-v4";
const FINNHUB_KEY = "finnhub-key";
const THEME_KEY = "watchlist-theme";

const defaultRows = [
  { ticker: "NVAX", rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "" },
  { ticker: "UUUU", rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "" },
];

const ui = {
  app: "bg-[#050816] text-slate-100",
  card: "rounded-3xl border border-white/25 bg-[#0B1220]/95 shadow-2xl shadow-black/30",
  input: "rounded-2xl border border-slate-700 bg-[#050816] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400",
  button: "rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-50",
  navIdle: "bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-700/80",
  accent: "bg-white text-slate-950 hover:bg-slate-200 border border-white",
};

const tableThemes = {
  dark: {
    label: "כהה",
    wrap: "bg-[#07111f] text-white border-white/70",
    top: "bg-[#0b1628]",
    head: "bg-[#0f1c31] text-white",
    row: "border-slate-700/80 hover:bg-white/5",
    title: "text-white",
    sub: "text-slate-300",
  },
  gray: {
    label: "אפור בהיר",
    wrap: "bg-[#d7dce5] text-slate-950 border-white",
    top: "bg-[#c8d0dc]",
    head: "bg-[#b8c2d0] text-slate-950",
    row: "border-slate-400/70 hover:bg-white/50",
    title: "text-slate-950",
    sub: "text-slate-700",
  },
  brown: {
    label: "חום",
    wrap: "bg-[#2b1d14] text-amber-50 border-white/80",
    top: "bg-[#3a291f]",
    head: "bg-[#563d2b] text-amber-50",
    row: "border-amber-900/50 hover:bg-[#63452f]",
    title: "text-white",
    sub: "text-amber-200",
  },
  white: {
    label: "לבן",
    wrap: "bg-white text-slate-950 border-white",
    top: "bg-slate-100",
    head: "bg-slate-200 text-slate-950",
    row: "border-slate-300 hover:bg-slate-100",
    title: "text-slate-950",
    sub: "text-slate-600",
  },
};

const playbook = [
  ["Spike", "ווליום חריג + נר חזק", "לחכות ל־Base קטן אחרי הספייק"],
  ["Pullback", "תיקון נשלט + ווליום יורד", "מעניין להוספה אם המבנה נשמר"],
  ["Base", "טווח צר + התכווצות", "מתבשל, לחכות ל־Range High"],
  ["Breakout", "פריצה + ווליום", "לא לרדוף, לחכות Retest"],
  ["Breakdown", "שבירה + לחץ מכירות", "להימנע עד Reclaim ברור"],
];

function safeNum(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(Number(n) || 0, max));
}

function avg(arr) {
  const nums = arr.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function max(arr) {
  const nums = arr.map(Number).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : 0;
}

function min(arr) {
  const nums = arr.map(Number).filter(Number.isFinite);
  return nums.length ? Math.min(...nums) : 0;
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
    volumeSignal: "Unknown",
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
  };
}

function candlesFromFinnhub(json) {
  if (!json || json.s !== "ok" || !Array.isArray(json.c)) return [];
  return json.c
    .map((c, i) => ({
      close: Number(c),
      open: Number(json.o?.[i]),
      high: Number(json.h?.[i]),
      low: Number(json.l?.[i]),
      volume: Number(json.v?.[i]),
    }))
    .filter((x) => Number.isFinite(x.close) && Number.isFinite(x.high) && Number.isFinite(x.low));
}

function analyzeCandles(candles) {
  if (!candles || candles.length < 25) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const closes = candles.map((x) => x.close);
  const volumes = candles.map((x) => x.volume || 0);
  const last20 = candles.slice(-20);
  const last10 = candles.slice(-10);
  const prev20 = candles.slice(-21, -1);

  const sma20 = avg(closes.slice(-20));
  const sma50 = avg(closes.slice(-50));
  const avgVol20 = avg(volumes.slice(-21, -1));
  const volumeRatio = avgVol20 ? (last.volume || 0) / avgVol20 : 0;
  const change1 = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const range20High = max(last20.map((x) => x.high));
  const range20Low = min(last20.map((x) => x.low));
  const range10High = max(last10.map((x) => x.high));
  const range10Low = min(last10.map((x) => x.low));
  const prev20High = max(prev20.map((x) => x.high));
  const prev20Low = min(prev20.map((x) => x.low));
  const range20Pct = range20Low ? ((range20High - range20Low) / range20Low) * 100 : 0;
  const range10Pct = range10Low ? ((range10High - range10Low) / range10Low) * 100 : 0;
  const nearHigh20 = range20High ? ((range20High - last.close) / range20High) * 100 : 99;
  const nearLow20 = range20Low ? ((last.close - range20Low) / range20Low) * 100 : 99;
  const above20 = last.close >= sma20;
  const above50 = sma50 ? last.close >= sma50 : true;

  const breakout = last.close > prev20High && volumeRatio >= 1.15;
  const spike = change1 >= 5 && volumeRatio >= 1.4;
  const breakdown = last.close < prev20Low || (change1 <= -3 && volumeRatio >= 1.2);
  const pullback = change1 < 0 && change1 >= -4 && above20 && volumeRatio <= 1.2;
  const base = range10Pct > 0 && range10Pct <= 7 && range20Pct <= 16 && nearHigh20 <= 10;
  const accumulation = range20Pct <= 18 && nearLow20 >= 4 && nearHigh20 <= 12;

  let setup = "Live Quote";
  let aiStatus = "WATCH";
  let score = 50;
  let why = "Candles loaded";

  if (breakdown) {
    setup = "Breakdown";
    aiStatus = "AVOID";
    score = 25;
    why = "Selling pressure / breakdown";
  } else if (spike) {
    setup = "Spike";
    aiStatus = "WATCH";
    score = 68;
    why = "Spike with volume expansion";
  } else if (breakout) {
    setup = "Breakout";
    aiStatus = "READY";
    score = 76;
    why = "Breakout above recent range";
  } else if (pullback) {
    setup = "Pullback";
    aiStatus = "READY";
    score = 72;
    why = "Controlled pullback above MA20";
  } else if (base || accumulation) {
    setup = "Base";
    aiStatus = "WATCH";
    score = base ? 70 : 62;
    why = base ? "Tight base / pressure build" : "Accumulation candidate";
  }

  let volumeSignal = "Normal";
  if (volumeRatio >= 2) volumeSignal = "Volume Spike";
  else if (volumeRatio >= 1.35) volumeSignal = "Volume Expansion";
  else if (volumeRatio <= 0.75) volumeSignal = "Quiet Volume";

  const trend = above20 && above50 ? "Above MA20/MA50" : !above20 && !above50 ? "Below MA20/MA50" : "Mixed / Reclaim";

  return {
    setup,
    aiStatus,
    score,
    why,
    price: last.close,
    change1,
    high: last.high,
    low: last.low,
    range20High,
    range20Low,
    range20Pct,
    range10Pct,
    sma20,
    sma50,
    volumeRatio,
    volumeSignal,
    trend,
    breakout,
    spike,
    breakdown,
    pullback,
    base,
    accumulation,
    nearHigh20,
  };
}

function enrichAnalysis(base, row) {
  const a = { ...emptyAnalysis(), ...(base || {}) };
  const rating = Number(row.rating || 0);
  const price = Number(a.price) || 0;

  let pressureScore = 25;
  if (a.setup === "Base") pressureScore += 25;
  if (a.setup === "Pullback") pressureScore += 20;
  if (a.setup === "Breakout") pressureScore += 14;
  if (a.setup === "Spike") pressureScore += 8;
  if (a.setup === "Breakdown") pressureScore -= 35;
  if (a.base) pressureScore += 18;
  if (a.accumulation) pressureScore += 12;
  if (a.pullback) pressureScore += 10;
  if (a.volumeRatio > 0 && a.volumeRatio <= 1.2) pressureScore += 8;
  if (rating >= 4) pressureScore += 8;
  pressureScore = clamp(pressureScore);

  let pressureBuild = "WAIT";
  if (pressureScore >= 78) pressureBuild = "STRONG";
  else if (pressureScore >= 58) pressureBuild = "BUILDING";
  else if (pressureScore >= 40) pressureBuild = "EARLY";
  if (a.setup === "Breakdown") pressureBuild = "WEAK";

  let wyckoffPhase = "Phase B / Watch";
  if (a.accumulation && pressureScore >= 58) wyckoffPhase = "Phase C→D";
  if (a.pullback) wyckoffPhase = "D — Backup / LPS";
  if (a.breakout) wyckoffPhase = "Phase D — Markup";
  if (a.spike) wyckoffPhase = "Post Spike / Test";
  if (a.breakdown || a.setup === "Breakdown") wyckoffPhase = "Distribution Risk";
  if (a.setup === "Needs Data") wyckoffPhase = "Needs Data";

  let addZone = "—";
  let invalidation = "—";
  if (price) {
    if (a.setup === "Base") {
      addZone = `${safeNum((a.range20High || price) * 0.99)}–${safeNum((a.range20High || price) * 1.03)}`;
      invalidation = `Below ${safeNum(a.range20Low || price * 0.92)}`;
    } else if (a.setup === "Pullback") {
      addZone = `${safeNum(price * 0.96)}–${safeNum(price * 1.01)}`;
      invalidation = `Below ${safeNum(Math.min(a.low || price, a.range20Low || price))}`;
    } else if (a.setup === "Breakout") {
      addZone = `${safeNum(price * 0.97)}–${safeNum(price * 1.01)}`;
      invalidation = `Failed breakout below ${safeNum(price * 0.97)}`;
    } else if (a.setup === "Spike") {
      addZone = `${safeNum(price * 0.9)}–${safeNum(price * 0.96)}`;
      invalidation = `Spike low / ${safeNum(a.low || price * 0.9)}`;
    } else if (a.setup === "Breakdown") {
      addZone = "No Add";
      invalidation = `Weak below ${safeNum(price * 0.98)}`;
    }
  }

  let campaignScore = 0;
  campaignScore += a.aiStatus === "READY" ? 24 : a.aiStatus === "WATCH" ? 14 : -20;
  campaignScore += a.setup === "Pullback" ? 24 : a.setup === "Base" ? 22 : a.setup === "Breakout" ? 18 : a.setup === "Spike" ? 10 : a.setup === "Breakdown" ? -30 : 5;
  campaignScore += Math.round(pressureScore * 0.32);
  campaignScore += rating * 7;
  campaignScore += a.weeklyTrend === "Bullish Weekly" || a.weeklyTrend === "Weekly Breakout" ? 10 : a.weeklyTrend === "Weak Weekly" ? -12 : 0;
  campaignScore += ["Volume Expansion", "Volume Spike"].includes(a.volumeSignal) ? 5 : 0;
  campaignScore += Math.round((Number(a.score) || 0) * 0.14);
  campaignScore = clamp(campaignScore);

  let campaignRank = "D";
  if (campaignScore >= 85) campaignRank = "A+";
  else if (campaignScore >= 72) campaignRank = "A";
  else if (campaignScore >= 58) campaignRank = "B";
  else if (campaignScore >= 40) campaignRank = "C";

  const decision = campaignRank === "A+" || campaignRank === "A" ? "CAMPAIGN READY" : campaignRank === "B" ? "WATCH FOR ADD" : campaignRank === "C" ? "WAIT" : "AVOID / NO ADD";

  return {
    ...a,
    pressureScore,
    pressureBuild,
    wyckoffPhase,
    addZone,
    invalidation,
    campaignScore,
    campaignRank,
    decision,
  };
}

function statusClass(v) {
  if (v === "READY") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (v === "AVOID") return "border-red-500/30 bg-red-500/15 text-red-300";
  return "border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
}

function setupClass(v) {
  if (v === "Spike") return "border-purple-500/30 bg-purple-500/15 text-purple-300";
  if (v === "Pullback") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (v === "Breakout") return "border-orange-500/30 bg-orange-500/15 text-orange-300";
  if (v === "Base") return "border-blue-500/30 bg-blue-500/15 text-blue-300";
  if (v === "Breakdown") return "border-red-500/30 bg-red-500/15 text-red-300";
  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function pressureClass(v) {
  if (v === "STRONG") return "border-cyan-400/40 bg-cyan-500/15 text-cyan-200";
  if (v === "BUILDING") return "border-yellow-400/40 bg-yellow-500/15 text-yellow-200";
  if (v === "EARLY") return "border-blue-400/40 bg-blue-500/15 text-blue-200";
  if (v === "WEAK") return "border-red-400/40 bg-red-500/15 text-red-200";
  return "border-orange-400/40 bg-orange-500/15 text-orange-200";
}

function rankClass(v) {
  if (v === "A+" || v === "A") return "border-emerald-400/50 bg-emerald-500/20 text-emerald-200";
  if (v === "B") return "border-yellow-400/50 bg-yellow-500/20 text-yellow-200";
  if (v === "C") return "border-blue-400/50 bg-blue-500/20 text-blue-200";
  return "border-red-400/50 bg-red-500/20 text-red-200";
}

function alertState(row, price) {
  const target = Number(row.alertPrice);
  const current = Number(price);
  if (!target || !current) return { state: "NO ALERT", label: "אין אלרט", triggered: false, cls: "border-slate-500/30 bg-slate-500/15 text-slate-300" };
  const type = row.alertType || "above";
  const triggered = type === "above" ? current >= target : current <= target;
  const dist = Math.abs(type === "above" ? ((target - current) / current) * 100 : ((current - target) / current) * 100);
  if (triggered) return { state: "TRIGGERED", label: "מוכנה", triggered: true, cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" };
  if (dist <= 3) return { state: "NEAR", label: `מתקרבת ${safeNum(dist, 1)}%`, triggered: false, cls: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300" };
  return { state: "WAIT", label: `ממתין ${safeNum(dist, 1)}%`, triggered: false, cls: "border-slate-500/30 bg-slate-500/15 text-slate-300" };
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
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem("telegram-bot-token") || "");
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem("telegram-chat-id") || "");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)), [rows]);
  useEffect(() => localStorage.setItem(FINNHUB_KEY, apiKey || ""), [apiKey]);
  useEffect(() => localStorage.setItem(THEME_KEY, tableTheme), [tableTheme]);
  useEffect(() => localStorage.setItem("telegram-bot-token", telegramBotToken || ""), [telegramBotToken]);
  useEffect(() => localStorage.setItem("telegram-chat-id", telegramChatId || ""), [telegramChatId]);

  function updateRow(ticker, patch) {
    setRows((prev) => prev.map((r) => (r.ticker === ticker ? { ...r, ...patch } : r)));
  }

  function addTicker() {
    const ticker = newTicker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!ticker) return;
    setRows((prev) => {
      if (prev.some((r) => r.ticker === ticker)) return prev.map((r) => (r.ticker === ticker ? { ...r, archived: false } : r));
      return [...prev, { ticker, rating: 0, userStatus: "WATCH", alertPrice: "", alertType: "above", archived: false, thesis: "", thesisDate: today }];
    });
    setNewTicker("");
  }

  function openChart(ticker) {
    window.open(`https://www.tradingview.com/chart/?symbol=${ticker}`, "_blank");
  }

  async function sendTelegram(message) {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text: message }),
      });
    } catch {}
  }

  async function loadTicker(row) {
    const key = (viteKey || apiKey || "").trim();
    if (!key) {
      setLastError("חסר Finnhub API Key");
      return row;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const dayFrom = now - 60 * 60 * 24 * 170;
      const weekFrom = now - 60 * 60 * 24 * 900;

      const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${key}`);
      const quote = await quoteRes.json();

      if (quote.error) {
        setLastError(`שגיאת Finnhub Quote: ${quote.error}`);
        return { ...row, analysis: enrichAnalysis({ ...emptyAnalysis(), why: `Quote error: ${quote.error}` }, row) };
      }

      if (!quote || !quote.c || quote.c === 0) {
        setLastError(`לא התקבל מחיר חי עבור ${row.ticker}`);
        return { ...row, analysis: enrichAnalysis(emptyAnalysis(), row) };
      }

      const price = Number(quote.c);
      const prev = Number(quote.pc) || price;
      const change1 = prev ? ((price - prev) / prev) * 100 : 0;
      const quoteBase = {
        ...emptyAnalysis(),
        setup: change1 > 3 ? "Breakout" : change1 < -3 ? "Breakdown" : "Live Quote",
        aiStatus: change1 < -3 ? "AVOID" : change1 > 3 ? "READY" : "WATCH",
        score: change1 > 3 ? 68 : change1 < -3 ? 25 : 50,
        price,
        change1,
        high: Number(quote.h) || price,
        low: Number(quote.l) || price,
        structure: `Quote Live | H ${safeNum(quote.h)} | L ${safeNum(quote.l)} | PC ${safeNum(quote.pc)}`,
        daily: "Quote only — Candles blocked/unavailable",
        weekly: "Quote only — Weekly candles blocked/unavailable",
        volumeSignal: "Quote Only",
        volumeRatio: 0,
        why: "Quote live loaded. Candle data is optional and may be blocked by Finnhub plan.",
      };

      let daily = null;
      let weekly = null;
      let candleBlocked = false;

      try {
        const [dailyRes, weeklyRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${row.ticker}&resolution=D&from=${dayFrom}&to=${now}&token=${key}`),
          fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${row.ticker}&resolution=W&from=${weekFrom}&to=${now}&token=${key}`),
        ]);

        const dailyJson = await dailyRes.json();
        const weeklyJson = await weeklyRes.json();

        if (dailyJson.error || weeklyJson.error) {
          candleBlocked = true;
        } else {
          daily = analyzeCandles(candlesFromFinnhub(dailyJson));
          weekly = analyzeCandles(candlesFromFinnhub(weeklyJson));
        }
      } catch {
        candleBlocked = true;
      }

      if (!daily) {
        const reason = candleBlocked ? "Candles blocked by Finnhub plan — using Quote only" : "Candles unavailable — using Quote only";
        return {
          ...row,
          analysis: enrichAnalysis({ ...quoteBase, why: `${quoteBase.why} ${reason}` }, row),
          alertNotified: false,
          lastLoadedAt: new Date().toISOString(),
        };
      }

      let weeklyTrend = "Neutral Weekly";
      if (weekly) {
        if (weekly.trend === "Above MA20/MA50") weeklyTrend = "Bullish Weekly";
        if (weekly.trend === "Below MA20/MA50") weeklyTrend = "Weak Weekly";
        if (weekly.setup === "Breakout") weeklyTrend = "Weekly Breakout";
      }

      const base = {
        ...daily,
        weeklyTrend,
        structure: `D: ${daily.trend} | Range20 ${safeNum(daily.range20Pct, 1)}% | Near High ${safeNum(daily.nearHigh20, 1)}%`,
        daily: `Price ${safeNum(daily.price)} | SMA20 ${safeNum(daily.sma20)} | SMA50 ${safeNum(daily.sma50)}`,
        weekly: weekly ? `W: ${weekly.trend} | Setup ${weekly.setup} | Range20 ${safeNum(weekly.range20Pct, 1)}%` : "Weekly unavailable",
      };

      return { ...row, analysis: enrichAnalysis(base, row), alertNotified: false, lastLoadedAt: new Date().toISOString() };
    } catch (e) {
      setLastError("טעינת Quote נכשלה — בדוק API / חיבור / מגבלת Finnhub");
      return { ...row, analysis: enrichAnalysis(emptyAnalysis(), row) };
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
      .filter((r) => !r.archived)
      .map((r) => {
        const analysis = enrichAnalysis(r.analysis || emptyAnalysis(), r);
        const alert = alertState(r, analysis.price);
        const enriched = { ...r, analysis, alert, isReadyToTrade: alert.triggered && analysis.aiStatus === "READY" && Number(r.rating || 0) >= 3 };
        return { ...enriched, priority: priorityScore(enriched) };
      })
      .sort((a, b) => b.priority - a.priority);
  }, [rows]);

  const archivedRows = useMemo(() => rows.filter((r) => r.archived), [rows]);

  const visibleRows = useMemo(() => {
    let data = analyzedRows;
    if (filter === "READY") data = data.filter((r) => r.isReadyToTrade);
    if (filter === "A") data = data.filter((r) => ["A+", "A"].includes(r.analysis.campaignRank));
    if (filter === "PRESSURE") data = data.filter((r) => ["STRONG", "BUILDING"].includes(r.analysis.pressureBuild));
    if (filter === "HIGH") data = data.filter((r) => Number(r.rating || 0) >= 4);
    return data;
  }, [analyzedRows, filter]);

  useEffect(() => {
    analyzedRows.forEach((row) => {
      if (row.alert.triggered && !row.alertNotified) {
        updateRow(row.ticker, { alertNotified: true });
        const message = [
          `🚨 ${row.ticker}`,
          row.alert.label,
          `Setup: ${row.analysis.setup}`,
          `Wyckoff: ${row.analysis.wyckoffPhase}`,
          `Rank: ${row.analysis.campaignRank}`,
          `Price: ${safeNum(row.analysis.price)}`,
        ].join(String.fromCharCode(10));
        sendTelegram(message);
      }
    });
  }, [analyzedRows]);

  const counts = analyzedRows.reduce((acc, r) => {
    acc[r.userStatus || "WATCH"] = (acc[r.userStatus || "WATCH"] || 0) + 1;
    return acc;
  }, { READY: 0, WATCH: 0, AVOID: 0 });

  const readyCount = analyzedRows.filter((r) => r.isReadyToTrade).length;
  const campaignACount = analyzedRows.filter((r) => ["A+", "A"].includes(r.analysis.campaignRank)).length;
  const pressureCount = analyzedRows.filter((r) => ["STRONG", "BUILDING"].includes(r.analysis.pressureBuild)).length;

  return (
    <div dir="rtl" className={`min-h-screen p-4 lg:p-6 ${ui.app}`}>
      <style>{`.scroll-gold::-webkit-scrollbar{height:10px}.scroll-gold::-webkit-scrollbar-thumb{background:rgba(255,255,255,.55);border-radius:999px}`}</style>
      <div className="mx-auto w-full max-w-[96vw] space-y-5">
        <Header counts={counts} readyCount={readyCount} campaignACount={campaignACount} pressureCount={pressureCount} lastRefresh={lastRefresh} setManualOpen={setManualOpen} apiReady={Boolean(viteKey || apiKey)} />
        <ControlPanel apiKey={apiKey} setApiKey={setApiKey} loadAllLive={loadAllLive} loading={loading} telegramBotToken={telegramBotToken} setTelegramBotToken={setTelegramBotToken} telegramChatId={telegramChatId} setTelegramChatId={setTelegramChatId} />
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
          <p className="mt-2 text-sm text-slate-400">Structure / Pressure / Wyckoff / Add Zone / Rank</p>
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
  return <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4"><div className={`text-3xl font-black ${color}`}>{value}</div><div className="text-xs text-slate-400">{label}</div></div>;
}

function ControlPanel({ apiKey, setApiKey, loadAllLive, loading, telegramBotToken, setTelegramBotToken, telegramChatId, setTelegramChatId }) {
  return (
    <section className={`${ui.card} p-4`}>
      <div className="grid gap-3 lg:grid-cols-2">
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Finnhub API Key" className={ui.input} />
        <Button onClick={loadAllLive} disabled={loading} className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">{loading ? "טוען..." : "טען דאטה חי"}</Button>
        <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className={ui.input} />
        <input value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="Telegram Bot Token" className={ui.input} />
      </div>
    </section>
  );
}

function Nav({ tab, setTab, archivedCount }) {
  const items = [["main", "מסך ראשי"], ["guide", "פירוט מבנים"], ["archive", `ארכיון (${archivedCount})`]];
  return <nav className={`${ui.card} flex flex-wrap gap-2 p-3`}>{items.map(([k, v]) => <Button key={k} onClick={() => setTab(k)} className={tab === k ? ui.accent : ui.navIdle}>{v}</Button>)}</nav>;
}

function Toolbar({ filter, setFilter, readyCount, campaignACount, pressureCount }) {
  const items = [["ALL", "הכל"], ["READY", `READY TO TRADE (${readyCount})`], ["A", `Campaign A (${campaignACount})`], ["PRESSURE", `Pressure (${pressureCount})`], ["HIGH", "דירוג גבוה ⭐4+"]];
  return <section className={`${ui.card} flex flex-wrap gap-2 p-3`}>{items.map(([k, v]) => <Button key={k} onClick={() => setFilter(k)} className={filter === k ? ui.accent : ui.navIdle}>{v}</Button>)}</section>;
}

function PriorityPanel({ rows }) {
  if (!rows.length) return null;
  return (
    <section className={`${ui.card} p-5`}>
      <h2 className="mb-4 text-xl font-black text-white">🔥 מנוע עדיפות — ההזדמנויות החשובות עכשיו</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const p = priorityLabel(row.priority);
          return (
            <div key={row.ticker} className="rounded-3xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between"><span className="text-3xl font-black text-white">{row.ticker}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${p.cls}`}>{p.text}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div>Rank: <b>{row.analysis.campaignRank}</b></div><div>Pressure: <b>{row.analysis.pressureBuild}</b></div><div>Wyckoff: <b>{row.analysis.wyckoffPhase}</b></div><div>Priority: <b>{row.priority}</b></div></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WatchTable(props) {
  const { rows, drawerTicker, setDrawerTicker, updateRow, openChart, setArchiveModal, setDeleteTicker, loadTicker, setRows, setLoading, setLastError, setLastRefresh, loading, newTicker, setNewTicker, addTicker, tableTheme, setTableTheme } = props;
  const t = tableThemes[tableTheme] || tableThemes.dark;

  async function loadSingle(row) {
    setLoading(true);
    setLastError("");
    try {
      const updated = await loadTicker(row);
      setRows((prev) => prev.map((x) => (x.ticker === row.ticker ? updated : x)));
      setLastRefresh(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`overflow-hidden rounded-3xl border-4 ${t.wrap}`}>
      <div className={`${t.top} border-b border-white/40 px-5 py-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className={`text-2xl font-black ${t.title}`}>רשימת מעקב חכמה</h2>
            <p className={`mt-1 text-base font-bold ${t.sub}`}>לחיצה על שורה פותחת מגירה. המסגרת חזרה ללבן.</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:max-w-[760px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-white drop-shadow">בחר צבע טאב:</span>
              {Object.entries(tableThemes).map(([key, val]) => (
                <button key={key} onClick={() => setTableTheme(key)} className={`rounded-xl border-2 px-4 py-2 text-base font-black ${tableTheme === key ? "border-white bg-white text-black" : "border-white/40 bg-black/30 text-white"}`}>{val.label}</button>
              ))}
            </div>
            <input value={newTicker} onChange={(e) => setNewTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTicker()} placeholder="הוסף טיקר ולחץ Enter" className={ui.input} />
          </div>
        </div>
      </div>
      <div className={`scroll-gold overflow-x-auto ${t.table}`}>
        <table className="w-full min-w-[1850px] border-collapse text-right text-sm">
          <thead className={`${t.head} text-sm font-black uppercase`}>
            <tr>{["טיקר", "מחיר", "%1D", "Priority", "Campaign Rank", "Structure", "Pressure Build", "Wyckoff", "Add Zone", "דירוג", "סטטוס", "AI", "סטאפ", "אלרט", "פעולות"].map((h) => <th key={h} className="p-4">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const a = row.analysis;
              const p = priorityLabel(row.priority);
              const open = drawerTicker === row.ticker;
              return (
                <React.Fragment key={row.ticker}>
                  <tr onClick={() => setDrawerTicker(open ? "" : row.ticker)} className={`cursor-pointer border-t ${t.row}`}>
                    <td className="p-4"><button onClick={(e) => { e.stopPropagation(); openChart(row.ticker); }} className="text-lg font-black text-blue-500 hover:underline">↗ {row.ticker}</button></td>
                    <td className="p-4 text-lg font-black">{safeNum(a.price)}</td>
                    <td className="p-4 text-lg font-black text-emerald-400">{safeNum(a.change1, 1)}%</td>
                    <td className="p-4"><span className={`rounded-xl border px-3 py-2 font-black ${p.cls}`}>{row.priority}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${rankClass(a.campaignRank)}`}>{a.campaignRank}</span></td>
                    <td className="max-w-[300px] p-4 font-bold">{a.structure}</td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${pressureClass(a.pressureBuild)}`}>{a.pressureBuild}</span></td>
                    <td className="p-4"><span className="font-black text-yellow-400">{a.wyckoffPhase}</span></td>
                    <td className="p-4 font-black text-emerald-400">{a.addZone}</td>
                    <td className="p-4"><select value={row.rating || 0} onClick={(e) => e.stopPropagation()} onChange={(e) => updateRow(row.ticker, { rating: Number(e.target.value) })} className={ui.input}><option value={0}>⭐</option><option value={1}>⭐ 1</option><option value={2}>⭐ 2</option><option value={3}>⭐ 3</option><option value={4}>⭐ 4</option><option value={5}>⭐ 5</option></select></td>
                    <td className="p-4"><select value={row.userStatus || "WATCH"} onClick={(e) => e.stopPropagation()} onChange={(e) => updateRow(row.ticker, { userStatus: e.target.value })} className={`rounded-xl border px-3 py-2 font-black ${statusClass(row.userStatus || "WATCH")}`}><option value="READY">READY</option><option value="WATCH">WATCH</option><option value="AVOID">AVOID</option></select></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${statusClass(a.aiStatus)}`}>{a.aiStatus}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${setupClass(a.setup)}`}>{a.setup}</span></td>
                    <td className="p-4"><span className={`rounded-xl border px-4 py-2 font-black ${row.alert.cls}`}>{row.alert.label}</span></td>
                    <td className="p-4"><div className="flex gap-2"><Button onClick={(e) => { e.stopPropagation(); loadSingle(row); }} className="border border-emerald-500/40 text-emerald-300">{loading ? "טוען" : "טען"}</Button><Button onClick={(e) => { e.stopPropagation(); setArchiveModal({ open: true, ticker: row.ticker, reason: "" }); }} className="border border-yellow-500/40 text-yellow-300">ארכיון</Button><Button onClick={(e) => { e.stopPropagation(); setDeleteTicker(row.ticker); }} className="border border-red-500/40 text-red-300">מחק</Button></div></td>
                  </tr>
                  {open && <Drawer row={row} updateRow={updateRow} />}
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
  const a = row.analysis;
  return (
    <tr className="bg-[#07111f] text-white">
      <td colSpan={15} className="p-5">
        <div className="grid gap-4 xl:grid-cols-3">
          <Info label="Daily" value={a.daily} />
          <Info label="Weekly" value={a.weekly} />
          <Info label="Volume" value={`${a.volumeSignal} | ${safeNum(a.volumeRatio, 2)}x`} />
          <Info label="Decision" value={a.decision} />
          <Info label="Invalidation" value={a.invalidation} />
          <Info label="Why" value={a.why} />
        </div>
        <textarea value={row.thesis || ""} onChange={(e) => updateRow(row.ticker, { thesis: e.target.value })} placeholder="תזה אישית / תוכנית פעולה" className={`${ui.input} mt-4 min-h-[120px] w-full`} />
      </td>
    </tr>
  );
}

function Info({ label, value }) {
  return <div className="rounded-2xl border border-white/15 bg-black/20 p-4"><div className="text-xs font-black text-slate-400">{label}</div><div className="mt-2 font-bold text-white">{value || "—"}</div></div>;
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
                <td className="p-3">
                  <span className={`rounded-lg border px-3 py-1 font-black ${setupClass(mode)}`}>
                    {mode}
                  </span>
                </td>
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
      <h2 className="text-2xl font-black text-white">
        מסך ארכיון
      </h2>

      {!rows.length ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-400">
          אין מניות בארכיון.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.ticker}
              className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
            >
              <div>
                <div className="text-xl font-black text-white">
                  {row.ticker}
                </div>

                <div className="text-sm text-slate-400">
                  {row.archiveReason || "ללא סיבה"}
                </div>
              </div>

              <Button
                onClick={() =>
                  updateRow(row.ticker, {
                    archived: false,
                  })
                }
                className="border border-emerald-500/40 text-emerald-300"
              >
                החזר
              </Button>
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
          <h2 className="text-3xl font-black text-white">
            📘 הוראות יצרן
          </h2>

          <Button
            onClick={() => setManualOpen(false)}
            className={ui.accent}
          >
            סגור
          </Button>
        </div>

        <div className="space-y-4 text-sm">
          <Info
            label="Campaign Rank"
            value="A/A+ = חזקה ומעניינת | B = מעקב טוב | C = מוקדם | D = חלש"
          />

          <Info
            label="Pressure Build"
            value="מודד אם נבנה לחץ לפני תנועה. STRONG / BUILDING עדיפים."
          />

          <Info
            label="Add Zone"
            value="אזור תיאורטי לבדיקה להוספה. לא כניסה אוטומטית."
          />

          <Info
            label="Quote Only"
            value="אם Finnhub חוסם candles, המערכת תמשיך לעבוד עם מחיר חי בלבד."
          />
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  ticker,
  setTicker,
  setRows,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`${ui.card} w-full max-w-md p-6`}>

        <h3 className="text-2xl font-black text-white">
          מחיקת מניה
        </h3>

        <p className="mt-3 text-slate-400">
          האם למחוק את {ticker}?
        </p>

        <div className="mt-5 flex gap-3">

          <Button
            onClick={() => {
              setRows((prev) =>
                prev.filter(
                  (r) => r.ticker !== ticker
                )
              );

              setTicker(null);
            }}
            className="border border-red-500/40 bg-red-500/10 text-red-300"
          >
            מחק
          </Button>

          <Button
            onClick={() => setTicker(null)}
            className={ui.navIdle}
          >
            ביטול
          </Button>

        </div>
      </div>
    </div>
  );
}


            <div key={row.ticker} className="flex items
function Archive({ rows, updateRow }) {
  return (
    <section className={`${ui.card} p-5`}>
      <h2 className="text-2xl font-black text-white">
        מסך ארכיון
      </h2>

      {!rows.length ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-400">
          אין מניות בארכיון.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.ticker}
              className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
            >
              <div>
                <div className="text-xl font-black text-white">
                  {row.ticker}
                </div>

                <div className="text-sm text-slate-400">
                  {row.archiveReason || "ללא סיבה"}
                </div>
              </div>

              <Button
                onClick={() =>
                  updateRow(row.ticker, {
                    archived: false,
                  })
                }
                className="border border-emerald-500/40 text-emerald-300"
              >
                החזר
              </Button>
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
          <h2 className="text-3xl font-black text-white">
            📘 הוראות יצרן
          </h2>

          <Button
            onClick={() => setManualOpen(false)}
            className={ui.accent}
          >
            סגור
          </Button>
        </div>

        <div className="space-y-4 text-sm">
          <Info
            label="Campaign Rank"
            value="A/A+ = חזקה | B = טובה | C = מוקדם | D = חלש"
          />

          <Info
            label="Pressure Build"
            value="מודד לחץ לפני תנועה."
          />

          <Info
            label="Add Zone"
            value="אזור אפשרי להוספה."
          />

          <Info
            label="Quote Only"
            value="המערכת יכולה לעבוד גם בלי candles."
          />
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  ticker,
  setTicker,
  setRows,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`${ui.card} w-full max-w-md p-6`}>

        <h3 className="text-2xl font-black text-white">
          מחיקת מניה
        </h3>

        <p className="mt-3 text-slate-400">
          האם למחוק את {ticker}?
        </p>

        <div className="mt-5 flex gap-3">

          <Button
            onClick={() => {
              setRows((prev) =>
                prev.filter(
                  (r) => r.ticker !== ticker
                )
              );

              setTicker(null);
            }}
            className="border border-red-500/40 bg-red-500/10 text-red-300"
          >
            מחק
          </Button>

          <Button
            onClick={() => setTicker(null)}
            className={ui.navIdle}
          >
            ביטול
          </Button>

        </div>
      </div>
    </div>
  );
}

function ArchiveModal({
  archiveModal,
  setArchiveModal,
  updateRow,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`${ui.card} w-full max-w-lg p-6`}>

        <h3 className="text-2xl font-black text-white">
          העבר לארכיון
        </h3>

        <textarea
          value={archiveModal.reason}
          onChange={(e) =>
            setArchiveModal((prev) => ({
              ...prev,
              reason: e.target.value,
            }))
          }
          placeholder="סיבה להעברה לארכיון"
          className={`${ui.input} mt-4 min-h-[120px] w-full`}
        />

        <div className="mt-5 flex gap-3">

          <Button
            onClick={() => {
              updateRow(
                archiveModal.ticker,
                {
                  archived: true,
                  archiveReason:
                    archiveModal.reason,
                }
              );

              setArchiveModal({
                open: false,
                ticker: "",
                reason: "",
              });
            }}
            className="border border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
          >
            העבר
          </Button>

          <Button
            onClick={() =>
              setArchiveModal({
                open: false,
                ticker: "",
                reason: "",
              })
            }
            className={ui.navIdle}
          >
            ביטול
          </Button>

        </div>
      </div>
    </div>
  );
}
