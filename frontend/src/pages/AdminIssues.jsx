import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import "./WardenDashboard.css";

function AdminIssues() {
  const navigate = useNavigate();
  const location = useLocation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hallFilter, setHallFilter] = useState(location.state?.hallFilter || "All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/issues", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setIssues(res.data.issues || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchIssues);

    const socket = connectSocket("global");
    if (socket) {
      socket.on("issue-created", (issue) => {
        setIssues((prev) => [issue, ...prev]);
      });

      socket.on("issue-updated", (issue) => {
        setIssues((prev) => prev.map((item) => (item._id === issue._id ? issue : item)));
      });

      socket.on("issue-deleted", ({ issueId }) => {
        setIssues((prev) => prev.filter((item) => item._id !== issueId));
      });
    }

    return () => {
      if (socket) {
        socket.off("issue-created");
        socket.off("issue-updated");
        socket.off("issue-deleted");
      }
      disconnectSocket();
    };
  }, []);

  const filteredIssues = issues.filter((issue) => {
    const matchStatus = statusFilter === "All" || issue.status === statusFilter;
    const matchCategory = categoryFilter === "All" || issue.category === categoryFilter;
    const matchHall = hallFilter === "All" || issue.hallId?._id === hallFilter;
    const matchSearch = searchQuery === "" || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.issueNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchHall && matchSearch;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending": return "status-pending";
      case "Accepted": return "status-accepted";
      case "In Progress": return "status-in-progress";
      case "Resolved": return "status-resolved";
      case "Rejected": return "status-rejected";
      default: return "status-pending";
    }
  };

  const openDeleteModal = (issue) => {
    setSelectedIssue(issue);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedIssue(null);
  };

  const deleteIssue = async () => {
    if (!selectedIssue) return;

    try {
      await api.delete(`/issues/${selectedIssue._id}`);
      closeDeleteModal();
      fetchIssues();
      notify.success("Issue deleted successfully.");
    } catch (error) {
      console.error(error);
      notify.error("Failed to delete issue.");
    }
  };

  const getStats = () => {
    return {
      total: filteredIssues.length,
      pending: filteredIssues.filter(i => i.status === "Pending").length,
      accepted: filteredIssues.filter(i => i.status === "Accepted").length,
      inProgress: filteredIssues.filter(i => i.status === "In Progress").length,
      resolved: filteredIssues.filter(i => i.status === "Resolved").length,
      rejected: filteredIssues.filter(i => i.status === "Rejected").length,
    };
  };

  const getUniqueHalls = () => {
    const hallMap = new Map();
    issues.forEach(issue => {
      if (issue.hallId && issue.hallId.hallNumber !== undefined) {
        hallMap.set(issue.hallId._id, issue.hallId);
      }
    });
    return Array.from(hallMap.values()).sort((a, b) => a.hallNumber - b.hallNumber);
  };

  const stats = getStats();
  const uniqueHalls = getUniqueHalls();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="warden-dashboard-page">
      <div className="warden-dashboard-header">
        <div>
          <h1>Admin Issue Management</h1>
          <p>View and manage issues across all hostels</p>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card accepted">
          <h3>{stats.accepted}</h3>
          <p>Accepted</p>
        </div>
        <div className="stat-card in-progress">
          <h3>{stats.inProgress}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card resolved">
          <h3>{stats.resolved}</h3>
          <p>Resolved</p>
        </div>
        <div className="stat-card rejected">
          <h3>{stats.rejected}</h3>
          <p>Rejected</p>
        </div>
      </div>

      <div className="filters-section">
        <h5>Filter Issues</h5>
        <div className="filters-row">
          <div className="filter-item">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by title or issue number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Electrical">Electrical</option>
              <option value="Mess">Mess</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Cleanliness">Cleanliness</option>
              <option value="Water">Water</option>
              <option value="Internet">Internet</option>
              <option value="Furniture">Furniture</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Hall</label>
            <select value={hallFilter} onChange={(e) => setHallFilter(e.target.value)}>
              <option value="All">All Halls</option>
              {uniqueHalls.map(hall => (
                <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="no-issues">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No Issues Found</h3>
          <p>Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="issues-grid">
          {filteredIssues.map((issue) => (
            <div key={issue._id} className="issue-card">
              <div className="issue-card-header">
                <div>
                  <h4>{issue.title}</h4>
                  <div className="issue-number">{issue.issueNumber}</div>
                </div>
                <span className={`status-badge ${getStatusClass(issue.status)}`}>
                  {issue.status}
                </span>
              </div>
              <div className="issue-card-body">
                <div className="issue-meta">
                  <span className="meta-badge category-badge">{issue.category}</span>
                  <span className="meta-badge" style={{background: '#f3e8ff', color: '#7c3aed'}}>
                    {issue.hallId?.hallName || 'Unknown Hall'}
                  </span>
                </div>
                <p className="issue-description">{issue.description}</p>
                <div className="issue-info">
                  <div className="issue-info-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {issue.reportedBy?.name}
                  </div>
                  <div className="issue-info-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {issue.roomId?.roomNumber}
                  </div>
                  <div className="issue-info-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="issue-card-footer">
                <div className="action-buttons">
                  <button
                    className="action-btn btn-view"
                    onClick={() => navigate(`/admin/issues/${issue._id}`)}
                  >
                    View Details
                  </button>
                  {issue.status === "Rejected" && (
                    <button
                      className="action-btn btn-delete"
                      onClick={() => openDeleteModal(issue)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && (
        <div className="remark-modal">
          <div className="remark-modal-content">
            <h4>Delete Issue</h4>
            <p style={{ color: "#64748B", marginBottom: "15px" }}>
                Are you sure you want to delete this issue?
              </p>
            <div className="remark-modal-buttons">
              <button className="btn-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="btn-delete" onClick={deleteIssue}>
                Delete Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIssues;
