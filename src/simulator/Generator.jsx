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

const BREAKER_LABELS = {
  OPEN: 'openBreaker',
  CLOSED: 'closeBreaker',
  TRIPPED: 'tripped',
};

export default function Generator({ genId, selected, onSelect }) {
  const { engineState, startGenerator, stopGenerator } = useGame();
  const { t } = useLang();

  const gen = engineState?.generators?.[genId];
  if (!gen) {
    return (
      <div
        className={`generator-panel generator-panel--offline ${selected ? 'generator-panel--selected' : ''}`}
        onClick={onSelect}
      >
        <div className="generator-panel__header">
          <span className="generator-panel__name">{genId}</span>
          <span className="generator-panel__state" style={{ color: '#666' }}>
            {t('off')}
          </span>
        </div>
      </div>
    );
  }

  const state = gen.state || 'OFF';
  const stateColor = STATE_COLORS[state] || '#666';
  const isRunning = state === 'RUNNING';
  const breakerStatus = gen.breakerState || 'OPEN';
  const isTripped = breakerStatus === 'TRIPPED';

  const panelClasses = [
    'generator-panel',
    selected && 'generator-panel--selected',
    isRunning && 'generator-panel--running',
    state === 'OFF' && 'generator-panel--off',
    state === 'IDLE' && 'generator-panel--idle',
    state === 'COOL_DOWN' && 'generator-panel--cooldown',
    isTripped && 'generator-panel--tripped',
  ]
    .filter(Boolean)
    .join(' ');

  const breakerColorClass =
    breakerStatus === 'CLOSED'
      ? 'generator-panel__breaker--closed'
      : breakerStatus === 'TRIPPED'
        ? 'generator-panel__breaker--tripped'
        : 'generator-panel__breaker--open';

  return (
    <div className={panelClasses} onClick={onSelect}>
      {/* Header: Name + State */}
      <div className="generator-panel__header">
        <span className="generator-panel__name">{genId}</span>
        <span
          className="generator-panel__state"
          style={{ color: stateColor }}
        >
          {t(STATE_KEYS[state] || 'off')}
        </span>
      </div>

      {/* Digital readouts */}
      <div className="generator-panel__readings">
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('rpm')}</span>
          <span className="generator-panel__reading-value">
            {Math.round(gen.rpm || 0)}
          </span>
        </div>
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('voltage')}</span>
          <span className="generator-panel__reading-value">
            {Math.round(gen.voltage || 0)} V
          </span>
        </div>
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('frequency')}</span>
          <span className="generator-panel__reading-value">
            {(gen.frequency || 0).toFixed(1)} Hz
          </span>
        </div>
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('activePower')}</span>
          <span className="generator-panel__reading-value">
            {Math.round(gen.activePower || 0)} kW
          </span>
        </div>
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('reactivePower')}</span>
          <span className="generator-panel__reading-value">
            {Math.round(gen.reactivePower || 0)} kVAR
          </span>
        </div>
        <div className="generator-panel__reading">
          <span className="generator-panel__reading-label">{t('loadPercent')}</span>
          <span className="generator-panel__reading-value">
            {Math.round(gen.loadPercent || 0)} %
          </span>
        </div>
      </div>

      {/* Breaker status */}
      <div className={`generator-panel__breaker ${breakerColorClass}`}>
        <span className="generator-panel__breaker-label">
          {isTripped ? t('tripped') : breakerStatus}
        </span>
        {isTripped && gen.tripReason && (
          <span className="generator-panel__trip-reason">
            {t(`trip.${gen.tripReason}`)}
          </span>
        )}
      </div>

      {/* Start / Stop buttons */}
      <div className="generator-panel__buttons">
        <button
          className="generator-panel__btn generator-panel__btn--start"
          onClick={(e) => {
            e.stopPropagation();
            startGenerator(genId);
          }}
          disabled={state !== 'OFF'}
        >
          {t('start')}
        </button>
        <button
          className="generator-panel__btn generator-panel__btn--stop"
          onClick={(e) => {
            e.stopPropagation();
            stopGenerator(genId);
          }}
          disabled={state === 'OFF' || state === 'COOL_DOWN'}
        >
          {t('stop')}
        </button>
      </div>
    </div>
  );
}
