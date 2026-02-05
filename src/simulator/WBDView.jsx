import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';

/* ── Layout constants ─────────────────────────────────────────────── */
const PORT_GENS = ['DG1', 'DG2'];
const STB_GENS = ['DG3', 'DG4'];
const GEN_X = { DG1: 280, DG2: 470, DG3: 920, DG4: 1110, EMG: 1450 };

const ENGINE_Y = 35;
const ENGINE_W = 58;
const ENGINE_H = 30;
const GEN_Y = 100;
const GEN_R = 30;
const BRK_Y = 165;
const BRK_H = 20;
const BUS_Y = 220;

const PORT_BUS_S = 150, PORT_BUS_E = 600;
const STB_BUS_S = 800, STB_BUS_E = 1250;
const MAIN_TIE_X = 700;
const EMG_TIE_X = 1340;
const EMG_BUS_S = 1380, EMG_BUS_E = 1530;

// Thrusters on 690V
const THR_ST_X = 190, THR_MT_X = 370;
const THR_BT_X = 850, THR_AZ_X = 1040;

// T1/T2 transformers (690V → 450V)
const T1_X = 550, T2_X = 1200;
const TRAFO_Y = 310;

// 450V buses
const SUB_450_Y = 390;
const PORT_450_S = 470, PORT_450_E = 630;
const STB_450_S = 1120, STB_450_E = 1280;
const TIE_450_X = 875;

// Consumers on 450V
const CRANE1_X = 500, ROV1_X = 600;
const CRANE2_X = 1150, ROV2_X = 1250;

// Shore on Stb 450V
const SHORE_X = 1200;
const SHORE_Y = 475;

// T5/T6 transformers (690V → 230V)
const T5_X = 230, T6_X = 1060;
const TRAFO_230_Y = 480;

// 230V port/stb buses
const BUS_230_Y = 555;
const PORT_230_S = 160, PORT_230_E = 320;
const STB_230_S = 990, STB_230_E = 1140;
const TIE_230_X = 655;

// EMG section
const T3_X = 1420;
const EMG_230_BUS_Y = 390;
const EMG_230_S = 1380, EMG_230_E = 1530;
const T4_X = 1490;
const T4_TRAFO_Y = 450;
const DC_110_BUS_Y = 520;

const SVG_W = 1600;
const SVG_H = 700;

/* ── Colors ───────────────────────────────────────────────────────── */
const C = {
  green: '#00ff88', greenDim: '#00cc6a',
  red: '#ff4444', redDim: '#d9534f',
  amber: '#ffaa00', gray: '#3a4a5e', grayLt: '#7a8a9e',
  text: '#c8d6e5', blue: '#88ccff', gold: '#ddbb66',
};

const RPM_MIN = 680, RPM_MAX = 760, RPM_STEP = 0.5, TICK_MS = 50;
const V_MIN = 620, V_MAX = 760;
const SYNC_N = 24, SYNC_R = 38;

let _popupId = 0;

