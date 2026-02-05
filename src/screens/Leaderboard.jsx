import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

export default function Leaderboard() {
  const { setScreen } = useGame();
  const { t } = useLang();

  const [activeTab, setActiveTab] = useState('local');
  const [localScores, setLocalScores] = useState([]);
  const [lanScores, setLanScores] = useState([]);
  const [lanServerUrl, setLanServerUrl] = useState('http://localhost:3000');
  const [lanConnected, setLanConnected] = useState(false);
  const [lanLoading, setLanLoading] = useState(false);
  const [lanError, setLanError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load local scores on mount
  useEffect(() => {
    loadLocalScores();
  }, []);

  const loadLocalScores = async () => {
    setLoading(true);
    try {
      let scores = null;
      if (window.electronAPI) {
        scores = await window.electronAPI.loadScores();
      }
      if (!scores) {
        // Fallback to localStorage
        const raw = localStorage.getItem('pms-scores');
        scores = raw ? JSON.parse(raw) : [];
      }
      // Sort by score descending, limit to top 50
      const sorted = (scores || [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
      setLocalScores(sorted);
    } catch (e) {
      console.error('Failed to load local scores:', e);
      setLocalScores([]);
    }
    setLoading(false);
  };

  const loadLanScores = async () => {
    if (!lanServerUrl.trim()) return;
    setLanLoading(true);
    setLanError(null);
    try {
      const url = lanServerUrl.replace(/\/+$/, '');
      const response = await fetch(`${url}/api/scores`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      const sorted = (data.scores || data || [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
      setLanScores(sorted);
      setLanConnected(true);
    } catch (e) {
      console.error('Failed to load LAN scores:', e);
      setLanError(e.message || 'Connection failed');
      setLanConnected(false);
      setLanScores([]);
    }
    setLanLoading(false);
  };

  const handleRefresh = () => {
    if (activeTab === 'local') {
      loadLocalScores();
    } else {
      loadLanScores();
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr || '--';
    }
  };

  const scores = activeTab === 'local' ? localScores : lanScores;
  const isLoading = activeTab === 'local' ? loading : lanLoading;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('leaderboard')}</h1>

        {/* Tab toggle */}
        <div style={styles.tabRow}>
          <button
            onClick={() => setActiveTab('local')}
            style={{
              ...styles.tab,
              ...(activeTab === 'local' ? styles.tabActive : {}),
            }}
          >
            {t('localScores')}
          </button>
          <button
            onClick={() => setActiveTab('lan')}
            style={{
              ...styles.tab,
              ...(activeTab === 'lan' ? styles.tabActive : {}),
            }}
          >
            {t('lanScores')}
          </button>
        </div>

        {/* LAN connection section */}
        {activeTab === 'lan' && (
          <div style={styles.lanSection}>
            <label style={styles.lanLabel}>{t('lanServerUrl')}</label>
            <div style={styles.lanInputRow}>
              <input
                type="text"
                value={lanServerUrl}
                onChange={(e) => setLanServerUrl(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                style={styles.lanInput}
              />
              <button
                onClick={loadLanScores}
                disabled={lanLoading}
                style={{
                  ...styles.connectButton,
                  ...(lanLoading ? styles.buttonDisabled : {}),
                }}
              >
                {lanLoading ? '...' : t('connect')}
              </button>
            </div>
            {lanError && <div style={styles.lanError}>{lanError}</div>}
            {lanConnected && !lanError && (
              <div style={styles.lanConnected}>Connected</div>
            )}
          </div>
        )}

        {/* Score table */}
        <div style={styles.tableContainer}>
          {isLoading ? (
            <div style={styles.loadingText}>Loading...</div>
          ) : scores.length === 0 ? (
            <div style={styles.noScores}>{t('noScores')}</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('rank')}</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>{t('player')}</th>
                  <th style={styles.th}>{t('level')}</th>
                  <th style={styles.th}>{t('score')}</th>
                  <th style={styles.th}>{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, i) => (
                  <tr
                    key={i}
                    style={{
                      ...styles.tr,
                      ...(i < 3 ? styles.topThree : {}),
                    }}
                  >
                    <td style={styles.tdRank}>
                      <span
                        style={{
                          ...styles.rankBadge,
                          ...(i === 0
                            ? styles.gold
                            : i === 1
                            ? styles.silver
                            : i === 2
                            ? styles.bronze
                            : {}),
                        }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td style={styles.tdName}>{entry.player}</td>
                    <td style={styles.tdCenter}>{entry.level}</td>
                    <td style={styles.tdScore}>{entry.score}</td>
                    <td style={styles.tdDate}>{formatDate(entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom buttons */}
        <div style={styles.buttonRow}>
          <button onClick={handleRefresh} style={styles.refreshButton}>
            {t('refresh')}
          </button>
          <button onClick={() => setScreen('menu')} style={styles.backButton}>
            {t('backToMenu')}
          </button>
        </div>
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
    padding: '32px 36px',
    maxWidth: 680,
    width: '100%',
    border: '1px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#4fc3f7',
    margin: '0 0 20px 0',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  tabRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: '#12161f',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#78909c',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: '#2d3748',
    color: '#4fc3f7',
  },
  lanSection: {
    marginBottom: 20,
    padding: '14px 16px',
    background: '#12161f',
    borderRadius: 8,
  },
  lanLabel: {
    fontSize: 12,
    color: '#90a4ae',
    textTransform: 'uppercase',
    letterSpacing: 1,
    display: 'block',
    marginBottom: 8,
  },
  lanInputRow: {
    display: 'flex',
    gap: 8,
  },
  lanInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #2d3748',
    background: '#1a202c',
    color: '#e0e0e0',
    outline: 'none',
    fontFamily: 'inherit',
  },
  connectButton: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 6,
    border: 'none',
    background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
    color: '#fff',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  lanError: {
    color: '#ef5350',
    fontSize: 12,
    marginTop: 8,
    fontWeight: 600,
  },
  lanConnected: {
    color: '#4caf50',
    fontSize: 12,
    marginTop: 8,
    fontWeight: 600,
  },
  tableContainer: {
    maxHeight: 420,
    overflowY: 'auto',
    marginBottom: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#78909c',
    padding: 32,
    fontSize: 14,
  },
  noScores: {
    textAlign: 'center',
    color: '#555',
    padding: 32,
    fontSize: 14,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#90a4ae',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '2px solid #2d3748',
    textAlign: 'center',
  },
  tr: {
    borderBottom: '1px solid #1e2a3a',
    transition: 'background 0.15s ease',
  },
  topThree: {
    background: 'rgba(79, 195, 247, 0.04)',
  },
  tdRank: {
    padding: '10px 12px',
    textAlign: 'center',
  },
  rankBadge: {
    display: 'inline-block',
    width: 28,
    height: 28,
    lineHeight: '28px',
    borderRadius: '50%',
    fontSize: 12,
    fontWeight: 700,
    background: '#2d3748',
    color: '#90a4ae',
    textAlign: 'center',
  },
  gold: {
    background: 'linear-gradient(135deg, #f5c518, #e0a800)',
    color: '#1a202c',
  },
  silver: {
    background: 'linear-gradient(135deg, #b0bec5, #90a4ae)',
    color: '#1a202c',
  },
  bronze: {
    background: 'linear-gradient(135deg, #cd7f32, #a0522d)',
    color: '#fff',
  },
  tdName: {
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0e0',
    textAlign: 'left',
  },
  tdCenter: {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: 14,
    color: '#b0bec5',
  },
  tdScore: {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#4fc3f7',
    fontFamily: "'Courier New', monospace",
  },
  tdDate: {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: 12,
    color: '#78909c',
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  refreshButton: {
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
  backButton: {
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
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
