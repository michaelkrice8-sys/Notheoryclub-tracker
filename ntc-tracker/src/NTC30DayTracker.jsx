import { useState, useEffect, useRef } from "react";

const DAYS = 30;
const TASKS = [
  { id: "chords", label: "Chord Switching", icon: "🎸" },
  { id: "strumming", label: "Strumming", icon: "🥁" },
  { id: "song", label: "Song Practice", icon: "🎵" },
];
const STORAGE_KEY = "ntc-30day-tracker-v1";

function encodeData(data) {
  const bits = [];
  data.forEach(day => TASKS.forEach(t => bits.push(day[t.id] ? 1 : 0)));
  while (bits.length % 8 !== 0) bits.push(0);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    bytes.push(byte);
  }
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeData(str) {
  try {
    const binary = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const bits = [];
    for (let i = 0; i < binary.length; i++) {
      const byte = binary.charCodeAt(i);
      for (let j = 7; j >= 0; j--) bits.push((byte >> j) & 1);
    }
    const data = Array.from({ length: DAYS }, () =>
      Object.fromEntries(TASKS.map(t => [t.id, false]))
    );
    let idx = 0;
    data.forEach(day => TASKS.forEach(t => { day[t.id] = bits[idx++] === 1; }));
    return data;
  } catch (_) { return null; }
}

function initData() {
  return Array.from({ length: DAYS }, () =>
    Object.fromEntries(TASKS.map(t => [t.id, false]))
  );
}

function calcCurrentStreak(data) {
  let lastActive = -1;
  for (let i = DAYS - 1; i >= 0; i--) {
    if (TASKS.some(t => data[i][t.id])) { lastActive = i; break; }
  }
  if (lastActive === -1) return 0;
  let streak = 0;
  for (let i = lastActive; i >= 0; i--) {
    if (TASKS.some(t => data[i][t.id])) streak++;
    else break;
  }
  return streak;
}

// ── CONFETTI ────────────────────────────────────────────────────────────────
function useConfetti() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  function launch() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const colors = ["#FFD60A", "#F77F00", "#ffffff", "#FF6B6B", "#4ECDC4", "#FFD60A", "#F77F00"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      opacity: 1,
    }));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotSpeed;
        if (frame > 120) p.opacity = Math.max(0, p.opacity - 0.012);
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 220) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    draw();
  }

  return { canvasRef, launch };
}

