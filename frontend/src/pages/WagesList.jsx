import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, Plus, Calendar, UserCheck } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const WagesList = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [wages, setWages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  // Dialog / form toggles
  const [showLogForm, setShowLogForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    days_worked: '1.0',
    daily_wage: '',
    allowance: '0.00',
    advance_given: '0.00',
    is_paid: false
  });

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/api/drivers/');
      setDrivers(response.data);
      if (response.data.length > 0) {
        setSelectedDriver(response.data[0].id.toString());
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
      setError('Could not load drivers list.');
    }
  };

  const fetchWages = async () => {
    if (!selectedDriver) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/wages/?driver=${selectedDriver}`);
      setWages(response.data);
    } catch (err) {
      console.error("Error fetching wages:", err);
      setError('Could not retrieve wages data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    fetchWages();
  }, [selectedDriver]);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("WAGE_LOG_")) {
      fetchWages();
    }
  }, [lastMessage]);

  // Set daily wage default in form when selected driver changes
  useEffect(() => {
    if (selectedDriver && drivers.length > 0) {
      const drv = drivers.find(d => d.id.toString() === selectedDriver);
      if (drv) {
        setFormData(prev => ({ ...prev, daily_wage: drv.daily_wage }));
      }
    }
  }, [selectedDriver, drivers]);

  const handleInputChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        driver: parseInt(selectedDriver),
      };
      await axios.post('/api/wages/', payload);
      setShowLogForm(false);
      setFormData(prev => ({
        ...prev,
        days_worked: '1.0',
        allowance: '0.00',
        advance_given: '0.00',
        is_paid: false
      }));
      fetchWages();
    } catch (err) {
      console.error("Error logging wage details:", err);
      alert("Failed to log wages.");
    }
  };

  // Filter wage logs just for the selected driver
  const driverWages = wages.filter(w => w.driver.toString() === selectedDriver);

  // Math calculations for KPI Cards
  const totalDays = driverWages.reduce((sum, w) => sum + parseFloat(w.days_worked || 0), 0);
  const totalWage = driverWages.reduce((sum, w) => sum + (parseFloat(w.days_worked || 0) * parseFloat(w.daily_wage || 0)), 0);
  const totalAllowance = driverWages.reduce((sum, w) => sum + parseFloat(w.allowance || 0), 0);
  const totalAdvances = driverWages.reduce((sum, w) => sum + parseFloat(w.advance_given || 0), 0);
  const totalPaid = driverWages.filter(w => w.is_paid).reduce((sum, w) => sum + parseFloat(w.total_amount || 0), 0);

  // Remaining balance = (total wage + total allowance) - advances - already paid
  const remainingWage = (totalWage + totalAllowance) - totalAdvances - totalPaid;

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
          <label htmlFor="driver-select" style={{ fontWeight: '600' }}>{t('Select Driver')}</label>
          <select
            id="driver-select"
            className="form-control"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
          >
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.village})</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => setShowLogForm(!showLogForm)} 
          className="btn btn-primary" 
          style={{ alignSelf: 'flex-end' }}
        >
          <Plus size={16} />
          <span>{t('Log Work / Advance')}</span>
        </button>
      </div>

      {showLogForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '1.1rem' }}>Log Work Day or Driver Advance</h3>
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
              <label>Days Worked</label>
              <input
                type="number"
                step="0.5"
                name="days_worked"
                className="form-control"
                value={formData.days_worked}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Daily Wage Rate (₹)</label>
              <input
                type="number"
                name="daily_wage"
                className="form-control"
                value={formData.daily_wage}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Allowance (₹)</label>
              <input
                type="number"
                step="0.01"
                name="allowance"
                className="form-control"
                value={formData.allowance}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Advance Given (₹)</label>
              <input
                type="number"
                step="0.01"
                name="advance_given"
                className="form-control"
                value={formData.advance_given}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="is_paid"
                name="is_paid"
                checked={formData.is_paid}
                onChange={handleInputChange}
              />
              <label htmlFor="is_paid" style={{ marginBottom: 0, cursor: 'pointer' }}>{t('Paid Instantly') || 'Paid Instantly'}</label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              {t('Save Booking')}
            </button>
          </form>
        </div>
      )}

      {/* KPI Panel */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Total Days Worked')}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', fontFamily: 'Outfit' }}>{totalDays} days</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Total Wage (+Allowances)')}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--secondary)' }}>{formatCurrency(totalWage + totalAllowance)}</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Advances Taken')}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--warning)' }}>{formatCurrency(totalAdvances)}</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Remaining Balance')}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--danger)' }}>{formatCurrency(remainingWage)}</span>
        </div>
      </div>

      {/* Wages Log Table */}
      <div className="table-container">
        <div className="table-controls">
          <h2 style={{ fontSize: '1.1rem' }}>{t('Wages Tracking & Attendance logs')}</h2>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>{t('Loading bookings...')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Date')}</th>
                <th>{t('Days Worked')}</th>
                <th>{t('Daily Wage Rate')}</th>
                <th>{t('Allowance')}</th>
                <th>{t('Advance Given')}</th>
                <th>{t('Total Earned')}</th>
                <th>{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {driverWages.map((w) => {
                const totalEarned = (parseFloat(w.days_worked) * parseFloat(w.daily_wage)) + parseFloat(w.allowance);
                return (
                  <tr key={w.id}>
                    <td>{new Date(w.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{w.days_worked}</td>
                    <td>₹{parseFloat(w.daily_wage).toLocaleString('en-IN')}</td>
                    <td>₹{parseFloat(w.allowance).toLocaleString('en-IN')}</td>
                    <td>₹{parseFloat(w.advance_given).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalEarned.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${w.is_paid ? 'completed' : 'pending'}`}>
                        {w.is_paid ? t('Completed') : t('Pending')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {driverWages.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('No wage logs recorded for this driver.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WagesList;
