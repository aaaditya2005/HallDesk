const generateRooms = (halls) => {

  const rooms = [];

  const getHallId = (hallNumber) => {
    const found = halls.find((hall) => hall.hallNumber === hallNumber);
    return found ? (found.id || found._id) : null;
  };

  const addBlockRooms = (hallNumber, block, floors, firstRoom, lastRoom, prefix = "", visibleFloorOffset = 1) => {
    floors.forEach((floor) => {
      for (let room = firstRoom; room <= lastRoom; room++) {
        rooms.push({
          hallId: getHallId(hallNumber),
          block,
          floor,
          roomNumber: `${prefix}${(floor + visibleFloorOffset) * 100 + room}`,
          capacity: 3,
        });
      }
    });
  };

  // Halls 1 and 2: South and Central have ground + 2 floors; Extension has ground + 3.
  [1, 2].forEach((hallNumber) => {
    addBlockRooms(hallNumber, "South", [0, 1, 2], 1, 16, "SB");
    addBlockRooms(hallNumber, "Central", [0, 1, 2], 1, 16, "CB");
    addBlockRooms(hallNumber, "Extension", [0, 1, 2, 3], 1, 16, "EXT");
  });

  // Hall 3 has the South and Central blocks only, with the Hall 2 layout.
  addBlockRooms(3, "South", [0, 1, 2], 1, 16, "SB");
  addBlockRooms(3, "Central", [0, 1, 2], 1, 16, "CB");

  // Hall 9: one main building, ground + 3 floors, rooms 101-140 per floor.
  addBlockRooms(9, "Main", [0, 1, 2, 3], 1, 40);

  // Hall 11: ground + 5 floors, rooms 101-140 per floor.
  addBlockRooms(11, "Main", [0, 1, 2, 3, 4, 5], 1, 40);

  // Hall 13: ground floor is the mess; twelve upper floors have rooms 101-125 to 1201-1225.
  addBlockRooms(13, "Main", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 1, 25, "", 0);

  // Hall 14: no ground-floor rooms, then eight floors with rooms 101-138 to 801-838.
  addBlockRooms(14, "Main", [1, 2, 3, 4, 5, 6, 7, 8], 1, 38, "", 0);

  return rooms;
};

export default generateRooms;