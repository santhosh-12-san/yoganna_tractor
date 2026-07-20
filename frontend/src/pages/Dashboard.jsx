import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Calendar, IndianRupee, Clock, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Award, Zap,
  Wrench, Activity, AlertTriangle, CloudRain, CheckCircle, Search, LayoutDashboard, Settings as SettingsIcon, Radio
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedCounter from '../components/AnimatedCounter';
import TiltCard from '../components/TiltCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();
  const [activeTab, setActiveTab] = useState('Dashboard');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'CUSTOMER';
  const isOwner = role === 'OWNER';

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/summary/');
      setData(response.data);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(t('Failed to load dashboard data. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'dashboard_update' || lastMessage.type === 'booking_update') {
        fetchDashboardData();
      }
    }
  }, [lastMessage]);

  if (loading) {
    return (
      <div className="skeleton-container" style={{ padding: '24px' }}>
        <div className="skeleton-box" style={{ height: '220px', borderRadius: '16px', marginBottom: '24px' }} />
        <div className="skeleton-grid-4">
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', fontSize: '1.1rem', marginBottom: '16px' }}>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">{t('Retry')}</button>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCustomers: 4,
    todayBookings: 0,
    todayEarnings: 0,
    pendingPayments: 9790,
    totalIncome: 0,
    netProfit: 0
  };

  return (
    <div className="figma-dark-dashboard">
      {/* Top Secondary Sub-Header Pill Bar */}
      <div className="figma-sub-header">
        <div className="figma-search-bar">
          <Search size={16} style={{ opacity: 0.6 }} />
          <input type="text" placeholder={t('Search services, tractors...')} className="figma-search-input" />
        </div>

        <div className="figma-nav-pills">
          {['Dashboard', 'Services', 'Bookings', 'Fleet', 'Support'].map((pill) => (
            <button 
              key={pill} 
              className={`figma-pill-btn ${activeTab === pill ? 'active' : ''}`}
              onClick={() => setActiveTab(pill)}
            >
              {pill === 'Dashboard' && <LayoutDashboard size={14} />}
              {pill === 'Services' && <Wrench size={14} />}
              {pill === 'Bookings' && <Calendar size={14} />}
              {pill === 'Fleet' && <Activity size={14} />}
              {pill === 'Support' && <ShieldCheck size={14} />}
              <span>{t(pill)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Service Cards + Monsoon Offer Banner */}
      <div className="figma-main-layout">
        <div className="figma-service-cards-section">
          <h2 className="figma-section-title">{t('Service Cards')}</h2>
          
          <div className="figma-cards-grid">
            {/* Card 1: Maintenance */}
            <TiltCard className="figma-glass-card">
              <div className="figma-card-top">
                <div className="figma-card-icon icon-maintenance">
                  <Wrench size={20} />
                </div>
                <span className="figma-badge badge-active">{t('Active')}</span>
              </div>
              <h3 className="figma-card-title">{t('Scheduled Maintenance')}</h3>
              <p className="figma-card-subtitle">Mahindra Nova 45 HP</p>
              <span className="figma-card-date">Next: Oct 12</span>
              
              <div className="figma-progress-wrapper">
                <div className="figma-progress-bar" style={{ width: '75%' }} />
              </div>
              
              <div className="figma-card-footer">
                <button className="figma-card-action" onClick={() => navigate('/maintenance')}>
                  <span>{t('Track Status')}</span>
                  <span className="percent-tag">75%</span>
                </button>
              </div>
            </TiltCard>

            {/* Card 2: Active Rental (Current - Glowing Border) */}
            <TiltCard className="figma-glass-card card-glowing-current">
              <div className="figma-card-top">
                <div className="figma-card-icon icon-rental">
                  <Activity size={20} />
                </div>
                <span className="figma-badge badge-current">{t('Current')}</span>
              </div>
              <h3 className="figma-card-title">{t('Active Rental')}</h3>
              <p className="figma-card-subtitle">New Holland 60HP</p>
              <span className="figma-card-date">Sept 1 - 30</span>
              
              <div className="figma-card-footer">
                <button className="figma-card-action action-highlight" onClick={() => navigate('/bookings')}>
                  <span>{t('Manage Booking')}</span>
                  <span className="days-tag">14 {t('days left')}</span>
                </button>
              </div>
            </TiltCard>

            {/* Card 3: Service History */}
            <TiltCard className="figma-glass-card">
              <div className="figma-card-top">
                <div className="figma-card-icon icon-history">
                  <Clock size={20} />
                </div>
              </div>
              <h3 className="figma-card-title">{t('Service History')}</h3>
              <p className="figma-card-subtitle">3 {t('completed jobs')}</p>
              
              <div className="figma-card-footer" style={{ marginTop: 'auto' }}>
                <button className="figma-card-action" onClick={() => navigate('/bookings')}>
                  <span>{t('View Logs')}</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </TiltCard>

            {/* Card 4: Fleet Overview */}
            <TiltCard className="figma-glass-card">
              <div className="figma-card-top">
                <div className="figma-card-icon icon-fleet">
                  <Users size={20} />
                </div>
              </div>
              <h3 className="figma-card-title">{t('Fleet Overview')}</h3>
              <p className="figma-card-subtitle">20 {t('Tractors')}</p>
              <span className="figma-card-date">16 {t('Active')}, 4 {t('Idle')}</span>
              
              <div className="figma-card-footer">
                <button className="figma-card-action" onClick={() => navigate('/drivers')}>
                  <span>{t('Manage Fleet')}</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </TiltCard>
          </div>
        </div>

        {/* Monsoon Offers Right Banner Card */}
        <TiltCard className="figma-monsoon-banner-card">
          <div className="monsoon-rain-header">
            <CloudRain size={36} className="cloud-rain-icon" />
            <div className="tractor-hero-pill">🚜</div>
          </div>
          
          <h2 className="monsoon-title">{t('MONSOON SPECIALS!')}</h2>
          <span className="monsoon-subtitle">{t('Pre-Season Checkup')}</span>
          
          <div className="monsoon-discount-box">
            <span className="discount-value">{t('Up to 20% OFF!')}</span>
            <span className="discount-valid">{t('Valid till Aug 31')}</span>
          </div>

          <div className="monsoon-footer-badge">
            <span>{t('Valid till Aug 31')}</span>
          </div>

          <button className="monsoon-cta-btn" onClick={() => navigate('/bookings/add')}>
            <span>{t('Book Now')}</span>
            <ArrowUpRight size={18} />
          </button>
        </TiltCard>
      </div>

      {/* Bottom KPI Stat Badges Row */}
      <div className="figma-kpi-section">
        <h2 className="figma-section-title">{t('KPI Stat Badges')}</h2>

        <div className="figma-kpi-grid">
          <TiltCard className="figma-kpi-card kpi-emerald-aura">
            <div className="kpi-header">
              <span className="kpi-title">{isOwner ? t('Total Customers') : t('Total Bookings')}</span>
              <Activity size={18} className="kpi-icon emerald-glow" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-val"><AnimatedCounter value={isOwner ? (summary.totalCustomers || 4) : (summary.totalBookings || 0)} /></span>
              <span className="kpi-status status-healthy">- {t('Active')}</span>
            </div>
          </TiltCard>

          <TiltCard className="figma-kpi-card kpi-danger-aura">
            <div className="kpi-header">
              <span className="kpi-title">{isOwner ? t('Pending Payments') : t('Pending Bookings')}</span>
              <AlertTriangle size={18} className="kpi-icon danger-glow" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-val"><AnimatedCounter value={isOwner ? (summary.pendingPayments || 9790) : (summary.pendingBookings || 0)} isCurrency={isOwner} /></span>
              <span className="kpi-status status-warning">- {t('Action Needed')}</span>
            </div>
          </TiltCard>

          <TiltCard className="figma-kpi-card kpi-blue-aura">
            <div className="kpi-header">
              <span className="kpi-title">{isOwner ? t("Today's Bookings") : t('Completed Bookings')}</span>
              <Zap size={18} className="kpi-icon blue-glow" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-val"><AnimatedCounter value={isOwner ? (summary.todayBookings || 0) : (summary.completedBookings || 0)} /></span>
              <span className="kpi-status status-info">- {t('Utilized')}</span>
            </div>
          </TiltCard>

          <TiltCard className="figma-kpi-card kpi-gold-aura">
            <div className="kpi-header">
              <span className="kpi-title">{isOwner ? t("Today's Earnings") : t('Total Paid')}</span>
              <IndianRupee size={18} className="kpi-icon gold-glow" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-val"><AnimatedCounter value={isOwner ? (summary.todayEarnings || 0) : (summary.totalPaid || 0)} isCurrency={true} /></span>
              <span className="kpi-status status-revenue">+8.5%</span>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
