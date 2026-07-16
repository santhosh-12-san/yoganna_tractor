import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AddCustomer = () => {
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
        {isEdit ? 'Edit Customer Details' : 'Add New Customer'}
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
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            placeholder="Enter full name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="text"
            id="phone"
            name="phone"
            className="form-control"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="village">Village</label>
          <input
            type="text"
            id="village"
            name="village"
            className="form-control"
            placeholder="Enter village"
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
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;
