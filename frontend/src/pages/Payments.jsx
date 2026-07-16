import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  const role = localStorage.getItem('user_role');
  const isOwner = role === 'OWNER';

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer: '',
    booking: '',
    total_amount: '',
    paid_amount: '',
    mode: 'Cash'
  });

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/api/payments/');
      setPayments(response.data);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError('Could not load payments details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    if (!isOwner) return;
    try {
      const [custRes, bookRes] = await Promise.all([
        axios.get('/api/customers/'),
        axios.get('/api/bookings/')
      ]);
      setCustomers(custRes.data);
      // Only show unpaid bookings
      setBookings(bookRes.data.filter(b => b.status !== 'Cancelled'));
    } catch (err) {
      console.error("Error loading forms metadata:", err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchFormMetadata();
  }, [isOwner]);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("PAYMENT_")) {
      fetchPayments();
    }
  }, [lastMessage]);

  // Auto-populate booking amount if selected in form
  useEffect(() => {
    if (formData.booking) {
      const selectedBooking = bookings.find(b => b.id.toString() === formData.booking);
      if (selectedBooking) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedBooking.total_amount,
          customer: selectedBooking.customer.toString(),
          paid_amount: selectedBooking.advance // Default paid is booking advance
        }));
      }
    }
  }, [formData.booking, bookings]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        customer: parseInt(formData.customer),
        booking: formData.booking ? parseInt(formData.booking) : null
      };
      await axios.post('/api/payments/', payload);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        customer: '',
        booking: '',
        total_amount: '',
        paid_amount: '',
        mode: 'Cash'
      });
      fetchPayments();
    } catch (err) {
      console.error("Error saving payment details:", err);
      alert("Failed to log payment transaction.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment transaction?")) {
      try {
        await axios.delete(`/api/payments/${id}/`);
        fetchPayments();
      } catch (err) {
        console.error("Error deleting payment log:", err);
        alert("Failed to delete transaction.");
      }
    }
  };

  const filteredPayments = payments.filter(p => 
    isOwner 
      ? (p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.mode.toLowerCase().includes(search.toLowerCase()))
      : p.mode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {isOwner && showForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>Log Customer Payment Receipt</h3>
            <button onClick={() => setShowForm(false)} className="btn-icon" style={{ color: 'var(--danger)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input
                type="date"
                name="date"
                className="form-control"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Unpaid Booking (Optional)</label>
              <select
                name="booking"
                className="form-control"
                value={formData.booking}
                onChange={handleInputChange}
              >
                <option value="">-- Direct Customer Payment --</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>{b.customer_name} - {b.work_type} (₹{parseFloat(b.total_amount).toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Customer</label>
              <select
                name="customer"
                className="form-control"
                value={formData.customer}
                onChange={handleInputChange}
                required
                disabled={!!formData.booking} // Locked if booking is selected
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Total Billed Amount (₹)</label>
              <input
                type="number"
                name="total_amount"
                className="form-control"
                placeholder="Total Amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                required
                disabled={!!formData.booking}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Paid Amount (₹)</label>
              <input
                type="number"
                name="paid_amount"
                className="form-control"
                placeholder="Paid Amount"
                value={formData.paid_amount}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Payment Mode</label>
              <select
                name="mode"
                className="form-control"
                value={formData.mode}
                onChange={handleInputChange}
                required
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              Save Payment
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <div className="table-controls">
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
              placeholder={isOwner ? "Search payments..." : "Search payment mode..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {isOwner && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Payment</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>Loading payments history...</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                {isOwner && <th>Customer</th>}
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Pending Amount</th>
                <th>Mode</th>
                {isOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  {isOwner && <td style={{ fontWeight: '600' }}>{p.customer_name}</td>}
                  <td>₹{parseFloat(p.total_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{parseFloat(p.paid_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: parseFloat(p.pending_amount) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: parseFloat(p.pending_amount) > 0 ? 'bold' : 'normal' }}>
                    ₹{parseFloat(p.pending_amount).toLocaleString('en-IN')}
                  </td>
                  <td>{p.mode}</td>
                  {isOwner && (
                    <td>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className="btn-icon delete"
                        title="Delete Payment Log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={isOwner ? 7 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No payments logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Payments;