export default function App() {
  const [data, setData] = useState(initData);
  const [loaded, setLoaded] = useState(false);
  const [celebrating, setCelebrating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { canvasRef, launch } = useConfetti();

  // Load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      if (d) {
        const decoded = decodeData(d);
        if (decoded) { setData(decoded); setLoaded(true); return; }
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(JSON.parse(saved));
    } catch (_) {}
    setLoaded(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  }, [data, loaded]);

  // Check for 30-day completion
  useEffect(() => {
    if (!loaded) return;
    const allDaysActive = data.every(day => TASKS.some(t => day[t.id]));
    if (allDaysActive) {
      setTimeout(() => {
        setShowModal(true);
        launch();
      }, 600);
    }
  }, [data, loaded]);

  function toggle(dayIdx, taskId) {
    setData(prev => {
      const next = prev.map((d, i) =>
        i === dayIdx ? { ...d, [taskId]: !d[taskId] } : d
      );
      const dayDone = TASKS.filter(t => next[dayIdx][t.id]).length;
      if (dayDone === TASKS.length) setCelebrating(dayIdx);
      return next;
    });
    setTimeout(() => setCelebrating(null), 1200);
  }

  function resetAll() {
    if (confirm("Reset all 30 days? This can't be undone.")) {
      setData(initData());
      window.history.replaceState(null, "", window.location.pathname);
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
        body { background: #080808; color: #fff; font-family: 'DM Sans', sans-serif; min-height: 100vh; }

        .confetti-canvas {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          z-index: 9999;
        }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          position: relative;
          animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFD60A, #F77F00);
          border-radius: 24px 24px 0 0;
        }

        .modal-emoji { font-size: 64px; margin-bottom: 16px; display: block; animation: bounce 1s ease infinite alternate; }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-8px); } }

        .modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          letter-spacing: 1px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #FFD60A, #F77F00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }

        .modal-subtitle {
          font-size: 16px;
          color: #fff;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .modal-body {
          font-size: 14px;
          color: #999;
          line-height: 1.7;
          margin-bottom: 28px;
        }
        .modal-body strong { color: #ccc; }

        .modal-close {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px 32px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 1px;
          color: #000;
          cursor: pointer;
          width: 100%;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 6px 28px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.4);
          display: block;
          text-decoration: none;
          text-shadow: none;
        }
        .modal-close:hover { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.4); }

        .modal-screenshot-hint {
          background: #1a1a1a;
          border: 1px dashed #333;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #FFD60A;
          font-weight: 600;
          margin-bottom: 16px;
          letter-spacing: 0.3px;
        }

        /* ── APP ── */
        .app { max-width: 680px; margin: 0 auto; padding: 24px 16px 60px; }
        .header { margin-bottom: 28px; }
        .header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 8vw, 52px); line-height: 1; letter-spacing: 1px; }
        .title-ntc { color: #fff; display: block; }
        .title-streak {
          display: block;
          background: linear-gradient(135deg, #FFD60A 0%, #F77F00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle { font-size: 14px; color: #888; margin-top: 6px; line-height: 1.5; }
        .subtitle strong { color: #ccc; }

        .reset-btn {
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #444;
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

        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
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
        .stat-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }

        .progress-wrap { margin-bottom: 28px; }
        .progress-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .progress-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        .progress-pct { font-family: 'Bebas Neue', sans-serif; font-size: 16px; color: #FFD60A; }
        .progress-track { height: 6px; background: #1a1a1a; border-radius: 99px; overflow: hidden; }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD60A, #F77F00);
          border-radius: 99px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .table-wrap { border: 1px solid #1e1e1e; border-radius: 16px; overflow: hidden; }
        .table-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr 60px;
          background: #111;
          border-bottom: 1px solid #222;
          padding: 12px 14px;
          gap: 8px;
          min-height: 56px;
          align-items: center;
        }
        .th {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #444;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-align: center;
          line-height: 1.3;
        }
        .th:first-child { align-items: flex-start; text-align: left; }
        .th:last-child { align-items: flex-end; text-align: right; }
        .th-icon { font-size: 13px; flex-shrink: 0; }
        .th-text { white-space: normal; }

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
        .day-row.complete { background: linear-gradient(90deg, rgba(247,127,0,0.06), transparent); }
        .day-row.celebrating { animation: celebrate 0.6s ease; }
        @keyframes celebrate {
          0% { background: transparent; }
          30% { background: rgba(255,214,10,0.12); }
          100% { background: linear-gradient(90deg, rgba(247,127,0,0.06), transparent); }
        }

        .day-label { display: flex; align-items: center; gap: 8px; }
        .day-num { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #333; min-width: 42px; }
        .day-num.active {
          background: linear-gradient(135deg, #FFD60A, #F77F00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .day-streak-icon { font-size: 14px; line-height: 1; }

        .check-cell { display: flex; justify-content: center; }
        .check-box {
          width: 30px; height: 30px;
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
        .check-box:hover { border-color: #FFD60A; background: rgba(255,214,10,0.05); }
        .check-box.checked { background: linear-gradient(135deg, #FFD60A, #F77F00); border-color: transparent; }
        .check-box.checked::after {
          content: '';
          width: 10px; height: 6px;
          border-left: 2px solid #000;
          border-bottom: 2px solid #000;
          transform: rotate(-45deg) translate(1px, -1px);
          display: block;
        }

        .pct-cell { display: flex; align-items: center; justify-content: flex-end; }
        .pct-ring { width: 32px; height: 32px; flex-shrink: 0; }

        .legend { display: flex; gap: 16px; margin-top: 20px; justify-content: center; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #444; }
        .legend-emoji { font-size: 13px; }

        @media (max-width: 420px) {
          .table-header, .day-row { grid-template-columns: 64px 1fr 1fr 1fr 52px; padding: 0 10px; }
          .day-num { font-size: 16px; min-width: 36px; }
          .check-box { width: 28px; height: 28px; }
          .modal { padding: 32px 20px; }
          .modal-title { font-size: 28px; }
        }
      `}</style>

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="confetti-canvas" />

      {/* Completion Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-emoji">🎸</span>
            <div className="modal-title">YOU'RE AN OFFICIAL GUITAR PLAYER</div>
            <div className="modal-subtitle">30 Days. Done. No excuses.</div>
            <p className="modal-body">
              You just did what most people never do — you showed up <strong>every single day</strong> for 30 days straight. That's not a beginner anymore. That's a guitar player.<br /><br />
              The calluses, the chord transitions, the strumming patterns — <strong>that's all you</strong>. This is where it gets really fun. Keep going. 🔥
            </p>
            <div className="modal-screenshot-hint">
              📸 Screenshot this & share it in the community!
            </div>
            <a
              className="modal-close"
              href="https://www.skool.com/notheoryclub"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowModal(false)}
            >
              Share in Community! 🤩
            </a>
          </div>
        </div>
      )}

      <div className="app">
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

        <div className="progress-wrap">
          <div className="progress-top">
            <span className="progress-label">Overall Progress</span>
            <span className="progress-pct">{totalChecks} / {maxChecks} tasks</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

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
            const r = 12, cx = 16, cy = 16;
            const circumference = 2 * Math.PI * r;
            const offset = circumference - (pct / 100) * circumference;
            const ringColor = isComplete ? "#FFD60A" : isPartial ? "#F77F00" : "#222";

            return (
              <div key={i} className={`day-row${isComplete ? " complete" : ""}${isCelebrating ? " celebrating" : ""}`}>
                <div className="day-label">
                  <span className={`day-num${isActive ? " active" : ""}`}>DAY {i + 1}</span>
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
                      onKeyDown={e => (e.key === "Enter" || e.key === " ") && toggle(i, t.id)}
                    />
                  </div>
                ))}
                <div className="pct-cell">
                  <svg className="pct-ring" viewBox="0 0 32 32">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1c1c" strokeWidth="3" />
                    {pct > 0 && (
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill="none" stroke={ringColor} strokeWidth="3"
                        strokeDasharray={circumference} strokeDashoffset={offset}
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
