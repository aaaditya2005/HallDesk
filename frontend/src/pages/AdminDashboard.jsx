import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../services/dashboardService";
import "./AdminDashboard.css";

const initialData = { totals: {}, pending: {}, roleCounts: {}, genderCounts: {}, yearCounts: {}, halls: [] };

function AdminDashboard() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then((response) => setData(response.data.data || initialData))
      .catch((loadError) => setError(loadError.response?.data?.message || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-dashboard-loading"><div className="spinner-border" role="status" /></div>;

  const { totals, pending, roleCounts, genderCounts, yearCounts, halls } = data;
  const bedTotal = (totals.occupiedBeds || 0) + (totals.availableBeds || 0);
  const occupancy = bedTotal ? Math.round((totals.occupiedBeds / bedTotal) * 100) : 0;

  return <div className="admin-dashboard-page">
    <header className="admin-dashboard-header"><div><span className="admin-dashboard-kicker">SYSTEM OVERVIEW</span><h1>Admin Dashboard</h1><p>Monitor users, halls, rooms, and pending work.</p></div><div className="admin-dashboard-actions"><Link to="/admin/users">Manage Users</Link><Link to="/admin/halls">Manage Halls</Link><Link to="/admin/rooms">Manage Rooms</Link></div></header>
    {error && <div className="alert alert-danger">{error}</div>}
    <section className="admin-dashboard-stats">
      <Stat label="Total Users" value={totals.users || 0} tone="navy" />
      <Stat label="Students" value={totals.students || 0} tone="blue" />
      <Stat label="Wardens" value={totals.wardens || 0} tone="gold" />
      <Stat label="Mess Managers" value={totals.messManagers || 0} tone="green" />
      <Stat label="Halls" value={totals.halls || 0} tone="slate" />
      <Stat label="Rooms" value={totals.rooms || 0} tone="teal" />
    </section>
    <div className="admin-dashboard-main-grid">
      <section className="admin-dashboard-panel"><div className="admin-dashboard-panel-heading"><div><h2>Bed Occupancy</h2><p>Across all configured halls</p></div><strong>{occupancy}%</strong></div><div className="admin-dashboard-progress"><span style={{ width: `${occupancy}%` }} /></div><div className="admin-dashboard-legend"><span><i className="occupied" />{totals.occupiedBeds || 0} occupied</span><span><i className="available" />{totals.availableBeds || 0} available</span></div></section>
      <section className="admin-dashboard-panel"><h2>User Breakdown</h2><p className="admin-dashboard-panel-subtitle">Current accounts by role</p><div className="admin-dashboard-breakdown"><Breakdown label="Students" value={roleCounts.student || 0} total={totals.users || 1} /><Breakdown label="Wardens" value={roleCounts.warden || 0} total={totals.users || 1} /><Breakdown label="Mess managers" value={roleCounts.mess_manager || 0} total={totals.users || 1} /><Breakdown label="Admins" value={roleCounts.admin || 0} total={totals.users || 1} /></div></section>
    </div>
    <section className="admin-dashboard-panel admin-dashboard-work"><div className="admin-dashboard-panel-heading"><div><h2>Pending Work</h2><p>Items requiring attention</p></div><Link to="/admin/analytics">View analytics</Link></div><div className="admin-dashboard-pending"><Pending label="Open issues" value={pending.issues || 0} /><Pending label="Pending fines" value={pending.fines || 0} /><Pending label="Certificates" value={pending.certificates || 0} /></div></section>
    <section className="admin-dashboard-panel"><div className="admin-dashboard-panel-heading"><div><h2>Hall Snapshot</h2><p>Rooms and occupancy by hall</p></div><Link to="/admin/halls">View halls</Link></div><div className="admin-dashboard-halls">{halls.length ? halls.map((hall) => <div className="admin-dashboard-hall" key={hall._id}><div><strong>Hall {hall.hallNumber}</strong><span>{hall.hallName}</span></div><div><b>{hall.roomCount}</b><small> rooms</small></div><div><b>{hall.occupiedBeds}</b><small> occupied</small></div></div>) : <p>No halls configured yet.</p>}</div></section>
    <section className="admin-dashboard-mini-grid"><div className="admin-dashboard-panel"><h2>Students by Gender</h2><p className="admin-dashboard-panel-subtitle">Male: {genderCounts.Male || 0} &nbsp; Female: {genderCounts.Female || 0}</p></div><div className="admin-dashboard-panel"><h2>Students by Year</h2><p className="admin-dashboard-panel-subtitle">{[1, 2, 3, 4].map((year) => `Year ${year}: ${yearCounts[year] || 0}`).join("  ·  ")}</p></div></section>
  </div>;
}

function Stat({ label, value, tone }) { return <div className={`admin-dashboard-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function Breakdown({ label, value, total }) { return <div className="admin-dashboard-breakdown-row"><span>{label}</span><strong>{value}</strong><div><i style={{ width: `${Math.min((value / total) * 100, 100)}%` }} /></div></div>; }
function Pending({ label, value }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

export default AdminDashboard;
