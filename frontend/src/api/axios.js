import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "http://backend:5000/api");

const instance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});

// Attach JWT automatically
instance.interceptors.request.use((config) => {
  // Support both persistent (localStorage) and session (sessionStorage) tokens
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response interceptor: logout on 401
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Don't redirect if we are already on login page or if the error is from the login endpoint itself
      const isLoginRequest = err.config.url.includes('/auth/login');
      const isLoginPage = window.location.pathname === '/login';

      if (!isLoginRequest && !isLoginPage) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        try { window.location.href = '/login'; } catch (e) { }
      }
    }
    return Promise.reject(err);
  }
);

export default instance;
