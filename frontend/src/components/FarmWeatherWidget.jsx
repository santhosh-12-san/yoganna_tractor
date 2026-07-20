import React from 'react';
import { Sun, CloudSun, CloudRain } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FarmWeatherWidget = () => {
  const { t } = useLanguage();

  return (
    <div className="weather-widget">
      <div className="weather-icon-wrapper">
        <Sun className="weather-icon sun-spin" size={18} />
      </div>
      <div className="weather-info">
        <span className="weather-temp">29°C</span>
        <span className="weather-desc">{t('Ideal Field Work Weather') || 'Ideal Field Work Weather'}</span>
      </div>
    </div>
  );
};

export default FarmWeatherWidget;
