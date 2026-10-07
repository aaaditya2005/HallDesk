import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getIssue, deleteIssue } from "../services/issueService";
import { useAuth } from "../context/authContextValue.js";
import notify from "../utils/toast";
import "./IssueDetails.css";

function IssueDetails() {
  // Safe auth fallback: prefer context but fall back to localStorage
  const auth = useAuth() || {};
  const contextUser = auth.user;
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  const user = contextUser || storedUser || {};
  const role = user?.role || "student";

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this issue?"
    );

    if (!confirmDelete) return;

    try {
      await deleteIssue(issue._id);
      notify.success("Issue deleted successfully.");
      navigate(role === "warden" ? "/warden/dashboard" : `/${role}/issues`);
    } catch (error) {
      console.error(error);
      notify.error(
        error?.response?.data?.message ||
        "Unable to delete issue."
      );
    }
  };
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");

  const fetchIssue = async () => {
    try {
      const res = await getIssue(id);
      setIssue(res.data.issue);
    } catch (err) {
      console.error(err);
      notify.error("Failed to load issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchIssue);
  }, [id]);

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

  const getTimelineStatusClass = (action) => {
    switch (action) {
      case "Resolved": return "status-resolved";
      case "Rejected": return "status-rejected";
      case "Accepted": return "status-accepted";
      case "In Progress": return "status-in-progress";
      default: return "";
    }
  };

  const getAttachmentUrl = (attachment) => {
    if (!attachment) return "";
    if (attachment.startsWith("http://") || attachment.startsWith("https://")) {
      return attachment;
    }
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, "");
    return `${baseUrl}/uploads/issues/${attachment}`;
  };

  const downloadAttachment = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to fetch attachment');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
      notify.error('Unable to download attachment.');
    }
  };

  const openPreview = (attachment) => {
    const source = getAttachmentUrl(attachment);
    setPreviewSource(source);
    setPreviewLabel(attachment.split('/').pop() || 'attachment');
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSource("");
    setPreviewLabel("");
  };

  const isVideo = (filename) => {
    if (!filename) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="alert alert-danger mt-5">
        Issue not found.
      </div>
    );
  }

  return (
    <div className="issue-details-page">
      <div className="issue-details-header">
        <h2>Issue Details</h2>
        <div className="d-flex gap-3 align-items-center">
          <span className="issue-number-badge">{issue.issueNumber}</span>
          <span className={`status-badge-large ${getStatusClass(issue.status)}`}>
            {issue.status}
          </span>
        </div>
      </div>

      <div className="details-card">
        <div className="card-body">
          <div className="issue-title-section">
            <h3>{issue.title}</h3>
            <div className="issue-meta">
              <span className="issue-meta-badge category-badge">{issue.category}</span>
            </div>
          </div>

          <div className="description-section">
            <h5>Description</h5>
            <p>{issue.description}</p>
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <h5>Student Details</h5>
          <div className="info-item">
            <label>Name</label>
            <span>{issue.reportedBy?.name || 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>Registration No</label>
            <span>{issue.reportedBy?.registrationNo || 'N/A'}</span>
          </div>
        </div>

        <div className="info-card">
          <h5>Hostel Details</h5>
          <div className="info-item">
            <label>Hall</label>
            <span>{issue.hallId ? `Hall ${issue.hallId.hallNumber} - ${issue.hallId.hallName}` : 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>Room</label>
            <span>{issue.roomId?.roomNumber || 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>Assigned Warden</label>
            <span>{issue.assignedTo?.name || 'Not Assigned'}</span>
          </div>
        </div>
      </div>

      <div className="details-card">
        <div className="card-header">Attachments</div>
        <div className="card-body">
          {(!issue.attachments || issue.attachments.filter(Boolean).length === 0) ? (
            <div className="no-attachments">No attachments uploaded</div>
          ) : (
            <div className="attachments-grid">
              {issue.attachments.filter(Boolean).map((attachment, index) => (
                <div key={index} className="attachment-item">
                  {isVideo(attachment) ? (
                    <video
                      src={getAttachmentUrl(attachment)}
                      controls
                    />
                  ) : (
                    <img
                      src={getAttachmentUrl(attachment)}
                      alt={`attachment-${index}`}
                      onClick={() => openPreview(attachment)}
                      className="attachment-thumb"
                    />
                  )}
                  <div className="attachment-actions">
                    <button
                      className="btn-download"
                      onClick={() => downloadAttachment(getAttachmentUrl(attachment), attachment.split('/').pop())}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="btn-open"
                      onClick={() => openPreview(attachment)}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="details-card">
        <div className="card-header">Timeline</div>
        <div className="card-body">
          <div className="timeline-section">
            {issue.timeline?.map((item, index) => (
              <div
                key={index}
                className={`timeline-item ${getTimelineStatusClass(item.action)}`}
              >
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h3 className="timeline-action">{item.action}</h3>
                  {item.remark && (
                    <p className="timeline-remark">"{item.remark}"</p>
                  )}
                  <p className="timeline-user">
                    <strong>By:</strong> {item.by?.name} ({item.by?.role || 'User'})
                  </p>
                  <p className="timeline-time">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {issue.status === "Resolved" && (
        <div className="resolution-card">
          <h5>✓ Issue Resolved</h5>
          <p><strong>Resolved By:</strong> {issue.resolvedBy?.name || 'N/A'}</p>
          <p><strong>Resolved At:</strong> {new Date(issue.resolvedAt).toLocaleString()}</p>
        </div>
      )}

      {issue.status === "Rejected" && (
        <div className="rejection-card">
          <h5>✗ Issue Rejected</h5>
          <p><strong>Reason:</strong> {issue.rejectionReason || 'No reason provided'}</p>
        </div>
      )}

      {previewOpen && (
        <div className="attachment-modal" onClick={closePreview}>
          <div className="attachment-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="attachment-modal-close" onClick={closePreview}>
              ×
            </button>
            {previewSource && (
              <img
                className="attachment-modal-image"
                src={previewSource}
                alt={previewLabel}
              />
            )}
            <div className="attachment-modal-actions">
              <button
                type="button"
                className="btn-download"
                onClick={() => downloadAttachment(previewSource, previewLabel)}
              >
                Download
              </button>
              <a
                className="btn-open"
                href={previewSource}
                target="_blank"
                rel="noreferrer"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {role === "admin" && issue.status === "Pending" && (
        <div className="action-buttons mt-4">
          <button className="btn-delete" onClick={handleDelete}>
            Delete Issue
          </button>
        </div>
      )}

      <div className="mt-4">
        <Link to={role === "warden" ? "/warden/dashboard" : `/${role}/issues`} className="btn-back">
          ← Back to {role === "student" ? "My Issues" : "Issues"}
        </Link>
      </div>
    </div>
  );

}

export default IssueDetails;