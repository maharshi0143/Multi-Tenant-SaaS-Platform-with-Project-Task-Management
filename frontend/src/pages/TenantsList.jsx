import { useEffect, useState } from "react";
import axios from "../api/axios";
import "./Tenants.css";

export default function TenantsList() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const res = await axios.get("/tenants");
                setTenants(res.data.data.tenants);
            } catch (err) {
                console.error("Failed to fetch tenants", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTenants();
    }, []);

    if (loading) return <div className="loading-text">Loading System Organizations...</div>;

    return (
        <div className="tenants-page">
            <h1 className="page-title">System Administration: Tenants</h1>
            <div className="tenants-card">
                <table className="tenants-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Subdomain</th>
                            <th>Plan</th>
                            <th>Users</th>
                            <th>Projects</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map(t => (
                            <tr key={t.id}>
                                <td>{t.name}</td>
                                <td>{t.subdomain}</td>
                                <td>
                                    <span className="role-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                                        {t.subscription_plan}
                                    </span>
                                </td>
                                <td>{t.totalUsers}</td>
                                <td>{t.totalProjects}</td>
                                <td>
                                    <span className={`status ${t.status}`}>
                                        {t.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
