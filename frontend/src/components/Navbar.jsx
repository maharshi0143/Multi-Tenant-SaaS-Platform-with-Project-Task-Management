import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDarkMode(isDark);
    document.body.classList.toggle("theme-dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.body.classList.toggle("theme-dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!user) return null; // Don't show navbar if logged out

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate(user.role === 'super_admin' ? "/tenants" : "/dashboard")}>
        SaaS Platform
      </div>

      <div className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
        <span /><span /><span />
      </div>

      <div className={`navbar-links ${menuOpen ? "active" : ""}`}>
        {/* Regular User & Tenant Admin Links */}
        {user.role !== "super_admin" && (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/projects">Projects</NavLink>
          </>
        )}

        {/* Shared Links */}
        {(user.role === "tenant_admin" || user.role === "super_admin") && (
          <NavLink to="/tasks">Tasks</NavLink>
        )}

        {/* Role-Specific Links */}
        {user.role === "tenant_admin" && (
          <NavLink to="/users">Users</NavLink>
        )}

        {user.role === "super_admin" && (
          <NavLink to="/tenants">Tenants</NavLink>
        )}
      </div>

      <div className="navbar-user">
        <span className="role-badge">{user.role}</span>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {darkMode ? "☀️" : "🌙"}
        </button>
        <div className="user-dropdown" onClick={() => setDropdownOpen(!dropdownOpen)}>
          {user.fullName || user.email}
          <span className="caret">▾</span>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={() => navigate("/profile")}>Profile</button>
              <button onClick={() => navigate("/settings")}>Settings</button>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}