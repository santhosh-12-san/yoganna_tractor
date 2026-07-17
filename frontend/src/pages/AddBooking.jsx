import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const AddBooking = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    customer: '',
    date: new Date().toISOString().split('T')[0],
    work_type: 'Ploughing',
    acres_hours: '',
    rate_per_unit: '',
    driver: '',
    advance: '0.00',
    status: 'Pending',
    notes: '',
    latitude: '',
    longitude: ''
  });

  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const role = localStorage.getItem('user_role');
  const isOwner = role === 'OWNER';

  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [loadingBooking, setLoadingBooking] = useState(isEdit);
  const [map, setMap] = useState(null);

  useEffect(() => {
    // If Owner, fetch customers and drivers lists for dropdowns
    if (isOwner) {
      const fetchData = async () => {
        try {
          const [custRes, drvRes] = await Promise.all([
            axios.get('/api/customers/'),
            axios.get('/api/drivers/')
          ]);
          setCustomers(custRes.data);
          setDrivers(drvRes.data);
        } catch (err) {
          console.error("Error loading dropdown data:", err);
          setError("Failed to load customers or drivers details.");
        }
      };
      fetchData();
    }
  }, [isOwner]);

  useEffect(() => {
    if (isEdit) {
      const fetchBooking = async () => {
        try {
          const response = await axios.get(`/api/bookings/${id}/`);
          const b = response.data;
          setFormData({
            customer: b.customer,
            date: b.date,
            work_type: b.work_type,
            acres_hours: b.acres_hours,
            rate_per_unit: b.rate_per_unit,
            driver: b.driver || '',
            advance: b.advance,
            status: b.status,
            notes: b.notes || '',
            latitude: b.latitude || '',
            longitude: b.longitude || ''
          });
        } catch (err) {
          console.error("Error fetching booking detail:", err);
          setError("Could not load booking details.");
        } finally {
          setLoadingBooking(false);
        }
      };
      fetchBooking();
    } else {
      setLoadingBooking(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (loadingBooking) return;
    
    const container = document.getElementById('field-map');
    if (!container || container._leaflet_id) return;

    const L = window.L;
    if (!L) {
      console.warn("Leaflet library not available on window object.");
      return;
    }

    const initialLat = parseFloat(formData.latitude) || 13.3379;
    const initialLng = parseFloat(formData.longitude) || 77.1173;
    
    const mapInstance = L.map('field-map').setView([initialLat, initialLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
    
    let markerInstance;
    if (formData.latitude && formData.longitude) {
      markerInstance = L.marker([initialLat, initialLng]).addTo(mapInstance);
    }
    
    mapRef.current = mapInstance;
    markerRef.current = markerInstance;

    mapInstance.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setFormData(prev => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6)
      }));
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng).addTo(mapInstance);
      }
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [loadingBooking]);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const lat = parseFloat(latitude.toFixed(6));
        const lng = parseFloat(longitude.toFixed(6));
        
        setFormData(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString()
        }));
        
        const map = mapRef.current;
        const L = window.L;
        
        if (map && L) {
          map.setView([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          }
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to access your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateTotal = () => {
    const acres = parseFloat(formData.acres_hours) || 0;
    const rate = parseFloat(formData.rate_per_unit) || 0;
    return acres * rate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prepare payload
    const payload = { ...formData };
    
    // For customers, clean administrative fields
    if (!isOwner) {
      delete payload.driver;
      delete payload.rate_per_unit;
      delete payload.advance;
      delete payload.status;
      // We set client default rate to 0 or it will be assigned by owner later
      payload.rate_per_unit = "0.00";
      payload.advance = "0.00";
      payload.status = "Pending";
      payload.customer = null;
    }

    if (payload.driver === '') {
      payload.driver = null;
    }

    if (!navigator.onLine) {
      try {
        const { saveOfflineBooking } = await import('../utils/offlineDb');
        await saveOfflineBooking(payload);
        alert("Saved offline! Your request has been queued locally and will sync automatically when you go online.");
        navigate('/bookings');
      } catch (err) {
        console.error("IndexedDB error:", err);
        setError("Device is offline, and failed to save request locally.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (isEdit) {
        await axios.put(`/api/bookings/${id}/`, payload);
      } else {
        await axios.post('/api/bookings/', payload);
      }
      navigate('/bookings');
    } catch (err) {
      console.error("Error saving booking:", err);
      setError(Object.values(err.response?.data || {}).join(' ') || "Could not process booking request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--primary)' }}>
        {isEdit ? t('Modify Tractor Booking') : (isOwner ? t('New Booking') : t('Submit Request'))}
      </h2>

      {error && (
        <div style={{
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          fontSize: '0.875rem',
          marginBottom: '20px',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isOwner && (
          <div className="form-group">
            <label htmlFor="customer">{t('Customer')}</label>
            <select
              id="customer"
              name="customer"
              className="form-control"
              value={formData.customer}
              onChange={handleInputChange}
              required
            >
              <option value="">-- {t('Customer')} --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.village})</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date">{t('Date')}</label>
          <input
            type="date"
            id="date"
            name="date"
            className="form-control"
            value={formData.date}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="work_type">{t('Work Type')}</label>
          <select
            id="work_type"
            name="work_type"
            className="form-control"
            value={formData.work_type}
            onChange={handleInputChange}
            required
          >
            <option value="Ploughing">{t('Ploughing')}</option>
            <option value="Rotavator">{t('Rotavator')}</option>
            <option value="Transport">{t('Transport')}</option>
            <option value="Seed Sowing">{t('Seed Sowing')}</option>
            <option value="Others">{t('Others')}</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="acres_hours">{t('Acres/Hours')}</label>
          <input
            type="number"
            step="0.01"
            id="acres_hours"
            name="acres_hours"
            className="form-control"
            placeholder="Enter quantity"
            value={formData.acres_hours}
            onChange={handleInputChange}
            required
          />
        </div>

        {isOwner && (
          <>
            <div className="form-group">
              <label htmlFor="rate_per_unit">{t('Rate per Unit (₹)')}</label>
              <input
                type="number"
                step="0.01"
                id="rate_per_unit"
                name="rate_per_unit"
                className="form-control"
                placeholder="Rate per unit"
                value={formData.rate_per_unit}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="driver">{t('Driver')}</label>
              <select
                id="driver"
                name="driver"
                className="form-control"
                value={formData.driver}
                onChange={handleInputChange}
              >
                <option value="">-- {t('Unassigned')} --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.village})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="advance">{t('Advance Payment Received (₹)')}</label>
              <input
                type="number"
                step="0.01"
                id="advance"
                name="advance"
                className="form-control"
                value={formData.advance}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>{t('Total Amount')}</label>
              <input
                type="text"
                className="form-control"
                value={`₹ ${calculateTotal().toLocaleString('en-IN')}`}
                disabled
                style={{ background: '#f5f5f5', fontWeight: 'bold', color: 'var(--primary)' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">{t('Status')}</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="Pending">{t('Pending')}</option>
                <option value="In Progress">{t('In Progress')}</option>
                <option value="Completed">{t('Completed')}</option>
                <option value="Cancelled">{t('Cancelled')}</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>{t('Field Location')}</label>
          <div id="field-map" style={{ height: '320px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '12px', zIndex: 1 }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span><strong>{t('Latitude')}:</strong> {formData.latitude || 'Not selected'}</span>
              <span><strong>{t('Longitude')}:</strong> {formData.longitude || 'Not selected'}</span>
            </div>
            <button 
              type="button" 
              onClick={handleLocateUser} 
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📍 {t('Use My Location')}</span>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">{t('Notes / Special Instructions')}</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            className="form-control"
            placeholder={t('Add any specific details here...')}
            value={formData.notes}
            onChange={handleInputChange}
          ></textarea>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/bookings')}
            disabled={loading}
          >
            {t('Cancel')}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Submitting...' : (isOwner ? t('Save Booking') : t('Submit Request'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBooking;
