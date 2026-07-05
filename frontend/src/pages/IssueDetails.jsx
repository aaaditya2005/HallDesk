import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function IssueDetails() {
  const { id } = useParams();

  const [issue, setIssue] =
    useState(null);

  useEffect(() => {
    const fetchIssue =
      async () => {
        try {
          const res =
            await api.get(
              `/issues/${id}`
            );

          setIssue(
            res.data.issue
          );
        } catch (error) {
          console.error(error);
        }
      };

    fetchIssue();
  }, [id]);

  if (!issue) {
    return <h2>Loading...</h2>;
  }

  return (
    <div>
      <h1>
        {issue.issueNumber}
      </h1>

      <h2>
        {issue.title}
      </h2>

      <p>
        {issue.description}
      </p>

      <p>
        Status: {issue.status}
      </p>

      <p>
        Category: {issue.category}
      </p>

      <p>
        Room: {issue.roomId?.roomNumber}
      </p>

      <hr />

      <h2>
        Timeline
      </h2>

      {issue.timeline?.map(
        (
          item,
          index
        ) => (
          <div
            key={index}
            style={{
              marginBottom:
                "15px",
              borderLeft:
                "3px solid green",
              paddingLeft:
                "10px",
            }}
          >
            <h4>
              {item.action}
            </h4>

            <p>
              {item.remark}
            </p>

            <small>
              {new Date(
                item.timestamp
              ).toLocaleString()}
            </small>
          </div>
        )
      )}
    </div>
  );
}

export default IssueDetails;