import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: 52,
      borderBottom: '1px solid #e5e7eb',
      background: '#fff',
    }}>
      <Link to="/dashboard" style={{
        fontWeight: 600,
        fontSize: 15,
        color: '#111',
        textDecoration: 'none',
        letterSpacing: '-0.3px',
      }}>
        TaskFlow
      </Link>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
          {user.role === 'admin' && <Link to="/admin" style={linkStyle}>Admin</Link>}
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user.name}</span>
          <button onClick={handleLogout} style={btnStyle}>Logout</button>
        </div>
      )}
    </nav>
  );
};

const linkStyle = {
  fontSize: 13,
  color: '#374151',
  textDecoration: 'none',
};

const btnStyle = {
  fontSize: 13,
  color: '#374151',
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: 'pointer',
};

export default Navbar;