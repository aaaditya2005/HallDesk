import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getHallCertificates,
  getCertificateById,
  approveCertificate,
  rejectCertificate,
  deleteCertificate,
  downloadApprovedCertificateFile,
} from "../services/certificateService";
import { connectSocket, disconnectSocket } from "../services/socket";
import jsPDF from "jspdf";
import nitLogo from "../assets/images/nitdgp-logo-dark.png";
import notify from "../utils/toast";
import "./WardenCertificates.css";

function WardenCertificates() {
  const { id: reviewId } = useParams();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [approving, setApproving] = useState(false);
  const [viewingPdfId, setViewingPdfId] = useState("");
  const [approvalData, setApprovalData] = useState({
    remarks: "",
    stampUrl: "",
    stampFileName: "",
    signatureUrl: "",
    signatureFileName: "",
  });
  const [filterStatus, setFilterStatus] = useState("All");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchCertificates = async () => {
    try {
      const res = await getHallCertificates();
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
    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("certificate-created", (certificate) => {
        setCertificates((prev) => [certificate, ...prev.filter((item) => item._id !== certificate._id)]);
      });

      socket.on("certificate-updated", (certificate) => {
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

  useEffect(() => {
    if (!reviewId) return;

    const loadReviewCertificate = async () => {
      try {
        const res = await getCertificateById(reviewId);
        setSelectedCert(res.data.certificate);
      } catch {
        notify.error("Failed to load certificate review.");
      }
    };

    loadReviewCertificate();
  }, [reviewId]);

  const normalizeStatus = (status) => String(status || "").trim();

  const getOrdinalSuffix = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const remainder = n % 10;
    const teen = n % 100;
    if (teen >= 11 && teen <= 13) return "th";
    if (remainder === 1) return "st";
    if (remainder === 2) return "nd";
    if (remainder === 3) return "rd";
    return "th";
  };

  const getStudentRoomNumber = (certificate) => {
    const studentRoom = certificate?.studentId?.roomId;
    const directRoom = certificate?.studentId?.roomNumber;

    if (typeof studentRoom === "string" && studentRoom.trim()) {
      return studentRoom;
    }

    if (studentRoom && typeof studentRoom === "object") {
      return studentRoom.roomNumber || studentRoom.number || "N/A";
    }

    if (typeof directRoom === "string" && directRoom.trim()) {
      return directRoom;
    }

    return "N/A";
  };

  const getStudentAcademicYearLabel = (certificate) => {
    const yearValue = Number(certificate?.studentId?.currentYear ?? 0);
    if (!Number.isFinite(yearValue) || yearValue <= 0) {
      return "N/A";
    }

    return `${yearValue}${getOrdinalSuffix(yearValue)} year`;
  };

  const getRoomDisplayValue = (roomNumber) => {
    if (!roomNumber) return "N/A";
    if (typeof roomNumber === "string" && /^[a-f0-9]{24}$/i.test(roomNumber)) return "N/A";
    return roomNumber;
  };

  const formatCertificateDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-GB");
  };

  const openPdfInNewTab = async (certificateId) => {
    if (!certificateId || viewingPdfId) {
      notify.error("No PDF available for this certificate.");
      return;
    }

    try {
      setViewingPdfId(certificateId);
      const res = await downloadApprovedCertificateFile(certificateId);
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
    } catch (error) {
      console.error("PDF open failed:", error);
      notify.error("PDF could not be opened. Please regenerate this certificate if it was approved before the storage fix.");
    } finally {
      setViewingPdfId("");
    }
  };

  const dataUriToBlobUrl = (dataUri) => {
    const [metadata, base64Data] = dataUri.split(",");
    const mimeType = metadata.match(/data:(.*);base64/)?.[1] || "application/pdf";
    const byteString = atob(base64Data);
    const bytes = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i += 1) {
      bytes[i] = byteString.charCodeAt(i);
    }

    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  };

  const downloadPdfFile = (pdfDataUri, fileName) => {
    if (!pdfDataUri) return;

    const blobUrl = dataUriToBlobUrl(pdfDataUri);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const generateCertificatePDF = async (certificate, stampUrl, signatureUrl) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const studentName = certificate?.studentId?.name || "Student Name";
    const registrationNo = certificate?.studentId?.registrationNo || "N/A";
    const roomNumber = getRoomDisplayValue(getStudentRoomNumber(certificate));
    const hallName = certificate?.hallId?.hallName || "Dr. B. R. Ambedkar Hall of Residence";
    const hallNumber = certificate?.hallId?.hallNumber || "14";
    const academicYearText = getStudentAcademicYearLabel(certificate);
    const dateText = new Date().toLocaleDateString("en-GB");
    const certificateType = String(certificate?.certificateType || "").toLowerCase();
    const isLeaveCertificate = certificateType === "leave";
    const leaveFromDate = formatCertificateDate(certificate?.leaveFromDate);
    const leaveToDate = formatCertificateDate(certificate?.leaveToDate);
    const leaveReason = certificate?.reason || "personal reasons";
    const parentPhone = certificate?.parentPhone || certificate?.studentId?.parentPhone || "N/A";

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, 15, 22, 22, 3, 3, "F");
    try {
      doc.addImage(nitLogo, "PNG", 20, 17, 18, 18);
    } catch (error) {
      console.warn("Could not add NIT logo:", error);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("NATIONAL INSTITUTE OF TECHNOLOGY DURGAPUR", 105, 38, { align: "center" });

    doc.setFontSize(12);
    doc.text("MAHATMA GANDHI AVENUE, DURGAPUR-713209", 105, 46, { align: "center" });
    doc.text("(WEST BENGAL)", 105, 52, { align: "center" });
    doc.setFontSize(13);
    doc.text(`${hallName.toUpperCase()} (HALL-${hallNumber})`, 105, 64, { align: "center" });

    doc.setDrawColor(0, 0, 0);
    doc.line(35, 70, 175, 70);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(isLeaveCertificate ? "HOSTEL LEAVE CERTIFICATE" : "TO WHOM IT MAY CONCERN", 105, 82, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    if (isLeaveCertificate) {
      const leaveIntroText = `This is to certify that ${studentName}, Registration No. ${registrationNo}, is a resident of room no. ${roomNumber} in ${hallName} (Hall ${hallNumber}) for the ${academicYearText}.`;
      const leavePermissionText = `The student has been permitted to leave the hostel from ${leaveFromDate} to ${leaveToDate} for ${leaveReason}.`;
      const leaveResponsibilityText = `During this leave period, the student shall remain responsible for travel and stay outside the hostel. Parent/Guardian contact: ${parentPhone}.`;
      const leaveClosingText = "This certificate is issued on the student's request for necessary permission and record.";

      doc.text(leaveIntroText, 20, 98, { maxWidth: 170 });
      doc.text(leavePermissionText, 20, 118, { maxWidth: 170 });
      doc.text(leaveResponsibilityText, 20, 138, { maxWidth: 170 });
      doc.text(leaveClosingText, 20, 158, { maxWidth: 170 });
    } else {
      const detailText = `This is to certify that ${studentName}, Registration No. ${registrationNo}, is residing in room no. ${roomNumber} in ${hallName} (Hall ${hallNumber}) for the ${academicYearText}.`;
      doc.text(detailText, 20, 98, { maxWidth: 170 });

      doc.text("This hall is equipped with canteen system. In this system students need to pay of Rs. 140/- (One hundred forty only) for base meal (Breakfast + Lunch + Dinner) in a day. The monthly estimated expenditure for the food is Rs. 4200/-.", 20, 118, { maxWidth: 170 });
    }

    doc.setFontSize(12);
    doc.text(`Date: ${dateText}`, 25, 175);

    if (stampUrl) {
      try {
        doc.addImage(stampUrl, "PNG", 30, 180, 22, 22);
      } catch (err) {
        console.warn("Could not add hall stamp:", err);
      }
    }

    if (signatureUrl) {
      try {
        doc.addImage(signatureUrl, "PNG", 128, 182, 40, 18);
      } catch (err) {
        console.warn("Could not add warden signature:", err);
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Warden", 146, 205, { align: "center" });
    doc.text(`${user.name}`, 146, 212, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Dr. B. R. Ambedkar Hall of Residence`, 145, 220, { align: "center" });
    doc.text(`(Hall ${hallNumber})`, 145, 226, { align: "center" });
    doc.text("NIT Durgapur", 145, 232, { align: "center" });

    return doc.output("datauristring");
  };

  const handleOpenApproval = async (id) => {
    try {
      const reviewUrl = `/warden/certificates/${id}/review`;
      window.open(reviewUrl, "_blank", "noopener,noreferrer");
      setApprovalData({
        remarks: "",
        stampUrl: "",
        stampFileName: "",
        signatureUrl: "",
        signatureFileName: "",
      });
    } catch {
      notify.error("Failed to load certificate.");
    }
  };

  const handleApprove = async () => {
    if (approving) return;

    if (!approvalData.stampUrl) {
      notify.warning("Please upload the stamp before approving the certificate.");
      return;
    }

    if (!approvalData.signatureUrl) {
      notify.warning("Please upload the warden signature before approving the certificate.");
      return;
    }

    if (!approvalData.remarks || approvalData.remarks.trim().length === 0) {
      notify.warning("Please enter remarks before approving the certificate.");
      return;
    }

    try {
      setApproving(true);

      const pdfDataUri = await generateCertificatePDF(
        selectedCert,
        approvalData.stampUrl,
        approvalData.signatureUrl
      );

      const approvalRes = await approveCertificate(selectedCert._id, {
        certificatePdfUrl: pdfDataUri,
        digitalSignatureUrl: approvalData.signatureUrl,
        stampUrl: approvalData.stampUrl,
        remarks: approvalData.remarks,
      });

      const approvedCertificate = approvalRes.data.certificate || {};

      setCertificates((prev) =>
        prev.map((item) => (item._id === approvedCertificate._id ? approvedCertificate : item))
      );

      setSelectedCert(null);
      notify.success(`${approvedCertificate.certificateRequestNumber || "Certificate"} approved.`);

      // Download PDF asynchronously without blocking UI
      const pdfFileName = `${selectedCert.certificateRequestNumber || "certificate"}.pdf`;
      setTimeout(() => {
        downloadPdfFile(pdfDataUri, pdfFileName);
      }, 0);

      navigate("/warden/certificates", { replace: true });

      setTimeout(() => {
        setApprovalData({ remarks: "", stampUrl: "", stampFileName: "", signatureUrl: "", signatureFileName: "" });
      }, 900);
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to approve certificate.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const reason = (approvalData.remarks || "").trim();
    if (!reason) {
      notify.warning("Remark is required before rejecting the certificate.");
      return;
    }

    try {

      const rejectedResponse = await rejectCertificate(selectedCert._id, { rejectionReason: reason });
      const rejectedCertificate = rejectedResponse.data.certificate || null;

      if (rejectedCertificate) {
        setCertificates((prev) =>
          prev.map((item) => (item._id === rejectedCertificate._id ? rejectedCertificate : item))
        );
      }

      notify.success("Certificate rejected.");
      setSelectedCert(null);
      setApprovalData({ remarks: "", stampUrl: "", stampFileName: "", signatureUrl: "", signatureFileName: "" });
      navigate("/warden/certificates", { replace: true });
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to reject certificate.");
    }
  };

  const handleDelete = async (certificateId) => {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    const deletionReason = window.prompt("Enter the reason for deleting this certificate:");
    if (deletionReason === null) return;
    if (!deletionReason.trim()) {
      notify.warning("A deletion remark is required.");
      return;
    }

    try {
      await deleteCertificate(certificateId, deletionReason.trim());
      notify.success("Certificate deleted successfully.");
      if (selectedCert?._id === certificateId) {
        setSelectedCert(null);
        navigate("/warden/certificates", { replace: true });
      }
      fetchCertificates();
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to delete certificate.");
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const nextValue = event.target.result;
      const nextApprovalData = {
        ...approvalData,
        [type === "stamp" ? "stampUrl" : "signatureUrl"]: nextValue,
        [type === "stamp" ? "stampFileName" : "signatureFileName"]: file.name,
      };

      setApprovalData(nextApprovalData);
      // Do NOT save to localStorage - uploads should be fresh each time
    };
    reader.readAsDataURL(file);
  };

  const filteredCerts = certificates.filter(
    (cert) => filterStatus === "All" || cert.status === filterStatus
  );

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  if (reviewId) {
    return (
      <div className="warden-certificates-shell">
        <div className="container py-4">
          <div className="approval-page-header mb-4">
            <h2>Certificate Review</h2>
            <p>Approve or reject the selected certificate request</p>
          </div>


          {!selectedCert ? (
            <div className="alert alert-info">Loading certificate details...</div>
          ) : (
            <div className="card certificate-card shadow-sm h-100">
              <div className="card-body">
                <div className="mb-3">
                  <p className="mb-1"><strong>Student:</strong> {selectedCert.studentId.name}</p>
                  <p className="mb-1"><strong>Registration No:</strong> {selectedCert.studentId.registrationNo}</p>
                  <p className="mb-1"><strong>Type:</strong> {selectedCert.certificateType}</p>
                  <p className="mb-1"><strong>Request Number:</strong> {selectedCert.certificateRequestNumber}</p>
                  {selectedCert.certificateType === "Leave" && (
                    <p className="mb-1">
                      <strong>Leave Period:</strong>{" "}
                      {new Date(selectedCert.leaveFromDate).toLocaleDateString()} to{" "}
                      {new Date(selectedCert.leaveToDate).toLocaleDateString()}
                    </p>
                  )}
                  {selectedCert.reason && (
                    <p className="mb-1"><strong>Reason:</strong> {selectedCert.reason}</p>
                  )}
                  {selectedCert.purpose && (
                    <p className="mb-1"><strong>Purpose:</strong> {selectedCert.purpose}</p>
                  )}
                </div>

                <div className="mb-3 upload-field-group">
                  <label className="upload-row-label">Upload Stamp <span className="text-danger">*</span></label>
                  <small className="text-muted d-block mb-2">Required for approval</small>
                  <div className="upload-box">
                    <button type="button" className="choose-file-btn">Choose file</button>
                    <span className="file-name-text">
                      {approvalData.stampFileName || "No file chosen"}
                    </span>
                    <input
                      type="file"
                      className="native-file-input"
                      accept="image/png,image/jpeg,.jpg,.jpeg"
                      onChange={(e) => handleImageUpload(e, "stamp")}
                    />
                  </div>
                  {approvalData.stampUrl && (
                    <div className="mt-2 warden-image-preview-box">
                      <img src={approvalData.stampUrl} alt="Stamp preview" className="warden-image-preview" />
                    </div>
                  )}
                </div>

                <div className="mb-3 upload-field-group">
                  <label className="upload-row-label">Upload Signature <span className="text-danger">*</span></label>
                  <small className="text-muted d-block mb-2">Required for approval</small>
                  <div className="upload-box">
                    <button type="button" className="choose-file-btn">Choose file</button>
                    <span className="file-name-text">
                      {approvalData.signatureFileName || "No file chosen"}
                    </span>
                    <input
                      type="file"
                      className="native-file-input"
                      accept="image/png,image/jpeg,.jpg,.jpeg"
                      onChange={(e) => handleImageUpload(e, "signature")}
                    />
                  </div>
                  {approvalData.signatureUrl && (
                    <div className="mt-2 warden-image-preview-box">
                      <img src={approvalData.signatureUrl} alt="Signature preview" className="warden-image-preview signature-preview" />
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Remark <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control remarks-textarea"
                    rows="4"
                    value={approvalData.remarks}
                    onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                    placeholder="Add a remark before approving or rejecting this certificate"
                    required
                  ></textarea>
                  <small className="text-muted d-block mt-1">
                    A remark is required for both approval and rejection.
                  </small>
                </div>
              </div>

              <div className="card-footer bg-white border-top d-flex gap-2">
                <button className="btn btn-danger" onClick={handleReject}>Reject</button>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: "#003366", borderColor: "#003366" }}
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? "Generating..." : "Approve & Generate PDF"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="warden-certificates-shell">
      <div className="container py-4">
        <div className="approval-page-header mb-4">
          <h2>Certificate Approvals</h2>
          <p>Review and approve student certificate requests</p>
        </div>


        <div className="filter-row mb-3">
          <select
            className="form-select approval-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="row g-4">
          {filteredCerts.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No certificates found for the selected status.
              </div>
            </div>
          ) : (
            filteredCerts.map((cert) => (
              <div key={cert._id} className="col-lg-6">
                <div className="card certificate-card shadow-sm h-100">
                  <div className="card-body">
                    {/* Header: Student Info + Status */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title mb-1">{cert.studentId.name}</h5>
                        <small className="text-muted">
                          {cert.studentId.registrationNo}
                        </small>
                      </div>
                      <span className={`badge bg-${normalizeStatus(cert.status) === "Pending" ? "warning" : normalizeStatus(cert.status) === "Approved" ? "success" : "danger"} fs-6`}>
                        {normalizeStatus(cert.status) || "Pending"}
                      </span>
                    </div>

                    <hr className="my-2" />

                    {/* Certificate Type & Number */}
                    <p className="mb-2">
                      <strong>Certificate:</strong> {cert.certificateType}
                      <br />
                      <small className="text-muted">{cert.certificateRequestNumber}</small>
                    </p>

                    {/* Requested Date */}
                    <p className="mb-2">
                      <strong>Requested:</strong> {new Date(cert.createdAt).toLocaleDateString()}
                    </p>

                    {/* Room & Year Info */}
                    <p className="mb-2">
                      <strong>Room:</strong> {getRoomDisplayValue(getStudentRoomNumber(cert))} | 
                      <strong className="ms-2">Year:</strong> {getStudentAcademicYearLabel(cert)}
                    </p>

                    {/* Leave Certificate Details */}
                    {cert.certificateType === "Leave" && (
                      <>
                        <p className="mb-2">
                          <strong>Leave:</strong> {formatCertificateDate(cert.leaveFromDate)} to{" "}
                          {formatCertificateDate(cert.leaveToDate)}
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
                        {cert.remarks && (
                          <p className="mb-2">
                            <strong>Remarks:</strong> {cert.remarks}
                          </p>
                        )}
                        <p className="mb-2 text-muted small">
                          <strong>Approved at:</strong> {new Date(cert.approvedAt).toLocaleString()}
                        </p>
                      </>
                    )}

                    {/* Rejection Details */}
                    {cert.status === "Rejected" && (cert.remarks || cert.rejectionReason) && (
                      <>
                        <hr className="my-2" />
                        <div className="alert alert-danger mb-0 small">
                          <strong>Remark:</strong> {cert.remarks || cert.rejectionReason}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center">
                    <div>
                      {normalizeStatus(cert.status) === "Pending" && (
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ backgroundColor: "#003366", borderColor: "#003366" }}
                          onClick={() => handleOpenApproval(cert._id)}
                        >
                          Review
                        </button>
                      )}
                      {normalizeStatus(cert.status) === "Approved" && cert.certificatePdfAvailable && (
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={viewingPdfId === cert._id}
                          onClick={() => openPdfInNewTab(cert._id)}
                        >
                          {viewingPdfId === cert._id ? "Opening..." : "View PDF"}
                        </button>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(cert._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Approval Modal */}
        {selectedCert && (
          <div className="modal-backdrop show" style={{ display: "block" }}>
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title">Review</h5>
                      <small className="text-muted d-block mt-1">{selectedCert.certificateRequestNumber}</small>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setSelectedCert(null)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <p className="mb-1"><strong>Student:</strong> {selectedCert.studentId.name}</p>
                      <p className="mb-1"><strong>Registration No:</strong> {selectedCert.studentId.registrationNo}</p>
                      <p className="mb-1"><strong>Type:</strong> {selectedCert.certificateType}</p>
                      {selectedCert.certificateType === "Leave" && (
                        <p className="mb-1">
                          <strong>Leave Period:</strong>{" "}
                          {new Date(selectedCert.leaveFromDate).toLocaleDateString()} to{" "}
                          {new Date(selectedCert.leaveToDate).toLocaleDateString()}
                        </p>
                      )}
                      {selectedCert.reason && (
                        <p className="mb-1"><strong>Reason:</strong> {selectedCert.reason}</p>
                      )}
                      {selectedCert.purpose && (
                        <p className="mb-1"><strong>Purpose:</strong> {selectedCert.purpose}</p>
                      )}
                    </div>

                    <div className="mb-3 upload-field-group">
                      <label className="upload-row-label">Upload Stamp <span className="text-danger">*</span></label>
                      <small className="text-muted d-block mb-2">Required for approval</small>
                      <div className="upload-box">
                        <button type="button" className="choose-file-btn">Choose file</button>
                        <span className="file-name-text">
                          {approvalData.stampFileName || "No file chosen"}
                        </span>
                        <input
                          type="file"
                          className="native-file-input"
                          accept="image/png,image/jpeg,.jpg,.jpeg"
                          onChange={(e) => handleImageUpload(e, "stamp")}
                        />
                      </div>
                      {approvalData.stampUrl && (
                        <div className="mt-2 warden-image-preview-box">
                          <img src={approvalData.stampUrl} alt="Stamp preview" className="warden-image-preview" />
                        </div>
                      )}
                    </div>

                    <div className="mb-3 upload-field-group">
                      <label className="upload-row-label">Upload Signature <span className="text-danger">*</span></label>
                      <small className="text-muted d-block mb-2">Required for approval</small>
                      <div className="upload-box">
                        <button type="button" className="choose-file-btn">Choose file</button>
                        <span className="file-name-text">
                          {approvalData.signatureFileName || "No file chosen"}
                        </span>
                        <input
                          type="file"
                          className="native-file-input"
                          accept="image/png,image/jpeg,.jpg,.jpeg"
                          onChange={(e) => handleImageUpload(e, "signature")}
                        />
                      </div>
                      {approvalData.signatureUrl && (
                        <div className="mt-2 warden-image-preview-box">
                          <img src={approvalData.signatureUrl} alt="Signature preview" className="warden-image-preview signature-preview" />
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Remark <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control remarks-textarea"
                        rows="3"
                        value={approvalData.remarks}
                        onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                        placeholder="Add a remark before approving or rejecting this certificate"
                        required
                      ></textarea>
                      <small className="text-muted d-block mt-1">
                        A remark is required for both approval and rejection.
                      </small>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedCert(null)}
                    >
                      Close
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleReject}
                    >
                      Reject
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ backgroundColor: "#003366", borderColor: "#003366" }}
                      onClick={handleApprove}
                      disabled={approving}
                    >
                      {approving ? "Generating..." : "Approve & Generate PDF"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WardenCertificates;
