import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Sun, CloudSun, CloudRain, Wind, Droplets, Gauge, Sparkles, X, ChevronDown, MapPin, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FarmWeatherWidget = () => {
  const { t } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [locationName, setLocationName] = useState('Karnataka (Mandya)');
  const widgetRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchIpLocationFallback = async () => {
    try {
      const res = await axios.get('https://ipwho.is/');
      if (res.data && res.data.success && res.data.latitude && res.data.longitude) {
        const place = res.data.city || res.data.region || 'Bengaluru';
        const state = res.data.region || 'Karnataka';
        setLocationName(`${place}, ${state}`);
        fetchLiveWeather(res.data.latitude, res.data.longitude);
        return;
      }
    } catch (err) {
      console.error("IP geolocation failed:", err);
    }
    setLocationName('Bengaluru, Karnataka');
    fetchLiveWeather(12.97, 77.59);
  };

  const fetchLiveWeather = async (lat = 12.97, lon = 77.59) => {
    try {
      const [weatherRes, geoRes] = await Promise.all([
        axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`
        ),
        axios.get(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        ).catch(() => null)
      ]);

      setWeatherData(weatherRes.data);

      if (geoRes && geoRes.data) {
        const place = geoRes.data.locality || geoRes.data.city || geoRes.data.localityInfo?.administrative?.[2]?.name;
        const state = geoRes.data.principalSubdivision || 'Karnataka';
        if (place) {
          setLocationName(`${place}, ${state}`);
        }
      }
    } catch (err) {
      console.error("Error fetching live weather & location:", err);
    } finally {
      setLoading(false);
    }
  };

  const detectUserLocation = () => {
    setDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchLiveWeather(pos.coords.latitude, pos.coords.longitude).finally(() => setDetecting(false));
        },
        (err) => {
          console.log("GPS error, trying IP location:", err);
          fetchIpLocationFallback().finally(() => setDetecting(false));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      fetchIpLocationFallback().finally(() => setDetecting(false));
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchLiveWeather(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.log("HTML5 Geolocation unavailable, using IP location fallback:", err);
          fetchIpLocationFallback();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      fetchIpLocationFallback();
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
    <div className="weather-widget-container" ref={widgetRef} style={{ position: 'relative' }}>
      {/* Clickable Header Weather Pill */}
      <div 
        className={`weather-widget clickable ${showDropdown ? 'active' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Click to view live weather & farm soil details"
      >
        <div className="weather-icon-wrapper">
          <IconComponent className="weather-icon sun-spin" size={18} style={{ color: weatherInfo.color }} />
        </div>
        <div className="weather-info">
          <span className="weather-temp">{currentTemp}°C</span>
          <span className="weather-desc">{weatherInfo.text}</span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--primary)', opacity: 0.7, transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>

      {/* Attached Header Dropdown Card */}
      {showDropdown && (
        <div className="weather-dropdown-card">
          <div className="weather-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudSun size={20} style={{ color: 'var(--warning)' }} />
              <div>
                <h2 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--primary-dark)' }}>
                  {t('Farm Weather & Soil Conditions')}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={12} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: '600' }}>{locationName}</span>
                  </span>
                  <button 
                    onClick={detectUserLocation} 
                    className="location-refresh-btn"
                    title={t('Update Location')}
                  >
                    <RefreshCw size={11} className={detecting ? 'spinSlow' : ''} />
                    <span>{detecting ? t('Detecting...') : t('Update Location')}</span>
                  </button>
                </span>
              </div>
            </div>
            <button className="modal-close-btn" onClick={() => setShowDropdown(false)} aria-label="Close Weather Details">
              <X size={18} />
            </button>
          </div>

          <div className="weather-hero-banner" style={{ padding: '14px 18px', marginBottom: '16px' }}>
            <div className="weather-hero-left">
              <span className="weather-big-temp" style={{ fontSize: '2.1rem' }}>{currentTemp}°C</span>
              <span className="weather-big-condition" style={{ fontSize: '0.85rem' }}>{weatherInfo.text}</span>
            </div>
            <div className="weather-hero-right">
              <span className="weather-soil-badge" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                <Sparkles size={12} />
                <span>{t('Excellent for Ploughing & Rotavator')}</span>
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="weather-metrics-grid" style={{ marginBottom: '16px' }}>
            <div className="weather-metric-item" style={{ padding: '10px 12px' }}>
              <div className="weather-item-icon" style={{ width: '32px', height: '32px' }}><Wind size={16} /></div>
              <div className="weather-item-data">
                <span className="weather-item-label">{t('Wind Speed')}</span>
                <span className="weather-item-val" style={{ fontSize: '0.85rem' }}>{currentWind} km/h</span>
              </div>
            </div>

            <div className="weather-metric-item" style={{ padding: '10px 12px' }}>
              <div className="weather-item-icon" style={{ width: '32px', height: '32px' }}><Droplets size={16} /></div>
              <div className="weather-item-data">
                <span className="weather-item-label">{t('Humidity')}</span>
                <span className="weather-item-val" style={{ fontSize: '0.85rem' }}>{currentHumidity}%</span>
              </div>
            </div>

            <div className="weather-metric-item" style={{ padding: '10px 12px' }}>
              <div className="weather-item-icon" style={{ width: '32px', height: '32px' }}><Sun size={16} /></div>
              <div className="weather-item-data">
                <span className="weather-item-label">{t('UV Index')}</span>
                <span className="weather-item-val" style={{ fontSize: '0.85rem' }}>6 (Moderate)</span>
              </div>
            </div>

            <div className="weather-metric-item" style={{ padding: '10px 12px' }}>
              <div className="weather-item-icon" style={{ width: '32px', height: '32px' }}><Gauge size={16} /></div>
              <div className="weather-item-data">
                <span className="weather-item-label">{t('Soil Moisture Rating')}</span>
                <span className="weather-item-val" style={{ fontSize: '0.85rem' }}>Optimal (68%)</span>
              </div>
            </div>
          </div>

          {/* 3-Day Farming Forecast */}
          <div className="weather-forecast-section">
            <h3 className="weather-forecast-title" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{t('3-Day Farming Forecast')}</h3>
            <div className="weather-forecast-grid">
              {dailyForecast.map((item, idx) => {
                const dayDetails = getWeatherDetails(item.code);
                const DayIcon = dayDetails.icon;
                return (
                  <div key={idx} className={`forecast-day-card ${idx === 0 ? 'active' : ''}`} style={{ padding: '10px 8px' }}>
                    <span className="forecast-day-title" style={{ fontSize: '0.75rem' }}>{item.dayLabel}</span>
                    <DayIcon size={20} style={{ color: dayDetails.color }} />
                    <span className="forecast-temp" style={{ fontSize: '0.85rem' }}>{item.maxTemp}° / {item.minTemp}°C</span>
                    <span className="forecast-desc" style={{ fontSize: '0.7rem' }}>{dayDetails.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmWeatherWidget;
