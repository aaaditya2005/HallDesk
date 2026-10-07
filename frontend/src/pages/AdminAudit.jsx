import { useEffect, useState } from "react";
import api from "../services/api";
import "./AdminAudit.css";

const detailLabels = { description: "", username: "Username", role: "Role", roomNumber: "Room", hallNumber: "Hall", count: "Count", bulk: "Bulk transfer", method: "Method", path: "Path", statusCode: "Status", issueNumber: "Issue Number", title: "Title", reportedByName: "Reported By", assignedToName: "Assigned To", status: "Status", remark: "Remark", deletionReason: "Deletion Reason" };

const formatDetails = (details) => {
  const readable = Object.entries(details || {}).filter(([key]) => !key.toLowerCase().endsWith("id"));
  if (!readable.length) return "Action completed.";
  return readable.map(([key, value]) => {
    const label = detailLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
    if (!label) return String(value);
    return `${label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : value}`;
  }).join("; ");
};

function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (roleFilter !== "All") params.set("role", roleFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const query = params.toString();
    api.get(`/audit/admin${query ? `?${query}` : ""}`)
      .then((response) => setLogs(response.data.logs || []))
      .catch((loadError) => setError(loadError.response?.data?.message || "Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, [roleFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setRoleFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  if (loading) return <div className="admin-audit-loading"><div className="spinner-border" role="status" /></div>;
  return <div className="admin-audit-page">
    <header className="admin-audit-header"><div><h1>Audit Logs</h1><p>Track user actions across the system.</p></div><strong>{logs.length} records</strong></header>
    {error && <div className="alert alert-danger">{error}</div>}
    <section className="admin-audit-filters" aria-label="Audit filters"><div className="admin-audit-filter-row"><div className="admin-audit-field admin-audit-role-field"><label htmlFor="audit-role-filter">Role</label><select id="audit-role-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="All">All users</option><option value="admin">Admins</option><option value="warden">Wardens</option><option value="student">Students</option><option value="mess_manager">Mess managers</option></select></div><div className="admin-audit-field"><label htmlFor="audit-date-from">From</label><input id="audit-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div><div className="admin-audit-field"><label htmlFor="audit-date-to">To</label><input id="audit-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div><button type="button" className="admin-audit-clear" onClick={clearFilters}>Clear filters</button></div></section>
    <div className="admin-audit-table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log._id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.actor?.name || log.actor?.username || "Unknown"}</td><td>{log.actor?.role || "-"}</td><td>{log.action}</td><td>{log.entity}</td><td>{formatDetails(log.details)}</td></tr>) : <tr><td colSpan="6" className="admin-audit-empty">No audit records yet.</td></tr>}</tbody></table></div>
  </div>;
}

export default AdminAudit;
