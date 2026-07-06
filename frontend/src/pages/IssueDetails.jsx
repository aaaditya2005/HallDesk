import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Timeline from "../components/Timeline/Timeline";

function IssueDetails() {

  const { id } = useParams();

  const [issue, setIssue] = useState(null);

  useEffect(() => {

    const fetchIssue = async () => {

      try {

        const res = await api.get(
          `/issues/${id}`
        );

        setIssue(res.data.issue);

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
    <div style={{ padding: "20px" }}>

      <h1>{issue.issueNumber}</h1>

      <hr />

      <h2>{issue.title}</h2>

      <p>
        <strong>Description:</strong>
        {" "}
        {issue.description}
      </p>

      <p>
        <strong>Category:</strong>
        {" "}
        {issue.category}
      </p>

      <p>
        <strong>Status:</strong>
        {" "}
        {issue.status}
      </p>

      <p>
        <strong>Priority:</strong>
        {" "}
        {issue.priority}
      </p>

      <hr />

      <h2>Student Details</h2>

      <p>
        <strong>Name:</strong>
        {" "}
        {issue.reportedBy?.name}
      </p>

      <p>
        <strong>Registration No:</strong>
        {" "}
        {issue.reportedBy?.registrationNo}
      </p>

      <p>
        <strong>Roll No:</strong>
        {" "}
        {issue.reportedBy?.rollNo}
      </p>

      <hr />

      <h2>Location</h2>

      <p>
        <strong>Hall:</strong>
        {" "}
        {issue.hallId?.hallName}
      </p>

      <p>
        <strong>Room:</strong>
        {" "}
        {issue.roomId?.roomNumber}
      </p>

      <hr />

      {issue.assignedTo && (

        <>
          <h2>Assigned To</h2>

          <p>
            {issue.assignedTo.name}
          </p>

          <hr />
        </>

      )}

      {issue.rejectionReason && (

        <>
          <h2>
            Rejection Reason
          </h2>

          <p>
            {issue.rejectionReason}
          </p>

          <hr />
        </>

      )}

      <h2>Timeline</h2>

      <Timeline
        timeline={issue.timeline}
      />
    </div>
  );
}

export default IssueDetails;