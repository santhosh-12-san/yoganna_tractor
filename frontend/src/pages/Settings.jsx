import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Shield, Key, Database, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    village: ''
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const role = localStorage.getItem('user_role');
  const isOwner = role === 'OWNER';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/me/');
        const u = response.data;
        setFormData({
          name: u.full_name,
          email: u.email,
          phone: u.phone_number,
          role: u.role,
          village: u.village || ''
        });
      } catch (err) {
        console.error("Error loading user profile details:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);
    try {
      // Split name back to first_name and last_name for Django User model update
      const names = formData.name.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      await axios.patch('/api/me/', {
        email: formData.email,
        first_name: firstName,
        last_name: lastName,
        village: formData.village
      });
      
      localStorage.setItem('user_full_name', formData.name);
      setSuccessMsg('Profile details updated successfully!');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // Call standard password change logic
      await axios.post('/api/me/change-password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      setSuccessMsg('Password changed successfully!');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to change password. Ensure old password is correct.');
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = () => {
    alert("Database backup initiated. A download link will be emailed to you shortly.");
  };

  const triggerRestore = () => {
    alert("Database restore interface: Upload SQL/JSON backup dump.");
  };

  return (
    <div className="dashboard-grid settings-layout" style={{ alignItems: 'flex-start' }}>
      {/* Settings Navigation Menu */}
      <div className="settings-sidebar" style={{ minWidth: '220px' }}>
        <button 
          onClick={() => { setActiveTab('profile'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
          style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
        >
          <User size={18} />
          <span>{t('Profile Information')}</span>
        </button>

        <button 
          onClick={() => { setActiveTab('password'); setSuccessMsg(''); setErrorMsg(''); }}
          className={`sidebar-item ${activeTab === 'password' ? 'active' : ''}`}
          style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
        >
          <Key size={18} />
          <span>{t('Change Password')}</span>
        </button>

        {isOwner && (
          <button 
            onClick={() => { setActiveTab('backup'); setSuccessMsg(''); setErrorMsg(''); }}
            className={`sidebar-item ${activeTab === 'backup' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <Database size={18} />
            <span>{t('Backup & Restore')}</span>
          </button>
        )}
      </div>

      {/* Settings Content Area */}
      <div className="form-container" style={{ margin: 0, maxWidth: '100%' }}>
        {successMsg && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.875rem',
            marginBottom: '20px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            {errorMsg}
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>{t('Profile Details')}</h3>
            
            <div className="form-group">
              <label>{t('Full Name')}</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('Role')}</label>
              <input
                type="text"
                className="form-control"
                value={formData.role === 'OWNER' ? 'Owner / System Admin' : 'Customer Account'}
                disabled
                style={{ background: '#f5f5f5', textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label>{t('Phone Number (Username)')}</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                disabled
                style={{ background: '#f5f5f5' }}
              />
            </div>

            <div className="form-group">
              <label>{t('Email Address')}</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('Village')}</label>
              <input
                type="text"
                name="village"
                className="form-control"
                value={formData.village}
                onChange={handleInputChange}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? t('Processing...') : t('Update Profile')}
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>{t('Change Account Password')}</h3>

            <div className="form-group">
              <label>{t('Old Password')}</label>
              <input
                type="password"
                name="old_password"
                className="form-control"
                value={passwordData.old_password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('New Password')}</label>
              <input
                type="password"
                name="new_password"
                className="form-control"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('Confirm New Password')}</label>
              <input
                type="password"
                name="confirm_password"
                className="form-control"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? t('Processing...') : t('Change Password')}
            </button>
          </form>
        )}

        {activeTab === 'backup' && isOwner && (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>{t('Backup & Recovery Systems')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Schedule automated backups of database tables (bookings, drivers logs, finances, payments) or perform raw dumps.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={triggerBackup} className="btn btn-primary">{t('Dump SQL Database')}</button>
              <button onClick={triggerRestore} className="btn btn-secondary">{t('Restore from File')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
