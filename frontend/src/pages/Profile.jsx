import { useEffect, useState } from "react";
import api from "../services/api";
import notify from "../utils/toast";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/profile?t=${Date.now()}`);
      setUser(res.data.user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchProfile);
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      notify.warning("New password and confirm password do not match.");
      return;
    }

    try {
      await api.put("/users/profile/password", {
        currentPassword,
        newPassword,
      });
      notify.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (error) {
      console.error(error);
      notify.error(error.response?.data?.message || "Failed to update password.");
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderRoleSpecificInfo = () => {
    if (!user) return null;

    const roleSpecific = [];

    if (user.role === "student") {
      if (user.hallId?.hallName) roleSpecific.push({ label: "Hall", value: `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName}` });
      if (user.registrationNo) roleSpecific.push({ label: "Registration No", value: user.registrationNo });
      if (user.rollNo) roleSpecific.push({ label: "Roll No", value: user.rollNo });
      if (user.branch) roleSpecific.push({ label: "Branch", value: user.branch });
      if (user.department) roleSpecific.push({ label: "Department", value: user.department });
      if (user.course) roleSpecific.push({ label: "Course", value: user.course });
      if (user.currentYear) roleSpecific.push({ label: "Current Year", value: user.currentYear });
      if (user.roomId?.roomNumber) roleSpecific.push({ label: "Room Number", value: user.roomId.roomNumber });
      if (user.parentPhone) roleSpecific.push({ label: "Parent Phone", value: user.parentPhone });
    } else if (user.role === "warden") {
      if (user.designation) roleSpecific.push({ label: "Designation", value: user.designation });
      if (user.officePhone) roleSpecific.push({ label: "Office Phone", value: user.officePhone });
      if (user.hallId?.hallName) roleSpecific.push({ label: "Assigned Hall", value: `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName}` });
    } else if (user.role === "mess_manager") {
      if (user.companyName) roleSpecific.push({ label: "Company Name", value: user.companyName });
      if (user.managerId) roleSpecific.push({ label: "Manager ID", value: user.managerId });
    } else if (user.role === "admin") {
      if (user.adminLevel) roleSpecific.push({ label: "Admin Level", value: user.adminLevel });
    }

    return roleSpecific;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="no-data">
        <p>Unable to load profile data.</p>
      </div>
    );
  }

  const roleSpecificInfo = renderRoleSpecificInfo();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and information</p>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-photo-section">
            <div className="profile-photo-placeholder">
              {getInitials(user.name)}
            </div>
          </div>
          <h2 className="user-name">{user.name}</h2>
          <p className="user-role">{user.role.replace("_", " ")}</p>
        </div>

        <div className="profile-main">
          <h3 className="section-title">Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Username</div>
              <div className="info-value">{user.username}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Email</div>
              <div className="info-value">{user.email || "Not provided"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Phone</div>
              <div className="info-value">{user.phone || "Not provided"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Gender</div>
              <div className="info-value">{user.gender || "Not provided"}</div>
            </div>
            {roleSpecificInfo.map((item, index) => (
              <div key={index} className="info-item">
                <div className="info-label">{item.label}</div>
                <div className="info-value">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="password-section">
            <h4>Change Password</h4>
            {!showPasswordForm ? (
              <button
                className="btn-update"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordUpdate}>
                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    maxLength={128}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    maxLength={128}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    maxLength={128}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="submit" className="btn-update">
                    Update Password
                  </button>
                  <button
                    type="button"
                    className="btn-update"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    style={{ background: "#64748B" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;