import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, UserCheck, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';

const DriversList = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  // Form State for Add/Edit inline
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    daily_wage: '',
    is_active: true
  });

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/api/drivers/');
      setDrivers(response.data);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      setError('Could not load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("DRIVER_")) {
      fetchDrivers();
    }
  }, [lastMessage]);

  const handleInputChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleEditClick = (drv) => {
    setEditId(drv.id);
    setFormData({
      name: drv.name,
      phone: drv.phone,
      village: drv.village,
      daily_wage: drv.daily_wage,
      is_active: drv.is_active
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({
      name: '',
      phone: '',
      village: '',
      daily_wage: '',
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/api/drivers/${editId}/`, formData);
      } else {
        await axios.post('/api/drivers/', formData);
      }
      handleCancelForm();
      fetchDrivers();
    } catch (err) {
      console.error("Error saving driver:", err);
      alert("Failed to save driver details.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        await axios.delete(`/api/drivers/${id}/`);
        fetchDrivers();
      } catch (err) {
        console.error("Error deleting driver:", err);
        alert("Failed to delete driver.");
      }
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    d.village.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
              {editId ? t('Modify Driver Details') || 'Modify Driver Details' : t('Register New Driver') || 'Register New Driver'}
            </h3>
            <button onClick={handleCancelForm} className="btn-icon" style={{ color: 'var(--danger)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Name')}</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Driver Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Phone')}</label>
              <input
                type="text"
                name="phone"
                className="form-control"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Village')}</label>
              <input
                type="text"
                name="village"
                className="form-control"
                placeholder="Village"
                value={formData.village}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Daily Wage') + ' (₹)'}</label>
              <input
                type="number"
                name="daily_wage"
                className="form-control"
                placeholder="Daily Wage"
                value={formData.daily_wage}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <label htmlFor="is_active" style={{ marginBottom: 0, cursor: 'pointer' }}>{t('Active Status') || 'Active Status'}</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
                {t('Save Booking')}
              </button>
            </div>
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
              placeholder={t('Search drivers...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>{t('Add Driver')}</span>
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
                <th>#</th>
                <th>{t('Name')}</th>
                <th>{t('Phone')}</th>
                <th>{t('Village')}</th>
                <th>{t('Daily Wage')}</th>
                <th>{t('Status')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d, idx) => (
                <tr key={d.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: '600' }}>{d.name}</td>
                  <td>{d.phone}</td>
                  <td>{d.village}</td>
                  <td>₹{parseFloat(d.daily_wage).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge ${d.is_active ? 'completed' : 'cancelled'}`}>
                      {d.is_active ? t('Normal') : t('Cancelled')}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleEditClick(d)} 
                        className="btn-icon"
                        title="Edit Driver"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id)} 
                        className="btn-icon delete"
                        title="Delete Driver"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('No drivers found.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DriversList;
