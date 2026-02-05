import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const RPM_MIN = 680;
const RPM_MAX = 760;
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

  function handleModeChange(newMode) {
    setSpeedMode(genId, newMode);
  }

  function handleSetpointChange(e) {
    setGovernorSetpoint(genId, parseFloat(e.target.value));
  }

  function handleDroopChange(e) {
    setDroopPercent(genId, parseFloat(e.target.value));
  }

  function handleCommsToggle() {
    setIsoComms(genId, !isoCommsEnabled);
  }

  return (
    <div className="governor-panel">
      <div className="governor-panel__title">{t('governor')} - {genId}</div>

      {/* Speed mode selector */}
      <div className="governor-panel__mode">
        <label className="governor-panel__mode-option">
          <input
            type="radio"
            name={`gov-mode-${genId}`}
            value="droop"
            checked={mode === 'droop'}
            onChange={() => handleModeChange('droop')}
          />
          <span className="governor-panel__mode-label">{t('droop')}</span>
        </label>
        <label className="governor-panel__mode-option">
          <input
            type="radio"
            name={`gov-mode-${genId}`}
            value="isochronous"
            checked={mode === 'isochronous'}
            onChange={() => handleModeChange('isochronous')}
          />
          <span className="governor-panel__mode-label">{t('isochronous')}</span>
        </label>
      </div>

      {/* Governor setpoint slider */}
      <div className="governor-panel__control">
        <label className="governor-panel__control-label">
          {t('speedSetpoint')}: {Math.round(setpoint)} RPM
        </label>
        <input
          type="range"
          className="governor-panel__slider"
          min={RPM_MIN}
          max={RPM_MAX}
          step={1}
          value={setpoint}
          onChange={handleSetpointChange}
        />
        <div className="governor-panel__slider-range">
          <span>{RPM_MIN}</span>
          <span>{RPM_MAX}</span>
        </div>
      </div>

      {/* Droop % slider */}
      <div className="governor-panel__control">
        <label className="governor-panel__control-label">
          {t('droopPercent')}: {droopPercent.toFixed(1)}%
        </label>
        <input
          type="range"
          className="governor-panel__slider"
          min={DROOP_MIN}
          max={DROOP_MAX}
          step={0.1}
          value={droopPercent}
          onChange={handleDroopChange}
          disabled={mode === 'isochronous'}
        />
        <div className="governor-panel__slider-range">
          <span>{DROOP_MIN}%</span>
          <span>{DROOP_MAX}%</span>
        </div>
      </div>

      {/* Load Sharing Comms toggle */}
      <div className="governor-panel__load-sharing">
        <span className="governor-panel__load-sharing-label">{t('loadSharing')}</span>
        <button
          className={`governor-panel__toggle ${
            isoCommsEnabled
              ? 'governor-panel__toggle--on'
              : 'governor-panel__toggle--off'
          }`}
          onClick={handleCommsToggle}
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
