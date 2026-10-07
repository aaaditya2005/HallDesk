function StatusBadge({ status }) {
    const classes = {
        Pending: "status-pending",
        Accepted: "status-accepted",
        "In Progress": "status-in-progress",
        Resolved: "status-resolved",
        Rejected: "status-rejected",
    };

    return (
        <span className={`status-badge ${classes[status] || "status-pending"}`}>
            {status}
        </span>
    );
}

export default StatusBadge;