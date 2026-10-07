import { useState } from "react";
import { downloadPaymentProof } from "../../services/fineService";
import notify from "../../utils/toast";
import "../../pages/WardenFines.css";

const FineCard = ({
  fine,
  isStudent = false,
  onStatusUpdate = null,
  onDelete = null,
  onUploadProof = null,
  readOnly = false,
  canUploadProof = true,
}) => {
  const [selectedForUpload, setSelectedForUpload] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [openingProof, setOpeningProof] = useState(false);

  const handleViewProof = async () => {
    const proofWindow = window.open("about:blank", "_blank");
    setOpeningProof(true);

    try {
      const response = await downloadPaymentProof(fine._id);
      const contentType = response.headers["content-type"] || "application/pdf";
      const proofUrl = URL.createObjectURL(new Blob([response.data], { type: contentType }));

      if (proofWindow) {
        proofWindow.location.href = proofUrl;
      } else {
        window.location.href = proofUrl;
      }
    } catch (error) {
      proofWindow?.close();
      notify.error(error.response?.data?.message || "Failed to open payment proof.");
    } finally {
      setOpeningProof(false);
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "N/A";
    const date = new Date(deadline);
    return date.toLocaleDateString("en-GB");
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending":
        return "bg-warning";
      case "Verification Pending":
        return "bg-info text-white";
      case "Paid":
        return "bg-success";
      case "Waived":
        return "bg-secondary";
      default:
        return "bg-secondary";
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        notify.error("File size must not exceed 5MB");
        return;
      }
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!validTypes.includes(file.type)) {
        notify.error("Only PDF, JPG, JPEG, and PNG files are allowed");
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofFile) {
      notify.warning("Please select a file");
      return;
    }

    setUploading(true);
    try {
      await onUploadProof(fine._id, proofFile);
      setSelectedForUpload(false);
      setProofFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card fine-card shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="card-title mb-1">
              {isStudent && !readOnly
                ? `Fine #${fine.fineNumber}`
                : fine.studentId?.name || "Student"}
            </h5>
            <small className="text-muted">
              {isStudent && !readOnly
                ? `Issued by: ${fine.issuedBy?.name || "Warden"}`
                : fine.studentId?.role === "mess_manager"
                  ? `Manager ID: ${fine.studentId.managerId || "N/A"}`
                  : fine.studentId?.registrationNo || "N/A"}
            </small>
          </div>
          <span className={`badge ${getStatusBadgeClass(fine.status)} fs-6`}>
            {fine.status}
          </span>
        </div>

        <hr className="my-2" />

        <p className="mb-2">
          <strong>Amount:</strong>{" "}
          <span className={isStudent ? "fs-5 text-danger" : ""}>
            ₹{Number(fine.amount || 0).toFixed(2)}
          </span>
        </p>

        <p className="mb-2">
          <strong>Description:</strong> {fine.reason}
        </p>

        <p
          className={`mb-2 ${
            isStudent && isDeadlinePassed(fine.paymentDeadline) && fine.status === "Pending"
              ? "text-danger"
              : ""
          }`}
        >
          <strong>{isStudent ? "Payment Deadline:" : "Deadline:"}</strong>{" "}
          {formatDeadline(fine.paymentDeadline)}
          {isStudent &&
            isDeadlinePassed(fine.paymentDeadline) &&
            fine.status === "Pending" && (
              <span className="text-danger ms-2">⚠ Overdue</span>
            )}
        </p>

        <p className="mb-2 text-muted small">
          <strong>{isStudent ? "Issued on:" : "Issued:"}</strong>{" "}
          {new Date(fine.issuedAt).toLocaleDateString()}
        </p>

        {fine.status === "Paid" && fine.paidAt && (
          <p className="mb-2 text-success small">
            <strong>Paid on:</strong> {new Date(fine.paidAt).toLocaleDateString()}
          </p>
        )}
        {fine.status === "Verification Pending" && (
          <p className="mb-2 text-info small">
            <strong>Verification Status:</strong> Pending Warden Verification
          </p>
        )}

        {fine.status === "Waived" && isStudent && (
          <div className="alert alert-info mb-2 py-2">
            This fine has been waived.
          </div>
        )}

        {fine.remarks && (
          <div className={`alert ${isStudent ? "alert-secondary" : "alert-info"} mb-2 py-2 small`}>
            <strong>Remarks:</strong> {fine.remarks}
          </div>
        )}
      </div>

      <div className="card-footer bg-white border-top">
        {isStudent ? (
          <>
            {!readOnly && canUploadProof && fine.status === "Pending" && (
              <>
                {selectedForUpload ? (
                  <div className="upload-section">
                    <label className="form-label mb-2">
                      Upload Payment Proof <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted d-block mb-2">
                      Max file size: 5MB (Image or PDF)
                    </small>
                    <input
                      type="file"
                      className="form-control mb-2"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                    />
                    {proofFile && (
                      <small className="text-success d-block mb-2">
                        ✓ {proofFile.name} selected
                      </small>
                    )}
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={handleSubmitProof}
                        disabled={!proofFile || uploading}
                      >
                        {uploading ? "Uploading..." : "Submit Proof"}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setSelectedForUpload(false);
                          setProofFile(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ backgroundColor: "#003366", borderColor: "#003366" }}
                    onClick={() => setSelectedForUpload(true)}
                  >
                    Pay Fine
                  </button>
                )}
              </>
            )}

            {["Paid", "Verification Pending"].includes(fine.status) && (fine.hasPaymentProof || fine.paymentProofUrl) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleViewProof}
                disabled={openingProof}
              >
                {openingProof ? "Opening..." : "View Payment Proof"}
              </button>
            )}
          </>
        ) : (
          <div className="d-flex gap-2 flex-wrap">
            {fine.status === "Pending" && (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => onStatusUpdate(fine._id, "Paid")}
                >
                  Mark as Paid
                </button>
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => onStatusUpdate(fine._id, "Waived")}
                >
                  Waive Fine
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(fine._id)}
                >
                  Delete
                </button>
              </>
            )}
            {fine.status === "Verification Pending" && (
              <>
                {fine.paymentProofUrl && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleViewProof}
                    disabled={openingProof}
                  >
                    {openingProof ? "Opening..." : "View Proof"}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => onStatusUpdate(fine._id, "Paid")}
                >
                  Verify & Mark Paid
                </button>
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => {
                    const remark = window.prompt("Enter rejection remark / reason for resending back:");
                    if (remark === null) return;
                    if (!remark.trim()) {
                      notify.warning("Remark is required to reject/resend payment proof.");
                      return;
                    }
                    onStatusUpdate(fine._id, "Pending", remark);
                  }}
                >
                  Reject & Resend
                </button>
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => onStatusUpdate(fine._id, "Waived")}
                >
                  Waive Fine
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(fine._id)}
                >
                  Delete
                </button>
              </>
            )}
            {fine.status === "Paid" && fine.paymentProofUrl && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleViewProof}
                disabled={openingProof}
              >
                {openingProof ? "Opening..." : "View Proof"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FineCard;
