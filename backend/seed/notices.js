const generateNotices = (
  halls,
  wardens
) => {

  const notices = [];

  let count = 1;

  const noticeTemplates = [
    {
      title: "Semester Registration Notice",
      description:
        "All students must complete semester registration before the last date.",
    },
    {
      title: "Water Supply Maintenance",
      description:
        "Water supply will remain unavailable from 10:00 AM to 2:00 PM due to maintenance.",
    },
    {
      title: "Electricity Shutdown",
      description:
        "Electricity will remain unavailable during scheduled maintenance.",
    },
    {
      title: "Hostel Cleanliness Drive",
      description:
        "Students are requested to participate in the cleanliness drive.",
    },
    {
      title: "Mess Committee Meeting",
      description:
        "Mess committee meeting will be held in the common room.",
    },
    {
      title: "Hostel Day Celebration",
      description:
        "Hostel Day celebrations will be held next week.",
    },
    {
      title: "Anti Ragging Notice",
      description:
        "Any form of ragging is strictly prohibited.",
    },
    {
      title: "WiFi Maintenance",
      description:
        "Internet services may be interrupted for network maintenance.",
    },
    {
      title: "Fire Safety Inspection",
      description:
        "Fire safety inspection will be conducted in every room.",
    },
    {
      title: "Hostel Gate Timing",
      description:
        "Students must return before hostel gate closing time.",
    },
  ];

  halls.forEach((hall) => {

    const hallWardens =
      wardens.filter(
        (warden) =>
          warden.hallId.toString() ===
          hall._id.toString()
      );

    noticeTemplates.forEach(
      (template, index) => {

        const createdBy =
          hallWardens[
            index %
              hallWardens.length
          ];

        notices.push({

          noticeNumber:
            `NOTICE-${String(
              count++
            ).padStart(4, "0")}`,

          title:
            template.title,

          description:
            template.description,

          createdBy:
            createdBy._id,

          hallId:
            hall._id,

          attachments: [],

          isActive: true,

        });

      }
    );

  });

  return notices;

};

export default generateNotices;