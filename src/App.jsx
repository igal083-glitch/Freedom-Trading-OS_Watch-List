import React, { useEffect, useMemo, useState } from "react";

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

const initialRows = [
  { ticker: "NVAX", status: "Watch", priority: "A", notes: "Campaign watch", archived: false },
  { ticker: "FOSL", status: "Active", priority: "A", notes: "Strong campaign", archived: false },
  { ticker: "UUUU", status: "Watch", priority: "B", notes: "Uranium / REE", archived: false },
  { ticker: "ALT", status: "Watch", priority: "B", notes: "", archived: false },
];

function scoreRow(row) {
  let score = 0;
  if (row.priority === "A") score += 35;
  if (row.priority === "B") score += 22;
  if (row.status === "Active") score += 25;
  if (row.status === "Ready") score += 30;
  if (row.status === "Watch") score += 12;
  if (row.quote?.changePct > 5) score += 15;
  if (row.quote?.changePct < -5) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export default function App() {
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem("freedom_watchlist_v1");
    return saved ? JSON.parse(saved) : initialRows;
  });

  const [newTicker, setNewTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [focusOnly, setFocusOnly] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    localStorage.setItem("freedom_watchlist_v1", JSON.stringify(rows));
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows
      .map((r) => ({ ...r, score: scoreRow(r) }))
      .filter((r) => (showArchive ? r.archived : !r.archived))
      .filter((r) => (focusOnly ? r.score >= 55 : true))
      .sort((a, b) => b.score - a.score);
  }, [rows, showArchive, focusOnly]);

  async function loadLiveData() {
    if (!API_KEY) {
      alert("Missing VITE_FINNHUB_API_KEY");
      return;
    }

    setLoading(true);

    try {
      const updated = await Promise.all(
        rows.map(async (row) => {
          if (row.archived) return row;

          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${row.ticker}&token=${API_KEY}`
          );

          const q = await res.json();

          return {
            ...row,
            quote: {
              price: q.c || 0,
              prev: q.pc || 0,
              changePct: q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0,
            },
            lastUpdate: new Date().toLocaleTimeString("he-IL"),
          };
        })
      );

      setRows(updated);
    } catch (e) {
      alert("Live data failed");
    } finally {
      setLoading(false);
    }
  }

  function addTicker() {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    if (rows.some((r) => r.ticker === ticker)) return;

    setRows([
      ...rows,
      {
        ticker,
        status: "Watch",
        priority: "B",
        notes: "",
        archived: false,
        telegram: "",
        alert: "",
      },
    ]);

    setNewTicker("");
  }

  function updateRow(ticker, patch) {
    setRows(rows.map((r) => (r.ticker === ticker ? { ...r, ...patch } : r)));
  }

  function removeRow(ticker) {
    setRows(rows.filter((r) => r.ticker !== ticker));
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 p-4 md:p-6">
      <div className="max-w-[1500px] mx-auto space-y-5">
        {/* HEADER */}
        <header className="rounded-3xl border border-slate-800 bg-[#0d111c]/90 shadow-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Freedom Trading OS
              </div>
              <h1 className="text-2xl md:text-4xl font-bold mt-1">
                Watch List Command Center
              </h1>
              <p className="text-slate-400 mt-2">
                Professional campaign tracker — clean UI, focused decisions, no chase.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadLiveData}
                className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-950 font-bold hover:bg-white transition"
              >
                {loading ? "Loading..." : "Load Live Data"}
              </button>

              <button
                onClick={() => setFocusOnly(!focusOnly)}
                className={`px-4 py-3 rounded-2xl border transition ${
                  focusOnly
                    ? "bg-emerald-500/15 border-emerald-400 text-emerald-300"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Focus Mode
              </button>

              <button
                onClick={() => setShowArchive(!showArchive)}
                className="px-4 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Archive ({rows.filter((r) => r.archived).length})
              </button>
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat title="Active List" value={rows.filter((r) => !r.archived).length} />
          <Stat title="Focus Names" value={rows.filter((r) => scoreRow(r) >= 55 && !r.archived).length} />
          <Stat title="Archived" value={rows.filter((r) => r.archived).length} />
          <Stat title="API" value={API_KEY ? "Connected" : "Missing"} />
        </section>

        {/* ADD BAR */}
        <section className="rounded-3xl border border-slate-800 bg-[#0d111c] p-4 flex flex-col md:flex-row gap-3">
          <input
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTicker()}
            placeholder="Add ticker, example: XFOR"
            className="flex-1 bg-[#070a10] border border-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-slate-500"
          />
          <button
            onClick={addTicker}
            className="px-6 py-3 rounded-2xl bg-[#1b2435] border border-slate-700 hover:bg-[#232f45] font-semibold"
          >
            Add Ticker
          </button>
        </section>

        {/* TABLE */}
        <section className="rounded-3xl border border-slate-800 bg-[#0d111c] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#111827] text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="text-left p-4">Ticker</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Change</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Priority</th>
                  <th className="text-left p-4">Score</th>
                  <th className="text-left p-4">Notes</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.ticker}
                    className="border-t border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="p-4">
                      <div className="font-bold text-lg">{row.ticker}</div>
                      <div className="text-xs text-slate-500">
                        {row.lastUpdate ? `Updated ${row.lastUpdate}` : "No live data"}
                      </div>
                    </td>

                    <td className="p-4 font-semibold">
                      {row.quote?.price ? `$${row.quote.price.toFixed(2)}` : "—"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          row.quote?.changePct > 0
                            ? "bg-emerald-500/10 text-emerald-300"
                            : row.quote?.changePct < 0
                            ? "bg-red-500/10 text-red-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {row.quote?.changePct
                          ? `${row.quote.changePct.toFixed(2)}%`
                          : "—"}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(row.ticker, { status: e.target.value })}
                        className="bg-[#070a10] border border-slate-700 rounded-xl px-3 py-2"
                      >
                        <option>Watch</option>
                        <option>Ready</option>
                        <option>Active</option>
                        <option>Wait</option>
                        <option>Closed</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <select
                        value={row.priority}
                        onChange={(e) => updateRow(row.ticker, { priority: e.target.value })}
                        className="bg-[#070a10] border border-slate-700 rounded-xl px-3 py-2"
                      >
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-300"
                          style={{ width: `${row.score}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{row.score}/100</div>
                    </td>

                    <td className="p-4 min-w-[240px]">
                      <input
                        value={row.notes || ""}
                        onChange={(e) => updateRow(row.ticker, { notes: e.target.value })}
                        placeholder="Structure / trigger / invalidation"
                        className="w-full bg-[#070a10] border border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-slate-500"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setDrawer(row)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
                        >
                          Drawer
                        </button>

                        <button
                          onClick={() =>
                            updateRow(row.ticker, { archived: !row.archived })
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
                        >
                          {row.archived ? "Restore" : "Archive"}
                        </button>

                        <button
                          onClick={() => removeRow(row.ticker)}
                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-slate-500">
                      No tickers in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* DRAWER */}
      {drawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-xl h-full bg-[#0d111c] border-l border-slate-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-widest">
                  Position Drawer
                </div>
                <h2 className="text-3xl font-bold">{drawer.ticker}</h2>
              </div>

              <button
                onClick={() => setDrawer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <DrawerField
                label="Alert"
                value={drawer.alert || ""}
                onChange={(v) => {
                  updateRow(drawer.ticker, { alert: v });
                  setDrawer({ ...drawer, alert: v });
                }}
                placeholder="Example: reclaim range high / pullback to base"
              />

              <DrawerField
                label="Telegram Field"
                value={drawer.telegram || ""}
                onChange={(v) => {
                  updateRow(drawer.ticker, { telegram: v });
                  setDrawer({ ...drawer, telegram: v });
                }}
                placeholder="Telegram message / trigger / channel note"
              />

              <DrawerField
                label="Campaign Notes"
                value={drawer.notes || ""}
                onChange={(v) => {
                  updateRow(drawer.ticker, { notes: v });
                  setDrawer({ ...drawer, notes: v });
                }}
                placeholder="Structure, entry zone, invalidation, add plan"
                textarea
              />

              <div className="rounded-2xl border border-slate-800 bg-[#070a10] p-4">
                <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">
                  Technical Checklist
                </div>

                <ul className="space-y-2 text-slate-300">
                  <li>• Structure clear?</li>
                  <li>• No chase after spike?</li>
                  <li>• Entry after base / pullback?</li>
                  <li>• Invalidation defined?</li>
                  <li>• Add only if stock proves itself?</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0d111c] p-4">
      <div className="text-slate-500 text-xs uppercase tracking-widest">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function DrawerField({ label, value, onChange, placeholder, textarea }) {
  return (
    <div>
      <label className="text-slate-400 text-sm">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="mt-2 w-full bg-[#070a10] border border-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-slate-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full bg-[#070a10] border border-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-slate-500"
        />
      )}
    </div>
  );
}
