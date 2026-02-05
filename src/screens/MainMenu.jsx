import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { useSettings } from '../context/SettingsContext';
import LanguageToggle from '../components/LanguageToggle';

const LEVELS = [
  { id: 1, key: 'level.1', difficulty: 'student' },
  { id: 2, key: 'level.2', difficulty: 'student' },
  { id: 3, key: 'level.3', difficulty: 'student' },
  { id: '4a', key: 'level.4a', difficulty: 'apprentice' },
  { id: '4b', key: 'level.4b', difficulty: 'apprentice' },
  { id: 5, key: 'level.5', difficulty: 'apprentice' },
  { id: 6, key: 'level.6', difficulty: 'apprentice' },
  { id: 7, key: 'level.7', difficulty: 'apprentice' },
  { id: 8, key: 'level.8', difficulty: 'apprentice' },
  { id: 9, key: 'level.9', difficulty: 'eto' },
  { id: 10, key: 'level.10', difficulty: 'eto' },
  { id: 11, key: 'level.11', difficulty: 'eto' },
  { id: 12, key: 'level.12', difficulty: 'eto' },
  { id: 13, key: 'level.13', difficulty: 'eto' },
];

const DIFFICULTY_COLORS = {
  student: { bg: '#1b3a2a', border: '#4caf50', text: '#66bb6a' },
  apprentice: { bg: '#3a351b', border: '#ff9800', text: '#ffb74d' },
  eto: { bg: '#3a1b1b', border: '#f44336', text: '#ef5350' },
};

function DifficultyBadge({ difficulty, t }) {
  const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.student;
  return (
    <div style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 1,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
    }}>
      {t(`difficulty.${difficulty}`)}
    </div>
  );
}

export default function MainMenu() {
  const { playerName, setPlayerName, unlockedLevels, startGame, setScreen } = useGame();
  const { t } = useLang();
  const { settings } = useSettings();
  const [selectedLevel, setSelectedLevel] = useState(null);

  const isLevelUnlocked = (levelId) => {
    if (settings.allowSkipLevels) return true;
    return unlockedLevels.includes(levelId);
  };

  const handleLevelSelect = (levelId) => {
    if (!isLevelUnlocked(levelId)) return;
    setSelectedLevel(levelId);
  };

  const handleStart = () => {
    if (!playerName.trim() || selectedLevel === null) return;
    startGame(selectedLevel);
  };

  return (
    <div className="main-menu" style={styles.container}>
      <div style={styles.languageCorner}>
        <LanguageToggle />
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>{t('appTitle')}</h1>
        <p style={styles.subtitle}>{t('appSubtitle')}</p>
      </div>

      <div style={styles.nameSection}>
        <label style={styles.nameLabel} htmlFor="player-name-input">
          {t('playerName')}
        </label>
        <input
          id="player-name-input"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder={t('enterName')}
          style={styles.nameInput}
          maxLength={24}
        />
      </div>

      <div style={styles.levelSectionHeader}>
        <h2 style={styles.levelTitle}>{t('selectLevel')}</h2>
      </div>

      <div style={styles.levelGrid}>
        {LEVELS.map((level) => {
          const unlocked = isLevelUnlocked(level.id);
          const selected = selectedLevel === level.id;

          return (
            <button
              key={level.id}
              onClick={() => handleLevelSelect(level.id)}
              disabled={!unlocked}
              style={{
                ...styles.levelCard,
                ...(unlocked ? styles.levelCardUnlocked : styles.levelCardLocked),
                ...(selected ? styles.levelCardSelected : {}),
              }}
            >
              <div style={styles.levelNumber}>
                {t('level')} {level.id}
              </div>
              <div style={styles.levelName}>
                {t(`${level.key}.name`)}
              </div>
              <DifficultyBadge difficulty={level.difficulty} t={t} />
              {!unlocked && (
                <div style={styles.lockedOverlay}>
                  <span style={styles.lockedText}>{t('locked')}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={styles.buttonRow}>
        <button
          onClick={handleStart}
          disabled={!playerName.trim() || selectedLevel === null}
          style={{
            ...styles.primaryButton,
            ...(!playerName.trim() || selectedLevel === null ? styles.buttonDisabled : {}),
          }}
        >
          {t('startGame')}
        </button>
        <button
          onClick={() => setScreen('leaderboard')}
          style={styles.secondaryButton}
        >
          {t('leaderboard')}
        </button>
        <button
          onClick={() => setScreen('settings')}
          style={styles.secondaryButton}
        >
          {t('settings')}
        </button>
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
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative',
  },
  languageCorner: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: 700,
    color: '#4fc3f7',
    margin: 0,
    letterSpacing: 2,
    textShadow: '0 0 20px rgba(79, 195, 247, 0.3)',
  },
  subtitle: {
    fontSize: 16,
    color: '#90a4ae',
    margin: '8px 0 0 0',
    letterSpacing: 1,
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
    maxWidth: 360,
  },
  nameLabel: {
    fontSize: 14,
    color: '#90a4ae',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameInput: {
    width: '100%',
    padding: '10px 16px',
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #2d3748',
    background: '#1a202c',
    color: '#e0e0e0',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  levelSectionHeader: {
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 20,
    color: '#b0bec5',
    fontWeight: 600,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 900,
    marginBottom: 32,
  },
  levelCard: {
    position: 'relative',
    padding: '14px 12px',
    borderRadius: 10,
    border: '2px solid transparent',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontFamily: 'inherit',
  },
  levelCardUnlocked: {
    background: '#1e2a3a',
    borderColor: '#2d3748',
    color: '#e0e0e0',
  },
  levelCardLocked: {
    background: '#12161f',
    borderColor: '#1a1f2e',
    color: '#555',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  levelCardSelected: {
    borderColor: '#4fc3f7',
    background: '#1a2f44',
    boxShadow: '0 0 12px rgba(79, 195, 247, 0.3)',
  },
  levelNumber: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#4fc3f7',
    marginBottom: 4,
  },
  levelName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
  },
  lockedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  lockedText: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#666',
    fontWeight: 700,
    letterSpacing: 1,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
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
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid #2d3748',
    background: '#1a202c',
    color: '#90a4ae',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
