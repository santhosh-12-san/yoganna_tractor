import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, X, MessageSquare } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useLanguage } from '../context/LanguageContext';

const Payments = () => {
  const { t } = useLanguage();
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

  const handleSendWhatsAppReceipt = (p) => {
    let rawPhone = p.customer_phone || p.customer?.phone || '';
    if (!rawPhone && p.customer && customers.length > 0) {
      const foundCustomer = customers.find(c => c.id === p.customer || c.name === p.customer_name);
      if (foundCustomer) rawPhone = foundCustomer.phone;
    }
    
    if (!rawPhone) {
      alert("Customer mobile number is missing for this payment record.");
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const dateStr = new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const total = parseFloat(p.total_amount).toLocaleString('en-IN');
    const paid = parseFloat(p.paid_amount).toLocaleString('en-IN');
    const pending = parseFloat(p.pending_amount).toLocaleString('en-IN');
    
    const message = `ನಮಸ್ಕಾರ ${p.customer_name || 'ಗ್ರಾಹಕರೇ'}! 🚜\n\nಯೋಗಣ್ಣ ಟ್ರಾಕ್ಟರ್ ಸೇವೆಯ ಪಾವತಿ ರಶೀದಿ (${dateStr}):\n---------------------------\n• ಒಟ್ಟು ದರ: ₹${total}\n• ಪಾವತಿಸಿದ ಮೊತ್ತ: ₹${paid}\n• ಬಾಕಿ ಮೊತ್ತ: ₹${pending}\n• ಪಾವತಿ ವಿಧಾನ: ${p.mode}\n---------------------------\nಧನ್ಯವಾದಗಳು! ಯೋಗಣ್ಣ ಟ್ರಾಕ್ಟರ್ ಸೇವೆಗಳು.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTogglePaymentStatus = async (p) => {
    const isPending = parseFloat(p.pending_amount) > 0;
    const newPaidAmount = isPending ? p.total_amount : '0.00';
    try {
      await axios.patch(`/api/payments/${p.id}/`, { paid_amount: newPaidAmount });
      fetchPayments();
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to update payment status.");
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
              <label>Select Booking</label>
              <select
                name="booking"
                className="form-control"
                value={formData.booking}
                onChange={handleInputChange}
              >
                <option value="">-- Manual Payment (No Booking) --</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    #{b.id} - {b.customer_name} ({b.work_type} - ₹{b.total_amount})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Customer</label>
              <select
                name="customer"
                className="form-control"
                value={formData.customer}
                onChange={handleInputChange}
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
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
              {t('Save Booking')}
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
              placeholder={t('Search bookings...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {isOwner && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>{t('Add Payment')}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>{t('Loading bookings...')}</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Date')}</th>
                {isOwner && <th>{t('Customer')}</th>}
                <th>{t('Total Amount')}</th>
                <th>{t('Paid Amount')}</th>
                <th>{t('Pending Amount')}</th>
                <th>{t('Mode')}</th>
                <th>{t('Status')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  {isOwner && <td style={{ fontWeight: '600' }}>{p.customer_name}</td>}
                  <td>₹{parseFloat(p.total_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#4ade80', fontWeight: 'bold' }}>₹{parseFloat(p.paid_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: parseFloat(p.pending_amount) > 0 ? '#f87171' : 'rgba(255, 255, 255, 0.5)', fontWeight: parseFloat(p.pending_amount) > 0 ? 'bold' : 'normal' }}>
                    ₹{parseFloat(p.pending_amount).toLocaleString('en-IN')}
                  </td>
                  <td>{t(p.mode)}</td>
                  <td>
                    {parseFloat(p.pending_amount) > 0 ? (
                      <span className="badge pending" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {t('Pending')}
                      </span>
                    ) : (
                      <span className="badge completed" style={{ background: 'rgba(52, 168, 83, 0.2)', color: '#4ade80', border: '1px solid rgba(52, 168, 83, 0.3)' }}>
                        {t('Completed')}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isOwner && (
                        <button 
                          onClick={() => handleTogglePaymentStatus(p)} 
                          className="btn"
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '0.78rem', 
                            fontWeight: '700',
                            borderRadius: '8px',
                            backgroundColor: parseFloat(p.pending_amount) > 0 ? '#34a853' : 'rgba(255, 255, 255, 0.12)', 
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title={parseFloat(p.pending_amount) > 0 ? t('Mark as Fully Paid') : t('Mark as Pending')}
                        >
                          {parseFloat(p.pending_amount) > 0 ? `✓ ${t('Mark Paid')}` : `↺ ${t('Set Pending')}`}
                        </button>
                      )}

                      <button 
                        onClick={() => handleSendWhatsAppReceipt(p)} 
                        className="btn-icon"
                        style={{ background: 'rgba(37, 211, 102, 0.2)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.4)' }}
                        title={t('Send WhatsApp Receipt')}
                      >
                        <MessageSquare size={16} />
                      </button>

                      {isOwner && (
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="btn-icon delete"
                          title="Delete Payment Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={isOwner ? 8 : 7} style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>{t('No payments found.')}</td>
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
