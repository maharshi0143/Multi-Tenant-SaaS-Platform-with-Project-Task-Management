import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <p style={{ padding: "20px" }}>Checking authentication...</p>;
  }

  // 1. If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if the user's role is allowed for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If Super Admin accidentally hits a tenant route, send them to their dashboard
    if (user.role === 'super_admin') return <Navigate to="/tenants" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}