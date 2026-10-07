import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import StatCard from "../components/Dashboard/StatCard";
import { getStudentDashboard } from "../services/dashboardService";
import { connectSocket, disconnectSocket } from "../services/socket";
import "./Dashboard.css";

function Dashboard() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    const [dashboardData, setDashboardData] = useState({ openIssues: 0, pendingCertificates: 0, activePolls: 0, pendingFines: 0, notices: [], recentActivity: [] });
    const notices = dashboardData.notices;

    const stats = [
        { title: "Open Issues", value: dashboardData.openIssues, icon: "bi-exclamation-circle", color: "blue" },
        { title: "Pending Certificates", value: dashboardData.pendingCertificates, icon: "bi-file-earmark-text", color: "green" },
        { title: "Active Polls", value: dashboardData.activePolls, icon: "bi-bar-chart", color: "orange" },
        { title: "Pending Fines", value: dashboardData.pendingFines, icon: "bi-cash-stack", color: "red" },
    ];

    const fetchDashboard = async () => {
        try {
            const res = await getStudentDashboard();
            setDashboardData(res.data.data || {});
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(fetchDashboard);

        const hallId = user?.hallId?._id || user?.hallId;
        const socket = connectSocket(hallId);

        if (socket) {
            socket.on("notice-created", (notice) => {
                setDashboardData((prev) => ({ ...prev, notices: [notice, ...prev.notices].slice(0, 3) }));
            });

            socket.on("notice-updated", (notice) => {
                setDashboardData((prev) => ({ ...prev, notices: prev.notices.map((item) => (item._id === notice._id ? notice : item)) }));
            });

            socket.on("notice-deleted", ({ noticeId }) => {
                setDashboardData((prev) => ({ ...prev, notices: prev.notices.filter((item) => item._id !== noticeId) }));
            });
        }

        return () => {
            if (socket) {
                socket.off("notice-created");
                socket.off("notice-updated");
                socket.off("notice-deleted");
            }
            disconnectSocket();
        };
    }, [user?.hallId?._id, user?.hallId]);

    const activities = dashboardData.recentActivity;

    return (

        <div className="dashboard-page">

            <div className="dashboard-header">

                <div>

                    <h2>

                        Good Morning, {user?.name}

                    </h2>

                    <p>

                        Welcome back to HallDesk.

                    </p>

                </div>

            </div>

            <div className="stats-grid">

                {stats.map((item, index) => (

                    <StatCard
                        key={index}
                        {...item}
                    />

                ))}

            </div>

            <div className="dashboard-grid">

                <div className="dashboard-card">

                    <h4>

                        Quick Actions

                    </h4>

                    <div className="action-buttons">

                        <Link
                            to="/student/create-issue"
                            className="btn btn-primary"
                        >

                            Report Issue

                        </Link>

                        <Link
                            to="/student/certificates"
                            className="btn btn-success"
                        >

                            Apply Certificate

                        </Link>

                        <Link
                            to="/student/mess"
                            className="btn btn-warning"
                        >

                            Mess Menu

                        </Link>

                        <Link
                            to="/student/polls"
                            className="btn btn-info"
                        >

                            Vote Poll

                        </Link>

                    </div>

                </div>

                <div className="dashboard-card">

                    <h4>

                        Latest Notices

                    </h4>

                    <div className="notices-list-dashboard">
                        {notices.slice(0, 3).map((notice) => (
                            <div key={notice._id} className="notice-item-dashboard">
                                <div className="notice-item-header">
                                    <span className={`status-badge ${notice.status === "Active" ? "active" : notice.status === "Expired" ? "expired" : "deleted"}`}>
                                        {notice.status}
                                    </span>
                                    <span className="notice-date">{new Date(notice.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h5>{notice.title}</h5>
                                <p className="notice-description-dashboard">{notice.description.substring(0, 80)}...</p>
                                {notice.attachment && (
                                    <div className="attachment-indicator">📎 Attachment</div>
                                )}
                            </div>
                        ))}
                        {notices.length === 0 && (
                            <div className="no-notices-dashboard">
                                <p>No notices yet</p>
                            </div>
                        )}
                    </div>
                    <Link to="/student/notices" className="view-all-link">
                        View All Notices →
                    </Link>

                </div>

            </div>

            <div className="dashboard-card">

                <h4>

                    Recent Activity

                </h4>

                <ul>

                    {activities.map((activity, index) => (

                        <li key={index}>

                            ✅ {activity}

                        </li>

                    ))}

                </ul>

            </div>

        </div>

    );

}

export default Dashboard;