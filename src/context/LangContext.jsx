import React, { createContext, useContext, useState, useCallback } from 'react';
import { t as translate } from '../i18n';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');

  const toggleLang = useCallback(() => {
    setLang(prev => (prev === 'en' ? 'no' : 'en'));
  }, []);

  const t = useCallback((key) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
