import { useState, useEffect } from "react";
import {
  getStudentCertificates,
  requestCertificate,
  deleteCertificate,
  downloadApprovedCertificateFile,
} from "../services/certificateService";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import "./Certificates.css";

function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");

  const [formData, setFormData] = useState({
    certificateType: "Leave",
    leaveFromDate: "",
    leaveToDate: "",
    reason: "",
    purpose: "",
    parentPhone: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchCertificates = async () => {
    try {
      const res = await getStudentCertificates();
      setCertificates(res.data.certificates || []);
    } catch (err) {
      console.error(err);
      notify.error("Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchCertificates);

    const hallId = user?.hallId?._id || user?.hallId;
    const currentStudentId = String(user?._id || user?.id || "");
    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("certificate-created", (certificate) => {
        const certificateStudentId = String(certificate.studentId?._id || certificate.studentId || "");
        if (certificateStudentId !== currentStudentId) return;
        setCertificates((prev) => [certificate, ...prev.filter((item) => item._id !== certificate._id)]);
      });

      socket.on("certificate-updated", (certificate) => {
        const certificateStudentId = String(certificate.studentId?._id || certificate.studentId || "");
        if (certificateStudentId !== currentStudentId) return;
        setCertificates((prev) => prev.map((item) => (item._id === certificate._id ? certificate : item)));
      });

      socket.on("certificate-deleted", ({ certificateId }) => {
        setCertificates((prev) => prev.filter((item) => item._id !== certificateId));
      });
    }

    return () => {
      if (socket) {
        socket.off("certificate-created");
        socket.off("certificate-updated");
        socket.off("certificate-deleted");
      }
      disconnectSocket();
    };
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        certificateType: formData.certificateType,
        leaveFromDate: formData.certificateType === "Leave" ? formData.leaveFromDate : null,
        leaveToDate: formData.certificateType === "Leave" ? formData.leaveToDate : null,
        reason: formData.certificateType === "Leave" ? formData.reason : null,
        purpose: formData.certificateType === "Hostel Bonafide" ? formData.purpose : null,
        parentPhone: formData.parentPhone || null,
      };

      const res = await requestCertificate(payload);
      notify.success("Certificate request submitted successfully!");
      setCertificates([res.data.certificate, ...certificates]);
      setShowRequestForm(false);
      setFormData({
        certificateType: "Leave",
        leaveFromDate: "",
        leaveToDate: "",
        reason: "",
        purpose: "",
        parentPhone: "",
      });
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to request certificate.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this certificate request?")) return;

    try {
      await deleteCertificate(id);
      setCertificates(certificates.filter((c) => c._id !== id));
      notify.success("Certificate request deleted.");
    } catch (err) {
      console.error(err);
      notify.error("Failed to delete certificate.");
    }
  };

  const downloadPdfFile = (pdfBlob, fileName) => {
    if (!pdfBlob) return;

    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const getDownloadErrorMessage = async (err) => {
    const fallback = "Failed to download certificate.";
    const data = err.response?.data;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed.message || fallback;
      } catch {
        return fallback;
      }
    }

    return data?.message || fallback;
  };

  const downloadCertificate = async (id) => {
    if (downloadingId) return;

    try {
      setDownloadingId(id);

      const certificate = certificates.find((cert) => cert._id === id) || {};
      const fileName = `${certificate.certificateRequestNumber || "certificate"}.pdf`;
      const res = await downloadApprovedCertificateFile(id);

      downloadPdfFile(res.data, fileName);
      await fetchCertificates();
      notify.success("Certificate downloaded successfully!");
    } catch (err) {
      console.error(err);
      notify.error(await getDownloadErrorMessage(err));
    } finally {
      setDownloadingId("");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Pending: "warning",
      Approved: "success",
      Rejected: "danger",
    };
    return statusMap[status] || "secondary";
  };

  const formatDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString();
  };

  const isPdfExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Certificates</h2>
          <p className="text-muted">Request and manage your certificates</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ backgroundColor: "#003366", borderColor: "#003366" }}
          onClick={() => setShowRequestForm(!showRequestForm)}
        >
          {showRequestForm ? "Cancel" : "Request Certificate"}
        </button>
      </div>


      {/* Request Form */}
      {showRequestForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">Request New Certificate</h5>
            <form onSubmit={handleRequestSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Certificate Type *</label>
                  <select
                    className="form-select"
                    value={formData.certificateType}
                    onChange={(e) =>
                      setFormData({ ...formData, certificateType: e.target.value })
                    }
                  >
                    <option value="Leave">Leave Certificate</option>
                    <option value="Hostel Bonafide">Bonafide Certificate</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Parent Phone (Optional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.parentPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, parentPhone: e.target.value })
                    }
                    placeholder="Parent phone number"
                  />
                </div>
              </div>

              {formData.certificateType === "Leave" && (
                <>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Leave From Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.leaveFromDate}
                        onChange={(e) =>
                          setFormData({ ...formData, leaveFromDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Leave To Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.leaveToDate}
                        onChange={(e) =>
                          setFormData({ ...formData, leaveToDate: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason for Leave *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      placeholder="State the reason for your leave"
                      required
                    ></textarea>
                  </div>
                </>
              )}

              {formData.certificateType === "Hostel Bonafide" && (
                <div className="mb-3">
                  <label className="form-label">Purpose (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                    placeholder="State the purpose of this certificate"
                  ></textarea>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100"
                style={{ backgroundColor: "#003366", borderColor: "#003366" }}
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Certificates List */}
      <div className="row">
        {certificates.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">
              No certificates requested yet. Click "Request Certificate" to get started.
            </div>
          </div>
        ) : (
          certificates.map((cert) => (
            <div key={cert._id} className="col-lg-6 mb-4">
              <div className="card certificate-card shadow-sm h-100">
                <div className="card-body">
                  {/* Header: Type + Status Badge */}
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="card-title mb-1">{cert.certificateType}</h5>
                      <small className="text-muted">{cert.certificateRequestNumber}</small>
                    </div>
                    <span className={`badge bg-${getStatusBadge(cert.status)} fs-6`}>
                      {cert.status}
                    </span>
                  </div>

                  <hr className="my-2" />

                  {/* Requested Date */}
                  <p className="mb-2">
                    <strong>Requested:</strong> {new Date(cert.createdAt).toLocaleDateString()}
                  </p>

                  {/* Leave Certificate Details */}
                  {cert.certificateType === "Leave" && (
                    <>
                      <p className="mb-2">
                        <strong>Leave:</strong> {new Date(cert.leaveFromDate).toLocaleDateString()} to{" "}
                        {new Date(cert.leaveToDate).toLocaleDateString()}
                      </p>
                      {cert.reason && (
                        <p className="mb-2">
                          <strong>Reason:</strong> {cert.reason}
                        </p>
                      )}
                    </>
                  )}

                  {/* Bonafide Certificate Details */}
                  {cert.certificateType === "Hostel Bonafide" && cert.purpose && (
                    <p className="mb-2">
                      <strong>Purpose:</strong> {cert.purpose}
                    </p>
                  )}

                  {/* Parent Phone */}
                  {cert.parentPhone && (
                    <p className="mb-2">
                      <strong>Parent Phone:</strong> {cert.parentPhone}
                    </p>
                  )}

                  {/* Approval Details */}
                  {cert.status === "Approved" && (
                    <>
                      <hr className="my-2" />
                      <p className="mb-2">
                        <strong>Approved by:</strong> {cert.approvedBy?.name || "N/A"}
                      </p>
                      <p className="mb-2">
                        <strong>Approved at:</strong> {formatDateTime(cert.approvedAt)}
                      </p>
                      {cert.remarks && (
                        <p className="mb-2">
                          <strong>Remarks:</strong> {cert.remarks}
                        </p>
                      )}
                      <p className="mb-2 text-muted small">
                        <strong>PDF available until:</strong> {formatDateTime(cert.certificatePdfExpiresAt)}
                        {isPdfExpired(cert.certificatePdfExpiresAt) && (
                          <span className="ms-2 text-danger fw-semibold">Expired</span>
                        )}
                      </p>
                    </>
                  )}

                  {/* Rejection Details */}
                  {cert.status === "Rejected" && cert.rejectionReason && (
                    <>
                      <hr className="my-2" />
                      <div className="alert alert-danger mb-0 small">
                        <strong>Rejection Reason:</strong> {cert.rejectionReason}
                      </div>
                    </>
                  )}

                  {/* PDF Not Available Warning */}
                  {cert.status === "Approved" && !cert.certificatePdfAvailable && (
                    <div className="alert alert-warning mb-0 small">
                      PDF needs to be regenerated by the warden.
                    </div>
                  )}
                </div>

                {/* Footer: Action Buttons */}
                <div className="card-footer bg-white border-top">
                  {cert.status === "Approved" && cert.certificatePdfAvailable && !isPdfExpired(cert.certificatePdfExpiresAt) && (
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ backgroundColor: "#003366", borderColor: "#003366" }}
                      disabled={downloadingId === cert._id}
                      onClick={() => downloadCertificate(cert._id)}
                    >
                      {downloadingId === cert._id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Downloading...
                        </>
                      ) : (
                        "Download"
                      )}
                    </button>
                  )}
                  {cert.status === "Pending" && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(cert._id)}
                    >
                      Delete Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Certificates;
