import React, { useState, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

/* ── Layout constants ─────────────────────────────────────────────── */
const MAIN_GENS = ['DG1', 'DG2', 'DG3', 'SG'];
const GEN_X = { DG1: 110, DG2: 270, DG3: 430, SG: 590 };
const EMG_X = 900;

const ENGINE_Y = 18;
const ENGINE_W = 48;
const ENGINE_H = 26;
const GEN_Y = 75;
const GEN_R = 24;
const BRK_Y = 130;
const BRK_SZ = 22;
const BUS_Y = 175;

const BUS_TIE_X = 750;
const EMG_BUS_START = 800;
const EMG_BUS_END = 1000;
const LOAD_Y = 215;

const TRAFO_X = 840;
const TRAFO_Y = 245;
const BUS_230_Y = 290;
const BUS_230_START = 800;
const BUS_230_END = 1000;

const SVG_W = 1060;
const SVG_H = 340;

/* ── Colors ───────────────────────────────────────────────────────── */
const C_GREEN = '#00ff88';
const C_GREEN_DIM = '#00cc6a';
const C_RED = '#ff4444';
const C_RED_DIM = '#d9534f';
const C_AMBER = '#ffaa00';
const C_GRAY = '#3a4a5e';
const C_GRAY_LIGHT = '#7a8a9e';
const C_TEXT = '#c8d6e5';

export default function Busbar({ selectedGen, onSelectGen }) {
  const {
    engineState,
    startGenerator, stopGenerator,
    closeBreaker, openBreaker, resetBreaker,
    autoSync, setBusTie,
  } = useGame();
  const { t } = useLang();
  const containerRef = useRef(null);
  const [popup, setPopup] = useState(null);

  /* ── Data ────────────────────────────────────────────────────────── */
  const bus = engineState?.mainBus;
  const emBus = engineState?.emergencyBus;
  const gens = engineState?.generators || {};
  const busLive = bus?.live ?? false;
  const emBusLive = emBus?.live ?? false;
  const busTieClosed = emBus?.busTieClosed ?? false;

  const busColor = busLive ? C_GREEN : C_GRAY;
  const emBusColor = emBusLive ? C_AMBER : C_GRAY;

  const busVoltage = Math.round(bus?.voltage || 0);
  const busFreq = (bus?.frequency || 0).toFixed(1);
  const totalLoad = Math.round(bus?.totalLoad || 0);

  const emVoltage = Math.round(emBus?.voltage || 0);
  const emFreq = (emBus?.frequency || 0).toFixed(1);
  const emLoad = Math.round(emBus?.totalLoad || 0);

  // Load bar
  const onlineGens = Object.values(gens).filter(
    (g) => !g.isEmergency && g.state === 'RUNNING' && g.breakerState === 'CLOSED'
  );
  const totalCap = onlineGens.reduce((s, g) => s + (g.capacity || 0), 0) || 1;
  const loadPct = Math.min((totalLoad / totalCap) * 100, 100);

  /* ── Popup helpers ──────────────────────────────────────────────── */
  const openPopup = useCallback((e, type, genId) => {
    e.stopPropagation();
    if (onSelectGen) onSelectGen(genId);
    const rect = containerRef.current.getBoundingClientRect();
    setPopup({
      type, genId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [onSelectGen]);

  const closePopup = useCallback(() => setPopup(null), []);

  /* ── Helper: state color ────────────────────────────────────────── */
  function stateColor(state) {
    if (state === 'RUNNING') return C_GREEN;
    if (state === 'IDLE') return '#4488ff';
    if (['PRE_LUBE', 'CRANKING', 'COOL_DOWN'].includes(state)) return C_AMBER;
    return C_GRAY;
  }

  function breakerColor(brk) {
    if (brk === 'CLOSED') return C_GREEN;
    if (brk === 'TRIPPED') return C_RED;
    return C_RED_DIM;
  }

  /* ── SVG: Engine symbol ─────────────────────────────────────────── */
  function renderEngine(cx, genId) {
    const gen = gens[genId];
    const running = gen?.state === 'RUNNING' || gen?.state === 'IDLE';
    const color = running ? C_GREEN_DIM : C_GRAY;
    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => openPopup(e, 'engine', genId)}
      >
        <rect
          x={cx - ENGINE_W / 2} y={ENGINE_Y - ENGINE_H / 2}
          width={ENGINE_W} height={ENGINE_H}
          rx={3} ry={3}
          fill="none" stroke={color} strokeWidth={1.5}
        />
        <text
          x={cx} y={ENGINE_Y + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="9" fontFamily="monospace" fontWeight="bold"
        >
          {genId === 'EMG' ? 'EMG ENG' : genId === 'SG' ? 'SHAFT' : 'DIESEL'}
        </text>
        {/* Connection line engine → generator */}
        <line
          x1={cx} y1={ENGINE_Y + ENGINE_H / 2}
          x2={cx} y2={GEN_Y - GEN_R}
          stroke={color} strokeWidth={2}
        />
      </g>
    );
  }

  /* ── SVG: Generator circle ──────────────────────────────────────── */
  function renderGenerator(cx, genId) {
    const gen = gens[genId];
    const color = stateColor(gen?.state);
    const isSelected = selectedGen === genId;
    const label = genId === 'SG' ? 'SG' : genId === 'EMG' ? 'EMG' : genId.replace('DG', 'G');
    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => openPopup(e, 'generator', genId)}
      >
        {/* Selection ring */}
        {isSelected && (
          <circle
            cx={cx} cy={GEN_Y} r={GEN_R + 4}
            fill="none" stroke={C_GREEN} strokeWidth={1}
            strokeDasharray="4 3" opacity={0.7}
          />
        )}
        <circle
          cx={cx} cy={GEN_Y} r={GEN_R}
          fill="none" stroke={color} strokeWidth={2.5}
        />
        {/* G symbol */}
        <text
          x={cx} y={GEN_Y - 4}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace"
        >
          G
        </text>
        <text
          x={cx} y={GEN_Y + 9}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="11" fontWeight="bold" fontFamily="monospace"
        >
          {label}
        </text>
        {/* Connection to breaker */}
        <line
          x1={cx} y1={GEN_Y + GEN_R}
          x2={cx} y2={BRK_Y - BRK_SZ / 2}
          stroke={color} strokeWidth={2}
        />
      </g>
    );
  }

  /* ── SVG: Breaker symbol ────────────────────────────────────────── */
  function renderBreaker(cx, genId, busY = BUS_Y) {
    const gen = gens[genId];
    const brk = gen?.breakerState || 'OPEN';
    const color = breakerColor(brk);
    const half = BRK_SZ / 2;

    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => openPopup(e, 'breaker', genId)}
      >
        <rect
          x={cx - half} y={BRK_Y - half}
          width={BRK_SZ} height={BRK_SZ}
          fill="none" stroke={color} strokeWidth={2}
        />
        {brk === 'CLOSED' && (
          <>
            <line x1={cx - half} y1={BRK_Y - half} x2={cx + half} y2={BRK_Y + half} stroke={color} strokeWidth={2} />
            <line x1={cx + half} y1={BRK_Y - half} x2={cx - half} y2={BRK_Y + half} stroke={color} strokeWidth={2} />
          </>
        )}
        {brk === 'TRIPPED' && (
          <rect
            x={cx - half} y={BRK_Y - half}
            width={BRK_SZ} height={BRK_SZ}
            fill="rgba(255,0,0,0.3)" stroke="none"
          >
            <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
          </rect>
        )}
        {/* Connection breaker → bus */}
        <line
          x1={cx} y1={BRK_Y + half}
          x2={cx} y2={busY}
          stroke={brk === 'CLOSED' ? busColor : C_GRAY} strokeWidth={2}
        />
      </g>
    );
  }

  /* ── SVG: Bus-tie breaker (horizontal) ──────────────────────────── */
  function renderBusTie() {
    const half = BRK_SZ / 2;
    const color = busTieClosed ? C_GREEN : C_RED_DIM;
    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => openPopup(e, 'bustie', 'BUS_TIE')}
      >
        <rect
          x={BUS_TIE_X - half} y={BUS_Y - half}
          width={BRK_SZ} height={BRK_SZ}
          fill="none" stroke={color} strokeWidth={2}
        />
        {busTieClosed && (
          <>
            <line x1={BUS_TIE_X - half} y1={BUS_Y - half} x2={BUS_TIE_X + half} y2={BUS_Y + half} stroke={color} strokeWidth={2} />
            <line x1={BUS_TIE_X + half} y1={BUS_Y - half} x2={BUS_TIE_X - half} y2={BUS_Y + half} stroke={color} strokeWidth={2} />
          </>
        )}
        <text
          x={BUS_TIE_X} y={BUS_Y - half - 6}
          textAnchor="middle" fill={C_GRAY_LIGHT} fontSize="8" fontFamily="monospace"
        >
          BUS TIE
        </text>
      </g>
    );
  }

  /* ── SVG: Transformer + 230V bus ──────────────────────────────── */
  function renderTransformerAndBus230() {
    const trafoColor = emBusLive ? C_AMBER : C_GRAY;
    const bus230Color = emBusLive ? '#88ccff' : C_GRAY;
    const loads230 = [
      { name: 'LTG', x: 850 },
      { name: 'NAV', x: 920 },
      { name: 'STR', x: 990 },
    ];
    return (
      <g>
        {/* Connection from EMG bus down to transformer */}
        <line x1={TRAFO_X} y1={BUS_Y} x2={TRAFO_X} y2={TRAFO_Y - 14}
          stroke={trafoColor} strokeWidth={1.5} />
        {/* Transformer symbol: two overlapping circles */}
        <circle cx={TRAFO_X} cy={TRAFO_Y - 6} r={10}
          fill="none" stroke={trafoColor} strokeWidth={1.5} />
        <circle cx={TRAFO_X} cy={TRAFO_Y + 6} r={10}
          fill="none" stroke={bus230Color} strokeWidth={1.5} />
        {/* Labels */}
        <text x={TRAFO_X + 16} y={TRAFO_Y - 4} fill={trafoColor}
          fontSize="7" fontFamily="monospace">690V</text>
        <text x={TRAFO_X + 16} y={TRAFO_Y + 8} fill={bus230Color}
          fontSize="7" fontFamily="monospace">230V</text>

        {/* Connection from transformer to 230V bus */}
        <line x1={TRAFO_X} y1={TRAFO_Y + 16} x2={TRAFO_X} y2={BUS_230_Y}
          stroke={bus230Color} strokeWidth={1.5} />

        {/* 230V Bus line */}
        <line x1={BUS_230_START} y1={BUS_230_Y} x2={BUS_230_END} y2={BUS_230_Y}
          stroke={bus230Color} strokeWidth={3} strokeLinecap="round" />
        <text x={(BUS_230_START + BUS_230_END) / 2} y={BUS_230_Y - 8}
          textAnchor="middle" fill={bus230Color} fontSize="8" fontFamily="monospace"
          letterSpacing="1.5" opacity={0.8}>
          230V EMG SWITCHBOARD
        </text>

        {/* 230V loads */}
        {loads230.map(({ name, x }) => (
          <g key={name}>
            <line x1={x} y1={BUS_230_Y} x2={x} y2={BUS_230_Y + 25}
              stroke={emBusLive ? bus230Color : C_GRAY} strokeWidth={1.5} />
            <rect x={x - 18} y={BUS_230_Y + 25} width={36} height={18} rx={2}
              fill={emBusLive ? 'rgba(136,204,255,0.12)' : 'rgba(60,70,85,0.3)'}
              stroke={emBusLive ? bus230Color : C_GRAY} strokeWidth={1} />
            <text x={x} y={BUS_230_Y + 35}
              textAnchor="middle" dominantBaseline="middle"
              fill={emBusLive ? bus230Color : C_GRAY} fontSize="8" fontFamily="monospace" fontWeight="bold">
              {name}
            </text>
          </g>
        ))}
      </g>
    );
  }

  /* ── Popup content ──────────────────────────────────────────────── */
  function renderPopup() {
    if (!popup) return null;
    const { type, genId, x, y } = popup;
    const gen = gens[genId];

    // Clamp popup position to stay visible
    const popupW = 280;
    const containerW = containerRef.current?.offsetWidth || 800;
    const containerH = containerRef.current?.offsetHeight || 400;
    let px = Math.min(x + 10, containerW - popupW - 10);
    let py = Math.min(y + 10, containerH - 260);
    if (px < 10) px = 10;
    if (py < 10) py = 10;

    return (
      <div
        className="busbar-popup"
        style={{ left: px, top: py }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="busbar-popup__header">
          <span className="busbar-popup__title">
            {type === 'engine' && `Engine — ${genId}`}
            {type === 'generator' && `Generator — ${genId}`}
            {type === 'breaker' && `Breaker — ${genId}`}
            {type === 'bustie' && 'Bus Tie Breaker'}
          </span>
          <button className="busbar-popup__close" onClick={closePopup}>×</button>
        </div>

        <div className="busbar-popup__body">
          {/* ── Generator popup ──────────────────────── */}
          {type === 'generator' && gen && (
            <>
              <div className="busbar-popup__readings">
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">State</span>
                  <span className="busbar-popup__value" style={{ color: stateColor(gen.state) }}>
                    {gen.state?.replace('_', ' ') || 'OFF'}
                  </span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">RPM</span>
                  <span className="busbar-popup__value">{Math.round(gen.rpm || 0)}</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Voltage</span>
                  <span className="busbar-popup__value">{Math.round(gen.voltage || 0)} V</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Frequency</span>
                  <span className="busbar-popup__value">{(gen.frequency || 0).toFixed(1)} Hz</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Power</span>
                  <span className="busbar-popup__value">{Math.round(gen.activePower || 0)} kW</span>
                </div>
              </div>
              <div className="busbar-popup__actions">
                <button
                  className="busbar-popup__btn busbar-popup__btn--start"
                  onClick={() => startGenerator(genId)}
                  disabled={gen.state !== 'OFF'}
                >
                  START
                </button>
                <button
                  className="busbar-popup__btn busbar-popup__btn--stop"
                  onClick={() => stopGenerator(genId)}
                  disabled={gen.state === 'OFF'}
                >
                  STOP
                </button>
              </div>
            </>
          )}

          {/* ── Engine / Governor popup ──────────────── */}
          {type === 'engine' && gen && (
            <>
              <div className="busbar-popup__readings">
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">RPM</span>
                  <span className="busbar-popup__value">{Math.round(gen.rpm || 0)}</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Frequency</span>
                  <span className="busbar-popup__value">{(gen.frequency || 0).toFixed(1)} Hz</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Mode</span>
                  <span className="busbar-popup__value" style={{ textTransform: 'capitalize' }}>
                    {gen.speedMode || 'droop'}
                  </span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Setpoint</span>
                  <span className="busbar-popup__value">{Math.round(gen.governorSetpoint || 0)} RPM</span>
                </div>
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">Droop</span>
                  <span className="busbar-popup__value">{(gen.droopPercent || 0).toFixed(1)}%</span>
                </div>
              </div>
              <div className="busbar-popup__actions">
                <button
                  className="busbar-popup__btn busbar-popup__btn--start"
                  onClick={() => startGenerator(genId)}
                  disabled={gen.state !== 'OFF'}
                >
                  START
                </button>
                <button
                  className="busbar-popup__btn busbar-popup__btn--stop"
                  onClick={() => stopGenerator(genId)}
                  disabled={gen.state === 'OFF'}
                >
                  STOP
                </button>
              </div>
            </>
          )}

          {/* ── Breaker popup ────────────────────────── */}
          {type === 'breaker' && gen && (
            <>
              <div className="busbar-popup__readings">
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">State</span>
                  <span className="busbar-popup__value" style={{ color: breakerColor(gen.breakerState) }}>
                    {gen.breakerState || 'OPEN'}
                  </span>
                </div>
                {gen.breakerState === 'TRIPPED' && gen.tripReason && (
                  <div className="busbar-popup__row">
                    <span className="busbar-popup__label">Trip Reason</span>
                    <span className="busbar-popup__value" style={{ color: C_RED }}>
                      {gen.tripReason}
                    </span>
                  </div>
                )}
              </div>
              <div className="busbar-popup__actions">
                <button
                  className="busbar-popup__btn busbar-popup__btn--start"
                  onClick={() => closeBreaker(genId)}
                  disabled={gen.breakerState === 'CLOSED' || gen.breakerState === 'TRIPPED'}
                >
                  CLOSE
                </button>
                <button
                  className="busbar-popup__btn busbar-popup__btn--stop"
                  onClick={() => openBreaker(genId)}
                  disabled={gen.breakerState !== 'CLOSED'}
                >
                  OPEN
                </button>
                <button
                  className="busbar-popup__btn busbar-popup__btn--reset"
                  onClick={() => resetBreaker(genId)}
                  disabled={gen.breakerState !== 'TRIPPED'}
                >
                  RESET
                </button>
              </div>
              <div className="busbar-popup__actions" style={{ marginTop: 4 }}>
                <button
                  className="busbar-popup__btn busbar-popup__btn--sync"
                  onClick={() => autoSync(genId)}
                  disabled={gen.breakerState === 'CLOSED' || gen.state !== 'RUNNING'}
                >
                  AUTO SYNC
                </button>
              </div>
            </>
          )}

          {/* ── Bus-tie popup ────────────────────────── */}
          {type === 'bustie' && (
            <>
              <div className="busbar-popup__readings">
                <div className="busbar-popup__row">
                  <span className="busbar-popup__label">State</span>
                  <span className="busbar-popup__value" style={{ color: busTieClosed ? C_GREEN : C_RED_DIM }}>
                    {busTieClosed ? 'CLOSED' : 'OPEN'}
                  </span>
                </div>
              </div>
              <div className="busbar-popup__actions">
                <button
                  className="busbar-popup__btn busbar-popup__btn--start"
                  onClick={() => setBusTie(true)}
                  disabled={busTieClosed}
                >
                  CLOSE
                </button>
                <button
                  className="busbar-popup__btn busbar-popup__btn--stop"
                  onClick={() => setBusTie(false)}
                  disabled={!busTieClosed}
                >
                  OPEN
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="busbar" ref={containerRef} onClick={closePopup}>
      <svg
        className="busbar__diagram"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Main generators ───────────────────────── */}
        {MAIN_GENS.map((genId) => (
          <g key={genId}>
            {renderEngine(GEN_X[genId], genId)}
            {renderGenerator(GEN_X[genId], genId)}
            {renderBreaker(GEN_X[genId], genId)}
          </g>
        ))}

        {/* ── Main bus line ─────────────────────────── */}
        <line
          x1={70} y1={BUS_Y} x2={700} y2={BUS_Y}
          stroke={busColor} strokeWidth={6} strokeLinecap="round"
        />
        {/* Main bus label */}
        <text
          x={385} y={BUS_Y + 16}
          textAnchor="middle" fill={C_GRAY_LIGHT} fontSize="9" fontFamily="monospace"
          letterSpacing="2"
        >
          MAIN BUS
        </text>

        {/* ── Main bus readings ─────────────────────── */}
        <text x={160} y={BUS_Y + 30} textAnchor="middle" fill={C_TEXT} fontSize="11" fontFamily="monospace">
          {busVoltage} V
        </text>
        <text x={385} y={BUS_Y + 30} textAnchor="middle" fill={C_TEXT} fontSize="11" fontFamily="monospace">
          {busFreq} Hz
        </text>
        <text x={570} y={BUS_Y + 30} textAnchor="middle" fill={C_TEXT} fontSize="11" fontFamily="monospace">
          {totalLoad} kW
        </text>

        {/* ── Connection main bus → bus tie ──────────── */}
        <line
          x1={700} y1={BUS_Y} x2={BUS_TIE_X - BRK_SZ / 2} y2={BUS_Y}
          stroke={busLive ? C_GREEN_DIM : C_GRAY} strokeWidth={3}
        />

        {/* ── Bus-tie breaker ───────────────────────── */}
        {renderBusTie()}

        {/* ── Connection bus tie → EMG bus ──────────── */}
        <line
          x1={BUS_TIE_X + BRK_SZ / 2} y1={BUS_Y} x2={EMG_BUS_START} y2={BUS_Y}
          stroke={busTieClosed && busLive ? C_AMBER : C_GRAY} strokeWidth={3}
        />

        {/* ── Emergency bus line ─────────────────────── */}
        <line
          x1={EMG_BUS_START} y1={BUS_Y} x2={EMG_BUS_END} y2={BUS_Y}
          stroke={emBusColor} strokeWidth={4} strokeLinecap="round"
        />
        <text
          x={(EMG_BUS_START + EMG_BUS_END) / 2} y={BUS_Y - 10}
          textAnchor="middle" fill={C_AMBER} fontSize="9" fontFamily="monospace"
          letterSpacing="1.5" opacity={0.8}
        >
          EMG BUS
        </text>

        {/* ── EMG bus readings ──────────────────────── */}
        <text x={EMG_BUS_START + 30} y={BUS_Y + 48} textAnchor="middle" fill={C_AMBER} fontSize="9" fontFamily="monospace" opacity={0.8}>
          {emVoltage} V
        </text>
        <text x={(EMG_BUS_START + EMG_BUS_END) / 2} y={BUS_Y + 48} textAnchor="middle" fill={C_AMBER} fontSize="9" fontFamily="monospace" opacity={0.8}>
          {emFreq} Hz
        </text>
        <text x={EMG_BUS_END - 30} y={BUS_Y + 48} textAnchor="middle" fill={C_AMBER} fontSize="9" fontFamily="monospace" opacity={0.8}>
          {emLoad} kW
        </text>

        {/* ── EMG Generator ─────────────────────────── */}
        {renderEngine(EMG_X, 'EMG')}
        {renderGenerator(EMG_X, 'EMG')}
        {(() => {
          const emg = gens['EMG'];
          const brk = emg?.breakerState || 'OPEN';
          const color = breakerColor(brk);
          const half = BRK_SZ / 2;
          return (
            <g
              style={{ cursor: 'pointer' }}
              onClick={(e) => openPopup(e, 'breaker', 'EMG')}
            >
              <rect
                x={EMG_X - half} y={BRK_Y - half}
                width={BRK_SZ} height={BRK_SZ}
                fill="none" stroke={color} strokeWidth={2}
              />
              {brk === 'CLOSED' && (
                <>
                  <line x1={EMG_X - half} y1={BRK_Y - half} x2={EMG_X + half} y2={BRK_Y + half} stroke={color} strokeWidth={2} />
                  <line x1={EMG_X + half} y1={BRK_Y - half} x2={EMG_X - half} y2={BRK_Y + half} stroke={color} strokeWidth={2} />
                </>
              )}
              {brk === 'TRIPPED' && (
                <rect
                  x={EMG_X - half} y={BRK_Y - half}
                  width={BRK_SZ} height={BRK_SZ}
                  fill="rgba(255,0,0,0.3)" stroke="none"
                >
                  <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
                </rect>
              )}
              {/* Connection breaker → EMG bus */}
              <line
                x1={EMG_X} y1={BRK_Y + half}
                x2={EMG_X} y2={BUS_Y}
                stroke={brk === 'CLOSED' ? emBusColor : C_GRAY} strokeWidth={2}
              />
            </g>
          );
        })()}

        {/* ── Transformer + 230V switchboard ──────── */}
        {renderTransformerAndBus230()}
      </svg>

      {/* ── Load demand bar ───────────────────────── */}
      <div className="busbar__load-demand">
        <span className="busbar__load-demand-label">Total Load: {totalLoad} kW</span>
        <div className="busbar__load-demand-bar">
          <div
            className="busbar__load-demand-fill"
            style={{
              width: `${loadPct}%`,
              backgroundColor:
                loadPct > 90 ? C_RED_DIM : loadPct > 70 ? C_AMBER : C_GREEN_DIM,
            }}
          />
        </div>
      </div>

      {/* ── Popup ─────────────────────────────────── */}
      {popup && renderPopup()}
    </div>
  );
}
