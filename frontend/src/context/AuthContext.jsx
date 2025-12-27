import { createContext, useEffect, useState } from "react";
import axios from "../api/axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user using JWT
  const loadUser = async () => {
    try {
      const res = await axios.get("/auth/me");
      const data = res.data.data;


      const userData = {
        ...data,
        tenantId: data.tenantId || data.tenant_id || null,
      };

      setUser(userData);

      // Token Expiry Logic
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload && payload.exp) {
            const expiresAt = payload.exp * 1000;
            const ms = expiresAt - Date.now();
            if (ms > 0) {
              if (window.__logoutTimer) clearTimeout(window.__logoutTimer);
              window.__logoutTimer = setTimeout(() => {
                logout();
                window.location.href = '/login';
              }, ms + 500);
            } else {
              logout();
            }
          }
        } catch (e) { /* ignore decode errors */ }
      }
      return userData;
    } catch (err) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (payload, remember = true) => {
    try {
      // API 2: User Login
      const res = await axios.post("/auth/login", payload);
      const { token, user: loginUser } = res.data.data;

      // Store the token immediately
      if (remember) localStorage.setItem("token", token);
      else sessionStorage.setItem("token", token);

      // Update local state with normalized data to prevent the loop
      const normalizedUser = {
        ...loginUser,
        tenantId: loginUser.tenantId || loginUser.tenant_id || null
      };

      setUser(normalizedUser);

      // Return the user so LoginPage can perform navigate()
      return normalizedUser;
    } catch (error) {
      // Clear storage on failure to prevent stale data
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      throw error;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    if (window.__logoutTimer) {
      clearTimeout(window.__logoutTimer);
      window.__logoutTimer = null;
    }
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) loadUser();
    else setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}