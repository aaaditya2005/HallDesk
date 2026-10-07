import { useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import "./WardenNotices.css";

function StudentNotices() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  });
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // attachments are download-only; no inline preview/modal

  const fetchNotices = async () => {
    try {
      const params = { status: statusFilter };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      
      const res = await api.get("/notices", { params });
      setNotices(res.data.notices || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize user once on mount so we have hallId for socket room
  useEffect(() => {
    let isMounted = true;
    const initializeUser = async () => {
      try {
        const res = await api.get('/auth/me');
        const nextUser = res.data.user || {};
        if (!isMounted) return;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      } catch {
        // keep existing user from localStorage if request fails
      }
    };
    initializeUser();
    return () => { isMounted = false; };
  }, []);

  const hallId = user?.hallId?._id || user?.hallId;

  // Fetch notices whenever filters or hallId change
  useEffect(() => {
    void Promise.resolve().then(fetchNotices);
  }, [statusFilter, startDate, endDate, hallId]);

  // Socket connection: join hall room and listen for real-time events
  useEffect(() => {
    if (!hallId) return;
    const socket = connectSocket(hallId);

    socket.on("notice-created", (notice) => {
      console.log('Socket event notice-created received (student):', notice);
      setNotices((prev) => [notice, ...prev]);
    });

    socket.on("notice-updated", (notice) => {
      console.log('Socket event notice-updated received (student):', notice);
      setNotices((prev) => prev.map((item) => (item._id === notice._id ? notice : item)));
    });

    socket.on("notice-deleted", ({ noticeId }) => {
      console.log('Socket event notice-deleted received (student):', noticeId);
      setNotices((prev) => prev.filter((item) => item._id !== noticeId));
    });

    return () => {
      if (socket) {
        socket.off("notice-created");
        socket.off("notice-updated");
        socket.off("notice-deleted");
      }
      disconnectSocket();
    };
  }, [hallId]);

  // attachments are download-only; no server HEAD checks or image modal

  const downloadAttachment = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Unable to fetch attachment.");
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "notice-file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      notify.error("Unable to download attachment. Please try again.");
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "active";
      case "Expired":
        return "expired";
      default:
        return "";
    }
  };

  const filteredNotices = notices.filter((notice) => notice.status === statusFilter);

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
    <div className="warden-notices-page">
      <div className="warden-notices-header">
        <h1>Notices</h1>
        <p>View notices and announcements from your hall</p>
      </div>

      <div className="filters-section">
        <h5>Filter Notices</h5>
        <div className="filters-row">
          <div className="filter-item">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="notices-grid">
        {filteredNotices.length === 0 ? (
          <div className="no-notices">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No Notices Found</h3>
            <p>There are no notices matching your filters.</p>
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div key={notice._id} className="notice-card">
              <div className="notice-card-header">
                <div className="notice-number">{notice.noticeNumber}</div>
                <span className={`status-badge ${getStatusClass(notice.status)}`}>
                  {notice.status}
                </span>
              </div>
              <div className="notice-card-body">
                <h3>{notice.title}</h3>
                <p className="notice-description">{notice.description}</p>
                {notice.attachmentUrl && notice.attachmentUrl.length > 0 && (
                  <div className="notice-attachments">
                    <h4>Attachments:</h4>
                    <div className="attachments-list">
                      {(Array.isArray(notice.attachmentUrl) ? notice.attachmentUrl : [notice.attachmentUrl]).map((url, idx) => {
                        const filename = Array.isArray(notice.attachment) ? notice.attachment[idx] : (notice.attachment || '').split('/').pop();
                        return (
                          <div key={idx} className="attachment-item">
                            <div className="attachment-entry">
                              <span className="attachment-filename">📎 {filename || 'Download file'}</span>
                              <button
                                className="attachment-download"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await downloadAttachment(url, filename);
                                }}
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="notice-card-footer">
                <div className="notice-meta">
                  <span className="meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {notice.createdBy?.name}
                  </span>
                  <span className="meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </span>
                  {notice.expiresAt && (
                    <span className="meta-item">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Expires: {new Date(notice.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* attachments are download-only; no modal */}
    </div>
  );
}

export default StudentNotices;
