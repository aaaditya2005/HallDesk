const generatePolls = (halls, wardens) => {

  const polls = [];

  let count = 1;

  const today = new Date();

  const pollTemplates = [
    {
      title: "Preferred Breakfast Menu",
      description: "Vote for the breakfast menu for next month.",
      options: [
        { optionText: "Poha", voteCount: 0 },
        { optionText: "Idli", voteCount: 0 },
        { optionText: "Paratha", voteCount: 0 },
        { optionText: "Bread Omelette", voteCount: 0 },
      ],
      days: 5,
    },
    {
      title: "Hostel Day Celebration Date",
      description: "Select the preferred date for Hostel Day.",
      options: [
        { optionText: "Saturday", voteCount: 0 },
        { optionText: "Sunday", voteCount: 0 },
      ],
      days: 7,
    },
    {
      title: "New Gym Equipment",
      description: "Choose which equipment should be purchased first.",
      options: [
        { optionText: "Treadmill", voteCount: 0 },
        { optionText: "Bench Press", voteCount: 0 },
        { optionText: "Dumbbells", voteCount: 0 },
      ],
      days: 6,
    },
    {
      title: "Mess Food Feedback",
      description: "Rate the overall mess food quality.",
      options: [
        { optionText: "Excellent", voteCount: 0 },
        { optionText: "Good", voteCount: 0 },
        { optionText: "Average", voteCount: 0 },
        { optionText: "Poor", voteCount: 0 },
      ],
      days: 4,
    },
    {
      title: "Weekend Movie Screening",
      description: "Vote for the movie to be screened this weekend.",
      options: [
        { optionText: "3 Idiots", voteCount: 0 },
        { optionText: "Interstellar", voteCount: 0 },
        { optionText: "Bahubali", voteCount: 0 },
      ],
      days: 3,
    },
  ];

  halls.forEach((hall) => {

    const hallWardens =
      wardens.filter(
        (warden) =>
          warden.hallId.toString() ===
          hall._id.toString()
      );

    pollTemplates.forEach((template, index) => {

      const startDate = new Date(today);

      const endDate = new Date(today);

      endDate.setDate(
        endDate.getDate() + template.days
      );

      polls.push({

        pollNumber:
          `POLL-${String(count++)
            .padStart(4, "0")}`,

        title:
          template.title,

        description:
          template.description,

        createdBy:
          hallWardens[
            index % hallWardens.length
          ]._id,

        hallId:
          hall._id,

        options:
          template.options,

        startDate,

        endDate,

        status:
          "Active",

        totalVotes:
          0,

        isActive:
          true,

      });

    });

  });

  return polls;

};

export default generatePolls;