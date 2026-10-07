import { useState, useEffect } from "react";
import {
  getMyFines,
  uploadPaymentProof,
} from "../services/fineService";
import { connectSocket, disconnectSocket } from "../services/socket";
import FineCard from "../components/Fine/FineCard";
import "./Fines.css";

function Fines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = String(user?._id || user?.id || "");
  const isOwnFine = (fine) => String(fine.studentId?._id || fine.studentId?.id || fine.studentId || "") === userId;

  const fetchFines = async () => {
    try {
      const res = await getMyFines();
      setFines(res.data.fines || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load fines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchFines);

    const hallId = user?.hallId?._id || user?.hallId;
    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("fine-created", (fine) => {
        if (!isOwnFine(fine)) return;
        setFines((prev) => [fine, ...prev.filter((item) => item._id !== fine._id)]);
      });

      socket.on("fine-updated", (fine) => {
        if (!isOwnFine(fine)) return;
        setFines((prev) => prev.map((item) => (item._id === fine._id ? fine : item)));
      });

      socket.on("fine-deleted", ({ fineId }) => {
        setFines((prev) => prev.filter((item) => item._id !== fineId));
      });
    }

    return () => {
      if (socket) {
        socket.off("fine-created");
        socket.off("fine-updated");
        socket.off("fine-deleted");
      }
      disconnectSocket();
    };
  }, []);

  const handleUploadProof = async (fineId, fileToUpload) => {
    if (!fileToUpload) {
      setError("Please select a file to upload.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("paymentProof", fileToUpload);

      const res = await uploadPaymentProof(fineId, formData);

      setFines((prev) =>
        prev.map((fine) => (fine._id === fineId ? res.data.fine : fine))
      );

      setSuccess("Payment proof uploaded successfully! Pending warden verification.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload payment proof.");
    }
  };

  const filteredFines = fines.filter((fine) => {
    const fineDate = String(fine.issuedAt || fine.createdAt || "").slice(0, 10);
    const afterStart = !fromDate || fineDate >= fromDate;
    const beforeEnd = !toDate || fineDate <= toDate;
    const matchingStatus = statusFilter === "All" || String(fine.status || "").trim() === statusFilter;
    return afterStart && beforeEnd && matchingStatus;
  });

  const clearFilters = () => {
    setStatusFilter("All");
    setFromDate("");
    setToDate("");
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  return (
    <div className="student-fines-shell">
      <div className="container py-4">
        <div>
          <h2 className="page-title mb-1">My Fines</h2>
          <p className="text-muted">View and pay fines issued to you</p>
        </div>

        {error && <div className="alert alert-danger mt-3">{error}</div>}
        {success && <div className="alert alert-success mt-3">{success}</div>}

        <div className="fine-filters row g-2 mt-3 mb-2">
          <div className="col-md-3">
            <label className="form-label" htmlFor="student-fine-status">Status</label>
            <select id="student-fine-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Paid">Paid</option>
              <option value="Waived">Waived</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="student-fine-from">From date</label>
            <input id="student-fine-from" type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="student-fine-to">To date</label>
            <input id="student-fine-to" type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>Clear</button>
          </div>
        </div>
        <p className="text-muted small mb-2">Showing {filteredFines.length} of {fines.length} fines</p>

        <div className="row g-3 mt-2">
          {filteredFines.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No fines match the selected filters.
              </div>
            </div>
          ) : (
            filteredFines.map((fine) => {
              const ownFine = isOwnFine(fine);
              return (
              <div key={fine._id} className="col-lg-6">
                <FineCard
                  fine={fine}
                  isStudent={true}
                  readOnly={!ownFine}
                  canUploadProof={ownFine}
                  onUploadProof={handleUploadProof}
                />
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Fines;