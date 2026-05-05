import { useState, useEffect } from "react";

const DAYS = 30;
const TASKS = [
  { id: "chords", label: "Chord Switching", icon: "🎸" },
  { id: "strumming", label: "Strumming", icon: "🥁" },
  { id: "song", label: "Song Practice", icon: "🎵" },
];

const STORAGE_KEY = "ntc-30day-tracker-v1";

function getDayEmoji(pct, isStreakDay) {
  if (pct === 0) return null;
  if (pct === 100) return "⭐";
  if (isStreakDay) return "🔥";
  return null;
}

function calcStreak(data) {
  let streak = 0;
  for (let i = 0; i < DAYS; i++) {
    const day = data[i];
    const done = TASKS.filter(t => day[t.id]).length;
    if (done > 0) streak++;
    else if (i > 0) break; // only count from day 1 forward consecutive
  }
  // Actually calc current streak from last completed day backward
  let s = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    const day = data[i];
    const done = TASKS.filter(t => day[t.id]).length;
    if (done > 0) s++;
    else break;
  }
  return s;
}

function calcCurrentStreak(data) {
  // find the last day that has any checks, then count backward from there
  let lastActive = -1;
  for (let i = DAYS - 1; i >= 0; i--) {
    const done = TASKS.filter(t => data[i][t.id]).length;
    if (done > 0) { lastActive = i; break; }
  }
  if (lastActive === -1) return 0;
  let streak = 0;
  for (let i = lastActive; i >= 0; i--) {
    const done = TASKS.filter(t => data[i][t.id]).length;
    if (done > 0) streak++;
    else break;
  }
  return streak;
}

