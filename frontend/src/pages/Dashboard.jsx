import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Calendar, IndianRupee, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

// Helper for formatting Indian currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const Dashboard = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/');
      setData(response.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to WebSocket broadcasts and trigger refresh
  useEffect(() => {
    if (lastMessage) {
      console.log("Real-time update triggered by WebSocket message:", lastMessage);
      fetchDashboardData();
    }
  }, [lastMessage]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{t('Loading bookings...')}</div>;
  }if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;
  if (!data) return null;

  const isOwner = data.role === 'OWNER';
  const { summary, recentBookings } = data;

  // Prepare line chart data (Income Overview)
  const lineChartData = isOwner && data.charts?.incomeOverview ? {
    labels: data.charts.incomeOverview.map(item => {
      const d = new Date(item.date);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Earnings (₹)',
        data: data.charts.incomeOverview.map(item => item.amount),
        borderColor: '#0e623f',
        backgroundColor: 'rgba(14, 98, 63, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  } : null;

  // Prepare doughnut chart data (Top Work Types)
  const doughnutChartData = isOwner && data.charts?.workTypes ? {
    labels: Object.keys(data.charts.workTypes),
    datasets: [
      {
        data: Object.values(data.charts.workTypes),
        backgroundColor: [
          '#0e623f',
          '#34a853',
          '#f9ab00',
          '#1a73e8',
          '#9ca3af'
        ],
        borderWidth: 1,
      }
    ]
  } : null;

  return (
    <div>
      {isOwner ? (
        // ----------------------------------
        // OWNER DASHBOARD
        // ----------------------------------
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Total Customers</span>
                <div className="metric-icon-wrapper">
                  <Users size={20} />
                </div>
              </div>
              <span className="metric-value">{summary.totalCustomers}</span>
              <span className="metric-trend trend-up">
                <ArrowUpRight size={14} />
                <span>+12% This Month</span>
              </span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t("Today's Bookings") || "Today's Bookings"}</span>
                <div className="metric-icon-wrapper">
                  <Calendar size={20} />
                </div>
              </div>
              <span className="metric-value">{summary.todayBookings}</span>
              <span className="metric-trend trend-up">
                <ArrowUpRight size={14} />
                <span>+2 New</span>
              </span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t("Today's Earnings") || "Today's Earnings"}</span>
                <div className="metric-icon-wrapper">
                  <IndianRupee size={20} />
                </div>
              </div>
              <span className="metric-value">{formatCurrency(summary.todayEarnings)}</span>
              <span className="metric-trend trend-up">
                <ArrowUpRight size={14} />
                <span>+18%</span>
              </span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t("Pending Payments") || "Pending Payments"}</span>
                <div className="metric-icon-wrapper">
                  <Clock size={20} />
                </div>
              </div>
              <span className="metric-value">{formatCurrency(summary.pendingPayments)}</span>
              <span className="metric-trend trend-up">
                <ArrowUpRight size={14} />
                <span>+4%</span>
              </span>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '32px' }}>
            <div className="metric-card" style={{ padding: '16px', background: '#fcfdfc' }}>
              <span className="metric-title" style={{ fontSize: '0.8rem' }}>{t("Fuel Expense (This Month)") || "Fuel Expense"}</span>
              <span className="metric-value" style={{ fontSize: '1.4rem', color: '#6b7280' }}>{formatCurrency(summary.fuelExpense)}</span>
            </div>
            <div className="metric-card" style={{ padding: '16px', background: '#fcfdfc' }}>
              <span className="metric-title" style={{ fontSize: '0.8rem' }}>{t("Maintenance Expense") || "Maintenance Expense"}</span>
              <span className="metric-value" style={{ fontSize: '1.4rem', color: '#6b7280' }}>{formatCurrency(summary.maintenanceExpense)}</span>
            </div>
            <div className="metric-card" style={{ padding: '16px', background: '#fcfdfc' }}>
              <span className="metric-title" style={{ fontSize: '0.8rem' }}>{t("Total Income (This Month)") || "Total Income"}</span>
              <span className="metric-value" style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>{formatCurrency(summary.totalIncome)}</span>
            </div>
            <div className="metric-card" style={{ padding: '16px', background: '#fcfdfc' }}>
              <span className="metric-title" style={{ fontSize: '0.8rem' }}>{t("Profit (This Month)") || "Profit"}</span>
              <span className="metric-value" style={{ fontSize: '1.4rem', color: 'var(--secondary)' }}>{formatCurrency(summary.netProfit)}</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="chart-card">
              <div className="card-header">
                <h2>{t("Income Overview") || "Income Overview"}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>June 2025</span>
              </div>
              <div style={{ height: '300px', position: 'relative' }}>
                {lineChartData && (
                  <Line 
                    data={lineChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                        }
                      }
                    }} 
                  />
                )}
              </div>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h2>{t("Top Work Types") || "Top Work Types"}</h2>
              </div>
              <div style={{ height: '240px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {doughnutChartData && (
                  <Doughnut 
                    data={doughnutChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { boxWidth: 12 }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="table-container">
            <div className="table-controls">
              <h2 style={{ fontSize: '1.15rem' }}>{t('Recent Activity') || 'Recent Bookings'}</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('Customer')}</th>
                  <th>{t('Work Type')}</th>
                  <th>{t('Acres/Hours')}</th>
                  <th>{t('Amount')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: '600' }}>{b.customer_name}</td>
                    <td>{t(b.work_type)}</td>
                    <td>{b.acres_hours}</td>
                    <td>{formatCurrency(b.total_amount)}</td>
                    <td>
                      <span className={`badge ${b.status.toLowerCase().replace(" ", "-")}`}>
                        {t(b.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        // ----------------------------------
        // CUSTOMER DASHBOARD
        // ----------------------------------
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t('Total Bookings')}</span>
                <div className="metric-icon-wrapper">
                  <Calendar size={20} />
                </div>
              </div>
              <span className="metric-value">{summary.totalBookings}</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t('Completed Bookings')}</span>
                <div className="metric-icon-wrapper">
                  <Calendar size={20} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
              <span className="metric-value">{summary.completedBookings}</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t('Pending Bookings')}</span>
                <div className="metric-icon-wrapper">
                  <Clock size={20} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
              <span className="metric-value">{summary.pendingBookings}</span>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{t('Pending Payments')}</span>
                <div className="metric-icon-wrapper">
                  <IndianRupee size={20} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
              <span className="metric-value">{formatCurrency(summary.pendingPayment)}</span>
            </div>
          </div>

          {/* Recent Bookings Specific to Customer */}
          <div className="table-container">
            <div className="table-controls">
              <h2 style={{ fontSize: '1.15rem' }}>{t('Your Bookings History')}</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('Date')}</th>
                  <th>{t('Work Type')}</th>
                  <th>{t('Acres/Hours')}</th>
                  <th>{t('Amount')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{t(b.work_type)}</td>
                    <td>{b.acres_hours}</td>
                    <td>{formatCurrency(b.total_amount)}</td>
                    <td>
                      <span className={`badge ${b.status.toLowerCase().replace(" ", "-")}`}>
                        {t(b.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('No bookings found. Request your first tractor service today!') || 'No bookings found. Request your first tractor service today!'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
