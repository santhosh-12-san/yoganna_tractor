import React, { useState } from 'react';
import { Sun, CloudSun, CloudRain, Wind, Droplets, Gauge, Sparkles, X, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FarmWeatherWidget = () => {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Clickable Header Weather Pill */}
      <div 
        className="weather-widget clickable" 
        onClick={() => setShowModal(true)}
        title="Click to view full farming weather & soil details"
        style={{ cursor: 'pointer' }}
      >
        <div className="weather-icon-wrapper">
          <Sun className="weather-icon sun-spin" size={18} />
        </div>
        <div className="weather-info">
          <span className="weather-temp">29°C</span>
          <span className="weather-desc">{t('Ideal Field Work Weather')}</span>
        </div>
        <ChevronRight size={14} style={{ color: 'var(--primary)', opacity: 0.7 }} />
      </div>

      {/* Interactive Weather Details Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card weather-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="weather-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudSun size={24} style={{ color: 'var(--warning)' }} />
                <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-dark)' }}>
                  {t('Farm Weather & Soil Conditions')}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)} aria-label="Close Weather Details">
                <X size={20} />
              </button>
            </div>

            <div className="weather-hero-banner">
              <div className="weather-hero-left">
                <span className="weather-big-temp">29°C</span>
                <span className="weather-big-condition">{t('Sunny & Clear')}</span>
              </div>
              <div className="weather-hero-right">
                <span className="weather-soil-badge">
                  <Sparkles size={14} />
                  <span>{t('Excellent for Ploughing & Rotavator')}</span>
                </span>
              </div>
            </div>

            {/* Farm Weather Metrics Grid */}
            <div className="weather-metrics-grid">
              <div className="weather-metric-item">
                <div className="weather-item-icon"><Wind size={20} /></div>
                <div className="weather-item-data">
                  <span className="weather-item-label">{t('Wind Speed')}</span>
                  <span className="weather-item-val">12 km/h WSW</span>
                </div>
              </div>

              <div className="weather-metric-item">
                <div className="weather-item-icon"><Droplets size={20} /></div>
                <div className="weather-item-data">
                  <span className="weather-item-label">{t('Humidity')}</span>
                  <span className="weather-item-val">62%</span>
                </div>
              </div>

              <div className="weather-metric-item">
                <div className="weather-item-icon"><Sun size={20} /></div>
                <div className="weather-item-data">
                  <span className="weather-item-label">{t('UV Index')}</span>
                  <span className="weather-item-val">6 (Moderate)</span>
                </div>
              </div>

              <div className="weather-metric-item">
                <div className="weather-item-icon"><Gauge size={20} /></div>
                <div className="weather-item-data">
                  <span className="weather-item-label">{t('Soil Moisture Rating')}</span>
                  <span className="weather-item-val">68% (Optimal)</span>
                </div>
              </div>
            </div>

            {/* 3-Day Farming Forecast */}
            <div className="weather-forecast-section">
              <h3 className="weather-forecast-title">{t('3-Day Farming Forecast')}</h3>
              <div className="weather-forecast-grid">
                <div className="forecast-day-card active">
                  <span className="forecast-day-title">{t('Today')}</span>
                  <Sun size={24} style={{ color: '#f9ab00' }} />
                  <span className="forecast-temp">29°C</span>
                  <span className="forecast-desc">{t('Sunny & Clear')}</span>
                </div>

                <div className="forecast-day-card">
                  <span className="forecast-day-title">{t('Tomorrow')}</span>
                  <CloudSun size={24} style={{ color: '#1a73e8' }} />
                  <span className="forecast-temp">27°C</span>
                  <span className="forecast-desc">{t('Scattered Clouds')}</span>
                </div>

                <div className="forecast-day-card">
                  <span className="forecast-day-title">{t('Day After')}</span>
                  <CloudRain size={24} style={{ color: '#34a853' }} />
                  <span className="forecast-temp">26°C</span>
                  <span className="forecast-desc">{t('Light Monsoon Rain')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FarmWeatherWidget;
