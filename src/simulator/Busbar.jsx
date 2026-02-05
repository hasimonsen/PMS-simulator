import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

/* ── Layout constants ─────────────────────────────────────────────── */
const MAIN_GENS = ['DG1', 'DG2', 'DG3', 'DG4'];
const PORT_GENS = ['DG1', 'DG2'];
const STB_GENS = ['DG3', 'DG4'];
const GEN_X = { DG1: 180, DG2: 380, DG3: 750, DG4: 950, EMG: 1260 };

const ENGINE_Y = 28;
const ENGINE_W = 50;
const ENGINE_H = 26;
const GEN_Y = 80;
const GEN_R = 25;
const BRK_Y = 142;
const BRK_H = 18;
const BUS_Y = 190;

const PORT_BUS_START = 100;
const PORT_BUS_END = 530;
const STB_BUS_START = 650;
const STB_BUS_END = 1080;
const MAIN_TIE_X = 590;
const EMG_TIE_X = 1130;
const EMG_BUS_START = 1180;
const EMG_BUS_END = 1350;

// Below-bus elements
const THR_ST_X = 130;
const THR_MT_X = 270;
const THR_BT_X = 700;
const THR_AZ_X = 850;
const T1_X = 470;
const T2_X = 1020;
const TRAFO_Y = 260;
const SUB_BUS_Y = 325;
const PORT_450_S = 400;
const PORT_450_E = 530;
const STB_450_S = 960;
const STB_450_E = 1080;
const CRANE1_X = 430;
const ROV1_X = 500;
const CRANE2_X = 990;
const ROV2_X = 1055;

const T3_X = 1220;
const EMG_230_BUS_Y = 325;
const EMG_230_S = 1180;
const EMG_230_E = 1350;
const T4_X = 1300;
const T4_TRAFO_Y = 375;
const DC_110_BUS_Y = 425;

const SHORE_X = 590;
const SHORE_Y = 440;
const SVG_W = 1400;
const SVG_H = 490;

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

