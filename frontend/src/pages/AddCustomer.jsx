import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const AddCustomer = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      const fetchCustomer = async () => {
        try {
          const response = await axios.get(`/api/customers/${id}/`);
          setFormData({
            name: response.data.name,
            phone: response.data.phone,
            village: response.data.village
          });
        } catch (err) {
          console.error("Error fetching customer details:", err);
          setError("Could not retrieve customer details.");
        }
      };
      fetchCustomer();
    }
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await axios.put(`/api/customers/${id}/`, formData);
      } else {
        await axios.post('/api/customers/', formData);
      }
      navigate('/customers');
    } catch (err) {
      console.error("Error saving customer:", err);
      setError(Object.values(err.response?.data || {}).join(' ') || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--primary)' }}>
        {isEdit ? t('Modify Driver Details') || 'Edit Customer Details' : t('Add Customer') || 'Add New Customer'}
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
        <div className="form-group">
          <label htmlFor="name">{t('Full Name') || 'Full Name'}</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            placeholder={t('Full Name') || 'Enter full name'}
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">{t('Phone Number (Username)') || 'Phone Number'}</label>
          <input
            type="text"
            id="phone"
            name="phone"
            className="form-control"
            placeholder={t('Phone') || 'Enter phone number'}
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="village">{t('Village')}</label>
          <input
            type="text"
            id="village"
            name="village"
            className="form-control"
            placeholder={t('Village') || 'Enter village'}
            value={formData.village}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/customers')}
            disabled={loading}
          >
            {t('Cancel')}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('Processing...') : t('Save Booking')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;
