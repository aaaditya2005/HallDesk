import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./AdminAnalytics.css";

function AdminAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHall, setSelectedHall] = useState(searchParams.get("hallId") || "All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchIssues = async () => {
    try {
      const res = await api.get("/issues");
      setIssues(res.data.issues || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void Promise.resolve().then(fetchIssues);
  }, []);

  const getUniqueHalls = () => {
    const hallMap = new Map();
    issues.forEach(issue => {
      if (issue.hallId && issue.hallId.hallNumber !== undefined) {
        hallMap.set(issue.hallId._id, issue.hallId);
      }
    });
    return Array.from(hallMap.values()).sort((a, b) => a.hallNumber - b.hallNumber);
  };

  const filterIssues = () => {
    return issues.filter(issue => {
      const matchHall = selectedHall === "All" || issue.hallId?._id === selectedHall;
      const matchCategory = selectedCategory === "All" || issue.category === selectedCategory;
      
      let matchDate = true;
      if (dateRange.start && dateRange.end) {
        const issueDate = new Date(issue.createdAt);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        matchDate = issueDate >= startDate && issueDate <= endDate;
      }
      
      return matchHall && matchCategory && matchDate;
    });
  };

  const filteredIssues = filterIssues();
  const uniqueHalls = getUniqueHalls();

  const getOverallStats = () => {
    return {
      total: filteredIssues.length,
      pending: filteredIssues.filter(i => i.status === "Pending").length,
      accepted: filteredIssues.filter(i => i.status === "Accepted").length,
      inProgress: filteredIssues.filter(i => i.status === "In Progress").length,
      resolved: filteredIssues.filter(i => i.status === "Resolved").length,
      rejected: filteredIssues.filter(i => i.status === "Rejected").length,
    };
  };

  const getHallStats = (hallId) => {
    const hallIssues = filteredIssues.filter(i => i.hallId?._id === hallId);
    const resolved = hallIssues.filter(i => i.status === "Resolved").length;
    const rejected = hallIssues.filter(i => i.status === "Rejected").length;
    const total = hallIssues.length;
    const eligibleForResolution = total - rejected;
    const resolutionRate = eligibleForResolution > 0 ? Math.round((resolved / eligibleForResolution) * 100) : 0;
    
    return {
      total,
      pending: hallIssues.filter(i => i.status === "Pending").length,
      resolved,
      rejected,
      resolutionRate,
    };
  };

  const getCategoryStats = () => {
    const categories = {};
    filteredIssues.forEach(issue => {
      if (!categories[issue.category]) {
        categories[issue.category] = 0;
      }
      categories[issue.category]++;
    });
    
    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: filteredIssues.length > 0 ? Math.round((count / filteredIssues.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  };

  const getCategoryClass = (category) => {
    const lower = category.toLowerCase();
    if (lower === "electrical") return "electrical";
    if (lower === "mess") return "mess";
    if (lower === "infrastructure") return "infrastructure";
    if (lower === "cleanliness") return "cleanliness";
    if (lower === "water") return "water";
    if (lower === "internet") return "internet";
    if (lower === "furniture") return "furniture";
    return "other";
  };

  const handleHallClick = (hallId) => {
    navigate(`/admin/analytics?hallId=${encodeURIComponent(hallId)}`);
    setSelectedHall(hallId);
  };

  const overallStats = getOverallStats();
  const categoryStats = getCategoryStats();

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
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Issue Analytics</h1>
          <p>Track issue performance across all hostels</p>
        </div>
      </div>

      <div className="filters-section">
        <h5>Filter Analytics</h5>
        <div className="filters-row">
          <div className="filter-item">
            <label>Hall</label>
            <select value={selectedHall} onChange={(e) => setSelectedHall(e.target.value)}>
              <option value="All">All Halls</option>
              {uniqueHalls.map(hall => (
                <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
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
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="filter-item">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="overview-stats">
        <div className="stat-card total">
          <h3>{overallStats.total}</h3>
          <p>Total Issues</p>
        </div>
        <div className="stat-card pending">
          <h3>{overallStats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card accepted">
          <h3>{overallStats.accepted}</h3>
          <p>Accepted</p>
        </div>
        <div className="stat-card in-progress">
          <h3>{overallStats.inProgress}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card resolved">
          <h3>{overallStats.resolved}</h3>
          <p>Resolved</p>
        </div>
        <div className="stat-card rejected">
          <h3>{overallStats.rejected}</h3>
          <p>Rejected</p>
        </div>
      </div>

      <h3 style={{ color: "#102A43", marginBottom: "20px", fontWeight: "600" }}>
        Hall-wise Performance
      </h3>
      
      {uniqueHalls.length === 0 ? (
        <div className="no-data">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3>No Hall Data Available</h3>
          <p>Issues need to be associated with halls to view analytics</p>
        </div>
      ) : (
        <div className="halls-grid">
          {uniqueHalls.map(hall => {
            const stats = getHallStats(hall._id);
            
            return (
              <div key={hall._id} className="hall-card" onClick={() => handleHallClick(hall._id)}>
                <div className="hall-card-header">
                  <h3>Hall {hall.hallNumber} - {hall.hallName}</h3>
                  <p>{stats.total} total issues</p>
                </div>
                <div className="hall-card-body">
                  <div className="hall-stats">
                    <div className="hall-stat-item resolved">
                      <h4>{stats.resolved}</h4>
                      <p>Resolved</p>
                    </div>
                    <div className="hall-stat-item rejected">
                      <h4>{stats.rejected}</h4>
                      <p>Rejected</p>
                    </div>
                    <div className="hall-stat-item">
                      <h4>{stats.resolutionRate}%</h4>
                      <p>Resolution Rate</p>
                    </div>
                  </div>
                  <div className="hall-performance">
                    <h5>Resolution Rate</h5>
                    <div className="performance-bar">
                      <div 
                        className="performance-fill" 
                        style={{ width: `${stats.resolutionRate}%` }}
                      />
                    </div>
                    <div className="performance-text">{stats.resolutionRate}% resolved</div>
                  </div>
                </div>
                <div className="hall-card-footer">
                  <span className="last-updated">Click to view details</span>
                  <button
                    className="view-details-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate("/admin/issues", { state: { hallFilter: hall._id } });
                    }}
                  >
                    View Issues →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="category-breakdown">
        <h3>Category Breakdown</h3>
        {categoryStats.length === 0 ? (
          <div className="no-data">
            <p>No category data available</p>
          </div>
        ) : (
          <div className="category-grid">
            {categoryStats.map(({ category, count, percentage }) => (
              <div key={category} className={`category-card ${getCategoryClass(category)}`}>
                <h4>{category}</h4>
                <p className="count">{count}</p>
                <p className="percentage">{percentage}% of total</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAnalytics;
