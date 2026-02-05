import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const EMERGENCY_LOADS = [
  { key: 'lighting', labelKey: 'emergencyLighting' },
  { key: 'navigation', labelKey: 'navigation' },
  { key: 'steering', labelKey: 'steering' },
];

const EM_BUS_Y = 60;
const MAIN_BUS_Y = 10;

export default function EmergencyBus() {
  const { engineState } = useGame();
  const { t } = useLang();

  const emBus = engineState?.emergencyBus;
  const busLive = emBus?.live ?? false;
  const busColor = busLive ? '#5cb85c' : '#888';

  const busTieClosed = emBus?.busTieClosed ?? false;

  const emgBreakerState = engineState?.generators?.EMG?.breakerState || 'OPEN';
  const emgBreakerClosed = emgBreakerState === 'CLOSED';

  return (
    <div className="emergency-bus">
      <div className="emergency-bus__title">{t('emergencyBus')}</div>

      <svg
        className="emergency-bus__diagram"
        viewBox="0 0 300 120"
        width="100%"
        height="120"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Connection to main bus (top) */}
        <line
          x1={60} y1={MAIN_BUS_Y}
          x2={240} y2={MAIN_BUS_Y}
          stroke="#888"
          strokeWidth={3}
          strokeDasharray="6,3"
        />
        <text x={150} y={MAIN_BUS_Y - 2} textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace">
          {t('mainBus')}
        </text>

        {/* Bus tie breaker line from main bus down */}
        <line
          x1={80} y1={MAIN_BUS_Y}
          x2={80} y2={EM_BUS_Y}
          stroke={busTieClosed ? '#5cb85c' : '#888'}
          strokeWidth={2}
        />
        {/* Bus tie breaker symbol */}
        <rect
          x={70} y={30}
          width={20} height={20}
          fill="none"
          stroke={busTieClosed ? '#5cb85c' : '#d9534f'}
          strokeWidth={2}
        />
        {busTieClosed && (
          <>
            <line x1={70} y1={30} x2={90} y2={50} stroke="#5cb85c" strokeWidth={2} />
            <line x1={90} y1={30} x2={70} y2={50} stroke="#5cb85c" strokeWidth={2} />
          </>
        )}
        <text x={80} y={28} textAnchor="middle" fill="#aaa" fontSize="8" fontFamily="monospace">
          {t('busTie')}
        </text>

        {/* EMG breaker line */}
        <line
          x1={220} y1={MAIN_BUS_Y + 20}
          x2={220} y2={EM_BUS_Y}
          stroke={emgBreakerClosed ? '#5cb85c' : '#888'}
          strokeWidth={2}
        />
        {/* EMG breaker symbol */}
        <rect
          x={210} y={30}
          width={20} height={20}
          fill="none"
          stroke={emgBreakerClosed ? '#5cb85c' : '#d9534f'}
          strokeWidth={2}
        />
        {emgBreakerClosed && (
          <>
            <line x1={210} y1={30} x2={230} y2={50} stroke="#5cb85c" strokeWidth={2} />
            <line x1={230} y1={30} x2={210} y2={50} stroke="#5cb85c" strokeWidth={2} />
          </>
        )}
        <text x={220} y={28} textAnchor="middle" fill="#aaa" fontSize="8" fontFamily="monospace">
          EMG
        </text>
        {/* EMG generator circle */}
        <circle cx={220} cy={MAIN_BUS_Y + 12} r={8} fill="none" stroke="#aaa" strokeWidth={1.5} />
        <text x={220} y={MAIN_BUS_Y + 15} textAnchor="middle" fill="#aaa" fontSize="7" fontFamily="monospace">
          E
        </text>

        {/* Emergency bus bar line */}
        <line
          x1={40} y1={EM_BUS_Y}
          x2={260} y2={EM_BUS_Y}
          stroke={busColor}
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Load connection lines below bus */}
        {EMERGENCY_LOADS.map((load, i) => {
          const x = 80 + i * 70;
          // Emergency loads are powered when the emergency bus is live
          const powered = busLive;
          const loadColor = powered ? '#5cb85c' : '#d9534f';
          return (
            <g key={load.key}>
              <line
                x1={x} y1={EM_BUS_Y}
                x2={x} y2={EM_BUS_Y + 30}
                stroke={loadColor}
                strokeWidth={2}
              />
              <rect
                x={x - 12} y={EM_BUS_Y + 30}
                width={24} height={16}
                fill={loadColor}
                rx={2}
                opacity={0.8}
              />
              <text
                x={x} y={EM_BUS_Y + 52}
                textAnchor="middle"
                fill="#ccc"
                fontSize="8"
                fontFamily="monospace"
              >
                {t(load.labelKey)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Emergency load indicators (text) */}
      <div className="emergency-bus__loads">
        {EMERGENCY_LOADS.map((load) => {
          // Emergency loads are powered when the emergency bus is live
          const powered = busLive;
          return (
            <div
              key={load.key}
              className={`emergency-bus__load ${
                powered ? 'emergency-bus__load--powered' : 'emergency-bus__load--dead'
              }`}
            >
              <span
                className="emergency-bus__load-dot"
                style={{ backgroundColor: powered ? '#5cb85c' : '#d9534f' }}
              />
              <span className="emergency-bus__load-label">{t(load.labelKey)}</span>
            </div>
          );
        })}
      </div>

      {/* Emergency bus readings */}
      <div className="emergency-bus__readings">
        <span className="emergency-bus__reading">
          {t('voltage')}: {Math.round(emBus?.voltage || 0)} V
        </span>
        <span className="emergency-bus__reading">
          {t('frequency')}: {(emBus?.frequency || 0).toFixed(1)} Hz
        </span>
        <span className="emergency-bus__reading">
          {t('totalLoad')}: {Math.round(emBus?.totalLoad || 0)} kW
        </span>
      </div>
    </div>
  );
}
