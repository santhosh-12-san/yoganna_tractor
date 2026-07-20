import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Calendar, IndianRupee, Clock, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Award, Zap,
  Wrench, Activity, AlertTriangle, CloudRain, CheckCircle, Search, LayoutDashboard
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

const OFFERS = [
  {
    id: 1,
    title: "Monsoon Special Ploughing Offer",
    tag: "SPECIAL DISCOUNT",
    desc: "Get 20% OFF on Heavy Ploughing & Rotavator Work for Mandya & Hassan regions.",
    img: "/images/offer1.jpg",
    cta: "Book Service Now",
    badge: "Limited Time"
  },
  {
    id: 2,
    title: "High Yield Seed Sowing Package",
    tag: "NEW SEASON",
    desc: "Discounted Per-Acre Rates for Seed Sowing & Rotavator tillage.",
    img: "/images/offer2.jpg",
    cta: "Explore Package",
    badge: "Popular"
  },
  {
    id: 3,
    title: "24/7 Priority Village Tractor Service",
    tag: "GROUP SAVINGS",
    desc: "Fast Driver & Tractor Arrival at Your Farm with group booking discount.",
    img: "/images/offer3.jpg",
    cta: "Book Service Now",
    badge: "15% OFF"
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'CUSTOMER';
  const isOwner = role === 'OWNER';

  const fetchDashboardData = async () => {
    try {
      let response;
      try {
        response = await axios.get('/api/dashboard/summary/');
      } catch (e) {
        response = await axios.get('/api/dashboard/');
      }
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

  useEffect(() => {
    const offerTimer = setInterval(() => {
      setCurrentOfferIndex((prev) => (prev + 1) % OFFERS.length);
    }, 5000);
    return () => clearInterval(offerTimer);
  }, []);

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

  const summary = data?.summary || {};
  const recentBookings = data?.recentBookings || [];

  // Line Chart Data for Income
  const incomeTrend = data?.incomeTrend || [12000, 18500, 9500, 24000, 15000, 28000, 32000];
  const trendLabels = data?.trendLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const lineChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: t('Income (₹)'),
        data: incomeTrend,
        borderColor: '#34a853',
        backgroundColor: 'rgba(52, 168, 83, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4ade80',
        pointRadius: 5
      }
    ]
  };

  const workTypeDistribution = data?.workTypeDistribution || {
    'Ploughing': 45,
    'Rotavator': 30,
    'Cultivator': 15,
    'Trolley Transport': 10
  };

  const doughnutChartData = {
    labels: Object.keys(workTypeDistribution),
    datasets: [
      {
        data: Object.values(workTypeDistribution),
        backgroundColor: ['#34a853', '#3b82f6', '#f9ab00', '#a855f7'],
        borderWidth: 0
      }
    ]
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
          {[
            { name: 'Dashboard', path: '/dashboard' },
            { name: 'Services', path: '/bookings/add' },
            { name: 'Bookings', path: '/bookings' },
            { name: 'Fleet', path: '/drivers' },
            { name: 'Support', path: '/settings' }
          ].map((pill) => (
            <button 
              key={pill.name} 
              className={`figma-pill-btn ${activeTab === pill.name ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(pill.name);
                navigate(pill.path);
              }}
            >
              {pill.name === 'Dashboard' && <LayoutDashboard size={14} />}
              {pill.name === 'Services' && <Wrench size={14} />}
              {pill.name === 'Bookings' && <Calendar size={14} />}
              {pill.name === 'Fleet' && <Activity size={14} />}
              {pill.name === 'Support' && <ShieldCheck size={14} />}
              <span>{t(pill.name)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Offer Banner Carousel */}
      <div className="offers-carousel-wrapper" style={{ marginBottom: '28px' }}>
        <div className="offer-slide active" style={{ backgroundImage: `linear-gradient(90deg, rgba(6, 35, 21, 0.92) 0%, rgba(6, 35, 21, 0.75) 50%, rgba(6, 35, 21, 0.92) 100%), url(${OFFERS[currentOfferIndex].img})` }}>
          <div className="offer-content">
            <span className="offer-tag"><Sparkles size={14} style={{ display: 'inline', marginRight: '4px' }} />{t(OFFERS[currentOfferIndex].tag)}</span>
            <h2 className="offer-title">{t(OFFERS[currentOfferIndex].title)}</h2>
            <p className="offer-desc">{t(OFFERS[currentOfferIndex].desc)}</p>
            <button className="btn btn-primary offer-cta" onClick={() => navigate('/bookings/add')}>
              {t(OFFERS[currentOfferIndex].cta)} <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="offer-controls">
            <button className="offer-nav-btn" onClick={() => setCurrentOfferIndex((prev) => (prev === 0 ? OFFERS.length - 1 : prev - 1))}>
              <ChevronLeft size={18} />
            </button>
            <div className="offer-dots">
              {OFFERS.map((_, i) => (
                <span key={i} className={`offer-dot ${i === currentOfferIndex ? 'active' : ''}`} onClick={() => setCurrentOfferIndex(i)} />
              ))}
            </div>
            <button className="offer-nav-btn" onClick={() => setCurrentOfferIndex((prev) => (prev + 1) % OFFERS.length)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Service Cards + Monsoon Offer Banner */}
      <div className="figma-main-layout">
        <div className="figma-service-cards-section">
          <h2 className="figma-section-title">{t('Service Cards')}</h2>
          
          <div className="figma-cards-grid">
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

      {/* KPI Stat Badges Row */}
      <div className="figma-kpi-section" style={{ marginBottom: '32px' }}>
        <h2 className="figma-section-title">{t('Business Performance Overview')}</h2>

        {isOwner ? (
          <div className="figma-kpi-grid">
            <TiltCard className="figma-kpi-card kpi-emerald-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Total Customers')}</span>
                <Users size={18} className="kpi-icon emerald-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.totalCustomers || 4} /></span>
                <span className="kpi-status status-healthy">+12% {t('This Month')}</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-blue-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t("Today's Bookings")}</span>
                <Calendar size={18} className="kpi-icon blue-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.todayBookings || 0} /></span>
                <span className="kpi-status status-info">+2 New</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-gold-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t("Today's Earnings")}</span>
                <IndianRupee size={18} className="kpi-icon gold-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.todayEarnings || 0} isCurrency={true} /></span>
                <span className="kpi-status status-revenue">+18%</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-danger-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Pending Payments')}</span>
                <IndianRupee size={18} className="kpi-icon danger-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.pendingPayments || 9790} isCurrency={true} /></span>
                <span className="kpi-status status-warning">+4%</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-emerald-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Fuel Expense')}</span>
                <Activity size={18} className="kpi-icon emerald-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.fuelExpense || 0} isCurrency={true} /></span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-blue-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Maintenance Expense')}</span>
                <Wrench size={18} className="kpi-icon blue-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.maintenanceExpense || 0} isCurrency={true} /></span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-gold-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Total Income (This Month)')}</span>
                <IndianRupee size={18} className="kpi-icon gold-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.totalIncome || 0} isCurrency={true} /></span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-emerald-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Profit (This Month)')}</span>
                <IndianRupee size={18} className="kpi-icon emerald-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val"><AnimatedCounter value={summary.netProfit || 0} isCurrency={true} /></span>
              </div>
            </TiltCard>
          </div>
        ) : (
          <div className="figma-kpi-grid">
            <TiltCard className="figma-kpi-card kpi-emerald-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Total Bookings')}</span>
                <Calendar size={18} className="kpi-icon emerald-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val">{summary.totalBookings || 0}</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-blue-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Completed Bookings')}</span>
                <CheckCircle size={18} className="kpi-icon blue-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val">{summary.completedBookings || 0}</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-gold-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Pending Bookings')}</span>
                <Clock size={18} className="kpi-icon gold-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val">{summary.pendingBookings || 0}</span>
              </div>
            </TiltCard>

            <TiltCard className="figma-kpi-card kpi-danger-aura">
              <div className="kpi-header">
                <span className="kpi-title">{t('Pending Payment')}</span>
                <IndianRupee size={18} className="kpi-icon danger-glow" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-val">{formatCurrency(summary.pendingPayment || 0)}</span>
              </div>
            </TiltCard>
          </div>
        )}
      </div>

      {/* Owner Analytics Charts */}
      {isOwner && (
        <div className="figma-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <TiltCard className="figma-glass-card" style={{ height: 'auto', padding: '24px' }}>
            <h3 className="figma-section-title">{t('Income Overview (7 Days)')}</h3>
            <div style={{ height: '260px' }}>
              <Line 
                data={lineChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { ticks: { color: 'rgba(255, 255, 255, 0.7)' }, grid: { color: 'rgba(255, 255, 255, 0.08)' } },
                    y: { ticks: { color: 'rgba(255, 255, 255, 0.7)' }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
                  },
                  plugins: { legend: { labels: { color: 'white' } } }
                }} 
              />
            </div>
          </TiltCard>

          <TiltCard className="figma-glass-card" style={{ height: 'auto', padding: '24px' }}>
            <h3 className="figma-section-title">{t('Top Work Types')}</h3>
            <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
              <Doughnut 
                data={doughnutChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: 'white', boxWidth: 12 } }
                  }
                }}
              />
            </div>
          </TiltCard>
        </div>
      )}

      {/* Recent Bookings Activity Table */}
      <div className="figma-table-container">
        <div className="figma-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="figma-section-title">{isOwner ? t('Recent Service Activity') : t('Your Bookings History')}</h2>
          <button className="figma-pill-btn active" onClick={() => navigate('/bookings')}>
            <span>{t('View All')}</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
          <table className="figma-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>{isOwner ? t('Customer') : t('Date')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('Work Type')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('Acres/Hours')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('Amount')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                    {isOwner ? b.customer_name : new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{t(b.work_type)}</td>
                  <td style={{ padding: '14px 16px' }}>{b.acres_hours}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#4ade80' }}>{formatCurrency(b.total_amount)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`figma-badge badge-${b.status.toLowerCase().replace(" ", "-")}`}>
                      {t(b.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {t('No bookings found. Request your first tractor service today!')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
