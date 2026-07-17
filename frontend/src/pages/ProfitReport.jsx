import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const ProfitReport = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfitDetails = async () => {
      try {
        const response = await axios.get('/api/reports/?type=profit');
        setData(response.data);
      } catch (err) {
        console.error("Error loading profit details:", err);
        setError("Could not retrieve profit details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfitDetails();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>{t('Loading bookings...')}</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;
  if (!data) return null;

  const { summary, breakdown, metrics } = data;

  // Prepare expense breakdown pie chart
  const doughnutData = {
    labels: Object.keys(breakdown),
    datasets: [
      {
        data: Object.values(breakdown),
        backgroundColor: [
          '#d93025', // Fuel (Red)
          '#1a73e8', // Maintenance (Blue)
          '#f9ab00', // Wages (Yellow)
          '#9ca3af', // Others (Gray)
          '#34a853'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/reports')} className="btn-icon" style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{t('View Profit Breakdowns')}</h2>
      </div>

      {/* Main KPI details cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px' }}>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Total Income (This Month)') || 'Total Income'}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--secondary)' }}>{formatCurrency(summary.totalIncome)}</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Expenses')}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--danger)' }}>{formatCurrency(summary.totalExpenses)}</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>{t('Profit (This Month)') || 'Net Profit'}</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>{formatCurrency(summary.netProfit)}</span>
        </div>
        <div className="metric-card" style={{ padding: '20px' }}>
          <span className="metric-title" style={{ fontSize: '0.85rem' }}>Profit %</span>
          <span className="metric-value" style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--info)' }}>
            <TrendingUp size={24} />
            <span>{summary.profitPercentage}%</span>
          </span>
        </div>
      </div>

      {/* Visual layouts */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="chart-card">
          <div className="card-header">
            <h2>{t('Expenses')}</h2>
          </div>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Doughnut 
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { boxWidth: 12 }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="activity-card">
          <div className="card-header">
            <h2>{t('Reports')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: '600' }}>{t('Total Bookings')}</span>
              <span style={{ fontWeight: 'bold' }}>{metrics.totalBookings}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: '600' }}>{t('Completed Bookings')}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{metrics.completedBookings}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: '600' }}>{t('Cancelled')}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{metrics.cancelledBookings}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: '600' }}>{t('Total Customers')}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--info)' }}>{metrics.totalCustomers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitReport;
