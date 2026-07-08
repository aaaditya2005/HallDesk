import firstNames from "./data/firstNames.js";
import lastNames from "./data/lastNames.js";
import departments from "./data/departments.js";

const usedNames = new Set();

function getUniqueName() {
  while (true) {
    const first =
      firstNames[
        Math.floor(Math.random() * firstNames.length)
      ];

    const last =
      lastNames[
        Math.floor(Math.random() * lastNames.length)
      ];

    const fullName = `${first} ${last}`;

    if (!usedNames.has(fullName)) {
      usedNames.add(fullName);
      return fullName;
    }
  }
}

function randomPhone(start = "9") {
  return (
    start +
    Math.floor(
      100000000 + Math.random() * 900000000
    )
  );
}

const generateStudents = (halls, rooms) => {

  const students = [];

  let registrationCounter = 10001;

  halls.forEach((hall) => {

    const hallRooms = rooms
      .filter(
        (room) =>
          room.hallId.toString() ===
          hall._id.toString()
      )
      .sort((a, b) => {

        if (a.floor !== b.floor) {
          return a.floor - b.floor;
        }

        return Number(a.roomNumber) - Number(b.roomNumber);

      });

    let roomIndex = 0;
    let seatCount = 0;

    for (let i = 1; i <= 30; i++) {

      const room = hallRooms[roomIndex];

      const name = getUniqueName();

      const department =
        departments[
          (i - 1) %
            departments.length
        ];

      const course = "BTech";

      const currentYear =
        hall.hallNumber === 14
          ? 2
          : Math.floor(
              Math.random() * 4
            ) + 1;

      const registrationNo =
        `24U${registrationCounter}`;

      const rollNo =
        `${department}24${department}${String(
          registrationCounter - 10000
        ).padStart(3, "0")}`;

      students.push({

        name,

        username:
          registrationNo,

        email: null,

        password:
          registrationNo,

        phone:
          randomPhone("9"),

        role:
          "student",

        hallId:
          hall._id,

        registrationNo,

        rollNo,

        department,

        course,

        currentYear,

        roomId:
          room._id,

        parentPhone:
          randomPhone("8"),

        gender:
          hall.gender,

      });

      room.occupants.push(null);

      seatCount++;

      if (
        seatCount === room.capacity
      ) {
        seatCount = 0;
        roomIndex++;
      }

      registrationCounter++;

    }

  });

  return students;

};

export default generateStudents;