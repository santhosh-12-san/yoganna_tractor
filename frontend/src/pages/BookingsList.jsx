import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, Calendar, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
                    <div className="action-buttons">
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
    </div>
  );
};

export default BookingsList;
