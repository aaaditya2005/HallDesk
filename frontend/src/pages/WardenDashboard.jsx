import { useEffect, useState } from "react";
import api from "../services/api";

function WardenDashboard() {
  const [issues, setIssues] = useState([]);

  const fetchIssues = async () => {
    try {
      const token =
        localStorage.getItem("token");

      const res = await api.get(
        "/issues/warden",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setIssues(res.data.issues);

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const updateStatus = async (
    issueId,
    status
  ) => {
    try {
      const remark = prompt(
        `Enter remark for ${status}`
      );

      if (remark === null) {
        return;
      }

      const token =
        localStorage.getItem("token");

      await api.patch(
        `/issues/${issueId}/status`,
        {
          status,
          remark,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      fetchIssues();

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>
        Warden Dashboard
      </h1>

      {issues.map((issue) => (
        <div
          key={issue._id}
          style={{
            border: "1px solid black",
            margin: "10px",
            padding: "10px",
          }}
        >
          <h3>
            {issue.issueNumber}
          </h3>

          <p>
            {issue.title}
          </p>

          <p>
            Status: {issue.status}
          </p>

          <p>
            Student:{" "}
            {issue.reportedBy?.name}
          </p>

          <p>
            Room:{" "}
            {issue.roomId?.roomNumber}
          </p>

          {issue.status ===
            "Pending" && (
            <>
              <button
                onClick={() =>
                  updateStatus(
                    issue._id,
                    "Accepted"
                  )
                }
              >
                Accept
              </button>

              <button
                onClick={() =>
                  updateStatus(
                    issue._id,
                    "Rejected"
                  )
                }
              >
                Reject
              </button>
            </>
          )}

          {issue.status ===
            "Accepted" && (
            <button
              onClick={() =>
                updateStatus(
                  issue._id,
                  "In Progress"
                )
              }
            >
              Mark In Progress
            </button>
          )}

          {issue.status ===
            "In Progress" && (
            <button
              onClick={() =>
                updateStatus(
                  issue._id,
                  "Resolved"
                )
              }
            >
              Resolve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default WardenDashboard;