export default function Busbar({ selectedGen, onSelectGen }) {
  const ctx = useGame();
  const { t } = useLang();
  const containerRef = useRef(null);
  const [popup, setPopup] = useState(null);
  const intervalRef = useRef(null);
  const dirRef = useRef(0);

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
  const portCol = portLive ? C.green : C.gray;
  const stbCol = stbLive ? C.green : C.gray;
  const emCol = emLive ? C.amber : C.gray;

  /* ── Popup helpers ──────────────────────────────────────────────── */
  const openPopup = useCallback((e, type, id) => {
    e.stopPropagation();
    if (onSelectGen) onSelectGen(id);
    const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setPopup({ type, id, x: e.clientX - r.left, y: e.clientY - r.top });
  }, [onSelectGen]);

  const closePopup = useCallback(() => { stopAdj(); setPopup(null); }, [stopAdj]);

  function sColor(s) {
    if (s === 'RUNNING') return C.green;
    if (s === 'IDLE') return '#4488ff';
    if (['PRE_LUBE', 'CRANKING', 'COOL_DOWN'].includes(s)) return C.amber;
    return C.gray;
  }
  function bColor(b) { return b === 'CLOSED' ? C.green : b === 'TRIPPED' ? C.red : C.gray; }
  function busColFor(id) { return PORT_GENS.includes(id) ? portCol : STB_GENS.includes(id) ? stbCol : emCol; }

  /* ── IEC Breaker ───────────────────────────────────────────────── */
  function Brk(cx, cy, state, onClick, horiz = false) {
    const col = bColor(state);
    const h = BRK_H / 2;
    const cr = 2.5;
    if (horiz) {
      return (
        <g style={{ cursor: 'pointer' }} onClick={onClick}>
          <circle cx={cx - h} cy={cy} r={cr} fill={col} />
          <circle cx={cx + h} cy={cy} r={cr} fill={col} />
          {state === 'CLOSED'
            ? <line x1={cx - h + cr} y1={cy} x2={cx + h - cr} y2={cy} stroke={col} strokeWidth={2.5} />
            : <line x1={cx + h - cr} y1={cy} x2={cx - 3} y2={cy - 9} stroke={col} strokeWidth={2.5} />}
          {state === 'TRIPPED' && <circle cx={cx} cy={cy} r={11} fill="none" stroke={C.red} strokeWidth={1.5}>
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
          : <line x1={cx} y1={cy + h - cr} x2={cx - 9} y2={cy - h + 2} stroke={col} strokeWidth={2.5} />}
        {state === 'TRIPPED' && <circle cx={cx} cy={cy} r={11} fill="none" stroke={C.red} strokeWidth={1.5}>
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
          fill={col} fontSize="9" fontFamily="monospace" fontWeight="bold">
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
    const sel = selectedGen === id;
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'gen', id)}>
        {sel && <circle cx={cx} cy={GEN_Y} r={GEN_R + 4} fill="none" stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />}
        <circle cx={cx} cy={GEN_Y} r={GEN_R} fill="none" stroke={col} strokeWidth={2.5} />
        <text x={cx} y={GEN_Y - 4} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="10" fontWeight="bold" fontFamily="monospace">G</text>
        <text x={cx} y={GEN_Y + 10} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="11" fontWeight="bold" fontFamily="monospace">{id}</text>
        <line x1={cx} y1={GEN_Y + GEN_R} x2={cx} y2={BRK_Y - BRK_H / 2 - 3} stroke={col} strokeWidth={2} />
      </g>
    );
  }

  /* ── Data table ─────────────────────────────────────────────────── */
  function DataTable(cx, id) {
    const g = gens[id];
    if (!g) return null;
    const left = PORT_GENS.includes(id) || id === 'EMG';
    const tx = left ? cx - GEN_R - 86 : cx + GEN_R + 4;
    const ty = 52;
    const w = 82, h = 52;
    const bdr = g.state === 'RUNNING' ? C.greenDim : C.gray;
    const hz = (g.frequency || 0).toFixed(1);
    const kw = Math.round(g.activePower || 0);
    const v = Math.round(g.voltage || 0);
    const a = g.voltage > 0 ? Math.round(g.activePower * 1000 / (g.voltage * 1.732)) : 0;
    return (
      <g>
        <rect x={tx} y={ty} width={w} height={h} rx={3} fill="rgba(10,14,23,0.9)" stroke={bdr} strokeWidth={1} />
        <text x={tx + 4} y={ty + 13} fill={C.text} fontSize="10" fontFamily="monospace">{hz} Hz</text>
        <text x={tx + w - 4} y={ty + 13} textAnchor="end" fill={C.text} fontSize="10" fontFamily="monospace">{kw} kW</text>
        <text x={tx + 4} y={ty + 27} fill={C.text} fontSize="10" fontFamily="monospace">{v} V</text>
        <text x={tx + w - 4} y={ty + 27} textAnchor="end" fill={C.text} fontSize="10" fontFamily="monospace">{a} A</text>
        <text x={tx + 4} y={ty + 41} fill={C.grayLt} fontSize="9" fontFamily="monospace">
          Load: {Math.round(g.loadPercent || 0)}%
        </text>
        {/* Fault dots: damage, tripped, running */}
        <circle cx={tx + w - 28} cy={ty + 43} r={3} fill={g.damaged ? C.red : C.gray} />
        <circle cx={tx + w - 17} cy={ty + 43} r={3} fill={g.breakerTripped ? C.red : C.gray} />
        <circle cx={tx + w - 6} cy={ty + 43} r={3} fill={g.state === 'RUNNING' ? C.green : C.gray} />
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
        <line x1={cx} y1={busY} x2={cx} y2={busY + 12} stroke={col} strokeWidth={1.5} />
        <circle cx={cx} cy={busY + 14} r={2.5} fill={bColor(c.breakerState)} />
        <line x1={cx} y1={busY + 17} x2={cx} y2={busY + 32} stroke={col} strokeWidth={1.5} />
        <rect x={cx - 28} y={busY + 32} width={56} height={28} rx={3}
          fill={live ? 'rgba(0,255,136,0.08)' : 'rgba(60,70,85,0.2)'} stroke={col} strokeWidth={1} />
        <text x={cx} y={busY + 43} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="7.5" fontFamily="monospace" fontWeight="bold">{c.name}</text>
        <text x={cx} y={busY + 55} textAnchor="middle" dominantBaseline="middle"
          fill={C.grayLt} fontSize="7" fontFamily="monospace">{Math.round(c.currentLoad)} kW{c.hasVSD ? ' VSD' : ''}</text>
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
        <line x1={cx} y1={brkY + BRK_H / 2 + 3} x2={cx} y2={trafoY - 12}
          stroke={bst === 'CLOSED' ? primCol : C.gray} strokeWidth={1.5} />
        <circle cx={cx} cy={trafoY - 5} r={8} fill="none" stroke={primCol} strokeWidth={1.5} />
        <circle cx={cx} cy={trafoY + 5} r={8} fill="none" stroke={secCol} strokeWidth={1.5} />
      </g>
    );
  }

  /* ── Shore ──────────────────────────────────────────────────────── */
  function Shore() {
    const conn = shore.breakerState === 'CLOSED';
    const col = conn ? C.greenDim : C.gray;
    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => openPopup(e, 'shore', 'SHORE')}>
        <line x1={SHORE_X} y1={BUS_Y} x2={SHORE_X} y2={SHORE_Y - 25} stroke={col} strokeWidth={1.5} />
        {Brk(SHORE_X, SHORE_Y - 25, shore.breakerState || 'OPEN', (e) => openPopup(e, 'shore', 'SHORE'))}
        <rect x={SHORE_X - 32} y={SHORE_Y} width={64} height={26} rx={4}
          fill={conn ? 'rgba(0,255,136,0.1)' : 'rgba(60,70,85,0.3)'} stroke={col} strokeWidth={1.5} />
        <text x={SHORE_X} y={SHORE_Y + 9} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="9" fontFamily="monospace" fontWeight="bold">SHORE</text>
        <text x={SHORE_X} y={SHORE_Y + 20} textAnchor="middle" dominantBaseline="middle"
          fill={C.grayLt} fontSize="7" fontFamily="monospace">690V 60Hz</text>
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

  /* ── Popup ──────────────────────────────────────────────────────── */
  function renderPopup() {
    if (!popup) return null;
    const { type, id, x, y } = popup;
    const pw = type === 'gen' ? 370 : 270;
    const cw = containerRef.current?.offsetWidth || 1000;
    const ch = containerRef.current?.offsetHeight || 600;
    let px = Math.min(x + 10, cw - pw - 10);
    let py = Math.min(y + 10, ch - 200);
    if (px < 10) px = 10;
    if (py < 10) py = 10;

    return (
      <div className="busbar-popup" style={{ left: px, top: py, width: pw, maxHeight: ch - 40, overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="busbar-popup__header">
          <span className="busbar-popup__title">
            {type === 'gen' && `Generator — ${id}`}
            {type === 'xformer' && `Transformer — ${xformers[id]?.name || id}`}
            {type === 'consumer' && `${consumers[id]?.name || id}`}
            {type === 'maintie' && 'Main Bus-Tie'}
            {type === 'emgtie' && 'EMG Bus-Tie'}
            {type === 'shore' && 'Shore Connection'}
          </span>
          <button className="busbar-popup__close" onClick={closePopup}>×</button>
        </div>
        <div className="busbar-popup__body">
          {type === 'gen' && GenPopup(id)}
          {type === 'xformer' && XformerPopup(id)}
          {type === 'consumer' && ConsumerPopup(id)}
          {type === 'maintie' && TiePopup(mainTieClosed, ctx.setMainBusTie)}
          {type === 'emgtie' && TiePopup(emTieClosed, ctx.setBusTie)}
          {type === 'shore' && ShorePopup()}
        </div>
      </div>
    );
  }

  function GenPopup(id) {
    const g = gens[id];
    if (!g) return null;
    const hz = (g.frequency || 0).toFixed(1);
    const kw = Math.round(g.activePower || 0);
    const v = Math.round(g.voltage || 0);
    const a = g.voltage > 0 ? Math.round(g.activePower * 1000 / (g.voltage * 1.732)) : 0;

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
        <div className="busbar-popup__readings">
          <Row l="State" v={g.state?.replace('_', ' ') || 'OFF'} vc={sColor(g.state)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', margin: '4px 0' }}>
            <SmVal l="Hz" v={hz} /><SmVal l="kW" v={kw} /><SmVal l="V" v={v} /><SmVal l="A" v={a} />
          </div>
          <Row l="Load" v={`${Math.round(g.loadPercent || 0)}%`} />
        </div>
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
        {g.state === 'RUNNING' && g.breakerState === 'OPEN' && <>{Sect('Synchroscope')}{MiniSync(id)}</>}
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
    const sb = subBuses[tf.secondaryBus] || {};
    return (
      <>
        <div className="busbar-popup__readings">
          <Row l="Breaker" v={tf.breakerState} vc={bColor(tf.breakerState)} />
          <Row l="Secondary" v={sb.voltage ? `${Math.round(sb.voltage)} V` : 'Dead'} />
          <Row l="Status" v={sb.live ? 'LIVE' : 'DEAD'} vc={sb.live ? C.green : C.gray} />
        </div>
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => ctx.closeTransformerBreaker(tId)} disabled={tf.breakerState === 'CLOSED'}>CLOSE</Btn>
          <Btn c="stop" onClick={() => ctx.openTransformerBreaker(tId)} disabled={tf.breakerState === 'OPEN'}>OPEN</Btn>
        </div>
      </>
    );
  }

  function ConsumerPopup(cId) {
    const c = consumers[cId];
    if (!c) return null;
    return (
      <>
        <div className="busbar-popup__readings">
          <Row l="Load" v={`${Math.round(c.currentLoad)} / ${c.maxKw} kW`} />
          <Row l="Enabled" v={c.enabled ? 'YES' : 'NO'} vc={c.enabled ? C.green : C.gray} />
          <Row l="Breaker" v={c.breakerState} vc={bColor(c.breakerState)} />
          {c.hasVSD && <Row l="VSD" v="YES" vc={C.blue} />}
        </div>
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => { ctx.enableConsumer(cId); ctx.closeConsumerBreaker(cId); }}
            disabled={c.enabled && c.breakerState === 'CLOSED'}>ENABLE</Btn>
          <Btn c="stop" onClick={() => { ctx.disableConsumer(cId); ctx.openConsumerBreaker(cId); }}
            disabled={!c.enabled}>DISABLE</Btn>
        </div>
      </>
    );
  }

  function TiePopup(closed, setFn) {
    return (
      <>
        <div className="busbar-popup__readings">
          <Row l="State" v={closed ? 'CLOSED' : 'OPEN'} vc={closed ? C.green : C.redDim} />
        </div>
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => setFn(true)} disabled={closed}>CLOSE</Btn>
          <Btn c="stop" onClick={() => setFn(false)} disabled={!closed}>OPEN</Btn>
        </div>
      </>
    );
  }

  function ShorePopup() {
    return (
      <>
        <div className="busbar-popup__readings">
          <Row l="Available" v={shore.available ? 'YES' : 'NO'} />
          <Row l="Breaker" v={shore.breakerState} vc={bColor(shore.breakerState)} />
          <Row l="Supply" v={`${shore.voltage}V / ${shore.frequency}Hz`} />
        </div>
        <div className="busbar-popup__actions">
          <Btn c="start" onClick={() => ctx.connectShore()} disabled={shore.breakerState === 'CLOSED'}>CONNECT</Btn>
          <Btn c="stop" onClick={() => ctx.disconnectShore()} disabled={shore.breakerState !== 'CLOSED'}>DISCONNECT</Btn>
        </div>
      </>
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
  function SmVal({ l, v }) {
    return <div style={{ fontSize: 11, fontFamily: 'monospace' }}><span style={{ color: C.grayLt, fontSize: 9 }}>{l} </span><span style={{ color: C.text }}>{v}</span></div>;
  }
  function Sect(title) {
    return <div className="busbar-popup__section-title">{typeof title === 'string' ? title : ''}</div>;
  }
  function Btn({ c, onClick, disabled, children }) {
    return <button className={`busbar-popup__btn busbar-popup__btn--${c}`} onClick={onClick} disabled={disabled}>{children}</button>;
  }

  /* ── Load info ──────────────────────────────────────────────────── */
  const totalLoad = Math.round(mainBus.totalLoad || 0);
  const onlineGens = Object.values(gens).filter(g => !g.isEmergency && g.state === 'RUNNING' && g.breakerState === 'CLOSED');
  const totalCap = onlineGens.reduce((s, g) => s + (g.capacity || 0), 0) || 1;
  const loadPct = Math.min((totalLoad / totalCap) * 100, 100);

  const sb450p = subBuses.port450Bus || {};
  const sb450s = subBuses.stb450Bus || {};
  const sb230 = subBuses.emg230Bus || {};
  const sb110 = subBuses.dc110Bus || {};

  /* ── Main SVG ───────────────────────────────────────────────────── */
  return (
    <div className="busbar" ref={containerRef} onClick={closePopup}>
      <svg className="busbar__diagram" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
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
        <line x1={PORT_BUS_START} y1={BUS_Y} x2={PORT_BUS_END} y2={BUS_Y} stroke={portCol} strokeWidth={6} strokeLinecap="round" />
        <text x={(PORT_BUS_START + PORT_BUS_END) / 2} y={BUS_Y + 16} textAnchor="middle"
          fill={portLive ? C.greenDim : C.grayLt} fontSize="9" fontFamily="monospace" letterSpacing="1.5">PORT 690V</text>
        <text x={(PORT_BUS_START + PORT_BUS_END) / 2} y={BUS_Y + 28} textAnchor="middle"
          fill={C.text} fontSize="10" fontFamily="monospace">
          {Math.round(portBus.voltage || 0)}V / {(portBus.frequency || 0).toFixed(1)}Hz
        </text>

        {/* Port → bus-tie → Stb */}
        <line x1={PORT_BUS_END} y1={BUS_Y} x2={MAIN_TIE_X - 14} y2={BUS_Y} stroke={portLive ? C.greenDim : C.gray} strokeWidth={3} />
        {Brk(MAIN_TIE_X, BUS_Y, mainTieClosed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'maintie', 'TIE'), true)}
        <text x={MAIN_TIE_X} y={BUS_Y - 14} textAnchor="middle" fill={C.grayLt} fontSize="8" fontFamily="monospace">BUS TIE</text>
        <line x1={MAIN_TIE_X + 14} y1={BUS_Y} x2={STB_BUS_START} y2={BUS_Y} stroke={stbLive ? C.greenDim : C.gray} strokeWidth={3} />

        {/* ═══ Stb 690V Bus ═══ */}
        <line x1={STB_BUS_START} y1={BUS_Y} x2={STB_BUS_END} y2={BUS_Y} stroke={stbCol} strokeWidth={6} strokeLinecap="round" />
        <text x={(STB_BUS_START + STB_BUS_END) / 2} y={BUS_Y + 16} textAnchor="middle"
          fill={stbLive ? C.greenDim : C.grayLt} fontSize="9" fontFamily="monospace" letterSpacing="1.5">STB 690V</text>
        <text x={(STB_BUS_START + STB_BUS_END) / 2} y={BUS_Y + 28} textAnchor="middle"
          fill={C.text} fontSize="10" fontFamily="monospace">
          {Math.round(stbBus.voltage || 0)}V / {(stbBus.frequency || 0).toFixed(1)}Hz
        </text>

        {/* Stb → EMG tie → EMG bus */}
        <line x1={STB_BUS_END} y1={BUS_Y} x2={EMG_TIE_X - 14} y2={BUS_Y} stroke={mainLive ? C.greenDim : C.gray} strokeWidth={3} />
        {Brk(EMG_TIE_X, BUS_Y, emTieClosed ? 'CLOSED' : 'OPEN', (e) => openPopup(e, 'emgtie', 'EMGTIE'), true)}
        <text x={EMG_TIE_X} y={BUS_Y - 14} textAnchor="middle" fill={C.grayLt} fontSize="8" fontFamily="monospace">EMG TIE</text>
        <line x1={EMG_TIE_X + 14} y1={BUS_Y} x2={EMG_BUS_START} y2={BUS_Y} stroke={emLive ? C.amber : C.gray} strokeWidth={3} />

        {/* ═══ EMG 690V Bus ═══ */}
        <line x1={EMG_BUS_START} y1={BUS_Y} x2={EMG_BUS_END} y2={BUS_Y} stroke={emCol} strokeWidth={5} strokeLinecap="round" />
        <text x={(EMG_BUS_START + EMG_BUS_END) / 2} y={BUS_Y + 16} textAnchor="middle"
          fill={emLive ? C.amber : C.grayLt} fontSize="9" fontFamily="monospace" letterSpacing="1">EMG 690V</text>

        {/* ── Port thrusters ──── */}
        {Consumer(THR_ST_X, BUS_Y, 'thrusterST', 'portBus')}
        {Consumer(THR_MT_X, BUS_Y, 'thrusterMT', 'portBus')}
        {/* ── Stb thrusters ──── */}
        {Consumer(THR_BT_X, BUS_Y, 'thrusterBT', 'stbBus')}
        {Consumer(THR_AZ_X, BUS_Y, 'thrusterAZ', 'stbBus')}

        {/* ── T1 Port → 450V ──── */}
        {Trafo(T1_X, TRAFO_Y, 'T1', BUS_Y, portCol, sb450p.live ? C.blue : C.gray)}
        <line x1={T1_X} y1={TRAFO_Y + 13} x2={T1_X} y2={SUB_BUS_Y} stroke={sb450p.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={PORT_450_S} y1={SUB_BUS_Y} x2={PORT_450_E} y2={SUB_BUS_Y} stroke={sb450p.live ? C.blue : C.gray} strokeWidth={3} strokeLinecap="round" />
        <text x={(PORT_450_S + PORT_450_E) / 2} y={SUB_BUS_Y - 7} textAnchor="middle"
          fill={sb450p.live ? C.blue : C.grayLt} fontSize="7" fontFamily="monospace">450V PORT</text>
        {Consumer(CRANE1_X, SUB_BUS_Y, 'crane1', 'port450Bus')}
        {Consumer(ROV1_X, SUB_BUS_Y, 'rov1', 'port450Bus')}

        {/* ── T2 Stb → 450V ──── */}
        {Trafo(T2_X, TRAFO_Y, 'T2', BUS_Y, stbCol, sb450s.live ? C.blue : C.gray)}
        <line x1={T2_X} y1={TRAFO_Y + 13} x2={T2_X} y2={SUB_BUS_Y} stroke={sb450s.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={STB_450_S} y1={SUB_BUS_Y} x2={STB_450_E} y2={SUB_BUS_Y} stroke={sb450s.live ? C.blue : C.gray} strokeWidth={3} strokeLinecap="round" />
        <text x={(STB_450_S + STB_450_E) / 2} y={SUB_BUS_Y - 7} textAnchor="middle"
          fill={sb450s.live ? C.blue : C.grayLt} fontSize="7" fontFamily="monospace">450V STB</text>
        {Consumer(CRANE2_X, SUB_BUS_Y, 'crane2', 'stb450Bus')}
        {Consumer(ROV2_X, SUB_BUS_Y, 'rov2', 'stb450Bus')}

        {/* ── T3 EMG → 230V ──── */}
        {Trafo(T3_X, TRAFO_Y, 'T3', BUS_Y, emCol, sb230.live ? C.blue : C.gray)}
        <line x1={T3_X} y1={TRAFO_Y + 13} x2={T3_X} y2={EMG_230_BUS_Y} stroke={sb230.live ? C.blue : C.gray} strokeWidth={1.5} />
        <line x1={EMG_230_S} y1={EMG_230_BUS_Y} x2={EMG_230_E} y2={EMG_230_BUS_Y} stroke={sb230.live ? C.blue : C.gray} strokeWidth={3} strokeLinecap="round" />
        <text x={(EMG_230_S + EMG_230_E) / 2} y={EMG_230_BUS_Y - 7} textAnchor="middle"
          fill={sb230.live ? C.blue : C.grayLt} fontSize="7" fontFamily="monospace">230V EMG</text>

        {/* ── T4 230V → 110V ──── */}
        {Trafo(T4_X, T4_TRAFO_Y, 'T4', EMG_230_BUS_Y, sb230.live ? C.blue : C.gray, sb110.live ? C.gold : C.gray)}
        <line x1={T4_X} y1={T4_TRAFO_Y + 13} x2={T4_X} y2={DC_110_BUS_Y} stroke={sb110.live ? C.gold : C.gray} strokeWidth={1.5} />
        <line x1={T4_X - 40} y1={DC_110_BUS_Y} x2={T4_X + 40} y2={DC_110_BUS_Y} stroke={sb110.live ? C.gold : C.gray} strokeWidth={3} strokeLinecap="round" />
        <text x={T4_X} y={DC_110_BUS_Y - 7} textAnchor="middle"
          fill={sb110.live ? C.gold : C.grayLt} fontSize="7" fontFamily="monospace">110V DC</text>

        {/* ── Shore connection ──── */}
        {Shore()}
      </svg>

      {/* Load bar */}
      <div className="busbar__load-demand">
        <span className="busbar__load-demand-label">Total Load: {totalLoad} kW</span>
        <div className="busbar__load-demand-bar">
          <div className="busbar__load-demand-fill" style={{
            width: `${loadPct}%`,
            backgroundColor: loadPct > 90 ? C.redDim : loadPct > 70 ? C.amber : C.greenDim,
          }} />
        </div>
      </div>

      {popup && renderPopup()}
    </div>
  );
}
