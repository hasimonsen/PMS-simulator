import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import LanguageToggle from './LanguageToggle';

export default function StatusBar() {
  const { playerName, scoreState, taskProgress, taskElapsed, currentLevel } = useGame();
  const { t } = useLang();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__player">{playerName}</span>
        <span className="status-bar__level">{t('level')} {currentLevel}</span>
      </div>
      <div className="status-bar__center">
        {taskProgress && taskProgress.currentTask && (
          <span className="status-bar__task">
            {t('task')}: {t(taskProgress.currentTask.nameKey)}
          </span>
        )}
      </div>
      <div className="status-bar__right">
        <span className="status-bar__time">
          {t('time')}: {formatTime(taskElapsed || 0)}
        </span>
        <span className="status-bar__score">
          {t('score')}: {scoreState ? scoreState.totalScore : 0}
        </span>
        {scoreState && scoreState.multiplier > 1 && (
          <span className="status-bar__multiplier">
            {scoreState.multiplier}x
          </span>
        )}
        <LanguageToggle />
      </div>
    </div>
  );
}
