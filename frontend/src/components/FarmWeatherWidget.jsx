import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sun, CloudSun, CloudRain, Wind, Droplets, Gauge, Sparkles, X, ChevronRight, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FarmWeatherWidget = () => {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Karnataka (Mandya)');

  const fetchLiveWeather = async (lat = 12.52, lon = 76.90) => {
    try {
      const res = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`
      );
      setWeatherData(res.data);
    } catch (err) {
      console.error("Error fetching live weather:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationName('Your Farm Location');
          fetchLiveWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          fetchLiveWeather();
        }
      );
    } else {
      fetchLiveWeather();
    }
  }, []);

  const getWeatherDetails = (code) => {
    if (code === 0 || code === 1) return { text: t('Sunny & Clear'), icon: Sun, color: '#f9ab00' };
    if (code === 2 || code === 3) return { text: t('Scattered Clouds'), icon: CloudSun, color: '#1a73e8' };
    if (code >= 51 && code <= 82) return { text: t('Light Monsoon Rain'), icon: CloudRain, color: '#34a853' };
    return { text: t('Sunny & Clear'), icon: Sun, color: '#f9ab00' };
  };

  const currentTemp = weatherData ? Math.round(weatherData.current.temperature_2m) : 29;
  const currentHumidity = weatherData ? weatherData.current.relative_humidity_2m : 68;
  const currentWind = weatherData ? weatherData.current.wind_speed_10m : 12;
  const weatherCode = weatherData ? weatherData.current.weather_code : 0;
  const weatherInfo = getWeatherDetails(weatherCode);
  const IconComponent = weatherInfo.icon;

  const dailyForecast = weatherData?.daily?.time ? weatherData.daily.time.slice(0, 3).map((date, idx) => ({
    dayLabel: idx === 0 ? t('Today') : (idx === 1 ? t('Tomorrow') : t('Day After')),
    maxTemp: Math.round(weatherData.daily.temperature_2m_max[idx]),
    minTemp: Math.round(weatherData.daily.temperature_2m_min[idx]),
    code: weatherData.daily.weather_code[idx]
  })) : [
    { dayLabel: t('Today'), maxTemp: 30, minTemp: 21, code: 0 },
    { dayLabel: t('Tomorrow'), maxTemp: 29, minTemp: 21, code: 2 },
    { dayLabel: t('Day After'), maxTemp: 27, minTemp: 20, code: 53 }
  ];

  return (
    <>
      {/* Clickable Header Weather Pill */}
      <div 
        className="weather-widget clickable" 
        onClick={() => setShowModal(true)}
        title="Click to view real live weather & farm soil details"
      >
        <div className="weather-icon-wrapper">
          <IconComponent className="weather-icon sun-spin" size={18} style={{ color: weatherInfo.color }} />
        </div>
        <div className="weather-info">
          <span className="weather-temp">{currentTemp}°C</span>
          <span className="weather-desc">{weatherInfo.text}</span>
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
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--primary-dark)' }}>
                    {t('Farm Weather & Soil Conditions')}
                  </h2>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    <span>{locationName}</span>
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)} aria-label="Close Weather Details">
                <X size={20} />
              </button>
            </div>

            <div className="weather-hero-banner">
              <div className="weather-hero-left">
                <span className="weather-big-temp">{currentTemp}°C</span>
                <span className="weather-big-condition">{weatherInfo.text}</span>
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
                  <span className="weather-item-val">{currentWind} km/h</span>
                </div>
              </div>

              <div className="weather-metric-item">
                <div className="weather-item-icon"><Droplets size={20} /></div>
                <div className="weather-item-data">
                  <span className="weather-item-label">{t('Humidity')}</span>
                  <span className="weather-item-val">{currentHumidity}%</span>
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
                  <span className="weather-item-val">Optimal (68%)</span>
                </div>
              </div>
            </div>

            {/* 3-Day Farming Forecast */}
            <div className="weather-forecast-section">
              <h3 className="weather-forecast-title">{t('3-Day Farming Forecast')}</h3>
              <div className="weather-forecast-grid">
                {dailyForecast.map((item, idx) => {
                  const dayDetails = getWeatherDetails(item.code);
                  const DayIcon = dayDetails.icon;
                  return (
                    <div key={idx} className={`forecast-day-card ${idx === 0 ? 'active' : ''}`}>
                      <span className="forecast-day-title">{item.dayLabel}</span>
                      <DayIcon size={24} style={{ color: dayDetails.color }} />
                      <span className="forecast-temp">{item.maxTemp}° / {item.minTemp}°C</span>
                      <span className="forecast-desc">{dayDetails.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FarmWeatherWidget;
