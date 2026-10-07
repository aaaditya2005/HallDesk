import { useEffect, useMemo, useState } from "react";
import { getPolls, votePoll, createPoll, deletePoll } from "../services/pollService";
import { connectSocket, disconnectSocket } from "../services/socket";

function Polls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: ["", ""],
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canManage = ["admin", "warden"].includes(user?.role);
  const isStudent = user?.role === "student";

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayDate = getLocalDateString(new Date());
  const endDateMin = newPoll.startDate || todayDate;

  const fetchPolls = async (status = filterStatus) => {
    try {
      const res = await getPolls(status);
      setPolls(res.data.polls || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchPolls());
  }, [filterStatus]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const hallId = user?.hallId?._id || user?.hallId;
    const socket = connectSocket(hallId);

    if (socket) {
      socket.on("poll-created", (poll) => {
        setPolls((prev) => [poll, ...prev]);
      });

      socket.on("poll-updated", (poll) => {
        setPolls((prev) => prev.map((p) => (p._id === poll._id ? poll : p)));
      });

      socket.on("poll-deleted", ({ pollId }) => {
        setPolls((prev) => prev.filter((p) => p._id !== pollId));
      });
    }

    return () => {
      if (socket) {
        socket.off("poll-created");
        socket.off("poll-updated");
        socket.off("poll-deleted");
      }
      disconnectSocket();
    };
  }, []);

  const handleVote = async (pollId, optionText) => {
    setError("");
    setSuccess("");
    setSubmittingId(pollId);
    try {
      const res = await votePoll(pollId, optionText);
      setPolls((prevPolls) =>
        prevPolls.map((poll) => (poll._id === pollId ? res.data.poll : poll))
      );
      // Do not show the global success flash for votes; we indicate vote on the option itself
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Vote failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm("Delete this poll? This cannot be undone.")) return;
    setError("");
    setSuccess("");
    setDeletingId(pollId);
    try {
      await deletePoll(pollId);
      setPolls((prevPolls) => prevPolls.filter((poll) => poll._id !== pollId));
      setSuccess("Poll deleted successfully.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete poll.");
    } finally {
      setDeletingId(null);
    }
  };

  const toStartOfDay = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const toEndOfDay = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  };

  const handleCreatePoll = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedOptions = newPoll.options
      .map((option) => option.trim())
      .filter(Boolean);

    if (!newPoll.title.trim() || !newPoll.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    if (trimmedOptions.length < 2) {
      setError("A poll must have at least two options.");
      return;
    }

    if (!newPoll.startDate || !newPoll.endDate) {
      setError("Start date and end date are required.");
      return;
    }

    const startDateValue = toStartOfDay(newPoll.startDate);
    const endDateValue = toEndOfDay(newPoll.endDate);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (startDateValue < todayStart) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (endDateValue <= startDateValue) {
      setError("End date must be after the start date.");
      return;
    }

    try {
      await createPoll({
        title: newPoll.title.trim(),
        description: newPoll.description.trim(),
        options: trimmedOptions,
        startDate: newPoll.startDate,
        endDate: newPoll.endDate,
      });
      setSuccess("Poll created successfully.");
      setNewPoll({
        title: "",
        description: "",
        options: ["", ""],
        startDate: "",
        endDate: "",
      });
      setIsCreating(false);
      fetchPolls();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to create poll.");
    }
  };

  const handleOptionChange = (index, value) => {
    setNewPoll((prevPoll) => {
      const options = [...prevPoll.options];
      options[index] = value;
      return { ...prevPoll, options };
    });
  };

  const addOption = () => {
    setNewPoll((prevPoll) => ({
      ...prevPoll,
      options: [...prevPoll.options, ""],
    }));
  };

  const removeOption = (index) => {
    setNewPoll((prevPoll) => ({
      ...prevPoll,
      options: prevPoll.options.filter((_, idx) => idx !== index),
    }));
  };

  const pollsCount = useMemo(() => polls.length, [polls]);

  const renderOption = (poll, option, index, allowVote) => {
    const percent = poll.totalVotes
      ? Math.round((option.voteCount / poll.totalVotes) * 100)
      : 0;

    const isSelected = poll.hasVoted && (poll.selectedIndex === index || poll.selectedOption === option.optionText);
    let progressClass = "progress-bar bg-light";
    if (percent > 0) progressClass = "progress-bar bg-navbar";

    const content = (
      <>
        <div className="d-flex justify-content-between align-items-center">
          <span>{option.optionText}</span>
          <span>
            {option.voteCount} votes
            {isSelected && (
              <span className="badge bg-success ms-2">You voted ✓</span>
            )}
          </span>
        </div>
        <div className="progress" style={{ height: "10px" }}>
          <div
            className={progressClass}
            role="progressbar"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
        <div className="d-flex justify-content-between mt-1">
          <small className="text-muted">{percent}%</small>
        </div>
      </>
    );

    if (allowVote) {
      return (
        <button
          key={option.optionText}
          type="button"
          className="option-row option-vote btn w-100 text-start mb-3"
          disabled={submittingId === poll._id}
          onClick={() => handleVote(poll._id, index)}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={option.optionText} className="option-row option-result mb-3">
        {content}
      </div>
    );
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
          <h2>Hall Polls</h2>
          <p className="text-muted">Vote on active polls and review the results below.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <select
            className="form-select"
            style={{ width: "200px" }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Polls</option>
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Closed">Closed</option>
          </select>
          {canManage && (
            <button
              type="button"
              className="btn sidebar-button"
              onClick={() => setIsCreating((prev) => !prev)}
            >
              {isCreating ? "Cancel" : "Create Poll"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 text-muted">
        Showing {pollsCount} poll{pollsCount !== 1 ? "s" : ""}.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isCreating && canManage && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">Create New Poll</h5>
            <form onSubmit={handleCreatePoll}>
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  placeholder="Enter poll title"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Describe what this poll is about"
                  value={newPoll.description}
                  onChange={(e) => setNewPoll((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Options</label>
                {newPoll.options.map((option, index) => (
                  <div key={index} className="input-group mb-2">
                    <input
                      className="form-control"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {newPoll.options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addOption}>
                  Add option
                </button>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={todayDate}
                    value={newPoll.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      setNewPoll((prev) => ({
                        ...prev,
                        startDate,
                        endDate: prev.endDate && prev.endDate < startDate ? "" : prev.endDate,
                      }));
                    }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={endDateMin}
                    value={newPoll.endDate}
                    onChange={(e) => setNewPoll((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mb-3 text-muted">
                <small>
                  Poll starts at 12:00 AM on the chosen start date and closes at 11:59 PM on the end date.
                </small>
              </div>

              <button className="btn sidebar-button" type="submit">
                Create Poll
              </button>
            </form>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div className="alert alert-info">No polls available.</div>
      ) : (
        polls.map((poll) => {
          const isActive = poll.status === "Active";
          return (
            <div key={poll._id} className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="mb-1">{poll.title}</h5>
                    <p className="text-muted mb-1">{poll.description}</p>
                    <small className="text-muted">
                      {poll.hallId ? `Hall ${poll.hallId.hallNumber} - ${poll.hallId.hallName}` : "Hall"} • {poll.status}
                    </small>
                  </div>
                  <div className="text-end">
                    <span className={`badge bg-${isActive ? "success" : poll.status === "Upcoming" ? "warning" : "secondary"}`}>
                      {poll.status}
                    </span>
                    {canManage && (
                      <button
                        className="btn btn-sm btn-outline-danger ms-2"
                        disabled={deletingId === poll._id}
                        onClick={() => handleDelete(poll._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3 text-muted">
                  <small>Starts: {new Date(poll.startDate).toLocaleDateString()} at {new Date(poll.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  <span className="mx-2">•</span>
                  <small>Ends: {new Date(poll.endDate).toLocaleDateString()} at {new Date(poll.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>

                {poll.options.map((option, idx) => renderOption(poll, option, idx, isStudent && isActive && !poll.hasVoted))}

                <div className="mt-3">
                  {isActive && isStudent && !poll.hasVoted && (
                    <div className="alert alert-secondary py-2">Tap an option to vote.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Polls;
