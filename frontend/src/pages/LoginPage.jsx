import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    tenantSubdomain: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginData = {
        email: form.email.trim(),
        password: form.password,
        tenantSubdomain: !form.tenantSubdomain.trim() || form.tenantSubdomain.trim().toLowerCase() === "null"
          ? null
          : form.tenantSubdomain.trim()
      };

      const user = await login(loginData, remember);

      if (user && user.role === 'super_admin') {
        // Fix: Redirect to Dashboard like other users
        navigate("/dashboard");
      } else if (user) {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Login</h2>

        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            placeholder="name@company.com"
            type="email"
            required
            onChange={handleChange}
            value={form.email}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            onChange={handleChange}
            value={form.password}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tenantSubdomain">Organization Subdomain</label>
          <input
            id="tenantSubdomain"
            name="tenantSubdomain"
            placeholder="e.g. demo (Leave empty for Super Admin)"
            onChange={handleChange}
            value={form.tenantSubdomain}
          />
        </div>

        <div className="checkbox">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember" style={{ margin: 0, fontWeight: 400 }}>Remember me</label>
        </div>

        <button disabled={loading} type="submit">
          {loading ? "Logging in..." : "Login to Account"}
        </button>

        <div className="auth-footer">
          Don’t have an organization?{" "}
          <span onClick={() => navigate("/register")}>
            Register here
          </span>
        </div>
      </form>
    </div>
  );
}
