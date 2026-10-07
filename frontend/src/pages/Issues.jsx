import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import IssueCard from "../components/Issue/IssueCard";
import { getMyIssues } from "../services/issueService";
import { connectSocket, disconnectSocket } from "../services/socket";
import notify from "../utils/toast";

function Issues() {

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");

    const fetchIssues = async () => {

        try {

            const res = await getMyIssues();

            console.log("Issues API Response:", res.data);
            setIssues(Array.isArray(res.data.issues) ? res.data.issues : []);

        } catch (err) {

            console.error(err);

            notify.error("Failed to load issues.");

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        void Promise.resolve().then(fetchIssues);

        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const hallId = user?.hallId?._id || user?.hallId;
        const socket = connectSocket(hallId);

        if (socket) {
            socket.on("issue-created", (issue) => {
                setIssues((prev) => [issue, ...prev]);
            });

            socket.on("issue-updated", (issue) => {
                setIssues((prev) => prev.map((item) => (item._id === issue._id ? issue : item)));
            });

            socket.on("issue-deleted", ({ issueId }) => {
                setIssues((prev) => prev.filter((item) => item._id !== issueId));
            });
        }

        return () => {
            if (socket) {
                socket.off("issue-created");
                socket.off("issue-updated");
                socket.off("issue-deleted");
            }
            disconnectSocket();
        };
    }, []);

    const filteredIssues = useMemo(() => {

    if (!Array.isArray(issues)) return [];

    return issues.filter((issue) => {

        const matchSearch =
            issue.title
                ?.toLowerCase()
                .includes(search.toLowerCase());

        const matchStatus =
            statusFilter === "All" ||
            issue.status === statusFilter;

        const matchCategory =
            categoryFilter === "All" ||
            issue.category === categoryFilter;

        return (
            matchSearch &&
            matchStatus &&
            matchCategory
        );

    });

}, [issues, search, statusFilter, categoryFilter]);

    if (loading) {

        return (
            <div className="text-center mt-5">
                <div className="spinner-border"></div>
            </div>
        );

    }

    return (

        <div className="container py-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <h2>My Issues</h2>

                <Link
                    to="/student/create-issue"
                    className="btn btn-primary"
                >
                    + Raise Issue
                </Link>

            </div>

            <div className="card shadow-sm mb-4">

                <div className="card-body">

                    <div className="row g-3">

                        <div className="col-md-4">

                            <input
                                className="form-control"
                                placeholder="Search Issue..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                            />

                        </div>

                        <div className="col-md-4">

                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                            >

                                <option>All</option>
                                <option>Pending</option>
                                <option>Accepted</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Rejected</option>

                            </select>

                        </div>

                        <div className="col-md-4">

                            <select
                                className="form-select"
                                value={categoryFilter}
                                onChange={(e) =>
                                    setCategoryFilter(e.target.value)
                                }
                            >

                                <option>All</option>
                                <option>Electrical</option>
                                <option>Mess</option>
                                <option>Infrastructure</option>
                                <option>Cleanliness</option>
                                <option>Water</option>
                                <option>Internet</option>
                                <option>Furniture</option>
                                <option>Other</option>

                            </select>

                        </div>

                    </div>

                </div>

            </div>

            {filteredIssues.length === 0 ? (

                <div className="alert alert-info">

                    No issues found.

                </div>

            ) : (

                <div className="row">

                    {filteredIssues.map((issue) => (

                        <div
                            key={issue._id}
                            className="col-lg-6 mb-4"
                        >

                            <IssueCard issue={issue} />

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}

export default Issues;