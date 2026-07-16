import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { lastMessage } = useWebSocket();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Fuel',
    description: '',
    amount: ''
  });

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('/api/expenses/');
      setExpenses(response.data);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError('Could not load expenses data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type.startsWith("EXPENSE_")) {
      fetchExpenses();
    }
  }, [lastMessage]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/expenses/', formData);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Fuel',
        description: '',
        amount: ''
      });
      fetchExpenses();
    } catch (err) {
      console.error("Error logging expense:", err);
      alert("Failed to save expense details.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await axios.delete(`/api/expenses/${id}/`);
        fetchExpenses();
      } catch (err) {
        console.error("Error deleting expense:", err);
        alert("Failed to delete expense.");
      }
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.category.toLowerCase().includes(search.toLowerCase()) || 
    exp.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {showForm && (
        <div className="form-container" style={{ marginBottom: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>Log Business Expense</h3>
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
              <label>Category</label>
              <select
                name="category"
                className="form-control"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="Fuel">Fuel</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Wages">Wages</option>
                <option value="Repair">Repair</option>
                <option value="Tyre">Tyre</option>
                <option value="Spare Parts">Spare Parts</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label>Description</label>
              <input
                type="text"
                name="description"
                className="form-control"
                placeholder="Expense description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                name="amount"
                className="form-control"
                placeholder="Amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
              Save Expense
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
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Expense</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>Loading expenses...</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontWeight: '600' }}>{exp.category}</td>
                  <td>{exp.description}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>₹{parseFloat(exp.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(exp.id)} 
                      className="btn-icon delete"
                      title="Delete Expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Expenses;
