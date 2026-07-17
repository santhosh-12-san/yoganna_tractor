import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, ShieldAlert, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';

const Maintenance = () => {
  const { t } = useLanguage();
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    last_done: new Date().toISOString().split('T')[0],
    next_due: '',
    status: 'Valid'
  });

  const fetchMaintenance = async () => {
    try {
      const response = await axios.get('/api/maintenance/');
      setMaintenanceItems(response.data);
    } catch (err) {
      console.error("Error fetching maintenance:", err);
      setError('Could not load maintenance alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("MAINTENANCE_")) {
      fetchMaintenance();
    }
  }, [lastMessage]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/maintenance/', formData);
      setShowForm(false);
      setFormData({
        item: '',
        last_done: new Date().toISOString().split('T')[0],
        next_due: '',
        status: 'Valid'
      });
      fetchMaintenance();
    } catch (err) {
      console.error("Error creating maintenance log:", err);
      alert("Failed to save maintenance alert.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this maintenance check?")) {
      try {
        await axios.delete(`/api/maintenance/${id}/`);
        fetchMaintenance();
      } catch (err) {
        console.error("Error deleting maintenance log:", err);
        alert("Failed to delete log.");
      }
    }
  };

  return (
    <div>
      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{t('Add Maintenance Alert')}</h3>
            <button onClick={() => setShowForm(false)} className="btn-icon" style={{ color: 'var(--danger)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Item')}</label>
              <input
                type="text"
                name="item"
                className="form-control"
                placeholder="e.g. Engine Oil Change"
                value={formData.item}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Last Done')}</label>
              <input
                type="date"
                name="last_done"
                className="form-control"
                value={formData.last_done}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Next Due')}</label>
              <input
                type="date"
                name="next_due"
                className="form-control"
                value={formData.next_due}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('Status')}</label>
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="Valid">{t('Normal')}</option>
                <option value="Due Soon">{t('Due Soon')}</option>
                <option value="Overdue">{t('Overdue')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              {t('Save Booking')}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <div className="table-controls">
          <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
            <span>{t('Tractor Service Alerts & Expiration Schedules')}</span>
          </h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>{t('Add Maintenance Alert')}</span>
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
                <th>{t('Item')}</th>
                <th>{t('Last Done')}</th>
                <th>{t('Next Due')}</th>
                <th>{t('Status')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: '600' }}>{item.item}</td>
                  <td>{new Date(item.last_done).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>{new Date(item.next_due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge ${item.status.toLowerCase().replace(" ", "-")}`}>
                      {t(item.status)}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="btn-icon delete"
                      title="Remove Alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {maintenanceItems.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('No maintenance items scheduled.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Maintenance;
