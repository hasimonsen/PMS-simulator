import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const DIAL_RADIUS = 90;
const DIAL_CX = 100;
const DIAL_CY = 100;
const NEEDLE_LENGTH = 70;
const GREEN_ZONE_DEG = 10; // +/- degrees for green zone at 12 o'clock
const TICK_COUNT = 36; // every 10 degrees
const MAJOR_TICK_INTERVAL = 3; // every 30 degrees is major

export default function Synchroscope({ genId }) {
  const { engineState } = useGame();
  const { t } = useLang();

  // Read pre-computed synchroscope data from engine state.
  // The synchroscope entry only exists when the generator is RUNNING,
  // its breaker is OPEN, and the bus is live.
  const syncData = engineState?.synchroscopes?.[genId];

  const deltaF = syncData?.freqDiff ?? 0;
  const deltaV = syncData?.voltageDiff ?? 0;
  const needleAngleDeg = syncData?.needleAngleDeg ?? 0;
  const isSyncReady = syncData?.inWindow ?? false;

  // Generate tick marks
  const ticks = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    const angleDeg = (i * 360) / TICK_COUNT - 90; // offset so 0 = top
    const angleRad = (angleDeg * Math.PI) / 180;
    const isMajor = i % MAJOR_TICK_INTERVAL === 0;
    const innerR = isMajor ? DIAL_RADIUS - 15 : DIAL_RADIUS - 8;
    const outerR = DIAL_RADIUS - 2;

    ticks.push(
      <line
        key={`tick-${i}`}
        x1={DIAL_CX + innerR * Math.cos(angleRad)}
        y1={DIAL_CY + innerR * Math.sin(angleRad)}
        x2={DIAL_CX + outerR * Math.cos(angleRad)}
        y2={DIAL_CY + outerR * Math.sin(angleRad)}
        stroke={isMajor ? '#ccc' : '#777'}
        strokeWidth={isMajor ? 2 : 1}
      />
    );
  }

  // Green zone arc at top (12 o'clock)
  const greenStartDeg = -90 - GREEN_ZONE_DEG;
  const greenEndDeg = -90 + GREEN_ZONE_DEG;
  const greenStartRad = (greenStartDeg * Math.PI) / 180;
  const greenEndRad = (greenEndDeg * Math.PI) / 180;
  const arcR = DIAL_RADIUS - 4;
  const greenArcPath = [
    `M ${DIAL_CX + arcR * Math.cos(greenStartRad)} ${DIAL_CY + arcR * Math.sin(greenStartRad)}`,
    `A ${arcR} ${arcR} 0 0 1 ${DIAL_CX + arcR * Math.cos(greenEndRad)} ${DIAL_CY + arcR * Math.sin(greenEndRad)}`,
  ].join(' ');

  // Needle endpoint
  const needleRad = ((needleAngleDeg - 90) * Math.PI) / 180;
  const needleX = DIAL_CX + NEEDLE_LENGTH * Math.cos(needleRad);
  const needleY = DIAL_CY + NEEDLE_LENGTH * Math.sin(needleRad);

  // "FAST" and "SLOW" labels
  const fastLabelRad = ((90 - 90) * Math.PI) / 180; // 3 o'clock = 90deg CW from top
  const slowLabelRad = ((-90 - 90) * Math.PI) / 180; // 9 o'clock

  return (
    <div className="synchroscope">
      <div className="synchroscope__title">{t('synchroscope')} - {genId}</div>

      <svg
        className="synchroscope__dial"
        viewBox="0 0 200 200"
        width="200"
        height="200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dark face background */}
        <circle
          cx={DIAL_CX}
          cy={DIAL_CY}
          r={DIAL_RADIUS}
          fill="#1a1a2e"
          stroke="#444"
          strokeWidth={3}
        />

        {/* Green zone arc */}
        <path
          d={greenArcPath}
          fill="none"
          stroke="rgba(92, 184, 92, 0.7)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {ticks}

        {/* FAST / SLOW labels */}
        <text
          x={DIAL_CX + 35}
          y={DIAL_CY + 5}
          textAnchor="middle"
          fill="#aaa"
          fontSize="10"
          fontFamily="monospace"
        >
          FAST
        </text>
        <text
          x={DIAL_CX - 35}
          y={DIAL_CY + 5}
          textAnchor="middle"
          fill="#aaa"
          fontSize="10"
          fontFamily="monospace"
        >
          SLOW
        </text>

        {/* 12 o'clock marker triangle */}
        <polygon
          points={`${DIAL_CX},${DIAL_CY - DIAL_RADIUS + 1} ${DIAL_CX - 5},${DIAL_CY - DIAL_RADIUS - 8} ${DIAL_CX + 5},${DIAL_CY - DIAL_RADIUS - 8}`}
          fill="#5cb85c"
        />

        {/* Needle */}
        <line
          x1={DIAL_CX}
          y1={DIAL_CY}
          x2={needleX}
          y2={needleY}
          stroke="#ff6b35"
          strokeWidth={3}
          strokeLinecap="round"
          style={{
            transition: Math.abs(deltaF) > 0.5 ? 'none' : 'all 0.1s linear',
          }}
        />

        {/* Needle center dot */}
        <circle cx={DIAL_CX} cy={DIAL_CY} r={5} fill="#ff6b35" />

        {/* Outer ring decoration */}
        <circle
          cx={DIAL_CX}
          cy={DIAL_CY}
          r={DIAL_RADIUS}
          fill="none"
          stroke="#555"
          strokeWidth={1}
        />
      </svg>

      {/* Digital readouts */}
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

      {/* Sync ready indicator */}
      <div
        className={`synchroscope__status ${
          isSyncReady
            ? 'synchroscope__status--ready'
            : 'synchroscope__status--not-ready'
        }`}
      >
        {isSyncReady ? t('syncReady') : t('syncNotReady')}
      </div>
    </div>
  );
}
