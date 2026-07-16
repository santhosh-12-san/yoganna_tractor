import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const CustomersList = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { lastMessage } = useWebSocket();

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers/');
      setCustomers(response.data);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError('Could not load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Sync list with WebSocket messages
  useEffect(() => {
    if (lastMessage && (lastMessage.type.startsWith("CUSTOMER_"))) {
      fetchCustomers();
    }
  }, [lastMessage]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`/api/customers/${id}/`);
        // List will auto refresh via websocket or we can do it manually
        fetchCustomers();
      } catch (err) {
        console.error("Error deleting customer:", err);
        alert("Failed to delete customer. Ensure they do not have active bookings.");
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.village.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <Link to="/customers/add" className="btn btn-primary">
          <Plus size={16} />
          <span>Add Customer</span>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>Loading customers...</div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Village</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c, idx) => (
              <tr key={c.id}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: '600' }}>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.village}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => navigate(`/customers/edit/${c.id}`)} 
                      className="btn-icon"
                      title="Edit Customer"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)} 
                      className="btn-icon delete"
                      title="Delete Customer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CustomersList;
