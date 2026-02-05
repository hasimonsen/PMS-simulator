import React from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import StatusBar from '../components/StatusBar';
import HUD from '../components/HUD';
import PMSSimulator from '../simulator/PMSSimulator';

export default function GameScreen() {
  const { isPaused, resumeGame, quitGame, alerts, taskBriefingOpen, dismissBriefing, taskProgress } = useGame();
  const { t } = useLang();
  const briefingTask = taskProgress?.currentTask;

  return (
    <div className="game-screen" style={styles.container}>
      {/* Top status bar */}
      <StatusBar />

      {/* Main simulator area */}
      <div style={styles.simulatorArea}>
        <PMSSimulator />
      </div>

      {/* HUD overlay (task info, hints, pause button) */}
      <HUD />

      {/* Alert toasts – bottom right */}
      <div style={styles.alertContainer}>
        {alerts && alerts.map((alert, i) => (
          <div
            key={alert.timestamp + '-' + i}
            style={{
              ...styles.alertToast,
              ...(alert.type === 'error'
                ? styles.alertError
                : alert.type === 'warning'
                ? styles.alertWarning
                : alert.type === 'success'
                ? styles.alertSuccess
                : styles.alertInfo),
            }}
          >
            {alert.message}
          </div>
        ))}
      </div>

      {/* Task briefing overlay */}
      {taskBriefingOpen && briefingTask && (
        <div style={styles.pauseOverlay}>
          <div style={styles.briefingModal}>
            <h2 style={styles.briefingTitle}>{t(briefingTask.nameKey)}</h2>
            <p style={styles.briefingDesc}>{t(briefingTask.descKey)}</p>
            <button onClick={dismissBriefing} style={styles.briefingBtn}>
              START
            </button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && (
        <div style={styles.pauseOverlay}>
          <div style={styles.pauseModal}>
            <h2 style={styles.pauseTitle}>{t('pause')}</h2>
            <div style={styles.pauseButtons}>
              <button onClick={resumeGame} style={styles.resumeButton}>
                {t('resume')}
              </button>
              <button onClick={quitGame} style={styles.quitButton}>
                {t('quit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0e17',
    color: '#e0e0e0',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  simulatorArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  alertContainer: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
    pointerEvents: 'none',
    maxWidth: 360,
  },
  alertToast: {
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease-out',
    pointerEvents: 'auto',
  },
  alertError: {
    background: 'rgba(198, 40, 40, 0.95)',
    color: '#fff',
    border: '1px solid #e53935',
  },
  alertWarning: {
    background: 'rgba(230, 126, 34, 0.95)',
    color: '#fff',
    border: '1px solid #f39c12',
  },
  alertSuccess: {
    background: 'rgba(46, 125, 50, 0.95)',
    color: '#fff',
    border: '1px solid #43a047',
  },
  alertInfo: {
    background: 'rgba(21, 101, 192, 0.95)',
    color: '#fff',
    border: '1px solid #1976d2',
  },
  pauseOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  pauseModal: {
    background: '#1a202c',
    borderRadius: 16,
    padding: '40px 48px',
    textAlign: 'center',
    border: '1px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  pauseTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#4fc3f7',
    margin: '0 0 28px 0',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  pauseButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
  },
  resumeButton: {
    padding: '12px 32px',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    color: '#fff',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  quitButton: {
    padding: '12px 32px',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid #c62828',
    background: 'transparent',
    color: '#ef5350',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  briefingModal: {
    background: '#131920',
    borderRadius: 16,
    padding: '48px 56px',
    textAlign: 'center',
    border: '1px solid rgba(0, 255, 136, 0.25)',
    boxShadow: '0 8px 48px rgba(0,0,0,0.7), 0 0 30px rgba(0,255,136,0.08)',
    maxWidth: 520,
    width: '90%',
  },
  briefingTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#00ff88',
    margin: '0 0 20px 0',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: "'Courier New', monospace",
  },
  briefingDesc: {
    fontSize: 18,
    color: '#c8d6e5',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  briefingBtn: {
    padding: '16px 56px',
    fontSize: 20,
    fontWeight: 700,
    borderRadius: 8,
    border: '2px solid #00ff88',
    background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: "'Courier New', monospace",
    transition: 'all 0.2s',
  },
};
