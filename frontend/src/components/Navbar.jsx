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
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">TaskFlow</Link>
      <div className="navbar-links">
        {user && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <span className="navbar-user">{user.name}</span>
            <button onClick={handleLogout} className="btn btn-sm btn-outline">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
