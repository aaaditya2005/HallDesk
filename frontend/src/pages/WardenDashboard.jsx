import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import "./WardenDashboard.css";

function WardenDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  });
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");

  const hallId = user?.hallId?._id || user?.hallId;

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/issues/warden", {
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

  const fetchUserData = async () => {
    try {
      const res = await api.get("/auth/me");
      const nextUser = res.data.user || {};
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      await fetchUserData();
      if (!isMounted) return;
      await fetchIssues();
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = connectSocket(hallId);

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
  }, [hallId]);

  const filteredIssues = issues.filter((issue) => {
    const matchStatus = statusFilter === "All" || issue.status === statusFilter;
    const matchCategory = categoryFilter === "All" || issue.category === categoryFilter;
    const matchSearch = searchQuery === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.issueNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
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

  const openRemarkModal = (issue, action) => {
    setSelectedIssue(issue);
    setSelectedAction(action);
    setRemark("");
    setRemarkError("");
    setShowRemarkModal(true);
  };

  const closeRemarkModal = () => {
    setShowRemarkModal(false);
    setSelectedIssue(null);
    setSelectedAction("");
    setRemark("");
    setRemarkError("");
  };

  const updateStatus = async () => {
    if (!selectedIssue || !selectedAction) return;

    if (selectedAction === "Rejected" && !remark.trim()) {
      setRemarkError("Rejection remark is required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/issues/${selectedIssue._id}/status`,
        {
          status: selectedAction,
          remark: remark || `Issue marked as ${selectedAction}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      closeRemarkModal();
      fetchIssues();
    } catch (error) {
      console.error(error);
      notify.error(error?.response?.data?.message || "Failed to update issue status.");
    }
  };

  const getStats = () => {
    return {
      total: issues.length,
      pending: issues.filter(i => i.status === "Pending").length,
      accepted: issues.filter(i => i.status === "Accepted").length,
      inProgress: issues.filter(i => i.status === "In Progress").length,
      resolved: issues.filter(i => i.status === "Resolved").length,
      rejected: issues.filter(i => i.status === "Rejected").length,
    };
  };

  const stats = getStats();

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
          <h1>Warden Dashboard</h1>
          <p>
            {user.hallId?.hallName ? `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName}` : 'Manage and track hostel issues'}
          </p>
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
                  {issue.status === "Pending" && (
                    <>
                      <button
                        className="action-btn btn-accept"
                        onClick={() => openRemarkModal(issue, "Accepted")}
                      >
                        ✓ Accept
                      </button>
                      <button
                        className="action-btn btn-reject"
                        onClick={() => openRemarkModal(issue, "Rejected")}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                  {issue.status === "Accepted" && (
                    <button
                      className="action-btn btn-progress"
                      onClick={() => openRemarkModal(issue, "In Progress")}
                    >
                      → In Progress
                    </button>
                  )}
                  {issue.status === "In Progress" && (
                    <button
                      className="action-btn btn-resolve"
                      onClick={() => openRemarkModal(issue, "Resolved")}
                    >
                      ✓ Resolve
                    </button>
                  )}
                  <button
                    className="action-btn btn-view"
                    onClick={() => navigate(`/warden/issues/${issue._id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRemarkModal && (
        <div className="remark-modal">
          <div className="remark-modal-content">
            <h4>
              {selectedAction === "Rejected" ? "Add Rejection Comment" : `Add Remark for ${selectedAction}`}
            </h4>
            <p className="remark-description">
              {selectedAction === "Rejected"
                ? "A rejection comment is required to explain why this issue was rejected."
                : "Add an optional remark for this status update."}
            </p>
            <div className="remark-card">
              <div className="remark-input-group">
                <label>
                  Comment {selectedAction === "Rejected" && <span className="required-label">*</span>}
                </label>
                <textarea
                  placeholder={
                    selectedAction === "Rejected"
                      ? "Enter rejection details..."
                      : "Enter your remark..."
                  }
                  value={remark}
                  onChange={(e) => {
                    setRemark(e.target.value);
                    if (remarkError && e.target.value.trim()) {
                      setRemarkError("");
                    }
                  }}
                />
                {remarkError && <div className="remark-error">{remarkError}</div>}
              </div>
            </div>
            <div className="remark-modal-buttons">
              <button className="btn-cancel" onClick={closeRemarkModal}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={updateStatus}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WardenDashboard;