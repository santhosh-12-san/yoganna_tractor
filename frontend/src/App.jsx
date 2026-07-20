import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, CalendarDays, Tractor, IndianRupee, Fuel, 
  Receipt, ShieldAlert, BarChart3, Settings as SettingsIcon, LogOut, Menu, UserCheck, Plus
} from 'lucide-react';

import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomersList from './pages/CustomersList';
import AddCustomer from './pages/AddCustomer';
import BookingsList from './pages/BookingsList';
import AddBooking from './pages/AddBooking';
import DriversList from './pages/DriversList';
import WagesList from './pages/WagesList';
import FuelManagement from './pages/FuelManagement';
import Expenses from './pages/Expenses';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import ReportsDashboard from './pages/ReportsDashboard';
import ProfitReport from './pages/ProfitReport';
import Settings from './pages/Settings';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

const isDevServer = window.location.port === '3000';
axios.defaults.baseURL = isDevServer ? 'http://localhost:8001' : window.location.origin;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const NavigationLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('user_role');
  const userFullName = localStorage.getItem('user_full_name') || 'User';
  const { lang, changeLanguage, t } = useLanguage();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_full_name');
    navigate('/login');
  };

  const navItems = [
    { name: t('Dashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'CUSTOMER'] },
    { name: t('Customers'), path: '/customers', icon: Users, roles: ['OWNER'] },
    { name: t('Bookings'), path: '/bookings', icon: CalendarDays, roles: ['OWNER', 'CUSTOMER'] },
    { name: t('Drivers'), path: '/drivers', icon: UserCheck, roles: ['OWNER'] },
    { name: t('Wages'), path: '/wages', icon: IndianRupee, roles: ['OWNER'] },
    { name: t('Payments'), path: '/payments', icon: IndianRupee, roles: ['OWNER', 'CUSTOMER'] },
    { name: t('Fuel'), path: '/fuel', icon: Fuel, roles: ['OWNER'] },
    { name: t('Expenses'), path: '/expenses', icon: Receipt, roles: ['OWNER'] },
    { name: t('Maintenance'), path: '/maintenance', icon: ShieldAlert, roles: ['OWNER'] },
    { name: t('Reports'), path: '/reports', icon: BarChart3, roles: ['OWNER'] },
    { name: t('Settings'), path: '/settings', icon: SettingsIcon, roles: ['OWNER', 'CUSTOMER'] },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Tractor size={24} />
          <span>Yoganna Tractor Services</span>
        </div>
        
        {/* Mobile menu toggle */}
        <button 
          className="menu-trigger" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>

        <nav className={`sidebar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems
            .filter(item => item.roles.includes(role))
            .map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link 
                  key={item.name} 
                  to={item.path} 
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>

        <div className={`sidebar-footer ${mobileMenuOpen ? 'open' : ''}`}>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={20} />
            <span>{t('Logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="page-title">
            <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', margin: 0 }}>
              {navItems.find(item => location.pathname.startsWith(item.path))?.name || t('Tractor Service Management')}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🌐 Language:</span>
              <select
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: 'white',
                  outline: 'none'
                }}
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            <div className="user-profile-badge">
              <div className="user-profile-info">
                <div className="user-profile-name">{userFullName}</div>
                <div className="user-profile-role">{role}</div>
              </div>
              <div className="avatar">
                {userFullName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="content-body">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Owner Only Routes */}
            <Route path="/customers" element={<PrivateRoute allowedRoles={['OWNER']}><CustomersList /></PrivateRoute>} />
            <Route path="/customers/add" element={<PrivateRoute allowedRoles={['OWNER']}><AddCustomer /></PrivateRoute>} />
            <Route path="/customers/edit/:id" element={<PrivateRoute allowedRoles={['OWNER']}><AddCustomer /></PrivateRoute>} />
            
            <Route path="/bookings/add" element={<PrivateRoute allowedRoles={['OWNER', 'CUSTOMER']}><AddBooking /></PrivateRoute>} />
            <Route path="/bookings/edit/:id" element={<PrivateRoute allowedRoles={['OWNER']}><AddBooking /></PrivateRoute>} />
            
            <Route path="/drivers" element={<PrivateRoute allowedRoles={['OWNER']}><DriversList /></PrivateRoute>} />
            <Route path="/wages" element={<PrivateRoute allowedRoles={['OWNER']}><WagesList /></PrivateRoute>} />
            <Route path="/fuel" element={<PrivateRoute allowedRoles={['OWNER']}><FuelManagement /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute allowedRoles={['OWNER']}><Expenses /></PrivateRoute>} />
            <Route path="/maintenance" element={<PrivateRoute allowedRoles={['OWNER']}><Maintenance /></PrivateRoute>} />
            
            <Route path="/reports" element={<PrivateRoute allowedRoles={['OWNER']}><ReportsDashboard /></PrivateRoute>} />
            <Route path="/reports/profit" element={<PrivateRoute allowedRoles={['OWNER']}><ProfitReport /></PrivateRoute>} />
            
            {/* Shared Protected Routes */}
            <Route path="/bookings" element={<BookingsList />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating Quick Action Booking Button */}
      <button 
        className="fab-booking-btn" 
        onClick={() => navigate('/bookings/add')}
        title={t('New Booking')}
      >
        <Plus size={22} />
        <span>{t('New Booking')}</span>
      </button>
    </div>
  );
};

function App() {
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      try {
        const { getOfflineBookings, deleteOfflineBooking } = await import('./utils/offlineDb');
        const bookings = await getOfflineBookings();
        if (bookings.length === 0) return;
        
        console.log(`Syncing ${bookings.length} offline bookings...`);
        for (const b of bookings) {
          const payload = { ...b };
          const tempId = payload.tempId;
          delete payload.tempId;
          
          try {
            await axios.post('/api/bookings/', payload);
            await deleteOfflineBooking(tempId);
          } catch (err) {
            console.error("Failed to sync offline booking:", err);
          }
        }
        alert("Online Sync: Offline booking requests have been synchronized successfully!");
        if (window.location.pathname === '/bookings') {
          window.location.reload();
        }
      } catch (err) {
        console.error("Auto sync failure:", err);
      }
    };

    syncOfflineData();
    window.addEventListener('online', syncOfflineData);
    return () => {
      window.removeEventListener('online', syncOfflineData);
    };
  }, []);

  return (
    <Router>
      <LanguageProvider>
        <WebSocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <NavigationLayout />
                </PrivateRoute>
              } 
            />
          </Routes>
        </WebSocketProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
