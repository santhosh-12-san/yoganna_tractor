import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tractor, Lock, Phone, User, Eye, EyeOff } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    village: '',
    confirm_password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { connect } = useWebSocket();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Authenticate via Simple JWT
      const response = await axios.post('/api/token/', {
        phone_number: formData.phone_number,
        password: formData.password
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Fetch user profile details
      const userProfile = await axios.get('/api/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });

      localStorage.setItem('user_role', userProfile.data.role);
      localStorage.setItem('user_full_name', userProfile.data.full_name);

      // Connect real-time WebSocket
      connect();

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid phone number or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/register/', {
        phone_number: formData.phone_number,
        password: formData.password,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        village: formData.village,
        role: 'CUSTOMER' // Self registration defaults to Customer
      });

      setIsRegister(false);
      setError('Registration successful! Please login with your details.');
    } catch (err) {
      console.error(err);
      setError(Object.values(err.response?.data || {}).join(' ') || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <Tractor size={48} />
          <h2>Yoganna Tractor Services</h2>
          <p>{isRegister ? 'Create your customer account' : 'Login to your account'}</p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: error.includes('successful') ? 'var(--primary-light)' : 'var(--danger-light)',
            color: error.includes('successful') ? 'var(--primary)' : 'var(--danger)',
            fontSize: '0.875rem',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <>
              <div className="form-group">
                <label>First Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="first_name"
                    className="form-control"
                    placeholder="Enter first name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-control"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Village</label>
                <input
                  type="text"
                  name="village"
                  className="form-control"
                  placeholder="Enter your village"
                  value={formData.village}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="phone_number"
                className="form-control"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                className="form-control"
                placeholder="Confirm password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          {!isRegister && (
            <div className="auth-extra">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact the Owner to reset your password."); }}>Forgot Password?</a>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Login')}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); setError(''); }}>Login</a></p>
          ) : (
            <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); setError(''); }}>Sign up</a></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
