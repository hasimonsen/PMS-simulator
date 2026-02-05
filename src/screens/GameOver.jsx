import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

export default function GameOver() {
  const {
    playerName,
    currentLevel,
    scoreState,
    gameOverReason,
    startGame,
    setScreen,
  } = useGame();
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isComplete = gameOverReason === 'complete' || gameOverReason === null;
  const isFailed = !isComplete;

  const tasks = scoreState?.completedTasks || [];
  const totalScore = scoreState?.totalScore || 0;
  const timeBonus = scoreState?.timeBonus || 0;
  const accuracyBonus = scoreState?.accuracyBonus || 0;
  const penalties = scoreState?.penalties || 0;
  const multiplier = scoreState?.multiplier || 1;
  const streak = scoreState?.streak || 0;

  const gameOverReasonText = {
    blackout: 'Blackout - All generators tripped',
    overload: 'Generator overload - System failure',
    timeout: 'Time expired',
  };

  const handleRetry = () => {
    startGame(currentLevel);
  };

  const handleNextLevel = () => {
    const nextLevel = typeof currentLevel === 'number' ? currentLevel + 1 : currentLevel;
    startGame(nextLevel);
  };

  const handleSubmitScore = async () => {
    if (!playerName.trim() || submitted) return;
    setSubmitting(true);
    try {
      const scoreEntry = {
        player: playerName.trim(),
        level: currentLevel,
        score: totalScore,
        date: new Date().toISOString(),
      };
      if (window.electronAPI) {
        await window.electronAPI.saveScore(scoreEntry);
      } else {
        // Fallback to localStorage
        const existing = JSON.parse(localStorage.getItem('pms-scores') || '[]');
        existing.push(scoreEntry);
        existing.sort((a, b) => b.score - a.score);
        localStorage.setItem('pms-scores', JSON.stringify(existing.slice(0, 50)));
      }
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to submit score:', e);
    }
    setSubmitting(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <h1 style={isComplete ? styles.headerComplete : styles.headerFailed}>
          {isComplete ? t('levelComplete') : t('gameOver')}
        </h1>

        {/* Game over reason */}
        {isFailed && gameOverReason && (
          <div style={styles.reasonBanner}>
            {gameOverReasonText[gameOverReason] || gameOverReason}
          </div>
        )}

        {/* Level info */}
        <div style={styles.levelInfo}>
          {t('level')} {currentLevel}
        </div>

        {/* Score breakdown */}
        <div style={styles.breakdownSection}>
          <h2 style={styles.breakdownTitle}>{t('taskResults')}</h2>

          {tasks.length > 0 ? (
            <div style={styles.taskList}>
              {tasks.map((task, i) => (
                <div key={i} style={styles.taskRow}>
                  <span style={styles.taskName}>
                    {task.name || `Task ${i + 1}`}
                  </span>
                  <span style={styles.taskScore}>
                    +{task.score || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noTasks}>--</div>
          )}

          <div style={styles.divider} />

          {/* Bonuses & penalties */}
          <div style={styles.bonusRow}>
            <span>{t('timeBonus')}</span>
            <span style={styles.bonusValue}>+{timeBonus}</span>
          </div>
          <div style={styles.bonusRow}>
            <span>{t('accuracyBonus')}</span>
            <span style={styles.bonusValue}>+{accuracyBonus}</span>
          </div>
          {penalties > 0 && (
            <div style={styles.penaltyRow}>
              <span>{t('penalties')}</span>
              <span style={styles.penaltyValue}>-{penalties}</span>
            </div>
          )}

          {multiplier > 1 && (
            <div style={styles.multiplierRow}>
              <span>
                {t('streak')}: {streak} ({t('multiplier')}: {multiplier}x)
              </span>
            </div>
          )}

          <div style={styles.divider} />

          {/* Total */}
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>{t('finalScore')}</span>
            <span style={styles.totalValue}>{totalScore}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.buttonRow}>
          <button onClick={handleRetry} style={styles.retryButton}>
            {t('retry')}
          </button>
          {isComplete && (
            <button onClick={handleNextLevel} style={styles.nextButton}>
              {t('nextLevel')}
            </button>
          )}
          <button onClick={() => setScreen('menu')} style={styles.menuButton}>
            {t('backToMenu')}
          </button>
        </div>

        {/* Submit score */}
        {playerName.trim() && (
          <div style={styles.submitSection}>
            {submitted ? (
              <div style={styles.submittedText}>{t('scoreSubmitted')}</div>
            ) : (
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.buttonDisabled : {}),
                }}
              >
                {submitting ? '...' : t('submitScore')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0e17 0%, #1a1f2e 50%, #0d1117 100%)',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: '#1a202c',
    borderRadius: 16,
    padding: '36px 44px',
    maxWidth: 520,
    width: '100%',
    border: '1px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
  headerComplete: {
    fontSize: 32,
    fontWeight: 700,
    color: '#4caf50',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerFailed: {
    fontSize: 32,
    fontWeight: 700,
    color: '#ef5350',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  reasonBanner: {
    background: 'rgba(198, 40, 40, 0.2)',
    border: '1px solid #c62828',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 14,
    color: '#ef9a9a',
    marginBottom: 16,
    fontWeight: 600,
  },
  levelInfo: {
    fontSize: 14,
    color: '#90a4ae',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },
  breakdownSection: {
    textAlign: 'left',
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4fc3f7',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  taskRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    background: '#12161f',
    borderRadius: 6,
    fontSize: 13,
  },
  taskName: {
    color: '#b0bec5',
  },
  taskScore: {
    color: '#4caf50',
    fontWeight: 600,
    fontFamily: "'Courier New', monospace",
  },
  noTasks: {
    color: '#555',
    textAlign: 'center',
    padding: 12,
  },
  divider: {
    height: 1,
    background: '#2d3748',
    margin: '14px 0',
  },
  bonusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    padding: '4px 0',
    color: '#90a4ae',
  },
  bonusValue: {
    color: '#4caf50',
    fontWeight: 600,
    fontFamily: "'Courier New', monospace",
  },
  penaltyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    padding: '4px 0',
    color: '#90a4ae',
  },
  penaltyValue: {
    color: '#ef5350',
    fontWeight: 600,
    fontFamily: "'Courier New', monospace",
  },
  multiplierRow: {
    fontSize: 13,
    color: '#f5c518',
    textAlign: 'center',
    padding: '6px 0',
    fontWeight: 600,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e0e0e0',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#4fc3f7',
    fontFamily: "'Courier New', monospace",
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  retryButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid #2d3748',
    background: '#1a202c',
    color: '#90a4ae',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  nextButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    color: '#fff',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  menuButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid #2d3748',
    background: 'transparent',
    color: '#78909c',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #f5c518, #e0a800)',
    color: '#1a202c',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  submittedText: {
    color: '#4caf50',
    fontWeight: 600,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
