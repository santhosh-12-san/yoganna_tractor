import React, { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key) => {
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      <div key={lang} className="lang-trans-container">
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
