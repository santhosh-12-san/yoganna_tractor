import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AddBooking = () => {
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
    
    let mapInstance;
    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 200);
        return;
      }
      
      const L = window.L;
      const initialLat = parseFloat(formData.latitude) || 13.3379;
      const initialLng = parseFloat(formData.longitude) || 77.1173;
      
      mapInstance = L.map('field-map').setView([initialLat, initialLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);
      
      let markerInstance;
      if (formData.latitude && formData.longitude) {
        markerInstance = L.marker([initialLat, initialLng]).addTo(mapInstance);
      }
      
      mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6)
        }));
        if (markerInstance) {
          markerInstance.setLatLng(e.latlng);
        } else {
          markerInstance = L.marker(e.latlng).addTo(mapInstance);
        }
      });
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [loadingBooking]);

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
        {isEdit ? 'Modify Tractor Booking' : (isOwner ? 'Create Tractor Booking' : 'Request Tractor Service')}
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
            <label htmlFor="customer">Select Customer</label>
            <select
              id="customer"
              name="customer"
              className="form-control"
              value={formData.customer}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.village})</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date">Date</label>
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
          <label htmlFor="work_type">Work Type</label>
          <select
            id="work_type"
            name="work_type"
            className="form-control"
            value={formData.work_type}
            onChange={handleInputChange}
            required
          >
            <option value="Ploughing">Ploughing</option>
            <option value="Rotavator">Rotavator</option>
            <option value="Transport">Transport</option>
            <option value="Seed Sowing">Seed Sowing</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="acres_hours">Acres / Hours</label>
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
              <label htmlFor="rate_per_unit">Rate (₹ per Acre/Hour)</label>
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
              <label htmlFor="driver">Select Driver</label>
              <select
                id="driver"
                name="driver"
                className="form-control"
                value={formData.driver}
                onChange={handleInputChange}
              >
                <option value="">-- No Driver / Unassigned --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.village})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="advance">Advance Amount (Optional)</label>
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
              <label>Total Amount (Auto-Calculated)</label>
              <input
                type="text"
                className="form-control"
                value={`₹ ${calculateTotal().toLocaleString('en-IN')}`}
                disabled
                style={{ background: '#f5f5f5', fontWeight: 'bold', color: 'var(--primary)' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Field Location (Click on the map to pin location)</label>
          <div id="field-map" style={{ height: '320px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '12px', zIndex: 1 }}></div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span><strong>Latitude:</strong> {formData.latitude || 'Not selected'}</span>
            <span><strong>Longitude:</strong> {formData.longitude || 'Not selected'}</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes / Special Instructions</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            className="form-control"
            placeholder="Add any specific details here..."
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
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Submitting...' : (isOwner ? 'Save Booking' : 'Submit Request')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBooking;
