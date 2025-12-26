import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tenantName: "",
    subdomain: "",
    adminEmail: "",
    adminFullName: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = value;
    if (name === 'subdomain') {
      val = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : val,
    }));
  };

  const validate = () => {
    if (!form.tenantName.trim()) return "Organization name is required";
    if (!form.subdomain.trim()) return "Subdomain is required";
    if (!form.adminEmail.includes("@")) return "Valid admin email is required";
    if (!form.adminFullName.trim()) return "Admin full name is required";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.acceptTerms) return "You must accept Terms & Conditions";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register-tenant", {
        tenantName: form.tenantName,
        subdomain: form.subdomain.toLowerCase(),
        adminEmail: form.adminEmail,
        adminFullName: form.adminFullName,
        adminPassword: form.password,
      });

      setSuccess("Tenant registered successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <h2>Register Organization</h2>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="form-group">
          <label htmlFor="tenantName">Organization Name</label>
          <input
            id="tenantName"
            name="tenantName"
            placeholder="Acme Inc."
            value={form.tenantName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="subdomain">Subdomain</label>
          <input
            id="subdomain"
            name="subdomain"
            placeholder="acme"
            value={form.subdomain}
            onChange={handleChange}
          />
          {form.subdomain && (
            <span className="subdomain-preview">
              {form.subdomain}.yourapp.com
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="adminFullName">Admin Full Name</label>
          <input
            id="adminFullName"
            name="adminFullName"
            placeholder="John Doe"
            value={form.adminFullName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="adminEmail">Admin Email</label>
          <input
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@acme.com"
            value={form.adminEmail}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.password}
              onChange={handleChange}
            />
            <span
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.8rem',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <div className="checkbox">
          <input
            type="checkbox"
            id="acceptTerms"
            name="acceptTerms"
            checked={form.acceptTerms}
            onChange={handleChange}
          />
          <label htmlFor="acceptTerms" style={{ margin: 0, fontWeight: 400 }}>
            I agree to the Terms & Conditions
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="auth-footer">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </div>
      </form>
    </div>
  );
}

