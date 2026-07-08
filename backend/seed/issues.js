const generateIssues = (
  students,
  wardens
) => {

  const issues = [];

  let count = 1;

  const templates = [
    {
      title: "Room Light Not Working",
      category: "Electrical",
      description: "Tube light has stopped working.",
    },
    {
      title: "Water Leakage",
      category: "Water",
      description: "Water is leaking from bathroom pipe.",
    },
    {
      title: "WiFi Not Working",
      category: "Internet",
      description: "Unable to access hostel WiFi.",
    },
    {
      title: "Fan Making Noise",
      category: "Electrical",
      description: "Ceiling fan is making loud noise.",
    },
    {
      title: "Broken Chair",
      category: "Furniture",
      description: "Study chair is broken.",
    },
    {
      title: "Mess Food Quality",
      category: "Mess",
      description: "Food quality has deteriorated.",
    },
    {
      title: "Dirty Washroom",
      category: "Cleanliness",
      description: "Washroom has not been cleaned.",
    },
    {
      title: "Window Glass Broken",
      category: "Infrastructure",
      description: "Window glass needs replacement.",
    },
    {
      title: "Door Lock Damaged",
      category: "Infrastructure",
      description: "Door lock is not functioning.",
    },
    {
      title: "Other Hostel Issue",
      category: "Other",
      description: "General hostel maintenance issue.",
    },
  ];

  const priorities = [
    "Low",
    "Medium",
    "High",
    "Critical",
  ];

  const statuses = [
    "Pending",
    "Accepted",
    "In Progress",
    "Resolved",
    "Rejected",
  ];

  students.forEach((student, index) => {

    if (index % 3 !== 0) return;

    const template =
      templates[index % templates.length];

    const status =
      statuses[index % statuses.length];

    const hallWardens =
      wardens.filter(
        (warden) =>
          warden.hallId.toString() ===
          student.hallId.toString()
      );

    const assigned =
      hallWardens[
        index % hallWardens.length
      ];

    const timeline = [];

    timeline.push({
      action: "Created",
      remark: "Issue reported by student.",
      by: student._id,
      timestamp: new Date(),
    });

    if (
      status === "Accepted" ||
      status === "In Progress" ||
      status === "Resolved"
    ) {
      timeline.push({
        action: "Accepted",
        remark: "Issue accepted by Warden.",
        by: assigned._id,
        timestamp: new Date(),
      });
    }

    if (
      status === "In Progress" ||
      status === "Resolved"
    ) {
      timeline.push({
        action: "In Progress",
        remark: "Maintenance work started.",
        by: assigned._id,
        timestamp: new Date(),
      });
    }

    if (status === "Resolved") {
      timeline.push({
        action: "Resolved",
        remark: "Issue resolved successfully.",
        by: assigned._id,
        timestamp: new Date(),
      });
    }

    if (status === "Rejected") {
      timeline.push({
        action: "Rejected",
        remark:
          "Issue rejected due to insufficient information.",
        by: assigned._id,
        timestamp: new Date(),
      });
    }

    issues.push({

      issueNumber:
        `ISSUE-${String(count++)
          .padStart(4, "0")}`,

      title:
        template.title,

      description:
        template.description,

      category:
        template.category,

      reportedBy:
        student._id,

      hallId:
        student.hallId,

      roomId:
        student.roomId,

      status,

      priority:
        priorities[index % priorities.length],

      attachments: [],

      supporters: [],

      assignedTo:
        status === "Pending"
          ? null
          : assigned._id,

      timeline,

      lastUpdatedAt:
        new Date(),

      resolvedAt:
        status === "Resolved"
          ? new Date()
          : null,

      resolvedBy:
        status === "Resolved"
          ? assigned._id
          : null,

      rejectionReason:
        status === "Rejected"
          ? "Insufficient evidence provided."
          : null,

      feedback:
        status === "Resolved"
          ? "Issue resolved quickly."
          : null,

      rating:
        status === "Resolved"
          ? 5
          : null,

      isActive: true,

    });

  });

  return issues;

};

export default generateIssues;

