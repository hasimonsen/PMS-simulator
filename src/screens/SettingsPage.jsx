import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { useSettings, DEFAULT_SETTINGS } from '../context/SettingsContext';

// ---- Setting definitions organized by category ----
const SIMULATION_SETTINGS = [
  { key: 'nominalVoltage', i18n: 'nominalVoltage', type: 'number', step: 1 },
  { key: 'nominalFrequency', i18n: 'nominalFrequency', type: 'number', step: 0.1 },
  { key: 'generatorPoles', i18n: 'generatorPoles', type: 'number', step: 2 },
  { key: 'dg1Capacity', i18n: 'dgCapacity', label: 'DG1', type: 'number', step: 10 },
  { key: 'dg2Capacity', i18n: 'dgCapacity', label: 'DG2', type: 'number', step: 10 },
  { key: 'dg3Capacity', i18n: 'dgCapacity', label: 'DG3', type: 'number', step: 10 },
  { key: 'sgCapacity', i18n: 'sgCapacity', type: 'number', step: 10 },
  { key: 'emgCapacity', i18n: 'emgCapacity', type: 'number', step: 10 },
  { key: 'defaultDroop', i18n: 'defaultDroop', type: 'number', step: 0.5, min: 0, max: 10 },
  { key: 'governorTimeConstant', i18n: 'governorTimeConst', type: 'number', step: 0.1, min: 0.1 },
  { key: 'avrTimeConstant', i18n: 'avrTimeConst', type: 'number', step: 0.1, min: 0.1 },
  { key: 'preLubeTime', i18n: 'preLubeTime', type: 'number', step: 1, min: 0 },
  { key: 'crankingTime', i18n: 'crankingTime', type: 'number', step: 1, min: 0 },
  { key: 'coolDownTime', i18n: 'coolDownTime', type: 'number', step: 1, min: 0 },
];

const PROTECTION_SETTINGS = [
  { key: 'syncVoltageTolerance', i18n: 'syncVoltageTol', type: 'number', step: 1, min: 1 },
  { key: 'syncFreqTolerance', i18n: 'syncFreqTol', type: 'number', step: 0.05, min: 0.05 },
  { key: 'syncPhaseTolerance', i18n: 'syncPhaseTol', type: 'number', step: 1, min: 1 },
  { key: 'underFreqTrip', i18n: 'underFreqTrip', type: 'number', step: 0.5 },
  { key: 'overFreqTrip', i18n: 'overFreqTrip', type: 'number', step: 0.5 },
  { key: 'underVoltTrip', i18n: 'underVoltTrip', type: 'number', step: 5 },
  { key: 'overVoltTrip', i18n: 'overVoltTrip', type: 'number', step: 5 },
  { key: 'reversePowerTrip', i18n: 'reversePowerTrip', type: 'number', step: 1 },
  { key: 'blackoutDetectDelay', i18n: 'blackoutDetectDelay', type: 'number', step: 0.5, min: 0 },
  { key: 'emgAutoStart', i18n: 'emgAutoStart', type: 'boolean' },
];

const GAME_SETTINGS = [
  { key: 'taskTimeMultiplier', i18n: 'taskTimeMultiplier', type: 'number', step: 0.1, min: 0.1 },
  { key: 'showHints', i18n: 'showHints', type: 'boolean' },
  { key: 'allowSkipLevels', i18n: 'allowSkipLevels', type: 'boolean' },
];

const TABS = [
  { id: 'simulation', i18n: 'simulation' },
  { id: 'protection', i18n: 'protection' },
  { id: 'game', i18n: 'game' },
  { id: 'admin', i18n: 'admin' },
];

