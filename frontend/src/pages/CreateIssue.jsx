import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createIssue } from "../services/issueService";
import api from "../services/api";
import notify from "../utils/toast";
import "./CreateIssue.css";

function CreateIssue() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || {});

  // Fetch fresh user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electrical");

  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewTypes, setPreviewTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      notify.error("Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    const oversizedFiles = fileArray.filter(file => file.size > 2 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      notify.error("Each image must be 2MB or smaller.");
      return;
    }

    if (attachments.length + fileArray.length > 2) {
      notify.warning("Maximum 2 images allowed.");
      return;
    }

    const newAttachments = [...attachments, ...fileArray];
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    const newTypes = fileArray.map(() => 'image');

    setAttachments(newAttachments);
    setPreviewUrls([...previewUrls, ...newPreviews]);
    setPreviewTypes([...previewTypes, ...newTypes]);
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removePreview = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    const newTypes = previewTypes.filter((_, i) => i !== index);

    URL.revokeObjectURL(previewUrls[index]);

    setAttachments(newAttachments);
    setPreviewUrls(newPreviews);
    setPreviewTypes(newTypes);
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
      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await createIssue(formData);

      notify.success("Issue created successfully.");

      navigate("/student/issues");
    } catch (error) {
      console.error(error);

      notify.error(
        error?.response?.data?.message ||
          "Failed to create issue."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-issue-page">
      <div className="create-issue-header">
        <h2>Raise New Issue</h2>
        <p>Report a problem in your hostel room or common area</p>
      </div>

      <div className="card create-issue-card">
        <div className="card-header">
          <h3>Issue Details</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Student Info Card */}
            <div className="student-info-card">
              <h5>Your Information</h5>
              <div className="student-info-row">
                <div className="student-info-item">
                  <label>Name</label>
                  <div>{user.name || 'N/A'}</div>
                </div>
                <div className="student-info-item">
                  <label>Room</label>
                  <div>{user.roomId?.roomNumber || 'N/A'}</div>
                </div>
                <div className="student-info-item">
                  <label>Hall</label>
                  <div>{user.hallId ? `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName}` : 'N/A'}</div>
                </div>
                <div className="student-info-item">
                  <label>Registration No</label>
                  <div>{user.registrationNo || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Issue Title *</label>
              <input
                className="form-control"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Leaking tap in bathroom"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Description *</label>
              <textarea
                className="form-control"
                rows="5"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail. Include when it started and any relevant information..."
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
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

            <div className="mb-4">
              <label className="form-label">Attachments (Images only)</label>
              <div
                className={`upload-section ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-icon">📎</div>
                <div className="upload-text">
                  Drag & drop images here or click to browse
                </div>
                <div className="upload-hint">
                  Supports: JPEG, PNG, GIF, WebP (Max 2 images, 2MB each)
                </div>
                <input
                  type="file"
                  className="d-none"
                  id="file-upload"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary mt-2"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  Browse Images
                </button>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Preview ({attachments.length}/2)</label>
                <div className="preview-grid">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="preview-item">
                      {previewTypes[index] === 'video' ? (
                        <video src={url} controls />
                      ) : (
                        <img src={url} alt={`preview-${index}`} />
                      )}
                      <button
                        type="button"
                        className="remove-preview"
                        onClick={() => removePreview(index)}

                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row mt-4">
              <div className="col-md-6">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate('/student/issues')}
                >
                  Cancel
                </button>
              </div>
              <div className="col-md-6">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateIssue;