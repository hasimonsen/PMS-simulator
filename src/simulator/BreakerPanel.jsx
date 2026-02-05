import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

export default function BreakerPanel({ genId }) {
  const { engineState, closeBreaker, openBreaker, resetBreaker, autoSync } = useGame();
  const { t } = useLang();

  const gen = engineState?.generators?.[genId];
  const breakerStatus = gen?.breakerState || 'OPEN';
  const isOpen = breakerStatus === 'OPEN';
  const isClosed = breakerStatus === 'CLOSED';
  const isTripped = breakerStatus === 'TRIPPED';
  const tripReason = gen?.tripReason || null;

  // Determine the status indicator color and class
  let statusColor = '#d9534f'; // red for open
  let statusClass = 'breaker-panel__indicator--open';
  if (isClosed) {
    statusColor = '#5cb85c';
    statusClass = 'breaker-panel__indicator--closed';
  } else if (isTripped) {
    statusColor = '#ff4444';
    statusClass = 'breaker-panel__indicator--tripped';
  }

  // Auto sync availability (check level config or feature flags)
  const levelConfig = engineState?.levelConfig;
  const autoSyncAvailable = levelConfig?.autoSyncEnabled ?? true;

  return (
    <div className="breaker-panel">
      <div className="breaker-panel__title">{t('closeBreaker').replace('Close ', '')} - {genId}</div>

      {/* Large breaker status indicator */}
      <div className={`breaker-panel__indicator ${statusClass}`}>
        <div
          className="breaker-panel__indicator-light"
          style={{ backgroundColor: statusColor }}
        />
        <span className="breaker-panel__indicator-label">
          {isTripped ? t('tripped') : isClosed ? 'CLOSED' : 'OPEN'}
        </span>
      </div>

      {/* Trip reason display */}
      {isTripped && tripReason && (
        <div className="breaker-panel__trip-reason">
          {t(`trip.${tripReason}`)}
        </div>
      )}

      {/* Breaker control buttons */}
      <div className="breaker-panel__controls">
        <button
          className="breaker-panel__btn breaker-panel__btn--close"
          onClick={() => closeBreaker(genId)}
          disabled={isClosed || isTripped}
        >
          {t('closeBreaker')}
        </button>
        <button
          className="breaker-panel__btn breaker-panel__btn--open"
          onClick={() => openBreaker(genId)}
          disabled={isOpen || isTripped}
        >
          {t('openBreaker')}
        </button>
        <button
          className="breaker-panel__btn breaker-panel__btn--reset"
          onClick={() => resetBreaker(genId)}
          disabled={!isTripped}
        >
          {t('resetBreaker')}
        </button>
      </div>

      {/* Auto sync button */}
      {autoSyncAvailable && (
        <div className="breaker-panel__auto-sync">
          <button
            className="breaker-panel__btn breaker-panel__btn--auto-sync"
            onClick={() => autoSync(genId)}
            disabled={isClosed || isTripped}
          >
            {t('autoSync')}
          </button>
        </div>
      )}
    </div>
  );
}
