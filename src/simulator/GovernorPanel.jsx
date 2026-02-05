import React, { useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const RPM_MIN = 680;
const RPM_MAX = 760;
const RPM_STEP = 0.5; // RPM change per tick while held
const TICK_MS = 50;   // ms between setpoint ticks
const DROOP_MIN = 0;
const DROOP_MAX = 8;

export default function GovernorPanel({ genId }) {
  const {
    engineState,
    setSpeedMode,
    setGovernorSetpoint,
    setDroopPercent,
    setIsoComms,
  } = useGame();
  const { t } = useLang();

  const gen = engineState?.generators?.[genId];
  const mode = gen?.speedMode || 'droop';
  const setpoint = gen?.governorSetpoint ?? 720;
  const droopPercent = gen?.droopPercent ?? 4;
  const isoCommsEnabled = gen?.isoCommsEnabled ?? false;

  const rpm = gen?.rpm || 0;
  const frequency = gen?.frequency || 0;
  const activePower = gen?.activePower || 0;
  const loadPercent = gen?.loadPercent || 0;

  // Cam switch: hold-to-adjust speed, spring-return to 0
  const intervalRef = useRef(null);
  const dirRef = useRef(0); // -1, 0, +1

  const stopAdjust = useCallback(() => {
    dirRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAdjust = useCallback((direction) => {
    stopAdjust();
    dirRef.current = direction;
    // Immediately apply one step
    setGovernorSetpoint(genId, Math.max(RPM_MIN, Math.min(RPM_MAX,
      (engineState?.generators?.[genId]?.governorSetpoint ?? 720) + direction * RPM_STEP
    )));
    // Continue adjusting while held
    intervalRef.current = setInterval(() => {
      const current = engineState?.generators?.[genId]?.governorSetpoint ?? 720;
      const next = Math.max(RPM_MIN, Math.min(RPM_MAX, current + direction * RPM_STEP));
      setGovernorSetpoint(genId, next);
    }, TICK_MS);
  }, [genId, setGovernorSetpoint, stopAdjust, engineState]);

  // Cleanup on unmount
  useEffect(() => stopAdjust, [stopAdjust]);

  function handleDroopChange(e) {
    setDroopPercent(genId, parseFloat(e.target.value));
  }

  return (
    <div className="governor-panel">
      <div className="governor-panel__title">{t('governor')} - {genId}</div>

      {/* Speed mode selector */}
      <div className="governor-panel__mode">
        <label className="governor-panel__mode-option">
          <input type="radio" name={`gov-mode-${genId}`} value="droop"
            checked={mode === 'droop'} onChange={() => setSpeedMode(genId, 'droop')} />
          <span className="governor-panel__mode-label">{t('droop')}</span>
        </label>
        <label className="governor-panel__mode-option">
          <input type="radio" name={`gov-mode-${genId}`} value="isochronous"
            checked={mode === 'isochronous'} onChange={() => setSpeedMode(genId, 'isochronous')} />
          <span className="governor-panel__mode-label">{t('isochronous')}</span>
        </label>
      </div>

      {/* Cam switch speed control */}
      <div className="governor-panel__control">
        <label className="governor-panel__control-label">
          {t('speedSetpoint')}: {Math.round(setpoint)} RPM
        </label>
        <div className="governor-panel__cam-switch">
          <button
            className={`governor-panel__cam-btn governor-panel__cam-btn--left${dirRef.current === -1 ? ' governor-panel__cam-btn--active' : ''}`}
            onMouseDown={() => startAdjust(-1)}
            onMouseUp={stopAdjust}
            onMouseLeave={stopAdjust}
            onTouchStart={() => startAdjust(-1)}
            onTouchEnd={stopAdjust}
          >
            1
          </button>
          <div className="governor-panel__cam-center">0</div>
          <button
            className={`governor-panel__cam-btn governor-panel__cam-btn--right${dirRef.current === 1 ? ' governor-panel__cam-btn--active' : ''}`}
            onMouseDown={() => startAdjust(1)}
            onMouseUp={stopAdjust}
            onMouseLeave={stopAdjust}
            onTouchStart={() => startAdjust(1)}
            onTouchEnd={stopAdjust}
          >
            2
          </button>
        </div>
        <div className="governor-panel__cam-labels">
          <span>LOWER</span>
          <span>RAISE</span>
        </div>
      </div>

      {/* Droop % slider */}
      <div className="governor-panel__control">
        <label className="governor-panel__control-label">
          {t('droopPercent')}: {droopPercent.toFixed(1)}%
        </label>
        <input type="range" className="governor-panel__slider"
          min={DROOP_MIN} max={DROOP_MAX} step={0.1}
          value={droopPercent} onChange={handleDroopChange}
          disabled={mode === 'isochronous'} />
        <div className="governor-panel__slider-range">
          <span>{DROOP_MIN}%</span>
          <span>{DROOP_MAX}%</span>
        </div>
      </div>

      {/* Load Sharing Comms toggle */}
      <div className="governor-panel__load-sharing">
        <span className="governor-panel__load-sharing-label">{t('loadSharing')}</span>
        <button
          className={`governor-panel__toggle ${isoCommsEnabled ? 'governor-panel__toggle--on' : 'governor-panel__toggle--off'}`}
          onClick={() => setIsoComms(genId, !isoCommsEnabled)}
        >
          {isoCommsEnabled ? t('enabled') : t('disabled')}
        </button>
      </div>

      {/* Current readings */}
      <div className="governor-panel__readings">
        <div className="governor-panel__reading">
          <span className="governor-panel__reading-label">{t('rpm')}</span>
          <span className="governor-panel__reading-value">{Math.round(rpm)}</span>
        </div>
        <div className="governor-panel__reading">
          <span className="governor-panel__reading-label">{t('frequency')}</span>
          <span className="governor-panel__reading-value">{frequency.toFixed(1)} Hz</span>
        </div>
        <div className="governor-panel__reading">
          <span className="governor-panel__reading-label">{t('activePower')}</span>
          <span className="governor-panel__reading-value">{Math.round(activePower)} kW</span>
        </div>
        <div className="governor-panel__reading">
          <span className="governor-panel__reading-label">{t('loadPercent')}</span>
          <span className="governor-panel__reading-value">{Math.round(loadPercent)} %</span>
        </div>
      </div>
    </div>
  );
}
