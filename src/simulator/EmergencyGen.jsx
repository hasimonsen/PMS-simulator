import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

const STATE_COLORS = {
  OFF: '#666',
  PRE_LUBE: '#f0ad4e',
  CRANKING: '#f0ad4e',
  IDLE: '#5bc0de',
  RUNNING: '#5cb85c',
  COOL_DOWN: '#f0ad4e',
};

const STATE_KEYS = {
  OFF: 'off',
  PRE_LUBE: 'preLube',
  CRANKING: 'cranking',
  IDLE: 'idle',
  RUNNING: 'running',
  COOL_DOWN: 'coolDown',
};

export default function EmergencyGen({ selected, onSelect }) {
  const { engineState, startGenerator, stopGenerator } = useGame();
  const { t } = useLang();

  const emg = engineState?.generators?.EMG;
  const autoStart = emg?.autoStart ?? false;

  const state = emg?.state || 'OFF';
  const stateColor = STATE_COLORS[state] || '#666';
  const isRunning = state === 'RUNNING';
  const breakerStatus = emg?.breakerState || 'OPEN';
  const isTripped = breakerStatus === 'TRIPPED';

  const panelClasses = [
    'emergency-gen',
    selected && 'emergency-gen--selected',
    isRunning && 'emergency-gen--running',
    state === 'OFF' && 'emergency-gen--off',
    isTripped && 'emergency-gen--tripped',
  ]
    .filter(Boolean)
    .join(' ');

  const breakerColorClass =
    breakerStatus === 'CLOSED'
      ? 'emergency-gen__breaker--closed'
      : breakerStatus === 'TRIPPED'
        ? 'emergency-gen__breaker--tripped'
        : 'emergency-gen__breaker--open';

  return (
    <div className={panelClasses} onClick={onSelect}>
      {/* Header */}
      <div className="emergency-gen__header">
        <span className="emergency-gen__name">{t('emergencyGen')}</span>
        <span className="emergency-gen__state" style={{ color: stateColor }}>
          {t(STATE_KEYS[state] || 'off')}
        </span>
      </div>

      {/* Auto-start indicator */}
      <div className="emergency-gen__auto-start">
        <span className="emergency-gen__auto-start-label">{t('emgAutoStart')}</span>
        <span
          className={`emergency-gen__auto-start-indicator ${
            autoStart
              ? 'emergency-gen__auto-start-indicator--on'
              : 'emergency-gen__auto-start-indicator--off'
          }`}
        >
          {autoStart ? t('enabled') : t('disabled')}
        </span>
      </div>

      {/* Readings */}
      <div className="emergency-gen__readings">
        <div className="emergency-gen__reading">
          <span className="emergency-gen__reading-label">{t('rpm')}</span>
          <span className="emergency-gen__reading-value">
            {Math.round(emg?.rpm || 0)}
          </span>
        </div>
        <div className="emergency-gen__reading">
          <span className="emergency-gen__reading-label">{t('voltage')}</span>
          <span className="emergency-gen__reading-value">
            {Math.round(emg?.voltage || 0)} V
          </span>
        </div>
        <div className="emergency-gen__reading">
          <span className="emergency-gen__reading-label">{t('frequency')}</span>
          <span className="emergency-gen__reading-value">
            {(emg?.frequency || 0).toFixed(1)} Hz
          </span>
        </div>
        <div className="emergency-gen__reading">
          <span className="emergency-gen__reading-label">{t('activePower')}</span>
          <span className="emergency-gen__reading-value">
            {Math.round(emg?.activePower || 0)} kW
          </span>
        </div>
        <div className="emergency-gen__reading">
          <span className="emergency-gen__reading-label">{t('loadPercent')}</span>
          <span className="emergency-gen__reading-value">
            {Math.round(emg?.loadPercent || 0)} %
          </span>
        </div>
      </div>

      {/* Breaker status */}
      <div className={`emergency-gen__breaker ${breakerColorClass}`}>
        <span className="emergency-gen__breaker-label">
          {isTripped ? t('tripped') : breakerStatus}
        </span>
        {isTripped && emg?.tripReason && (
          <span className="emergency-gen__trip-reason">
            {t(`trip.${emg.tripReason}`)}
          </span>
        )}
      </div>

      {/* Start / Stop buttons */}
      <div className="emergency-gen__buttons">
        <button
          className="emergency-gen__btn emergency-gen__btn--start"
          onClick={(e) => {
            e.stopPropagation();
            startGenerator('EMG');
          }}
          disabled={state !== 'OFF'}
        >
          {t('start')}
        </button>
        <button
          className="emergency-gen__btn emergency-gen__btn--stop"
          onClick={(e) => {
            e.stopPropagation();
            stopGenerator('EMG');
          }}
          disabled={state === 'OFF' || state === 'COOL_DOWN'}
        >
          {t('stop')}
        </button>
      </div>
    </div>
  );
}
