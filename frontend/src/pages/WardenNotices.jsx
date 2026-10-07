import { useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import "./WardenNotices.css";

function WardenNotices() {
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

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const hallId = user?.hallId?._id || user?.hallId;

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

  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      try {
        const res = await api.get("/auth/me");
        const nextUser = res.data.user || {};
        if (!isMounted) return;
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
      } catch (error) {
        console.error(error);
      }
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchNotices);
  }, [statusFilter, startDate, endDate, hallId]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("notice-created", (notice) => {
        setNotices((prev) => [notice, ...prev]);
      });

      socket.on("notice-updated", (notice) => {
        setNotices((prev) => prev.map((item) => (item._id === notice._id ? notice : item)));
      });

      socket.on("notice-deleted", ({ noticeId }) => {
        setNotices((prev) => prev.filter((item) => item._id !== noticeId));
      });
    }

    return () => {
      if (socket) {
        socket.off("notice-created");
        socket.off("notice-updated");
        socket.off("notice-deleted");
      }
      disconnectSocket();
    };
  }, [hallId]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    // merge with existing attachments but limit to 2 total
    const combined = [...attachments, ...files].slice(0, 2);

    for (const file of combined) {
      if (!validTypes.includes(file.type)) {
        notify.error("Please upload valid images (JPEG, PNG, GIF, WebP) or PDF files.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        notify.error("Each file must be <= 2MB.");
        return;
      }
    }

    setAttachments(combined);
    setPreviewUrls(combined.map(f => f.type === 'application/pdf' ? f.name : URL.createObjectURL(f)));
  };

  const removeAttachment = (index) => {
    const next = attachments.slice();
    const nextPreviews = previewUrls.slice();
    if (next[index]?.type !== 'application/pdf') {
      URL.revokeObjectURL(nextPreviews[index]);
    }
    next.splice(index, 1);
    nextPreviews.splice(index, 1);
    setAttachments(next);
    setPreviewUrls(nextPreviews);
  };

  // no inline preview; attachments are download-only

  const openCreateModal = () => {
    console.log("Opening create modal - setting showModal to true");
    setModalMode("create");
    setTitle("");
    setDescription("");
    setExpiresAt("");
    setAttachments([]);
    setPreviewUrls([]);
    setShowModal(true);
  };

  const openEditModal = (notice) => {
    setModalMode("edit");
    setSelectedNotice(notice);
    setTitle(notice.title);
    setDescription(notice.description);
    setExpiresAt(notice.expiresAt ? notice.expiresAt.split('T')[0] : "");
    setAttachments([]);
    setPreviewUrls(notice.attachmentUrl ? (Array.isArray(notice.attachmentUrl) ? notice.attachmentUrl : [notice.attachmentUrl]) : []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNotice(null);
    setTitle("");
    setDescription("");
    setExpiresAt("");
    setAttachments([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (title.trim().length < 5) {
      notify.warning("Title must be at least 5 characters.");
      return;
    }

    if (description.trim().length < 15) {
      notify.warning("Description must be at least 15 characters.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (expiresAt) formData.append("expiresAt", expiresAt);
      // append up to 2 attachments
      if (attachments && attachments.length) {
        attachments.slice(0,2).forEach((file) => {
          formData.append("attachments", file);
        });
      }

      if (modalMode === "create") {
        await api.post("/notices", formData);
        notify.success("Notice created successfully.");
      } else {
        await api.put(`/notices/${selectedNotice._id}`, formData);
        notify.success("Notice updated successfully.");
      }

      closeModal();
      fetchNotices();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || "Failed to save notice.";
      notify.error(errorMsg);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    
    try {
      await api.delete(`/notices/${noticeId}`);
      notify.success("Notice deleted successfully.");
      fetchNotices();
    } catch (error) {
      console.error('Delete notice error:', error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to delete notice.";
      notify.error(`Delete failed: ${errorMsg}`);
    }
  };

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

  const canEditNotice = (notice) => {
    if (!notice?.createdAt) return false;
    const createdAt = new Date(notice.createdAt).getTime();
    const minutesSinceCreate = (currentTime - createdAt) / 1000 / 60;
    return minutesSinceCreate <= 20;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Active": return "active";
      case "Expired": return "expired";
      case "Deleted": return "deleted";
      default: return "active";
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
    <div className="notices-page">
      <div className="notices-header">
        <div>
          <h1>Notices</h1>
          <p>
            {user.hallId?.hallName ? `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName} Notices` : 'Manage Hall Notices'}
          </p>
        </div>
        <button
          className="create-notice-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log("Create button clicked");
            openCreateModal();
          }}
          style={{ pointerEvents: 'auto' }}
        >
          + Create Notice
        </button>
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

      {filteredNotices.length === 0 ? (
        <div className="no-notices">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3>No Notices Found</h3>
          <p>Try adjusting your filters or create a new notice</p>
        </div>
      ) : (
        <div className="notices-grid">
          {filteredNotices.map((notice) => (
            <div key={notice._id} className="notice-card">
              <div className="notice-card-header">
                <div>
                  <div className="notice-number">{notice.noticeNumber}</div>
                  <h3>{notice.title}</h3>
                </div>
                <span className={`notice-status ${getStatusClass(notice.status)}`}>
                  {notice.status}
                </span>
              </div>
              <div className="notice-card-body">
                <p className="notice-description">{notice.description}</p>
                <div className="notice-meta">
                  <div className="notice-meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {notice.createdBy?.name}
                  </div>
                  <div className="notice-meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </div>
                  {notice.expiresAt && (
                    <div className="notice-meta-item">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Expires: {new Date(notice.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {notice.attachmentUrl && (
                  <div className="notice-attachments">
                    <h6>Attachments</h6>
                    <div className="attachment-list">
                      {(Array.isArray(notice.attachmentUrl) ? notice.attachmentUrl : [notice.attachmentUrl]).map((url, idx) => {
                        const filename = Array.isArray(notice.attachment) ? notice.attachment[idx] : (notice.attachment || '').split('/').pop();
                        return (
                          <div key={idx} className="attachment-item">
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
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="notice-card-footer">
                {notice.status === "Active" && canEditNotice(notice) && (
                  <button
                    className="action-btn action-btn-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(notice);
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="action-btn action-btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notice._id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <h4>{modalMode === "create" ? "Create New Notice" : "Edit Notice"}</h4>
            <button
              type="button"
              className="close-modal-btn"
              onClick={() => {
                console.log("Close button clicked");
                closeModal();
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              ×
            </button>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notice title..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter notice description..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Attachments (Image/PDF, Max 2 files, 2MB each)</label>
                <div className="upload-section" onClick={() => document.getElementById('file-upload').click()}>
                  <div className="upload-icon">📎</div>
                  <div className="upload-text">Click to upload files</div>
                  <div className="upload-hint">JPEG, PNG, GIF, WebP, PDF (Max 2 files, 2MB each)</div>
                  <input
                    type="file"
                    className="d-none"
                    id="file-upload"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileInput}
                  />
                </div>
                {previewUrls && previewUrls.length > 0 && (
                  <div className="preview-section">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="preview-item">
                        {attachments[idx]?.type === 'application/pdf' ? (
                          <div className="preview-pdf">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>{attachments[idx]?.name}</span>
                          </div>
                        ) : (
                          <img src={url} alt={`Preview-${idx}`} className="preview-image" />
                        )}
                        <button type="button" className="remove-preview" onClick={() => removeAttachment(idx)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {modalMode === "create" ? "Create Notice" : "Update Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* attachments are download-only; no modal */}
    </div>
  );
}

export default WardenNotices;
