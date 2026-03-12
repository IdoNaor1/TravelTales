import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeNav = () => setCollapsed(true);

  return (
    <nav className="navbar navbar-expand-md bg-body-tertiary sticky-top shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" onClick={closeNav}>
          ✈ TravelTales
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${collapsed ? '' : ' show'}`}>
          <ul className="navbar-nav me-auto mb-2 mb-md-0">
            <li className="nav-item">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={closeNav}
              >
                Home
              </NavLink>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto mb-2 mb-md-0 align-items-md-center gap-md-1">
            {user ? (
              <>
                <li className="nav-item">
                  <Link
                    to="/create"
                    className="btn btn-primary btn-sm"
                    onClick={closeNav}
                  >
                    + Create Post
                  </Link>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/ai"
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={closeNav}
                  >
                    AI Assistant
                  </NavLink>
                </li>
                <li className="nav-item">
                  <Link
                    to={`/profile/${user._id}`}
                    className="nav-link d-flex align-items-center gap-2"
                    onClick={closeNav}
                  >
                    <Avatar src={user.profilePicture} username={user.username} size={32} />
                    <span>{user.username}</span>
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link text-danger p-0"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={closeNav}
                  >
                    Login
                  </NavLink>
                </li>
                <li className="nav-item">
                  <Link
                    to="/register"
                    className="btn btn-outline-primary btn-sm"
                    onClick={closeNav}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
