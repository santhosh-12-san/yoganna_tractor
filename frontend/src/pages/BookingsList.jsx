import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, Calendar, RefreshCw, Play, Check } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingBooking, setCompletingBooking] = useState(null);
  const [completeFormData, setCompleteFormData] = useState({
    acres_hours: '',
    rate_per_unit: '',
    advance: '0.00',
    engine_hours: ''
  });
  const navigate = useNavigate();
  const role = localStorage.getItem('user_role');
  const isOwner = role === 'OWNER';
  const { lastMessage } = useWebSocket();

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings/');
      setBookings(response.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Listen to WebSockets and refresh on any booking signal
  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("BOOKING_")) {
      fetchBookings();
    }
  }, [lastMessage]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await axios.delete(`/api/bookings/${id}/`);
        fetchBookings();
      } catch (err) {
        console.error("Error deleting booking:", err);
        alert("Failed to delete booking.");
      }
    }
  };

  const handleCancelBooking = async (id) => {
    if (window.confirm("Are you sure you want to cancel this booking request?")) {
      try {
        await axios.patch(`/api/bookings/${id}/`, { status: 'Cancelled' });
        fetchBookings();
      } catch (err) {
        console.error("Error cancelling booking:", err);
        alert("Failed to cancel booking.");
      }
    }
  };

  const handleStartWork = async (id) => {
    try {
      await axios.patch(`/api/bookings/${id}/`, { status: 'In Progress' });
      fetchBookings();
    } catch (err) {
      console.error("Error starting work:", err);
      alert("Failed to start booking.");
    }
  };

  const openCompletionModal = (booking) => {
    setCompletingBooking(booking);
    setCompleteFormData({
      acres_hours: booking.acres_hours,
      rate_per_unit: booking.rate_per_unit || '',
      advance: booking.advance || '0.00',
      engine_hours: booking.engine_hours || booking.acres_hours || ''
    });
  };

  const handleCompleteWorkSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`/api/bookings/${completingBooking.id}/`, {
        status: 'Completed',
        acres_hours: completeFormData.acres_hours,
        rate_per_unit: completeFormData.rate_per_unit,
        advance: completeFormData.advance,
        engine_hours: completeFormData.engine_hours
      });
      setCompletingBooking(null);
      fetchBookings();
    } catch (err) {
      console.error("Error completing booking:", err);
      alert("Failed to complete booking.");
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = isOwner 
      ? (b.customer_name?.toLowerCase().includes(search.toLowerCase()) || b.work_type?.toLowerCase().includes(search.toLowerCase()))
      : b.work_type?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchesDate = !dateFilter || b.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="table-container">
      <div className="table-controls">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              type="text"
              className="search-input"
              placeholder={isOwner ? "Search bookings..." : "Search work type..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px', minWidth: '200px' }}
            />
          </div>

          <input
            type="date"
            className="form-control"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: '160px', padding: '9px 12px' }}
          />

          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px', padding: '9px 12px' }}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {isOwner ? (
          <Link to="/bookings/add" className="btn btn-primary">
            <Plus size={16} />
            <span>New Booking</span>
          </Link>
        ) : (
          <button onClick={() => navigate('/bookings/add')} className="btn btn-primary">
            <Plus size={16} />
            <span>Request Booking</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>Loading bookings...</div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              {isOwner && <th>Customer</th>}
              <th>Work Type</th>
              <th>Acres/Hours</th>
              <th>Amount</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b, idx) => (
              <tr key={b.id}>
                <td>{idx + 1}</td>
                <td>{new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                {isOwner && <td style={{ fontWeight: '600' }}>{b.customer_name}</td>}
                <td>{b.work_type}</td>
                <td>{b.acres_hours}</td>
                <td>₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</td>
                <td>{b.driver_name || 'Unassigned'}</td>
                <td>
                  <span className={`badge ${b.status.toLowerCase().replace(" ", "-")}`}>
                    {b.status}
                  </span>
                </td>
                <td>
                  {isOwner ? (
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {b.status?.toLowerCase() === 'pending' && (
                        <button 
                          onClick={() => handleStartWork(b.id)} 
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--primary)', color: 'white' }}
                          title="Start Work"
                        >
                          <Play size={12} fill="white" />
                          <span>Start</span>
                        </button>
                      )}
                      {b.status?.toLowerCase() === 'in progress' && (
                        <button 
                          onClick={() => openCompletionModal(b)} 
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--secondary)', color: 'white' }}
                          title="Complete Work"
                        >
                          <Check size={12} />
                          <span>Complete</span>
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/bookings/edit/${b.id}`)} 
                        className="btn-icon"
                        title="Edit Booking"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id)} 
                        className="btn-icon delete"
                        title="Delete Booking"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    b.status === 'Pending' && (
                      <button 
                        onClick={() => handleCancelBooking(b.id)} 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Cancel
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No bookings found.</td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      )}

      {completingBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            width: '400px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Complete Booking & Invoice</h3>
            <form onSubmit={handleCompleteWorkSubmit}>
              <div className="form-group">
                <label htmlFor="modal_acres_hours">Actual Acres / Hours</label>
                <input
                  id="modal_acres_hours"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={completeFormData.acres_hours}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, acres_hours: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal_engine_hours">Tractor Engine Hours Spent</label>
                <input
                  id="modal_engine_hours"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={completeFormData.engine_hours}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, engine_hours: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal_rate_per_unit">Rate per Unit (₹)</label>
                <input
                  id="modal_rate_per_unit"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={completeFormData.rate_per_unit}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, rate_per_unit: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal_advance">Advance Payment Received (₹)</label>
                <input
                  id="modal_advance"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={completeFormData.advance}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, advance: e.target.value })}
                  required
                />
              </div>
              <div style={{ margin: '16px 0', padding: '12px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', fontWeight: '600' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: 'var(--primary)' }}>
                    ₹{(parseFloat(completeFormData.acres_hours) * parseFloat(completeFormData.rate_per_unit) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--text-primary)' }}
                  onClick={() => setCompletingBooking(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;
