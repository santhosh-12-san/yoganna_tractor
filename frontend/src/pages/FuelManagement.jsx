import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, Fuel, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';

const FuelManagement = () => {
  const { t } = useLanguage();
  const [fuelLogs, setFuelLogs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driver: '',
    litres: '',
    price_per_litre: '90.00',
    meter_reading: ''
  });

  const fetchFuelLogs = async () => {
    try {
      const response = await axios.get('/api/fuel/');
      setFuelLogs(response.data);
    } catch (err) {
      console.error("Error fetching fuel logs:", err);
      setError('Could not load fuel logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/api/drivers/');
      setDrivers(response.data);
    } catch (err) {
      console.error("Error fetching drivers for fuel logs:", err);
    }
  };

  useEffect(() => {
    fetchFuelLogs();
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("FUEL_LOG_")) {
      fetchFuelLogs();
    }
  }, [lastMessage]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        driver: formData.driver ? parseInt(formData.driver) : null
      };
      await axios.post('/api/fuel/', payload);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        driver: '',
        litres: '',
        price_per_litre: '90.00',
        meter_reading: ''
      });
      fetchFuelLogs();
    } catch (err) {
      console.error("Error logging fuel:", err);
      alert("Failed to log fuel entry.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fuel log?")) {
      try {
        await axios.delete(`/api/fuel/${id}/`);
        fetchFuelLogs();
      } catch (err) {
        console.error("Error deleting fuel log:", err);
        alert("Failed to delete fuel log.");
      }
    }
  };

  const filteredLogs = fuelLogs.filter(log => 
    log.driver_name?.toLowerCase().includes(search.toLowerCase()) || 
    log.date.includes(search)
  );

  return (
    <div>
      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>Log Tractor Fuel Refill</h3>
            <button onClick={() => setShowForm(false)} className="btn-icon" style={{ color: 'var(--danger)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input
                type="date"
                name="date"
                className="form-control"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Driver</label>
              <select
                name="driver"
                className="form-control"
                value={formData.driver}
                onChange={handleInputChange}
                required
              >
                <option value="">-- Choose Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Litres</label>
              <input
                type="number"
                step="0.01"
                name="litres"
                className="form-control"
                placeholder="Fuel Litres"
                value={formData.litres}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Price/Litre (₹)</label>
              <input
                type="number"
                step="0.01"
                name="price_per_litre"
                className="form-control"
                value={formData.price_per_litre}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Meter Reading</label>
              <input
                type="number"
                name="meter_reading"
                className="form-control"
                placeholder="Hour/KM meter"
                value={formData.meter_reading}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              {t('Save Booking')}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <div className="table-controls">
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              type="text"
              className="search-input"
              placeholder={t('Search bookings...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>{t('Log Fuel')}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>{t('Loading bookings...')}</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Date')}</th>
                <th>{t('Driver')}</th>
                <th>{t('Litres')}</th>
                <th>{t('Price/Ltr')}</th>
                <th>{t('Total Amount')}</th>
                <th>{t('Meter Reading')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontWeight: '600' }}>{log.driver_name || 'Owner'}</td>
                  <td>{log.litres} L</td>
                  <td>₹{parseFloat(log.price_per_litre).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{parseFloat(log.total_amount).toLocaleString('en-IN')}</td>
                  <td>{log.meter_reading}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(log.id)} 
                      className="btn-icon delete"
                      title="Delete Log"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('No fuel entries found.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FuelManagement;
