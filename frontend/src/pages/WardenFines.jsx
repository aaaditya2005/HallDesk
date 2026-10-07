import { useState, useEffect } from "react";
import {
  issueFine,
  getWardenFines,
  searchStudents,
  updateFineStatus,
  deleteFine,
} from "../services/fineService";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";
import FineCard from "../components/Fine/FineCard";
import "./WardenFines.css";

function WardenFines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    registrationNo: "",
    amount: "",
    description: "",
    paymentDeadline: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const hallId = user?.hallId?._id || user?.hallId;

  const fetchFines = async () => {
    try {
      const res = await getWardenFines();
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

    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("fine-created", (fine) => {
        setFines((prev) => [fine, ...prev.filter((item) => item._id !== fine._id)]);
      });

      socket.on("fine-updated", (fine) => {
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
  }, [hallId]);

  const handleSearchStudent = async (e) => {
    const query = e.target.value;
    setFormData({ ...formData, studentName: query });

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const res = await searchStudents(query);
      setSearchResults(res.data.students || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStudent = (student) => {
    setFormData({
      ...formData,
      studentId: student._id,
      studentName: student.name,
      registrationNo: student.registrationNo || student.managerId,
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.studentId || !formData.amount || !formData.description || !formData.paymentDeadline) {
      notify.warning("All required fields must be filled.");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      notify.warning("Amount must be greater than 0.");
      return;
    }

    try {
      const payload = {
        studentId: formData.studentId,
        amount: parseFloat(formData.amount),
        reason: formData.description,
        paymentProcedure: "Both",
        paymentDeadline: formData.paymentDeadline,
        description: formData.description || null,
      };

      const res = await issueFine(payload);
      notify.success(`Fine issued to ${formData.studentName} successfully!`);
      setFines((prev) => [res.data.fine, ...prev.filter((fine) => fine._id !== res.data.fine._id)]);
      setShowIssueForm(false);
      setFormData({
        studentId: "",
        studentName: "",
        registrationNo: "",
        amount: "",
        description: "",
        paymentDeadline: "",
      });

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to issue fine.");
    }
  };

  const handleStatusUpdate = async (fineId, newStatus, remarks = "") => {
    if (!remarks && !window.confirm(`Mark fine as ${newStatus}?`)) return;

    try {
      const payload = { status: newStatus };
      if (remarks) payload.remarks = remarks;

      const res = await updateFineStatus(fineId, payload);
      setFines((prev) =>
        prev.map((fine) => (fine._id === fineId ? res.data.fine : fine))
      );
      notify.success(`Fine status updated to ${newStatus}.`);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to update fine status.");
    }
  };

  const handleDelete = async (fineId) => {
    if (!window.confirm("Are you sure you want to delete this fine?")) return;

    try {
      await deleteFine(fineId);
      setFines((prev) => prev.filter((fine) => fine._id !== fineId));
      notify.success("Fine deleted successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to delete fine.");
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
    <div className="warden-fines-shell">
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="page-title mb-1">Fine Management</h2>
            <p className="text-muted">Issue and manage fines for students</p>
          </div>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: "#003366", borderColor: "#003366" }}
            onClick={() => setShowIssueForm(!showIssueForm)}
          >
            {showIssueForm ? "Cancel" : "+ Issue Fine"}
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="fine-filters row g-2 mb-4">
          <div className="col-md-3">
            <label className="form-label" htmlFor="warden-fine-status">Status</label>
            <select id="warden-fine-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Paid">Paid</option>
              <option value="Waived">Waived</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="warden-fine-from">From date</label>
            <input id="warden-fine-from" type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="warden-fine-to">To date</label>
            <input id="warden-fine-to" type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>Clear</button>
          </div>
        </div>
        <p className="text-muted small mb-3">Showing {filteredFines.length} of {fines.length} fines</p>

        {showIssueForm && (
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">Issue New Fine</h5>
              <form onSubmit={handleSubmit}>
                <div className="row mb-3">
                  <div className="col-lg-6">
                    <label className="form-label">
                      Select Student <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name, registration, or manager ID"
                      value={formData.studentName}
                      onChange={handleSearchStudent}
                      autoComplete="off"
                    />
                    {isSearching && (
                      <small className="text-muted d-block mt-2">Searching...</small>
                    )}
                    {searchResults.length > 0 && (
                      <div className="list-group mt-2" style={{ maxHeight: "180px", overflowY: "auto" }}>
                        {searchResults.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            className="list-group-item list-group-item-action p-2"
                            onClick={() => handleSelectStudent(student)}
                          >
                            <div className="d-flex justify-content-between">
                              <strong>{student.name}</strong>
                              <span className="text-muted">
                                {student.role === "mess_manager"
                                  ? `Manager ID: ${student.managerId || "N/A"}`
                                  : student.registrationNo}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {formData.studentId && (
                      <div className="alert alert-info mt-2 mb-0 py-2">
                        ✓ {formData.studentName} ({formData.registrationNo})
                      </div>
                    )}
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label">
                      Fine Amount (₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter fine amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-6">
                    <label className="form-label">
                      Payment Deadline <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.paymentDeadline}
                      onChange={(e) => setFormData({ ...formData, paymentDeadline: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Enter reason and details about the fine"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: "#003366", borderColor: "#003366" }}>
                    Issue Fine
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowIssueForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="row g-3">
          {filteredFines.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No fines match the selected filters.
              </div>
            </div>
          ) : (
            filteredFines.map((fine) => (
              <div key={fine._id} className="col-lg-6">
                <FineCard
                  fine={fine}
                  isStudent={false}
                  onStatusUpdate={handleStatusUpdate}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default WardenFines;