export default function SettingsPage() {
  const { setScreen } = useGame();
  const { t } = useLang();
  const { settings, saveSettings, resetToDefaults, checkPassword, setPassword } = useSettings();

  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Settings edit state (clone of current settings for editing)
  const [editSettings, setEditSettings] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('simulation');

  // Admin: change password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // ---- Auth ----
  const handleUnlock = () => {
    if (checkPassword(passwordInput)) {
      setAuthenticated(true);
      setPasswordError(false);
      setEditSettings({ ...settings });
    } else {
      setPasswordError(true);
    }
  };

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock();
  };

  // ---- Settings editing ----
  const handleSettingChange = (key, value, type) => {
    let parsed = value;
    if (type === 'number') {
      parsed = value === '' ? '' : Number(value);
    }
    setEditSettings((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleToggle = (key) => {
    setEditSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    // Convert any empty string numeric fields back to defaults
    const cleaned = { ...editSettings };
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      if (cleaned[key] === '' || cleaned[key] === undefined) {
        cleaned[key] = DEFAULT_SETTINGS[key];
      }
    });
    saveSettings(cleaned);
    setScreen('menu');
  };

  const handleCancel = () => {
    setEditSettings({ ...settings });
    setScreen('menu');
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setEditSettings({ ...DEFAULT_SETTINGS });
  };

  // ---- Admin: change password ----
  const handleChangePassword = () => {
    setPasswordMismatch(false);
    setPasswordChanged(false);

    if (!newPassword || newPassword !== confirmPasswordVal) {
      setPasswordMismatch(true);
      return;
    }
    setPassword(newPassword);
    setNewPassword('');
    setConfirmPasswordVal('');
    setPasswordChanged(true);
  };

  // ---- Renderers ----
  const renderSettingField = (def) => {
    const value = editSettings[def.key];
    const labelText = def.label
      ? `${def.label} - ${t(def.i18n)}`
      : t(def.i18n);

    if (def.type === 'boolean') {
      return (
        <div key={def.key} style={styles.fieldRow}>
          <span style={styles.fieldLabel}>{labelText}</span>
          <button
            onClick={() => handleToggle(def.key)}
            style={{
              ...styles.toggleButton,
              ...(value ? styles.toggleOn : styles.toggleOff),
            }}
          >
            {value ? 'ON' : 'OFF'}
          </button>
        </div>
      );
    }

    return (
      <div key={def.key} style={styles.fieldRow}>
        <label style={styles.fieldLabel} htmlFor={`setting-${def.key}`}>
          {labelText}
        </label>
        <input
          id={`setting-${def.key}`}
          type="number"
          value={value === undefined ? '' : value}
          onChange={(e) => handleSettingChange(def.key, e.target.value, def.type)}
          step={def.step || 1}
          min={def.min}
          max={def.max}
          style={styles.numberInput}
        />
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'simulation':
        return SIMULATION_SETTINGS.map(renderSettingField);
      case 'protection':
        return PROTECTION_SETTINGS.map(renderSettingField);
      case 'game':
        return GAME_SETTINGS.map(renderSettingField);
      case 'admin':
        return renderAdminTab();
      default:
        return null;
    }
  };

  const renderAdminTab = () => (
    <div>
      <h3 style={styles.adminSectionTitle}>{t('changePassword')}</h3>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel} htmlFor="new-password-input">
          {t('newPassword')}
        </label>
        <input
          id="new-password-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={styles.textInput}
        />
      </div>
      <div style={styles.fieldRow}>
        <label style={styles.fieldLabel} htmlFor="confirm-password-input">
          {t('confirmPassword')}
        </label>
        <input
          id="confirm-password-input"
          type="password"
          value={confirmPasswordVal}
          onChange={(e) => setConfirmPasswordVal(e.target.value)}
          style={styles.textInput}
        />
      </div>
      {passwordMismatch && (
        <div style={styles.errorText}>Passwords do not match</div>
      )}
      {passwordChanged && (
        <div style={styles.successText}>Password changed successfully</div>
      )}
      <button onClick={handleChangePassword} style={styles.changePasswordBtn}>
        {t('changePassword')}
      </button>
    </div>
  );

  // ---- Main render ----
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('settingsTitle')}</h1>

        {/* Reset to defaults - always visible */}
        <div style={styles.resetRow}>
          <button onClick={handleResetDefaults} style={styles.resetButton}>
            {t('resetDefaults')}
          </button>
        </div>

        {!authenticated ? (
          /* ---- Password gate ---- */
          <div style={styles.authSection}>
            <label style={styles.authLabel} htmlFor="settings-password-input">
              {t('password')}
            </label>
            <div style={styles.authInputRow}>
              <input
                id="settings-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={handlePasswordKeyDown}
                placeholder={t('enterPassword')}
                style={styles.authInput}
              />
              <button onClick={handleUnlock} style={styles.unlockButton}>
                {t('unlock')}
              </button>
            </div>
            {passwordError && (
              <div style={styles.errorText}>{t('wrongPassword')}</div>
            )}
            <div style={styles.authBackRow}>
              <button onClick={() => setScreen('menu')} style={styles.backButton}>
                {t('backToMenu')}
              </button>
            </div>
          </div>
        ) : (
          /* ---- Settings editor ---- */
          <div>
            {/* Tabs */}
            <div style={styles.tabRow}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.tab,
                    ...(activeTab === tab.id ? styles.tabActive : {}),
                  }}
                >
                  {t(tab.i18n)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={styles.tabContent}>
              {renderTabContent()}
            </div>

            {/* Bottom actions */}
            <div style={styles.actionRow}>
              <button onClick={handleSave} style={styles.saveButton}>
                {t('save')}
              </button>
              <button onClick={handleCancel} style={styles.cancelButton}>
                {t('cancel')}
              </button>
              <button onClick={() => setScreen('menu')} style={styles.backButton}>
                {t('backToMenu')}
              </button>
            </div>
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
    padding: '32px 36px',
    maxWidth: 600,
    width: '100%',
    border: '1px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#4fc3f7',
    margin: '0 0 12px 0',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  resetRow: {
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    padding: '8px 20px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 6,
    border: '1px solid #c62828',
    background: 'transparent',
    color: '#ef5350',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
  },
  // Auth section
  authSection: {
    maxWidth: 360,
    margin: '0 auto',
    textAlign: 'center',
  },
  authLabel: {
    fontSize: 13,
    color: '#90a4ae',
    textTransform: 'uppercase',
    letterSpacing: 1,
    display: 'block',
    marginBottom: 8,
  },
  authInputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  authInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #2d3748',
    background: '#12161f',
    color: '#e0e0e0',
    outline: 'none',
    fontFamily: 'inherit',
  },
  unlockButton: {
    padding: '10px 20px',
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
  authBackRow: {
    marginTop: 20,
  },
  // Tabs
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
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#78909c',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabActive: {
    background: '#2d3748',
    color: '#4fc3f7',
  },
  tabContent: {
    maxHeight: 400,
    overflowY: 'auto',
    marginBottom: 20,
    paddingRight: 4,
  },
  // Fields
  fieldRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #1e2a3a',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#b0bec5',
    flexShrink: 0,
    marginRight: 16,
  },
  numberInput: {
    width: 100,
    padding: '6px 10px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #2d3748',
    background: '#12161f',
    color: '#e0e0e0',
    outline: 'none',
    textAlign: 'right',
    fontFamily: "'Courier New', monospace",
  },
  textInput: {
    width: 180,
    padding: '6px 10px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #2d3748',
    background: '#12161f',
    color: '#e0e0e0',
    outline: 'none',
    fontFamily: 'inherit',
  },
  toggleButton: {
    padding: '6px 18px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'inherit',
    minWidth: 60,
    transition: 'all 0.2s ease',
  },
  toggleOn: {
    background: '#2e7d32',
    color: '#fff',
  },
  toggleOff: {
    background: '#37474f',
    color: '#90a4ae',
  },
  // Admin tab
  adminSectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4fc3f7',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  changePasswordBtn: {
    marginTop: 12,
    padding: '8px 24px',
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
  // Feedback
  errorText: {
    color: '#ef5350',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 4,
    marginBottom: 4,
  },
  successText: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 4,
    marginBottom: 4,
  },
  // Bottom actions
  actionRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  saveButton: {
    padding: '10px 28px',
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
  cancelButton: {
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
};
