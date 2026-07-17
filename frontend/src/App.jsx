import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, CalendarDays, Tractor, IndianRupee, Fuel, 
  Receipt, ShieldAlert, BarChart3, Settings as SettingsIcon, LogOut, Menu, UserCheck
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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_full_name');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'CUSTOMER'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['OWNER'] },
    { name: 'Bookings', path: '/bookings', icon: CalendarDays, roles: ['OWNER', 'CUSTOMER'] },
    { name: 'Drivers', path: '/drivers', icon: UserCheck, roles: ['OWNER'] },
    { name: 'Wages', path: '/wages', icon: IndianRupee, roles: ['OWNER'] },
    { name: 'Payments', path: '/payments', icon: IndianRupee, roles: ['OWNER', 'CUSTOMER'] },
    { name: 'Fuel', path: '/fuel', icon: Fuel, roles: ['OWNER'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['OWNER'] },
    { name: 'Maintenance', path: '/maintenance', icon: ShieldAlert, roles: ['OWNER'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['OWNER'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['OWNER', 'CUSTOMER'] },
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
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="page-title">
            <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
              {navItems.find(item => location.pathname.startsWith(item.path))?.name || 'Tractor Service Management'}
            </h1>
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
    </div>
  );
};

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
