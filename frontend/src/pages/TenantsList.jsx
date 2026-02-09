import { useEffect, useState } from "react";
import axios from "../api/axios";
import Navbar from "../components/Navbar";
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

    const handleStatusChange = async (tenantId, newStatus) => {
        try {
            await axios.put(`/tenants/${tenantId}`, { status: newStatus });
            // Update local state
            setTenants(tenants.map(t =>
                t.id === tenantId ? { ...t, status: newStatus } : t
            ));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    if (loading) return (<><Navbar /><div className="loading-text">Loading System Organizations...</div></>);

    return (
        <>
        <Navbar />
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
                                        {t.subscriptionPlan}
                                    </span>
                                </td>
                                <td>{t.totalUsers}</td>
                                <td>{t.totalProjects}</td>
                                <td>
                                    <select
                                        value={t.status}
                                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                        className={`status-select ${t.status}`}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            backgroundColor: t.status === 'active' ? '#dcfce7' : t.status === 'suspended' ? '#fee2e2' : '#f3f4f6',
                                            color: t.status === 'active' ? '#166534' : t.status === 'suspended' ? '#991b1b' : '#374151'
                                        }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="trial">Trial</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </>
    );
}
