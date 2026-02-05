import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

/**
 * DEIF CSQ-3 style LED ring synchroscope.
 * Ring of LEDs rotates based on phase difference.
 * 12 o'clock = in sync. CW = too fast, CCW = too slow.
 */
const LED_COUNT = 36;
const RING_R = 72;
const CX = 105;
const CY = 105;
const LED_R = 4.5;
const SVG_SIZE = 210;

export default function Synchroscope({ genId }) {
  const { engineState } = useGame();
  const { t } = useLang();

  const syncData = engineState?.synchroscopes?.[genId];
  const deltaF = syncData?.freqDiff ?? 0;
  const deltaV = syncData?.voltageDiff ?? 0;
  const needleAngleDeg = syncData?.needleAngleDeg ?? 0;
  const isSyncReady = syncData?.inWindow ?? false;
  const isActive = !!syncData;

  const activeLedIdx = isActive
    ? Math.round(((needleAngleDeg % 360 + 360) % 360) / (360 / LED_COUNT)) % LED_COUNT
    : -1;

  const voltageTooHigh = isActive && deltaV > 15;
  const voltageTooLow = isActive && deltaV < -15;

  const leds = [];
  for (let i = 0; i < LED_COUNT; i++) {
    const angleDeg = (i * 360) / LED_COUNT - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = CX + RING_R * Math.cos(angleRad);
    const y = CY + RING_R * Math.sin(angleRad);
    const isLit = i === activeLedIdx;
    const inSyncZone = i <= 2 || i >= LED_COUNT - 2;

    leds.push(
      <circle
        key={i}
        cx={x} cy={y}
        r={isLit ? LED_R + 1 : LED_R}
        fill={isLit ? (inSyncZone ? '#00ff88' : '#ff3333') : '#4a2020'}
        stroke={isLit ? (inSyncZone ? '#00ff88' : '#ff3333') : '#333'}
        strokeWidth={isLit ? 1.5 : 0.5}
        style={isLit ? { filter: `drop-shadow(0 0 4px ${inSyncZone ? '#00ff88' : '#ff3333'})` } : undefined}
      />
    );
  }

  return (
    <div className="synchroscope">
      <div className="synchroscope__title">{t('synchroscope')} - {genId}</div>

      <div className="synchroscope__face">
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} width="100%"
          preserveAspectRatio="xMidYMid meet" className="synchroscope__svg">
          {/* Cream face */}
          <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} rx="8" fill="#f5f0e8" />
          <rect x="3" y="3" width={SVG_SIZE - 6} height={SVG_SIZE - 6} rx="6"
            fill="none" stroke="#333" strokeWidth="3" />

          {/* Direction arcs */}
          <path d={`M ${CX - 50} ${CY - 28} A 50 50 0 0 1 ${CX - 12} ${CY - 50}`}
            fill="none" stroke="#222" strokeWidth="2" markerEnd="url(#arr)" />
          <path d={`M ${CX + 50} ${CY - 28} A 50 50 0 0 0 ${CX + 12} ${CY - 50}`}
            fill="none" stroke="#222" strokeWidth="2" markerEnd="url(#arr)" />
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#222" />
            </marker>
          </defs>

          <text x={CX - 62} y={CY - 42} textAnchor="middle" fill="#222"
            fontSize="10" fontWeight="bold" fontFamily="Arial">TOO FAST</text>
          <text x={CX + 62} y={CY - 42} textAnchor="middle" fill="#222"
            fontSize="10" fontWeight="bold" fontFamily="Arial">TOO SLOW</text>

          {/* SYNC marker */}
          <text x={CX} y={16} textAnchor="middle" fill="#222"
            fontSize="10" fontWeight="bold" fontFamily="Arial">SYNC</text>
          <polygon points={`${CX - 5},20 ${CX + 5},20 ${CX},27`} fill="#222" />

          {/* LED ring */}
          {leds}

          {/* φOK */}
          <polygon points={`${CX - 5},${CY - 32} ${CX + 5},${CY - 32} ${CX},${CY - 25}`}
            fill={isSyncReady ? '#00cc44' : '#888'} />
          <text x={CX + 12} y={CY - 25} fill="#222"
            fontSize="9" fontWeight="bold" fontFamily="Arial">φOK</text>

          {/* UGEN indicators */}
          <text x={32} y={CY + 45} fill="#222" fontSize="8" fontFamily="Arial">
            U<tspan fontSize="6" dy="2">GEN</tspan>
          </text>
          <circle cx={32} cy={CY + 55} r={4.5}
            fill={voltageTooHigh ? '#ff3333' : '#4a2020'} stroke="#333" strokeWidth={0.5} />
          <text x={42} y={CY + 58} fill="#222" fontSize="8" fontWeight="bold" fontFamily="Arial">TOO HIGH</text>
          <circle cx={32} cy={CY + 70} r={4.5}
            fill={voltageTooLow ? '#ff3333' : '#4a2020'} stroke="#333" strokeWidth={0.5} />
          <text x={42} y={CY + 73} fill="#222" fontSize="8" fontWeight="bold" fontFamily="Arial">TOO LOW</text>

          {/* Label */}
          <text x={CX + 25} y={CY + 62} textAnchor="middle" fill="#222"
            fontSize="9" fontWeight="bold" fontFamily="Arial">SYNCHROSCOPE</text>
          <text x={CX + 25} y={CY + 73} textAnchor="middle" fill="#666"
            fontSize="7" fontStyle="italic" fontFamily="Arial">CSQ-3</text>

          {/* DEIF badge */}
          <rect x={SVG_SIZE - 48} y={SVG_SIZE - 24} width="38" height="14" rx="1"
            fill="#222" stroke="#000" strokeWidth="0.5" />
          <text x={SVG_SIZE - 29} y={SVG_SIZE - 14} textAnchor="middle" fill="#fff"
            fontSize="8" fontWeight="bold" fontFamily="Arial">DEIF</text>
        </svg>
      </div>

      {/* Readouts */}
      <div className="synchroscope__readouts">
        <div className="synchroscope__readout">
          <span className="synchroscope__readout-label">{t('freqDiff')}</span>
          <span className="synchroscope__readout-value">
            {deltaF >= 0 ? '+' : ''}{deltaF.toFixed(2)} Hz
          </span>
        </div>
        <div className="synchroscope__readout">
          <span className="synchroscope__readout-label">{t('voltDiff')}</span>
          <span className="synchroscope__readout-value">
            {deltaV >= 0 ? '+' : ''}{Math.round(deltaV)} V
          </span>
        </div>
        <div className="synchroscope__readout">
          <span className="synchroscope__readout-label">{t('phaseDiff')}</span>
          <span className="synchroscope__readout-value">
            {needleAngleDeg >= 0 ? '+' : ''}{needleAngleDeg.toFixed(1)}&deg;
          </span>
        </div>
      </div>

      <div className={`synchroscope__status ${
        isSyncReady ? 'synchroscope__status--ready' : 'synchroscope__status--not-ready'
      }`}>
        {isSyncReady ? t('syncReady') : t('syncNotReady')}
      </div>
    </div>
  );
}
