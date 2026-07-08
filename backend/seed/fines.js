const generateFines = (
  students,
  wardens
) => {

  const fines = [];

  let count = 1;

  const fineTemplates = [
    {
      title: "Late Hostel Entry",
      description:
        "Entered hostel after the permitted entry time.",
      amount: 100,
    },
    {
      title: "Damage to Hostel Property",
      description:
        "Damaged hostel furniture/property.",
      amount: 500,
    },
    {
      title: "Noise Complaint",
      description:
        "Created disturbance during quiet hours.",
      amount: 200,
    },
    {
      title: "Unauthorized Guest",
      description:
        "Allowed unauthorized guest inside hostel.",
      amount: 1000,
    },
    {
      title: "Mess Rule Violation",
      description:
        "Violation of mess discipline rules.",
      amount: 150,
    },
    {
      title: "Room Not Maintained",
      description:
        "Room found in unhygienic condition during inspection.",
      amount: 250,
    },
  ];

  students.forEach((student, index) => {

    // Give fine to roughly every 5th student
    if (index % 5 !== 0) return;

    const hallWardens =
      wardens.filter(
        (warden) =>
          warden.hallId.toString() ===
          student.hallId.toString()
      );

    const template =
      fineTemplates[
        index % fineTemplates.length
      ];

    const issuedBy =
      hallWardens[
        index % hallWardens.length
      ];

    const statuses = [
      "Pending",
      "Paid",
      "Waived",
    ];

    const status =
      statuses[
        index % statuses.length
      ];

    fines.push({

      fineNumber:
        `FINE-${String(count++)
          .padStart(4, "0")}`,

      studentId:
        student._id,

      hallId:
        student.hallId,

      title:
        template.title,

      description:
        template.description,

      amount:
        template.amount,

      issuedBy:
        issuedBy._id,

      status,

      issuedAt:
        new Date(),

      paidAt:
        status === "Paid"
          ? new Date()
          : null,

      paymentProofUrl:
        null,

      remarks:
        status === "Waived"
          ? "Waived by Warden."
          : null,

      isActive:
        true,

    });

  });

  return fines;

};

export default generateFines;