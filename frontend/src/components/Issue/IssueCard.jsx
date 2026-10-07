import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContextValue.js";
import StatusBadge from "./StatusBadge";
import "./IssueCard.css";

function IssueCard({ issue }) {
    const { user } = useAuth();
    const role = user?.role || "student";

    const getIssueRoute = () => {
        if (issue?.reportedBy && role === "student") {
            return `/student/issues/${issue._id}`;
        }
        return `/${role}/issues/${issue._id}`;
    };

    return (
        <div className="issue-card">
            <div className="issue-card-header">
                <div>
                    <h4>{issue.title}</h4>
                    <div className="issue-number">{issue.issueNumber || "Issue"}</div>
                </div>
                <StatusBadge status={issue.status} />
            </div>

            <div className="issue-card-body">
                <div className="issue-meta">
                    <span className="meta-badge category-badge">{issue.category}</span>
                </div>
                <p className="issue-description">{issue.description}</p>

                <div className="issue-info">
                    <div className="issue-info-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {issue.reportedBy?.name || "You"}
                    </div>
                    <div className="issue-info-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {issue.roomId?.roomNumber || issue.room || "N/A"}
                    </div>
                    <div className="issue-info-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : issue.date || "N/A"}
                    </div>
                </div>
            </div>

            <div className="issue-card-footer">
                <Link className="action-btn btn-view" to={getIssueRoute()}>
                    View Details
                </Link>
            </div>
        </div>
    );
}

export default IssueCard;