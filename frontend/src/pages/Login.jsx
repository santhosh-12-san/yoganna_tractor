import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tractor, Lock, Phone, User, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import FloatingParticles from '../components/FloatingParticles';
import TiltCard from '../components/TiltCard';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('CUSTOMER');
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
      const response = await axios.post('/api/token/', {
        phone_number: formData.phone_number,
        password: formData.password
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      const userProfile = await axios.get('/api/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });

      localStorage.setItem('user_role', userProfile.data.role);
      localStorage.setItem('user_full_name', userProfile.data.full_name);

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
        role: activeRoleTab
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
    <div className="figma-login-wrapper">
      {/* Background Floating Dust Particles */}
      <FloatingParticles />

      {/* Glassmorphism 3D Login Card */}
      <TiltCard className="figma-login-card">
        <div className="figma-login-logo">
          <div className="logo-glow-wrapper">
            <Tractor size={38} className="logo-icon-tractor" />
          </div>
          <h2 className="login-brand-title">Yoganna Tractor Services</h2>
          <p className="login-brand-subtitle">
            {isRegister ? 'Join Mandya & Karnataka Tractor Network' : 'Empowering Farmers • Enriching Lives'}
          </p>
        </div>

        {/* Role Selector Tabs */}
        {!isRegister && (
          <div className="figma-role-tabs">
            <button
              type="button"
              className={`role-tab-btn ${activeRoleTab === 'CUSTOMER' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('CUSTOMER')}
            >
              <User size={14} />
              <span>Farmer / Customer</span>
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeRoleTab === 'OWNER' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('OWNER')}
            >
              <ShieldCheck size={14} />
              <span>Owner / Admin</span>
            </button>
          </div>
        )}

        {error && (
          <div className={`figma-login-alert ${error.includes('successful') ? 'alert-success' : 'alert-danger'}`}>
            <span>{error}</span>
          </div>
        )}

        <form className="figma-login-form" onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <>
              <div className="figma-form-row">
                <div className="figma-input-group">
                  <label className="figma-label">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    className="figma-input"
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="figma-input-group">
                  <label className="figma-label">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    className="figma-input"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="figma-input-group">
                <label className="figma-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="figma-input"
                  placeholder="name@farm.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="figma-input-group">
                <label className="figma-label">Village / Town</label>
                <input
                  type="text"
                  name="village"
                  className="figma-input"
                  placeholder="e.g. Mandya / Hassan"
                  value={formData.village}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <div className="figma-input-group">
            <label className="figma-label">Phone Number</label>
            <div className="figma-input-wrapper">
              <span className="country-code">+91</span>
              <input
                type="text"
                name="phone_number"
                className="figma-input phone-input"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
              <Phone size={16} className="input-icon-right" />
            </div>
          </div>

          <div className="figma-input-group">
            <label className="figma-label">Password</label>
            <div className="figma-input-wrapper">
              <Lock size={16} className="input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="figma-input lock-input"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle Password Visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="figma-input-group">
              <label className="figma-label">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                className="figma-input"
                placeholder="Re-enter password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          {!isRegister && (
            <div className="figma-extra-row">
              <label className="figma-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Remember Me</span>
              </label>
              <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); alert("Please contact Yoganna Service Admin to reset password."); }}>
                Forgot Password?
              </a>
            </div>
          )}

          <button 
            type="submit" 
            className="figma-submit-btn" 
            disabled={loading}
          >
            <span>{loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="figma-login-footer">
          {isRegister ? (
            <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); setError(''); }}>Sign In</a></p>
          ) : (
            <p>New to Yoganna Services? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); setError(''); }}>Create Account</a></p>
          )}
        </div>
      </TiltCard>
    </div>
  );
};

export default Login;