function initData() {
  return Array.from({ length: DAYS }, () =>
    Object.fromEntries(TASKS.map(t => [t.id, false]))
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [loaded, setLoaded] = useState(false);
  const [celebrating, setCelebrating] = useState(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(JSON.parse(saved));
    } catch (_) {}
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  }, [data, loaded]);

  function toggle(dayIdx, taskId) {
    setData(prev => {
      const next = prev.map((d, i) =>
        i === dayIdx ? { ...d, [taskId]: !d[taskId] } : d
      );
      // Check if day just hit 100%
      const dayDone = TASKS.filter(t => next[dayIdx][t.id]).length;
      if (dayDone === TASKS.length) setCelebrating(dayIdx);
      return next;
    });
    setTimeout(() => setCelebrating(null), 1200);
  }

  function resetAll() {
    if (confirm("Reset all 30 days? This can't be undone.")) {
      setData(initData());
    }
  }

  const streak = calcCurrentStreak(data);
  const totalDaysActive = data.filter(d => TASKS.some(t => d[t.id])).length;
  const totalChecks = data.reduce((acc, d) => acc + TASKS.filter(t => d[t.id]).length, 0);
  const maxChecks = DAYS * TASKS.length;
  const overallPct = Math.round((totalChecks / maxChecks) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080808;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .app {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 60px;
        }

        /* ── HEADER ── */
        .header {
          margin-bottom: 28px;
        }
        .header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 8vw, 52px);
          line-height: 1;
          letter-spacing: 1px;
        }
        .title-ntc {
          color: #ffffff;
          display: block;
        }
        .title-streak {
          display: block;
          background: linear-gradient(135deg, #FFD60A 0%, #F77F00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle {
          font-size: 14px;
          color: #888;
          margin-top: 6px;
          line-height: 1.5;
        }
        .subtitle strong {
          color: #ccc;
        }
        .reset-btn {
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #555;
          font-size: 11px;
          font-family: 'DM Sans', sans-serif;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .reset-btn:hover { border-color: #F77F00; color: #F77F00; }

        /* ── STATS ROW ── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          padding: 14px 12px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD60A, #F77F00);
        }
        .stat-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px;
          background: linear-gradient(135deg, #FFD60A, #F77F00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
        }

        /* ── PROGRESS BAR ── */
        .progress-wrap {
          margin-bottom: 28px;
        }
        .progress-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .progress-label {
          font-size: 11px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .progress-pct {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          color: #FFD60A;
        }
        .progress-track {
          height: 6px;
          background: #1a1a1a;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD60A, #F77F00);
          border-radius: 99px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── TABLE ── */
        .table-wrap {
          border: 1px solid #1e1e1e;
          border-radius: 16px;
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr 60px;
          background: #111;
          border-bottom: 1px solid #222;
          padding: 10px 14px;
          gap: 8px;
        }
        .th {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #444;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          line-height: 1.3;
          text-align: center;
        }
        .th:first-child { justify-content: flex-start; }
        .th:last-child { justify-content: flex-end; }
        .th-icon { font-size: 11px; flex-shrink: 0; }
        .th-text { white-space: nowrap; }

        .day-row {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr 60px;
          align-items: center;
          padding: 0 14px;
          gap: 8px;
          border-bottom: 1px solid #141414;
          min-height: 52px;
          transition: background 0.15s;
          position: relative;
        }
        .day-row:last-child { border-bottom: none; }
        .day-row:hover { background: #0f0f0f; }
        .day-row.complete {
          background: linear-gradient(90deg, rgba(247,127,0,0.06), transparent);
        }
        .day-row.celebrating {
          animation: celebrate 0.6s ease;
        }
        @keyframes celebrate {
          0% { background: transparent; }
          30% { background: rgba(255, 214, 10, 0.12); }
          100% { background: linear-gradient(90deg, rgba(247,127,0,0.06), transparent); }
        }

        .day-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .day-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          color: #333;
          min-width: 42px;
        }
        .day-num.active {
          background: linear-gradient(135deg, #FFD60A, #F77F00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .day-streak-icon {
          font-size: 14px;
          line-height: 1;
        }

        /* checkboxes */
        .check-cell {
          display: flex;
          justify-content: center;
        }
        .check-box {
          width: 26px;
          height: 26px;
          border: 2px solid #252525;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          background: transparent;
          flex-shrink: 0;
        }
        .check-box:hover {
          border-color: #FFD60A;
          background: rgba(255,214,10,0.05);
        }
        .check-box.checked {
          background: linear-gradient(135deg, #FFD60A, #F77F00);
          border-color: transparent;
        }
        .check-box.checked::after {
          content: '';
          width: 10px;
          height: 6px;
          border-left: 2px solid #000;
          border-bottom: 2px solid #000;
          transform: rotate(-45deg) translate(1px, -1px);
          display: block;
        }

        /* pct cell */
        .pct-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .pct-ring {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }
        .pct-text {
          font-size: 11px;
          color: #444;
          font-weight: 600;
          min-width: 28px;
          text-align: right;
        }
        .pct-text.partial { color: #F77F00; }
        .pct-text.full { color: #FFD60A; }

        /* ── LEGEND ── */
        .legend {
          display: flex;
          gap: 16px;
          margin-top: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #444;
        }
        .legend-emoji { font-size: 13px; }

        /* mobile tweak */
        @media (max-width: 420px) {
          .table-header, .day-row {
            grid-template-columns: 64px 1fr 1fr 1fr 52px;
            padding: 0 10px;
          }
          .day-num { font-size: 16px; min-width: 36px; }
          .check-box { width: 24px; height: 24px; }
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div>
              <div className="title">
                  <span className="title-ntc">NO THEORY CLUB</span>
                  <span className="title-streak">30 DAY STREAK 🔥</span>
                </div>
              <p className="subtitle">
                Build a daily guitar habit that transforms your playing.<br />
                <strong>Practice daily. Even 5 minutes counts. Momentum beats perfection.</strong>
              </p>
            </div>
            <button className="reset-btn" onClick={resetAll}>Reset</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalDaysActive}</div>
            <div className="stat-label">Days Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallPct}%</div>
            <div className="stat-label">Completion</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-top">
            <span className="progress-label">Overall Progress</span>
            <span className="progress-pct">{totalChecks} / {maxChecks} tasks</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-header">
            <div className="th">Day</div>
            {TASKS.map(t => (
              <div className="th" key={t.id}>
                <span className="th-icon">{t.icon}</span>
                <span className="th-text">{t.label}</span>
              </div>
            ))}
            <div className="th" style={{ justifyContent: "flex-end" }}>%</div>
          </div>

          {data.map((day, i) => {
            const done = TASKS.filter(t => day[t.id]).length;
            const pct = Math.round((done / TASKS.length) * 100);
            const isComplete = pct === 100;
            const isPartial = pct > 0 && pct < 100;
            const isActive = done > 0;
            const emoji = isComplete ? "⭐" : isPartial ? "🔥" : null;
            const isCelebrating = celebrating === i;

            // SVG ring
            const r = 12, cx = 16, cy = 16;
            const circumference = 2 * Math.PI * r;
            const offset = circumference - (pct / 100) * circumference;
            const ringColor = isComplete ? "#FFD60A" : isPartial ? "#F77F00" : "#222";

            return (
              <div
                key={i}
                className={`day-row${isComplete ? " complete" : ""}${isCelebrating ? " celebrating" : ""}`}
              >
                <div className="day-label">
                  <span className={`day-num${isActive ? " active" : ""}`}>
                    DAY {i + 1}
                  </span>
                  {emoji && <span className="day-streak-icon">{emoji}</span>}
                </div>

                {TASKS.map(t => (
                  <div className="check-cell" key={t.id}>
                    <div
                      className={`check-box${day[t.id] ? " checked" : ""}`}
                      onClick={() => toggle(i, t.id)}
                      role="checkbox"
                      aria-checked={day[t.id]}
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" || e.key === " " ? toggle(i, t.id) : null}
                    />
                  </div>
                ))}

                <div className="pct-cell">
                  <svg className="pct-ring" viewBox="0 0 32 32">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1c1c" strokeWidth="3" />
                    {pct > 0 && (
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        style={{ transition: "stroke-dashoffset 0.4s ease" }}
                      />
                    )}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item"><span className="legend-emoji">⭐</span><span>100% day</span></div>
          <div className="legend-item"><span className="legend-emoji">🔥</span><span>Partial day</span></div>
          <div className="legend-item"><span className="legend-emoji">🎸</span><span>Chord Switching</span></div>
          <div className="legend-item"><span className="legend-emoji">🥁</span><span>Strumming</span></div>
          <div className="legend-item"><span className="legend-emoji">🎵</span><span>Song Practice</span></div>
        </div>
      </div>
    </>
  );
}
