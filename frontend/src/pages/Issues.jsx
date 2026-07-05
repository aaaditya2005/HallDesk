import { useEffect, useState } from "react";
import api from "../services/api";

function Issues() {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const token =
          localStorage.getItem("token");

        const res = await api.get(
          "/issues/my",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setIssues(res.data.issues);
      } catch (error) {
        console.error(error);
      }
    };

    fetchIssues();
  }, []);

  return (
    <div>
      <h1>My Issues</h1>

      {issues.length === 0 ? (
        <p>No issues found</p>
      ) : (
        issues.map((issue) => (
          <div
            key={issue._id}
            style={{
              border: "1px solid black",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <h3>{issue.issueNumber}</h3>

            <p>
              <strong>Title:</strong>{" "}
              {issue.title}
            </p>

            <p>
              <strong>Category:</strong>{" "}
              {issue.category}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {issue.status}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default Issues;