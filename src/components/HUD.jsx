import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { useSettings } from '../context/SettingsContext';

export default function HUD() {
  const { taskProgress, scoreState, alerts, isPaused, pauseGame, resumeGame, quitGame } = useGame();
  const { t } = useLang();
  const { settings } = useSettings();
  const [showHint, setShowHint] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const task = taskProgress?.currentTask;

  return (
    <div className="hud">
      <div className={`hud__task-panel${collapsed ? ' hud__task-panel--collapsed' : ''}`}>
        <button
          className="hud__collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '+' : '\u2212'}
        </button>
        {collapsed ? (
          <span style={{ fontSize: 12, color: '#90a4ae', marginRight: 28 }}>
            {task ? t(task.nameKey) : ''}
          </span>
        ) : (
          task && (
            <>
              <div className="hud__task-title">{t(task.nameKey)}</div>
              <div className="hud__task-desc">{t(task.descKey)}</div>
              {settings.showHints && (
                <div className="hud__hint-area">
                  {!showHint ? (
                    <button className="hud__hint-btn" onClick={() => setShowHint(true)}>
                      {t('hint')} ?
                    </button>
                  ) : (
                    <div className="hud__hint-text">{t(task.hintKey)}</div>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>

      {scoreState && scoreState.streak > 1 && (
        <div className="hud__streak">
          {t('streak')}: {scoreState.streak} ({scoreState.multiplier}x)
        </div>
      )}

      <div className="hud__controls">
        <button className="hud__pause-btn" onClick={isPaused ? resumeGame : pauseGame}>
          {isPaused ? t('resume') : t('pause')}
        </button>
      </div>

      <div className="hud__alerts">
        {alerts && alerts.map((alert, i) => (
          <div key={alert.timestamp + i} className={`hud__alert hud__alert--${alert.type}`}>
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
}
