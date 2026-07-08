const generateCertificates = (
  students,
  wardens
) => {

  const certificates = [];

  let count = 1;

  const leaveReasons = [
    "Medical Emergency",
    "Family Function",
    "Festival Vacation",
    "Personal Work",
    "Competitive Examination",
    "Family Emergency",
  ];

  const bonafidePurposes = [
    "Scholarship Application",
    "Bank Education Loan",
    "Passport Verification",
    "Internship Requirement",
    "Government Document",
    "SIM Card Verification",
  ];

  students.forEach((student, index) => {

    // Approximately every 4th student gets one certificate request
    if (index % 4 !== 0) return;

    const hallWardens =
      wardens.filter(
        (warden) =>
          warden.hallId.toString() ===
          student.hallId.toString()
      );

    const approver =
      hallWardens[
        index % hallWardens.length
      ];

    const certificateType =
      index % 2 === 0
        ? "Leave"
        : "Hostel Bonafide";

    const statuses = [
      "Pending",
      "Approved",
      "Rejected",
    ];

    const status =
      statuses[
        index % statuses.length
      ];

    const fromDate =
      new Date();

    const toDate =
      new Date();

    toDate.setDate(
      fromDate.getDate() + 5
    );

    certificates.push({

      certificateRequestNumber:
        `CERT-${String(count++)
          .padStart(4, "0")}`,

      certificateType,

      studentId:
        student._id,

      hallId:
        student.hallId,

      leaveFromDate:
        certificateType === "Leave"
          ? fromDate
          : null,

      leaveToDate:
        certificateType === "Leave"
          ? toDate
          : null,

      parentPhone:
        student.parentPhone,

      reason:
        certificateType === "Leave"
          ? leaveReasons[
              index %
                leaveReasons.length
            ]
          : null,

      purpose:
        certificateType ===
        "Hostel Bonafide"
          ? bonafidePurposes[
              index %
                bonafidePurposes.length
            ]
          : null,

      status,

      approvedBy:
        status === "Pending"
          ? null
          : approver._id,

      approvedAt:
        status === "Approved"
          ? new Date()
          : null,

      rejectionReason:
        status === "Rejected"
          ? "Insufficient information provided."
          : null,

      certificatePdfUrl:
        null,

      digitalSignatureUrl:
        null,

      remarks:
        status === "Approved"
          ? "Approved by Warden."
          : null,

      isActive:
        true,

    });

  });

  return certificates;

};

export default generateCertificates;