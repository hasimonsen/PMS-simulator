import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const GENERATORS = ['DG1', 'DG2', 'DG3', 'SG'];
const GEN_POSITIONS = {
  DG1: { x: 80 },
  DG2: { x: 230 },
  DG3: { x: 380 },
  SG: { x: 530 },
};

const BUS_Y = 120;
const GEN_Y = 30;
const BREAKER_SIZE = 20;

export default function Busbar({ selectedGen, onSelectGen }) {
  const { engineState, closeBreaker, openBreaker } = useGame();
  const { t } = useLang();

  const bus = engineState?.mainBus;
  const busLive = bus?.live ?? false;
  const busColor = busLive ? '#5cb85c' : '#888';

  const busVoltage = Math.round(bus?.voltage || 0);
  const busFrequency = (bus?.frequency || 0).toFixed(1);
  const totalLoad = Math.round(bus?.totalLoad || 0);
  const totalGeneration = Math.round(bus?.totalGeneration || 0);

  // Compute total online capacity from generators for the load bar
  const onlineGens = Object.values(engineState?.generators || {}).filter(
    (g) => !g.isEmergency && g.state === 'RUNNING' && g.breakerState === 'CLOSED'
  );
  const totalCapacity = onlineGens.reduce((sum, g) => sum + (g.capacity || 0), 0) || 1;
  const loadBarPercent = Math.min((totalLoad / totalCapacity) * 100, 100);

  function renderBreakerSymbol(genId, cx, cy) {
    const gen = engineState?.generators?.[genId];
    const breakerStatus = gen?.breakerState || 'OPEN';
    const isClosed = breakerStatus === 'CLOSED';
    const isTripped = breakerStatus === 'TRIPPED';

    const half = BREAKER_SIZE / 2;

    let strokeColor = '#d9534f'; // red = open
    if (isClosed) strokeColor = '#5cb85c'; // green = closed
    if (isTripped) strokeColor = '#ff4444'; // bright red = tripped

    return (
      <g
        className="busbar__breaker-symbol"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectGen) onSelectGen(genId);
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Breaker square */}
        <rect
          x={cx - half}
          y={cy - half}
          width={BREAKER_SIZE}
          height={BREAKER_SIZE}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
        />
        {/* X when closed */}
        {isClosed && (
          <>
            <line
              x1={cx - half} y1={cy - half}
              x2={cx + half} y2={cy + half}
              stroke={strokeColor} strokeWidth={2}
            />
            <line
              x1={cx + half} y1={cy - half}
              x2={cx - half} y2={cy + half}
              stroke={strokeColor} strokeWidth={2}
            />
          </>
        )}
        {/* Flashing effect for tripped */}
        {isTripped && (
          <rect
            x={cx - half}
            y={cy - half}
            width={BREAKER_SIZE}
            height={BREAKER_SIZE}
            fill="rgba(255,0,0,0.3)"
            stroke="none"
          >
            <animate
              attributeName="opacity"
              values="1;0;1"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </rect>
        )}
      </g>
    );
  }

  return (
    <div className="busbar">
      <div className="busbar__title">{t('mainBus')}</div>

      <svg
        className="busbar__diagram"
        viewBox="0 0 640 200"
        width="100%"
        height="200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main bus bar line */}
        <line
          x1={40} y1={BUS_Y}
          x2={600} y2={BUS_Y}
          stroke={busColor}
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Generator connections */}
        {GENERATORS.map((genId) => {
          const pos = GEN_POSITIONS[genId];
          const gen = engineState?.generators?.[genId];
          const isRunning = gen?.state === 'RUNNING';
          const genColor = isRunning ? '#5cb85c' : '#888';
          const breakerY = (GEN_Y + BUS_Y) / 2;

          return (
            <g key={genId}>
              {/* Generator icon (circle) */}
              <circle
                cx={pos.x}
                cy={GEN_Y}
                r={18}
                fill="none"
                stroke={genColor}
                strokeWidth={2}
              />
              <text
                x={pos.x}
                y={GEN_Y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={genColor}
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {genId === 'SG' ? 'SG' : genId.replace('DG', 'G')}
              </text>

              {/* Connection line: generator to breaker */}
              <line
                x1={pos.x} y1={GEN_Y + 18}
                x2={pos.x} y2={breakerY - BREAKER_SIZE / 2}
                stroke={genColor}
                strokeWidth={2}
              />

              {/* Breaker symbol */}
              {renderBreakerSymbol(genId, pos.x, breakerY)}

              {/* Connection line: breaker to bus */}
              <line
                x1={pos.x} y1={breakerY + BREAKER_SIZE / 2}
                x2={pos.x} y2={BUS_Y}
                stroke={busColor}
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* Bus readings */}
        <text x={320} y={BUS_Y + 25} textAnchor="middle" fill="#ccc" fontSize="12" fontFamily="monospace">
          {t('busVoltage')}: {busVoltage} V
        </text>
        <text x={320} y={BUS_Y + 42} textAnchor="middle" fill="#ccc" fontSize="12" fontFamily="monospace">
          {t('busFrequency')}: {busFrequency} Hz
        </text>
        <text x={320} y={BUS_Y + 59} textAnchor="middle" fill="#ccc" fontSize="12" fontFamily="monospace">
          {t('totalLoad')}: {totalLoad} kW
        </text>
      </svg>

      {/* Load demand bar */}
      <div className="busbar__load-demand">
        <span className="busbar__load-demand-label">{t('totalLoad')}: {totalLoad} kW</span>
        <div className="busbar__load-demand-bar">
          <div
            className="busbar__load-demand-fill"
            style={{
              width: `${loadBarPercent}%`,
              backgroundColor:
                loadBarPercent > 90
                  ? '#d9534f'
                  : loadBarPercent > 70
                    ? '#f0ad4e'
                    : '#5cb85c',
            }}
          />
        </div>
      </div>
    </div>
  );
}