export default function WBDView() {
  const ctx = useGame();
  const containerRef = useRef(null);
  const [popups, setPopups] = useState([]);
  const intervalRef = useRef(null);
  const dirRef = useRef(0);
  const dragRef = useRef(null);

  const stopAdj = useCallback(() => {
    dirRef.current = 0;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);
  useEffect(() => stopAdj, [stopAdj]);

  const es = ctx.engineState || {};
  const gens = es.generators || {};
  const portBus = es.portBus || {};
  const stbBus = es.stbBus || {};
  const mainBus = es.mainBus || {};
  const emBus = es.emergencyBus || {};
  const busTie = es.busTie || {};
  const busTie450 = es.busTie450 || {};
  const busTie230 = es.busTie230 || {};
  const xformers = es.transformers || {};
  const subBuses = es.subBuses || {};
  const consumers = es.heavyConsumers || {};
  const shore = es.shoreConnection || {};
  const syncs = es.synchroscopes || {};

  const portLive = portBus.live;
  const stbLive = stbBus.live;
  const mainLive = mainBus.live;
  const emLive = emBus.live;
  const mainTieClosed = busTie.closed ?? true;
  const emTieClosed = emBus.busTieClosed ?? false;
  const tie450Closed = busTie450.closed ?? false;
  const tie230Closed = busTie230.closed ?? false;
  const portCol = portLive ? C.green : C.gray;
  const stbCol = stbLive ? C.green : C.gray;
  const emCol = emLive ? C.amber : C.gray;

  const sb450p = subBuses.port450Bus || {};
  const sb450s = subBuses.stb450Bus || {};
  const sb230p = subBuses.port230Bus || {};
  const sb230s = subBuses.stb230Bus || {};
  const sb230e = subBuses.emg230Bus || {};
  const sb110 = subBuses.dc110Bus || {};

  /* ── Popup helpers (multi-popup, movable) ─────────────────────── */
  const openPopup = useCallback((e, type, id) => {
    e.stopPropagation();
    const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setPopups(prev => {
      const existing = prev.find(p => p.type === type && p.id === id);
      if (existing) return [...prev.filter(p => p !== existing), existing];
      return [...prev, { key: ++_popupId, type, id, x: x + 10, y: y + 10 }];
    });
  }, []);

  const closeOnePopup = useCallback((key) => {
    stopAdj();
    setPopups(prev => prev.filter(p => p.key !== key));
  }, [stopAdj]);

  const onDragStart = useCallback((e, key) => {
    e.preventDefault();
    const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const p = popups.find(p => p.key === key);
    if (!p) return;
    dragRef.current = { key, offsetX: e.clientX - r.left - p.x, offsetY: e.clientY - r.top - p.y };
  }, [popups]);

  const onDragMove = useCallback((e) => {
    if (!dragRef.current) return;
    const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const { key, offsetX, offsetY } = dragRef.current;
    const nx = e.clientX - r.left - offsetX;
    const ny = e.clientY - r.top - offsetY;
    setPopups(prev => prev.map(p => p.key === key ? { ...p, x: nx, y: ny } : p));
  }, []);

  const onDragEnd = useCallback(() => { dragRef.current = null; }, []);

  function sColor(s) {
    if (s === 'RUNNING') return C.green;
    if (s === 'IDLE') return '#4488ff';
    if (['PRE_LUBE', 'CRANKING', 'COOL_DOWN'].includes(s)) return C.amber;
    return C.gray;
  }
  function bColor(b) { return b === 'CLOSED' ? C.green : b === 'TRIPPED' ? C.red : C.gray; }

  /* ── IEC Breaker ───────────────────────────────────────────────── */
  function Brk(cx, cy, state, onClick, horiz = false) {
    const col = bColor(state);
    const h = BRK_H / 2;
    const cr = 3;
    if (horiz) {
      return (
        <g style={{ cursor: 'pointer' }} onClick={onClick}>
          <circle cx={cx - h} cy={cy} r={cr} fill={col} />
          <circle cx={cx + h} cy={cy} r={cr} fill={col} />
          {state === 'CLOSED'
            ? <line x1={cx - h + cr} y1={cy} x2={cx + h - cr} y2={cy} stroke={col} strokeWidth={2.5} />
            : <line x1={cx + h - cr} y1={cy} x2={cx - 3} y2={cy - 10} stroke={col} strokeWidth={2.5} />}
          {state === 'TRIPPED' && <circle cx={cx} cy={cy} r={13} fill="none" stroke={C.red} strokeWidth={1.5}>
            <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" /></circle>}
        </g>
      );
    }
    return (
      <g style={{ cursor: 'pointer' }} onClick={onClick}>
        <circle cx={cx} cy={cy - h} r={cr} fill={col} />
        <circle cx={cx} cy={cy + h} r={cr} fill={col} />
        {state === 'CLOSED'
          ? <line x1={cx} y1={cy - h + cr} x2={cx} y2={cy + h - cr} stroke={col} strokeWidth={2.5} />
          : <line x1={cx} y1={cy + h - cr} x2={cx - 10} y2={cy - h + 2} stroke={col} strokeWidth={2.5} />}
        {state === 'TRIPPED' && <circle cx={cx} cy={cy} r={13} fill="none" stroke={C.red} strokeWidth={1.5}>
          <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" /></circle>}
      </g>
    );
  }

  /* ── Engine symbol ──────────────────────────────────────────────── */
  function Engine(cx, id) {
    const g = gens[id];
    const on = g?.state === 'RUNNING' || g?.state === 'IDLE';
    const col = on ? C.greenDim : C.gray;
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'gen', id)}>
        <rect x={cx - ENGINE_W / 2} y={ENGINE_Y - ENGINE_H / 2} width={ENGINE_W} height={ENGINE_H}
          rx={3} fill="none" stroke={col} strokeWidth={1.5} />
        <text x={cx} y={ENGINE_Y + 1} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="10" fontFamily="monospace" fontWeight="bold">
          {id === 'EMG' ? 'EMG ENG' : 'DIESEL'}
        </text>
        <line x1={cx} y1={ENGINE_Y + ENGINE_H / 2} x2={cx} y2={GEN_Y - GEN_R} stroke={col} strokeWidth={2} />
      </g>
    );
  }

  /* ── Generator circle ───────────────────────────────────────────── */
  function Gen(cx, id) {
    const g = gens[id];
    const col = sColor(g?.state);
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'gen', id)}>
        <circle cx={cx} cy={GEN_Y} r={GEN_R} fill="none" stroke={col} strokeWidth={2.5} />
        <text x={cx} y={GEN_Y - 6} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="12" fontWeight="bold" fontFamily="monospace">G</text>
        <text x={cx} y={GEN_Y + 10} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="12" fontWeight="bold" fontFamily="monospace">{id}</text>
        <line x1={cx} y1={GEN_Y + GEN_R} x2={cx} y2={BRK_Y - BRK_H / 2 - 3} stroke={col} strokeWidth={2} />
      </g>
    );
  }

  /* ── Data table ─────────────────────────────────────────────────── */
  function DataTable(cx, id) {
    const g = gens[id];
    if (!g) return null;
    const left = PORT_GENS.includes(id) || id === 'EMG';
    const tx = left ? cx - GEN_R - 100 : cx + GEN_R + 6;
    const ty = 48;
    const w = 94, h = 62;
    const bdr = g.state === 'RUNNING' ? C.greenDim : C.gray;
    const hz = (g.frequency || 0).toFixed(1);
    const kw = Math.round(g.activePower || 0);
    const v = Math.round(g.voltage || 0);
    const a = g.voltage > 0 ? Math.round(g.activePower * 1000 / (g.voltage * 1.732)) : 0;
    return (
      <g>
        <rect x={tx} y={ty} width={w} height={h} rx={3} fill="rgba(10,14,23,0.92)" stroke={bdr} strokeWidth={1} />
        <text x={tx + 5} y={ty + 15} fill={C.text} fontSize="11" fontFamily="monospace">{hz} Hz</text>
        <text x={tx + w - 5} y={ty + 15} textAnchor="end" fill={C.text} fontSize="11" fontFamily="monospace">{kw} kW</text>
        <text x={tx + 5} y={ty + 31} fill={C.text} fontSize="11" fontFamily="monospace">{v} V</text>
        <text x={tx + w - 5} y={ty + 31} textAnchor="end" fill={C.text} fontSize="11" fontFamily="monospace">{a} A</text>
        <text x={tx + 5} y={ty + 47} fill={C.grayLt} fontSize="10" fontFamily="monospace">
          Load: {Math.round(g.loadPercent || 0)}%
        </text>
        <circle cx={tx + w - 32} cy={ty + 53} r={3.5} fill={g.damaged ? C.red : C.gray} />
        <circle cx={tx + w - 19} cy={ty + 53} r={3.5} fill={g.breakerTripped ? C.red : C.gray} />
        <circle cx={tx + w - 6} cy={ty + 53} r={3.5} fill={g.state === 'RUNNING' ? C.green : C.gray} />
      </g>
    );
  }

  /* ── Consumer block ─────────────────────────────────────────────── */
  function Consumer(cx, busY, cId, busName) {
    const c = consumers[cId];
    if (!c) return null;
    const bus = busName === 'portBus' ? portBus : busName === 'stbBus' ? stbBus : subBuses[busName] || {};
    const live = bus.live && c.breakerState === 'CLOSED' && c.enabled;
    const col = live ? C.greenDim : C.gray;
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'consumer', cId)}>
        <line x1={cx} y1={busY} x2={cx} y2={busY + 14} stroke={col} strokeWidth={1.5} />
        <circle cx={cx} cy={busY + 16} r={3} fill={bColor(c.breakerState)} />
        <line x1={cx} y1={busY + 19} x2={cx} y2={busY + 36} stroke={col} strokeWidth={1.5} />
        <rect x={cx - 34} y={busY + 36} width={68} height={34} rx={3}
          fill={live ? 'rgba(0,255,136,0.08)' : 'rgba(60,70,85,0.2)'} stroke={col} strokeWidth={1} />
        <text x={cx} y={busY + 48} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="9" fontFamily="monospace" fontWeight="bold">{c.name}</text>
        <text x={cx} y={busY + 62} textAnchor="middle" dominantBaseline="middle"
          fill={C.grayLt} fontSize="8" fontFamily="monospace">{Math.round(c.currentLoad)} kW{c.hasVSD ? ' VSD' : ''}</text>
      </g>
    );
  }

  /* ── Transformer ────────────────────────────────────────────────── */
  function Trafo(cx, trafoY, tId, fromY, primCol, secCol) {
    const tf = xformers[tId];
    if (!tf) return null;
    const brkY = fromY + (trafoY - fromY) * 0.35;
    const bst = tf.breakerState || 'OPEN';
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'xformer', tId)}>
        <line x1={cx} y1={fromY} x2={cx} y2={brkY - BRK_H / 2 - 3} stroke={primCol} strokeWidth={1.5} />
        {Brk(cx, brkY, bst, (e) => openPopup(e, 'xformer', tId))}
        <line x1={cx} y1={brkY + BRK_H / 2 + 3} x2={cx} y2={trafoY - 14}
          stroke={bst === 'CLOSED' ? primCol : C.gray} strokeWidth={1.5} />
        <circle cx={cx} cy={trafoY - 6} r={10} fill="none" stroke={primCol} strokeWidth={1.5} />
        <circle cx={cx} cy={trafoY + 6} r={10} fill="none" stroke={secCol} strokeWidth={1.5} />
        <text x={cx + 16} y={trafoY} textAnchor="start" dominantBaseline="middle"
          fill={C.grayLt} fontSize="8" fontFamily="monospace">{tf.name || tId}</text>
      </g>
    );
  }

  /* ── Shore ──────────────────────────────────────────────────────── */
  function Shore() {
    const conn = shore.breakerState === 'CLOSED';
    const col = conn ? C.greenDim : C.gray;
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'shore', 'SHORE')}>
        <line x1={SHORE_X} y1={SUB_450_Y} x2={SHORE_X} y2={SHORE_Y - 30} stroke={col} strokeWidth={1.5} />
        {Brk(SHORE_X, SHORE_Y - 30, shore.breakerState || 'OPEN', (e) => openPopup(e, 'shore', 'SHORE'))}
        <rect x={SHORE_X - 40} y={SHORE_Y} width={80} height={32} rx={4}
          fill={conn ? 'rgba(0,255,136,0.1)' : 'rgba(60,70,85,0.3)'} stroke={col} strokeWidth={1.5} />
        <text x={SHORE_X} y={SHORE_Y + 11} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="11" fontFamily="monospace" fontWeight="bold">SHORE</text>
        <text x={SHORE_X} y={SHORE_Y + 24} textAnchor="middle" dominantBaseline="middle"
          fill={C.grayLt} fontSize="8" fontFamily="monospace">450V 60Hz</text>
      </g>
    );
  }

  /* ── Power summary panel ────────────────────────────────────────── */
  function PowerSummary() {
    const pLoad = Math.round(portBus.totalLoad || 0);
    const sLoad = Math.round(stbBus.totalLoad || 0);
    const total = Math.round(mainBus.totalLoad || 0);
    const onGens = Object.values(gens).filter(g => !g.isEmergency && g.state === 'RUNNING' && g.breakerState === 'CLOSED');
    const totalCap = onGens.reduce((s, g) => s + (g.capacity || 0), 0) || 1;
    const pct = Math.min((total / totalCap) * 100, 100);
    const barCol = pct > 90 ? C.red : pct > 70 ? C.amber : C.greenDim;
    const px = 20, py = SVG_H - 80, pw = 200, ph = 70;
    return (
      <g>
        <rect x={px} y={py} width={pw} height={ph} rx={4} fill="rgba(10,14,23,0.92)" stroke={C.gray} strokeWidth={1} />
        <text x={px + 8} y={py + 16} fill={C.text} fontSize="10" fontFamily="monospace" fontWeight="bold">POWER SUMMARY</text>
        <text x={px + 8} y={py + 32} fill={C.grayLt} fontSize="10" fontFamily="monospace">Port: {pLoad} kW</text>
        <text x={px + 108} y={py + 32} fill={C.grayLt} fontSize="10" fontFamily="monospace">Stb: {sLoad} kW</text>
        <text x={px + 8} y={py + 48} fill={C.text} fontSize="10" fontFamily="monospace">Total: {total} kW / {Math.round(totalCap)} kW</text>
        <rect x={px + 8} y={py + 55} width={pw - 16} height={8} rx={3} fill="rgba(60,70,85,0.5)" />
        <rect x={px + 8} y={py + 55} width={Math.max(0, (pw - 16) * pct / 100)} height={8} rx={3} fill={barCol} />
      </g>
    );
  }

  /* ── Mini synchroscope ──────────────────────────────────────────── */
  function MiniSync(gId) {
    const sd = syncs[gId];
    if (!sd) return <div style={{ color: C.grayLt, fontSize: 11, padding: 4 }}>Bus dead or gen not running</div>;
    const cx = 48, cy = 48;
    const leds = [];
    for (let i = 0; i < SYNC_N; i++) {
      const a = (i / SYNC_N) * 2 * Math.PI - Math.PI / 2;
      const lx = cx + SYNC_R * Math.cos(a);
      const ly = cy + SYNC_R * Math.sin(a);
      const nIdx = ((sd.needleAngleDeg + 180) / 360 * SYNC_N + SYNC_N) % SYNC_N;
      const d = Math.min(Math.abs(i - nIdx), SYNC_N - Math.abs(i - nIdx));
      let lc = 'rgba(50,60,70,0.4)';
      if (d < 1.5) {
        lc = (i < SYNC_N / 4 || i > 3 * SYNC_N / 4) ? '#00ff88' : '#ff4444';
      }
      if (i === 0 && d >= 1.5) lc = '#003311';
      leds.push(<circle key={i} cx={lx} cy={ly} r={3} fill={lc} />);
    }
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={96} height={96} viewBox="0 0 96 96">{leds}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={C.text} fontSize="8" fontFamily="monospace">SYNC</text>
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.grayLt, fontFamily: 'monospace', padding: '0 6px' }}>
          <span>dF:{sd.freqDiff?.toFixed(2)}</span><span>dV:{sd.voltageDiff?.toFixed(0)}</span>
        </div>
        {sd.inWindow && <div style={{ color: C.green, fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>IN WINDOW</div>}
      </div>
    );
  }

  /* ── Popup (multi, movable) ────────────────────────────────────── */
  function popupTitle(type, id) {
    if (type === 'gen') return `Generator — ${id}`;
    if (type === 'xformer') return `Transformer — ${xformers[id]?.name || id}`;
    if (type === 'consumer') return consumers[id]?.name || id;
    if (type === 'maintie') return 'Main Bus-Tie';
    if (type === 'emgtie') return 'EMG Bus-Tie';
    if (type === 'tie450') return '450V Bus-Tie';
    if (type === 'tie230') return '230V Bus-Tie';
    if (type === 'shore') return 'Shore Connection';
    return id;
  }

  function popupBody(type, id) {
    if (type === 'gen') return GenPopup(id);
    if (type === 'xformer') return XformerPopup(id);
    if (type === 'consumer') return ConsumerPopup(id);
    if (type === 'maintie') return TiePopup(mainTieClosed, ctx.setMainBusTie);
    if (type === 'emgtie') return TiePopup(emTieClosed, ctx.setBusTie);
    if (type === 'tie450') return TiePopup(tie450Closed, ctx.setTie450);
    if (type === 'tie230') return TiePopup(tie230Closed, ctx.setTie230);
    if (type === 'shore') return ShorePopup();
    return null;
  }

  function renderPopups() {
    if (popups.length === 0) return null;
    const cw = containerRef.current?.offsetWidth || 1000;
    const ch = containerRef.current?.offsetHeight || 600;
    return popups.map((p) => {
      const pw = p.type === 'gen' ? 370 : 270;
      const px = Math.max(0, Math.min(p.x, cw - pw - 10));
      const py = Math.max(0, Math.min(p.y, ch - 200));
      return (
        <div key={p.key} className="busbar-popup" style={{ left: px, top: py, width: pw, maxHeight: ch - 40, overflowY: 'auto', zIndex: 100 + p.key }}
          onClick={(e) => e.stopPropagation()}>
          <div className="busbar-popup__header busbar-popup__drag-handle"
            onMouseDown={(e) => onDragStart(e, p.key)}>
            <span className="busbar-popup__title">{popupTitle(p.type, p.id)}</span>
            <button className="busbar-popup__close" onClick={() => closeOnePopup(p.key)}>×</button>
          </div>
          <div className="busbar-popup__body">
            {popupBody(p.type, p.id)}
          </div>
        </div>
      );
    });
  }

  function GenPopup(id) {
    const g = gens[id];
    if (!g) return null;

    const startCam = (dir) => {
      stopAdj();
      dirRef.current = dir;
      const cur = es.generators?.[id]?.governorSetpoint ?? 720;
      ctx.setGovernorSetpoint(id, Math.max(RPM_MIN, Math.min(RPM_MAX, cur + dir * RPM_STEP)));
      intervalRef.current = setInterval(() => {
        const c2 = es.generators?.[id]?.governorSetpoint ?? 720;
        ctx.setGovernorSetpoint(id, Math.max(RPM_MIN, Math.min(RPM_MAX, c2 + dir * RPM_STEP)));
      }, TICK_MS);
    };

    return (
      <>
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => ctx.startGenerator(id)} disabled={g.state !== 'OFF'}>START</Btn>
          <Btn c="stop" onClick={() => ctx.stopGenerator(id)} disabled={g.state === 'OFF'}>STOP</Btn>
        </div>
        <Sect>Breaker</Sect>
        <Row l="State" v={`${g.breakerState}${g.tripReason ? ' (' + g.tripReason + ')' : ''}`} vc={bColor(g.breakerState)} />
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => ctx.closeBreaker(id)} disabled={g.breakerState === 'CLOSED' || g.breakerState === 'TRIPPED'}>CLOSE</Btn>
          <Btn c="stop" onClick={() => ctx.openBreaker(id)} disabled={g.breakerState !== 'CLOSED'}>OPEN</Btn>
          <Btn c="reset" onClick={() => ctx.resetBreaker(id)} disabled={g.breakerState !== 'TRIPPED'}>RESET</Btn>
        </div>
        <div className="busbar-popup__actions" style={{ marginTop: 4 }}>
          <Btn c="sync" onClick={() => ctx.autoSync(id)} disabled={g.breakerState === 'CLOSED' || g.state !== 'RUNNING'}>AUTO SYNC</Btn>
        </div>
        {g.state === 'RUNNING' && g.breakerState === 'OPEN' && <><Sect>Synchroscope</Sect>{MiniSync(id)}</>}
        <Sect>Governor</Sect>
        <div className="busbar-popup__row">
          <span className="busbar-popup__label">Mode</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`busbar-popup__btn-sm ${g.speedMode === 'droop' ? 'busbar-popup__btn-sm--active' : ''}`}
              onClick={() => ctx.setSpeedMode(id, 'droop')}>Droop</button>
            <button className={`busbar-popup__btn-sm ${g.speedMode === 'isochronous' ? 'busbar-popup__btn-sm--active' : ''}`}
              onClick={() => ctx.setSpeedMode(id, 'isochronous')}>Iso</button>
          </div>
        </div>
        <div className="busbar-popup__row">
          <span className="busbar-popup__label">Speed: {Math.round(g.governorSetpoint)} RPM</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="busbar-popup__cam-btn" onMouseDown={() => startCam(-1)} onMouseUp={stopAdj} onMouseLeave={stopAdj}>−</button>
            <span style={{ fontSize: 10, color: C.grayLt, width: 14, textAlign: 'center' }}>0</span>
            <button className="busbar-popup__cam-btn" onMouseDown={() => startCam(1)} onMouseUp={stopAdj} onMouseLeave={stopAdj}>+</button>
          </div>
        </div>
        <div className="busbar-popup__row">
          <span className="busbar-popup__label">Droop: {(g.droopPercent || 0).toFixed(1)}%</span>
          <input type="range" min={0} max={8} step={0.1} value={g.droopPercent || 4}
            onChange={(e) => ctx.setDroopPercent(id, parseFloat(e.target.value))}
            disabled={g.speedMode === 'isochronous'} style={{ width: 90 }} />
        </div>
        <Sect>AVR</Sect>
        <div className="busbar-popup__row">
          <span className="busbar-popup__label">V Set: {Math.round(g.avrSetpoint)} V</span>
          <input type="range" min={V_MIN} max={V_MAX} step={1} value={g.avrSetpoint || 690}
            onChange={(e) => ctx.setAvrSetpoint(id, parseFloat(e.target.value))} style={{ width: 90 }} />
        </div>
      </>
    );
  }

  function XformerPopup(tId) {
    const tf = xformers[tId];
    if (!tf) return null;
    return (
      <div className="busbar-popup__actions">
        <Btn c="start" onClick={() => ctx.closeTransformerBreaker(tId)} disabled={tf.breakerState === 'CLOSED'}>CLOSE</Btn>
        <Btn c="stop" onClick={() => ctx.openTransformerBreaker(tId)} disabled={tf.breakerState === 'OPEN'}>OPEN</Btn>
      </div>
    );
  }

  function ConsumerPopup(cId) {
    const c = consumers[cId];
    if (!c) return null;
    return (
      <div className="busbar-popup__actions">
        <Btn c="start" onClick={() => { ctx.enableConsumer(cId); ctx.closeConsumerBreaker(cId); }}
          disabled={c.enabled && c.breakerState === 'CLOSED'}>ENABLE</Btn>
        <Btn c="stop" onClick={() => { ctx.disableConsumer(cId); ctx.openConsumerBreaker(cId); }}
          disabled={!c.enabled}>DISABLE</Btn>
      </div>
    );
  }

  function TiePopup(closed, setFn) {
    return (
      <div className="busbar-popup__actions">
        <Btn c="start" onClick={() => setFn(true)} disabled={closed}>CLOSE</Btn>
        <Btn c="stop" onClick={() => setFn(false)} disabled={!closed}>OPEN</Btn>
      </div>
    );
  }

  function ShorePopup() {
    return (
      <div className="busbar-popup__actions">
        <Btn c="start" onClick={() => ctx.connectShore()} disabled={shore.breakerState === 'CLOSED'}>CONNECT</Btn>
        <Btn c="stop" onClick={() => ctx.disconnectShore()} disabled={shore.breakerState !== 'CLOSED'}>DISCONNECT</Btn>
      </div>
    );
  }

  /* ── Popup tiny helpers ─────────────────────────────────────────── */
  function Row({ l, v, vc }) {
    return (
      <div className="busbar-popup__row">
        <span className="busbar-popup__label">{l}</span>
        <span className="busbar-popup__value" style={vc ? { color: vc } : undefined}>{v}</span>
      </div>
    );
  }
  function Sect({ children }) {
    return <div className="busbar-popup__section-title">{children}</div>;
  }
  function Btn({ c, onClick, disabled, children }) {
    return <button className={`busbar-popup__btn busbar-popup__btn--${c}`} onClick={onClick} disabled={disabled}>{children}</button>;
  }

  /* ── Main SVG ───────────────────────────────────────────────────── */
  return (
    <div className="wbd-view" ref={containerRef} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}>
      <svg className="wbd-view__diagram" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">

        {/* Port generators */}
        {PORT_GENS.map(id => <g key={id}>
          {DataTable(GEN_X[id], id)}{Engine(GEN_X[id], id)}{Gen(GEN_X[id], id)}
          {Brk(GEN_X[id], BRK_Y, gens[id]?.breakerState || 'OPEN', (e) => openPopup(e, 'gen', id))}
          <line x1={GEN_X[id]} y1={BRK_Y + BRK_H / 2 + 3} x2={GEN_X[id]} y2={BUS_Y}
            stroke={gens[id]?.breakerState === 'CLOSED' ? portCol : C.gray} strokeWidth={2} />
        </g>)}

        {/* Stb generators */}
        {STB_GENS.map(id => <g key={id}>
          {DataTable(GEN_X[id], id)}{Engine(GEN_X[id], id)}{Gen(GEN_X[id], id)}
          {Brk(GEN_X[id], BRK_Y, gens[id]?.breakerState || 'OPEN', (e) => openPopup(e, 'gen', id))}
          <line x1={GEN_X[id]} y1={BRK_Y + BRK_H / 2 + 3} x2={GEN_X[id]} y2={BUS_Y}
            stroke={gens[id]?.breakerState === 'CLOSED' ? stbCol : C.gray} strokeWidth={2} />
        </g>)}

        {/* EMG generator */}
        <g>
          {DataTable(GEN_X.EMG, 'EMG')}{Engine(GEN_X.EMG, 'EMG')}{Gen(GEN_X.EMG, 'EMG')}
          {Brk(GEN_X.EMG, BRK_Y, gens.EMG?.breakerState || 'OPEN', (e) => openPopup(e, 'gen', 'EMG'))}
          <line x1={GEN_X.EMG} y1={BRK_Y + BRK_H / 2 + 3} x2={GEN_X.EMG} y2={BUS_Y}
            stroke={gens.EMG?.breakerState === 'CLOSED' ? emCol : C.gray} strokeWidth={2} />
        </g>

        {/* ═══ Port 690V Bus ═══ */}
        <line x1={PORT_BUS_S} y1={BUS_Y} x2={PORT_BUS_E} y2={BUS_Y} stroke={portCol} strokeWidth={7} strokeLinecap="round" />
        <text x={(PORT_BUS_S + PORT_BUS_E) / 2} y={BUS_Y - 12} textAnchor="middle"
          fill={portLive ? C.greenDim : C.grayLt} fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="2">PORT 690V</text>
        <text x={(PORT_BUS_S + PORT_BUS_E) / 2} y={BUS_Y + 18} textAnchor="middle"
          fill={C.text} fontSize="11" fontFamily="monospace">
          {Math.round(portBus.voltage || 0)}V / {(portBus.frequency || 0).toFixed(1)}Hz
        </text>

        {/* Port → bus-tie → Stb */}
        <line x1={PORT_BUS_E} y1={BUS_Y} x2={MAIN_TIE_X - 16} y2={BUS_Y} stroke={portLive ? C.greenDim : C.gray} strokeWidth={3} />
        {Brk(MAIN_TIE_X, BUS_Y, mainTieClosed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'maintie', 'TIE'), true)}
        <text x={MAIN_TIE_X} y={BUS_Y - 16} textAnchor="middle" fill={C.grayLt} fontSize="9" fontFamily="monospace">BUS TIE</text>
        <line x1={MAIN_TIE_X + 16} y1={BUS_Y} x2={STB_BUS_S} y2={BUS_Y} stroke={stbLive ? C.greenDim : C.gray} strokeWidth={3} />

        {/* ═══ Stb 690V Bus ═══ */}
        <line x1={STB_BUS_S} y1={BUS_Y} x2={STB_BUS_E} y2={BUS_Y} stroke={stbCol} strokeWidth={7} strokeLinecap="round" />
        <text x={(STB_BUS_S + STB_BUS_E) / 2} y={BUS_Y - 12} textAnchor="middle"
          fill={stbLive ? C.greenDim : C.grayLt} fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="2">STB 690V</text>
        <text x={(STB_BUS_S + STB_BUS_E) / 2} y={BUS_Y + 18} textAnchor="middle"
          fill={C.text} fontSize="11" fontFamily="monospace">
          {Math.round(stbBus.voltage || 0)}V / {(stbBus.frequency || 0).toFixed(1)}Hz
        </text>

        {/* Stb → EMG tie → EMG bus */}
        <line x1={STB_BUS_E} y1={BUS_Y} x2={EMG_TIE_X - 16} y2={BUS_Y} stroke={mainLive ? C.greenDim : C.gray} strokeWidth={3} />
        {Brk(EMG_TIE_X, BUS_Y, emTieClosed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'emgtie', 'EMGTIE'), true)}
        <text x={EMG_TIE_X} y={BUS_Y - 16} textAnchor="middle" fill={C.grayLt} fontSize="9" fontFamily="monospace">EMG TIE</text>
        <line x1={EMG_TIE_X + 16} y1={BUS_Y} x2={EMG_BUS_S} y2={BUS_Y} stroke={emLive ? C.amber : C.gray} strokeWidth={3} />

        {/* ═══ EMG 690V Bus ═══ */}
        <line x1={EMG_BUS_S} y1={BUS_Y} x2={EMG_BUS_E} y2={BUS_Y} stroke={emCol} strokeWidth={6} strokeLinecap="round" />
        <text x={(EMG_BUS_S + EMG_BUS_E) / 2} y={BUS_Y - 12} textAnchor="middle"
          fill={emLive ? C.amber : C.grayLt} fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1">EMG 690V</text>

        {/* ── Port thrusters ──── */}
        {Consumer(THR_ST_X, BUS_Y, 'thrusterST', 'portBus')}
        {Consumer(THR_MT_X, BUS_Y, 'thrusterMT', 'portBus')}
        {/* ── Stb thrusters ──── */}
        {Consumer(THR_BT_X, BUS_Y, 'thrusterBT', 'stbBus')}
        {Consumer(THR_AZ_X, BUS_Y, 'thrusterAZ', 'stbBus')}

        {/* ── T1 Port → 450V ──── */}
        {Trafo(T1_X, TRAFO_Y, 'T1', BUS_Y, portCol, sb450p.live ? C.blue : C.gray)}
        <line x1={T1_X} y1={TRAFO_Y + 16} x2={T1_X} y2={SUB_450_Y} stroke={sb450p.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={PORT_450_S} y1={SUB_450_Y} x2={PORT_450_E} y2={SUB_450_Y} stroke={sb450p.live ? C.blue : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={(PORT_450_S + PORT_450_E) / 2} y={SUB_450_Y - 9} textAnchor="middle"
          fill={sb450p.live ? C.blue : C.grayLt} fontSize="8" fontFamily="monospace">450V PORT</text>
        {Consumer(CRANE1_X, SUB_450_Y, 'crane1', 'port450Bus')}
        {Consumer(ROV1_X, SUB_450_Y, 'rov1', 'port450Bus')}

        {/* ── T2 Stb → 450V ──── */}
        {Trafo(T2_X, TRAFO_Y, 'T2', BUS_Y, stbCol, sb450s.live ? C.blue : C.gray)}
        <line x1={T2_X} y1={TRAFO_Y + 16} x2={T2_X} y2={SUB_450_Y} stroke={sb450s.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={STB_450_S} y1={SUB_450_Y} x2={STB_450_E} y2={SUB_450_Y} stroke={sb450s.live ? C.blue : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={(STB_450_S + STB_450_E) / 2} y={SUB_450_Y - 9} textAnchor="middle"
          fill={sb450s.live ? C.blue : C.grayLt} fontSize="8" fontFamily="monospace">450V STB</text>
        {Consumer(CRANE2_X, SUB_450_Y, 'crane2', 'stb450Bus')}
        {Consumer(ROV2_X, SUB_450_Y, 'rov2', 'stb450Bus')}

        {/* ── 450V Bus-Tie ──── */}
        <line x1={PORT_450_E} y1={SUB_450_Y} x2={TIE_450_X - 16} y2={SUB_450_Y}
          stroke={sb450p.live ? C.blue : C.gray} strokeWidth={2} />
        {Brk(TIE_450_X, SUB_450_Y, tie450Closed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'tie450', 'TIE450'), true)}
        <text x={TIE_450_X} y={SUB_450_Y - 14} textAnchor="middle" fill={C.grayLt} fontSize="8" fontFamily="monospace">450V TIE</text>
        <line x1={TIE_450_X + 16} y1={SUB_450_Y} x2={STB_450_S} y2={SUB_450_Y}
          stroke={sb450s.live ? C.blue : C.gray} strokeWidth={2} />

        {/* ── Shore on Stb 450V ──── */}
        {Shore()}

        {/* ── T5 Port 690V → 230V ──── */}
        {Trafo(T5_X, TRAFO_230_Y, 'T5', BUS_Y, portCol, sb230p.live ? C.blue : C.gray)}
        <line x1={T5_X} y1={TRAFO_230_Y + 16} x2={T5_X} y2={BUS_230_Y} stroke={sb230p.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={PORT_230_S} y1={BUS_230_Y} x2={PORT_230_E} y2={BUS_230_Y} stroke={sb230p.live ? C.blue : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={(PORT_230_S + PORT_230_E) / 2} y={BUS_230_Y - 9} textAnchor="middle"
          fill={sb230p.live ? C.blue : C.grayLt} fontSize="8" fontFamily="monospace">230V PORT</text>

        {/* ── T6 Stb 690V → 230V ──── */}
        {Trafo(T6_X, TRAFO_230_Y, 'T6', BUS_Y, stbCol, sb230s.live ? C.blue : C.gray)}
        <line x1={T6_X} y1={TRAFO_230_Y + 16} x2={T6_X} y2={BUS_230_Y} stroke={sb230s.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={STB_230_S} y1={BUS_230_Y} x2={STB_230_E} y2={BUS_230_Y} stroke={sb230s.live ? C.blue : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={(STB_230_S + STB_230_E) / 2} y={BUS_230_Y - 9} textAnchor="middle"
          fill={sb230s.live ? C.blue : C.grayLt} fontSize="8" fontFamily="monospace">230V STB</text>

        {/* ── 230V Bus-Tie ──── */}
        <line x1={PORT_230_E} y1={BUS_230_Y} x2={TIE_230_X - 16} y2={BUS_230_Y}
          stroke={sb230p.live ? C.blue : C.gray} strokeWidth={2} />
        {Brk(TIE_230_X, BUS_230_Y, tie230Closed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'tie230', 'TIE230'), true)}
        <text x={TIE_230_X} y={BUS_230_Y - 14} textAnchor="middle" fill={C.grayLt} fontSize="8" fontFamily="monospace">230V TIE</text>
        <line x1={TIE_230_X + 16} y1={BUS_230_Y} x2={STB_230_S} y2={BUS_230_Y}
          stroke={sb230s.live ? C.blue : C.gray} strokeWidth={2} />

        {/* ── T3 EMG → 230V ──── */}
        {Trafo(T3_X, TRAFO_Y, 'T3', BUS_Y, emCol, sb230e.live ? C.blue : C.gray)}
        <line x1={T3_X} y1={TRAFO_Y + 16} x2={T3_X} y2={EMG_230_BUS_Y} stroke={sb230e.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={EMG_230_S} y1={EMG_230_BUS_Y} x2={EMG_230_E} y2={EMG_230_BUS_Y} stroke={sb230e.live ? C.blue : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={(EMG_230_S + EMG_230_E) / 2} y={EMG_230_BUS_Y - 9} textAnchor="middle"
          fill={sb230e.live ? C.blue : C.grayLt} fontSize="8" fontFamily="monospace">230V EMG</text>

        {/* ── T4 230V → 110V ──── */}
        {Trafo(T4_X, T4_TRAFO_Y, 'T4', EMG_230_BUS_Y, sb230e.live ? C.blue : C.gray, sb110.live ? C.gold : C.gray)}
        <line x1={T4_X} y1={T4_TRAFO_Y + 16} x2={T4_X} y2={DC_110_BUS_Y} stroke={sb110.live ? C.gold : C.gray} strokeWidth={1.5} />
        <line x1={T4_X - 50} y1={DC_110_BUS_Y} x2={T4_X + 50} y2={DC_110_BUS_Y} stroke={sb110.live ? C.gold : C.gray} strokeWidth={4} strokeLinecap="round" />
        <text x={T4_X} y={DC_110_BUS_Y - 9} textAnchor="middle"
          fill={sb110.live ? C.gold : C.grayLt} fontSize="8" fontFamily="monospace">110V DC</text>

        {/* ── Power summary ──── */}
        {PowerSummary()}
      </svg>

      {renderPopups()}
    </div>
  );
}
