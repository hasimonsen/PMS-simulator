import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const DEFAULT_SETTINGS = {
  // Simulation
  nominalVoltage: 440,
  nominalFrequency: 60,
  generatorPoles: 10,
  dg1Capacity: 1000,
  dg2Capacity: 1000,
  dg3Capacity: 1000,
  sgCapacity: 1500,
  emgCapacity: 500,
  defaultDroop: 4,
  governorTimeConstant: 0.8,
  avrTimeConstant: 0.3,
  preLubeTime: 3,
  crankingTime: 2,
  coolDownTime: 30,

  // Protection
  syncVoltageTolerance: 10,
  syncFreqTolerance: 0.2,
  syncPhaseTolerance: 10,
  underFreqTrip: 55,
  overFreqTrip: 65,
  underVoltTrip: 380,
  overVoltTrip: 480,
  reversePowerTrip: -5,
  blackoutDetectDelay: 2,
  emgAutoStart: true,

  // Game
  taskTimeMultiplier: 1.0,
  showHints: true,
  allowSkipLevels: false,

  // Admin
  settingsPasswordHash: null,
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (window.electronAPI) {
          const saved = await window.electronAPI.loadSettings();
          if (saved) {
            setSettings({ ...DEFAULT_SETTINGS, ...saved });
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
      setLoaded(true);
    }
    load();
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(newSettings);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  const resetToDefaults = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (e) {
      console.error('Failed to save defaults:', e);
    }
  }, []);

  const checkPassword = useCallback((password) => {
    if (!settings.settingsPasswordHash) {
      return password === 'admin';
    }
    return simpleHash(password) === settings.settingsPasswordHash;
  }, [settings.settingsPasswordHash]);

  const setPassword = useCallback((newPassword) => {
    const newSettings = {
      ...settings,
      settingsPasswordHash: simpleHash(newPassword),
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      loaded,
      saveSettings,
      resetToDefaults,
      checkPassword,
      setPassword,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
