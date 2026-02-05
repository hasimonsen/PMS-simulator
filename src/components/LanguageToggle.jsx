import React from 'react';
import { useLang } from '../context/LangContext';

export default function LanguageToggle() {
  const { lang, toggleLang } = useLang();

  return (
    <button className="language-toggle" onClick={toggleLang} title="Toggle language">
      <span className={lang === 'en' ? 'lang-active' : 'lang-inactive'}>EN</span>
      <span className="lang-separator">/</span>
      <span className={lang === 'no' ? 'lang-active' : 'lang-inactive'}>NO</span>
    </button>
  );
}
