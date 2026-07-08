const generateRooms = (halls) => {

  const rooms = [];

  const getHallId = (hallNumber) =>
    halls.find(
      (hall) => hall.hallNumber === hallNumber
    )._id;

  // Hall 1
  ["South", "Mid"].forEach((block) => {
    [1, 2].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(1),
          block,
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  });

  ["Extension"].forEach((block) => {
    [1, 2, 3, 4].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(1),
          block,
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  });

  // Hall 2
  ["South", "Mid"].forEach((block) => {
    [1, 2].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(2),
          block,
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  });

  ["Extension"].forEach((block) => {
    [1, 2, 3, 4].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(2),
          block,
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  });

  // Hall 3
  ["South", "Mess"].forEach((block) => {
    [1, 2, 3, 4].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(3),
          block,
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  });

  // Hall 4 - Hall 13
  for (let hall = 4; hall <= 13; hall++) {
    [1, 2, 3, 4].forEach((floor) => {
      for (let room = 1; room <= 40; room++) {
        rooms.push({
          hallId: getHallId(hall),
          block: "Main",
          floor,
          roomNumber: `${floor * 100 + room}`,
          capacity: 2,
        });
      }
    });
  }

  // Hall 14
  for (let floor = 1; floor <= 12; floor++) {
    for (let room = 1; room <= 40; room++) {
      rooms.push({
        hallId: getHallId(14),
        block: "Main",
        floor,
        roomNumber: `${floor * 100 + room}`,
        capacity: 2,
      });
    }
  }

  return rooms;
};

export default generateRooms;