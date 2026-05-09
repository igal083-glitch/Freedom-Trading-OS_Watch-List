// Freedom Trading OS — Modern UI Upgrade
// App.jsx
// React + Tailwind + Vite
// UI upgraded without breaking your logic

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "freedom-watchlist-v1";

const defaultRows = [
  {
    ticker: "NVAX",
    userStatus: "WATCH",
    rating: 4,
    archived: false,
    analysis: {
      price: 10.11,
      change1: 9.53,
      aiStatus: "READY",
      score: 62,
      setup: "Breakout",
      structure: "Weekly continuation",
      entryZone: "9.70 - 10.20",
      invalidation: "Below 9.10",
      why: "Strong weekly continuation.",
    },
  },
  {
    ticker: "FOSL",
    userStatus: "WATCH",
    rating: 5,
    archived: false,
    analysis: {
      price: 4.43,
      change1: -1.34,
      aiStatus: "WATCH",
      score: 60,
      setup: "Pullback",
      structure: "Controlled pullback",
      entryZone: "4.10 - 4.35",
      invalidation: "Below 3.80",
      why: "Watching pullback continuation.",
    },
  },
];

function safeNum(v, d = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function statusClass(status) {
  if (status === "READY")
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (status === "AVOID")
    return "bg-red-500/10 text-red-300 border-red-500/20";

  return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
}

function setupClass(setup) {
  if (setup === "Breakout")
    return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";

  if (setup === "Pullback")
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";

  return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
}

export default function App() {
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaultRows;

    try {
      return JSON.parse(saved);
    } catch {
      return defaultRows;
    }
  });

  const [newTicker, setNewTicker] = useState("");
  const [drawerTicker, setDrawerTicker] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const visibleRows = useMemo(() => {
    let data = rows.filter((r) => !r.archived);

    if (focusMode) {
      data = data.filter(
        (r) =>
          r.analysis?.aiStatus === "READY" ||
          Number(r.analysis?.score || 0) >= 60
      );
    }

    return data;
  }, [rows, focusMode]);

  const addTicker = () => {
    const ticker = newTicker.trim().toUpperCase();

    if (!ticker) return;

    setRows((prev) => [
      ...prev,
      {
        ticker,
        userStatus: "WATCH",
        rating: 0,
        archived: false,
        analysis: {
          price: null,
          change1: null,
          aiStatus: "WATCH",
          score: 0,
          setup: "Needs Data",
          structure: "No structure yet",
          entryZone: "—",
          invalidation: "—",
          why: "Load live data.",
        },
      },
    ]);

    setNewTicker("");
  };

  const updateRow = (ticker, patch) => {
    setRows((prev) =>
      prev.map((row) =>
        row.ticker === ticker ? { ...row, ...patch } : row
      )
    );
  };

  const archiveTicker = (ticker) => {
    setRows((prev) =>
      prev.map((row) =>
        row.ticker === ticker ? { ...row, archived: true } : row
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="mx-auto max-w-[1800px] px-4 py-5">

        {/* HEADER */}

        <div className="rounded-3xl border border-white/10 bg-[#0B1220] p-6 shadow-2xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <div className="text-xs tracking-[0.35em] text-cyan-400">
                FREEDOM TRADING OS
              </div>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
                Watch List Command Center
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Professional campaign tracker — clean UI, focused decisions, no chase.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={() => setLoading(true)}
                className="rounded-2xl bg-white px-6 py-3 font-black text-black transition hover:opacity-90"
              >
                {loading ? "Loading..." : "Load Live Data"}
              </button>

              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`rounded-2xl border px-5 py-3 font-semibold transition ${
                  focusMode
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                Focus Mode
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-slate-300">
                Archive (0)
              </button>

            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-3xl border border-white/10 bg-[#0B1220] p-5">
            <div className="text-xs tracking-wider text-slate-500">
              ACTIVE LIST
            </div>

            <div className="mt-3 text-5xl font-black text-white">
              {visibleRows.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B1220] p-5">
            <div className="text-xs tracking-wider text-slate-500">
              FOCUS NAMES
            </div>

            <div className="mt-3 text-5xl font-black text-emerald-300">
              {
                visibleRows.filter(
                  (r) => r.analysis?.aiStatus === "READY"
                ).length
              }
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B1220] p-5">
            <div className="text-xs tracking-wider text-slate-500">
              ARCHIVED
            </div>

            <div className="mt-3 text-5xl font-black text-yellow-300">
              {rows.filter((r) => r.archived).length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B1220] p-5">
            <div className="text-xs tracking-wider text-slate-500">
              API
            </div>

            <div className="mt-3 text-3xl font-black text-emerald-300">
              Connected
            </div>
          </div>

        </div>

        {/* ADD TICKER */}

        <div className="mt-5 rounded-3xl border border-white/10 bg-[#0B1220] p-4">

          <div className="flex gap-3">

            <input
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="Add ticker, example: XFOR"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/30"
            />

            <button
              onClick={addTicker}
              className="rounded-2xl border border-white/10 bg-slate-800 px-6 py-4 font-black text-white transition hover:bg-slate-700"
            >
              Add Ticker
            </button>

          </div>

        </div>

        {/* TABLE */}

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1220]">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1500px]">

              <thead className="border-b border-white/10 bg-white/[0.02] text-left text-xs uppercase tracking-wider text-slate-500">

                <tr>
                  <th className="px-5 py-4">Ticker</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Change</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">AI</th>
                  <th className="px-5 py-4">Score</th>
                  <th className="px-5 py-4">Setup</th>
                  <th className="px-5 py-4">Notes</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>

              </thead>

              <tbody>

                {visibleRows.map((row) => (
                  <React.Fragment key={row.ticker}>

                    <tr className="border-b border-white/[0.05] transition hover:bg-white/[0.03]">

                      <td className="px-5 py-5">

                        <button
                          onClick={() =>
                            setDrawerTicker(
                              drawerTicker === row.ticker ? "" : row.ticker
                            )
                          }
                          className="text-left"
                        >
                          <div className="text-xl font-black tracking-wide text-white">
                            {row.ticker}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Updated 11:36:10
                          </div>
                        </button>

                      </td>

                      <td className="px-5 py-5 font-bold text-white">
                        ${safeNum(row.analysis?.price)}
                      </td>

                      <td
                        className={`px-5 py-5 font-black ${
                          Number(row.analysis?.change1) >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {safeNum(row.analysis?.change1)}%
                      </td>

                      <td className="px-5 py-5">

                        <select
                          value={row.rating || 0}
                          onChange={(e) =>
                            updateRow(row.ticker, {
                              rating: Number(e.target.value),
                            })
                          }
                          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                        >
                          <option value={0}>⭐</option>
                          <option value={1}>⭐1</option>
                          <option value={2}>⭐2</option>
                          <option value={3}>⭐3</option>
                          <option value={4}>⭐4</option>
                          <option value={5}>⭐5</option>
                        </select>

                      </td>

                      <td className="px-5 py-5">

                        <select
                          value={row.userStatus || "WATCH"}
                          onChange={(e) =>
                            updateRow(row.ticker, {
                              userStatus: e.target.value,
                            })
                          }
                          className={`rounded-xl border px-3 py-2 text-sm font-black outline-none ${statusClass(
                            row.userStatus
                          )}`}
                        >
                          <option value="READY">READY</option>
                          <option value="WATCH">WATCH</option>
                          <option value="AVOID">AVOID</option>
                        </select>

                      </td>

                      <td className="px-5 py-5">

                        <span
                          className={`rounded-xl border px-3 py-2 text-xs font-black ${statusClass(
                            row.analysis?.aiStatus
                          )}`}
                        >
                          {row.analysis?.aiStatus}
                        </span>

                      </td>

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-3">

                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-800">

                            <div
                              className="h-full rounded-full bg-white"
                              style={{
                                width: `${row.analysis?.score || 0}%`,
                              }}
                            />

                          </div>

                          <div className="text-sm font-black text-white">
                            {row.analysis?.score}
                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-5">

                        <span
                          className={`rounded-xl border px-3 py-2 text-xs font-black ${setupClass(
                            row.analysis?.setup
                          )}`}
                        >
                          {row.analysis?.setup}
                        </span>

                      </td>

                      <td className="max-w-[260px] px-5 py-5 text-sm text-slate-400">
                        {row.analysis?.why}
                      </td>

                      <td className="px-5 py-5">

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              setDrawerTicker(
                                drawerTicker === row.ticker
                                  ? ""
                                  : row.ticker
                              )
                            }
                            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                          >
                            Drawer
                          </button>

                          <button
                            onClick={() => archiveTicker(row.ticker)}
                            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                          >
                            Archive
                          </button>

                          <button
                            className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                    {drawerTicker === row.ticker && (

                      <tr className="border-b border-white/[0.05] bg-black/20">

                        <td colSpan={10} className="p-6">

                          <div className="grid gap-4 xl:grid-cols-4">

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <div className="text-xs tracking-wider text-slate-500">
                                STRUCTURE
                              </div>

                              <div className="mt-3 text-sm text-slate-300">
                                {row.analysis?.structure}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <div className="text-xs tracking-wider text-slate-500">
                                ENTRY ZONE
                              </div>

                              <div className="mt-3 text-sm font-black text-emerald-300">
                                {row.analysis?.entryZone}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <div className="text-xs tracking-wider text-slate-500">
                                INVALIDATION
                              </div>

                              <div className="mt-3 text-sm font-black text-red-300">
                                {row.analysis?.invalidation}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <div className="text-xs tracking-wider text-slate-500">
                                NOTES
                              </div>

                              <textarea
                                placeholder="Campaign notes..."
                                className="mt-3 min-h-[90px] w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none placeholder:text-slate-500"
                              />
                            </div>

                          </div>

                        </td>

                      </tr>

                    )}

                  </React.Fragment>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </div>
  );
}
