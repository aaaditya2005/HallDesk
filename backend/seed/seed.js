import dotenv from "dotenv";
import mongoose from "mongoose";

import Hall from "../src/models/Hall.js";
import Room from "../src/models/Room.js";
import User from "../src/models/User.js";
import Issue from "../src/models/Issue.js";
import Notice from "../src/models/Notice.js";
import Poll from "../src/models/Poll.js";
import Fine from "../src/models/Fine.js";
import Certificate from "../src/models/Certificate.js";

import halls from "./halls.js";
import wardens from "./wardens.js";
import messManagers from "./messManagers.js";
import admins from "./admins.js";

import generateRooms from "./rooms.js";
import generateStudents from "./students.js";
import generateIssues from "./issues.js";
import generateNotices from "./notices.js";
import generatePolls from "./polls.js";
import generateFines from "./fines.js";
import generateCertificates from "./certificates.js";

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

console.log("✅ MongoDB Connected");


/* ---------------- DELETE OLD DATA ---------------- */

await Certificate.deleteMany({});
await Fine.deleteMany({});
await Poll.deleteMany({});
await Notice.deleteMany({});
await Issue.deleteMany({});
await User.deleteMany({});
await Room.deleteMany({});
await Hall.deleteMany({});

console.log("🗑️ Old database cleared.");


/* ---------------- INSERT HALLS ---------------- */

const insertedHalls =
  await Hall.insertMany(halls);

console.log(
  `✅ ${insertedHalls.length} Halls Inserted`
);

/* ---------------- INSERT ADMIN ---------------- */

const insertedAdmins =
  await User.insertMany(admins);

console.log(
  `✅ ${insertedAdmins.length} Admin Inserted`
);

/* ---------------- INSERT WARDENS ---------------- */

const wardenUsers = [];

for (const warden of wardens) {

  const hall = insertedHalls.find(
    (h) => h.hallNumber === warden.hallNumber
  );

  const newWarden = await User.create({

    name: warden.name,

    username: warden.username,

    email: warden.email,

    password: warden.password,

    phone: warden.officePhone,

    role: "warden",

    registrationNo: undefined,
    rollNo: undefined,
    course: undefined,
    department: undefined,
    currentYear: undefined,
    parentPhone: undefined,
    roomId: undefined,

    hallId: hall._id,

    designation: warden.designation,

    officePhone: warden.officePhone,

    gender:
      hall.gender,

  });

  wardenUsers.push(newWarden);

}

console.log(
  `✅ ${wardenUsers.length} Wardens Inserted`
);


/* ---------------- UPDATE HALL WARDENS ---------------- */

for (const hall of insertedHalls) {

  const hallWardens =
    wardenUsers
      .filter(
        (warden) =>
          warden.hallId.toString() ===
          hall._id.toString()
      )
      .map(
        (warden) => warden._id
      );

  hall.wardenIds =
    hallWardens;

  await hall.save();

}

console.log(
  "✅ Hall Wardens Linked"
);

/* ---------------- INSERT MESS MANAGERS ---------------- */

const messManagerUsers = [];

for (const manager of messManagers) {

  const hall = insertedHalls.find(
    (h) => h.hallNumber === manager.hallNumber
  );

  const newManager = await User.create({

    name: manager.name,

    username: manager.username,

    password: manager.password,

    role: "mess_manager",

    hallId: hall._id,

    registrationNo: undefined,
    rollNo: undefined,
    course: undefined,
    department: undefined,
    currentYear: undefined,
    parentPhone: undefined,
    roomId: undefined,

    companyName: manager.companyName,

    managerId: manager.managerId,

    gender: hall.gender,

  });

  messManagerUsers.push(newManager);

}

console.log(
  `✅ ${messManagerUsers.length} Mess Managers Inserted`
);

/* ---------------- LINK MESS MANAGER TO HALL ---------------- */

for (const hall of insertedHalls) {

  const manager =
    messManagerUsers.find(
      (m) =>
        m.hallId.toString() ===
        hall._id.toString()
    );

  if (manager) {

    hall.messManagerId =
      manager._id;

    await hall.save();

  }

}

console.log(
  "✅ Mess Managers Linked To Halls"
);



/* ---------------- GENERATE ROOMS ---------------- */

const roomData =
  generateRooms(insertedHalls);

const insertedRooms =
  await Room.insertMany(roomData);

console.log(
  `✅ ${insertedRooms.length} Rooms Inserted`
);

/* ---------------- UPDATE HALL ROOM STATISTICS ---------------- */

for (const hall of insertedHalls) {

  const hallRooms =
    insertedRooms.filter(
      (room) =>
        room.hallId.toString() ===
        hall._id.toString()
    );

  hall.availableRooms =
    hallRooms.length;

  hall.occupiedRooms = 0;

  await hall.save();

}

console.log(
  "✅ Hall Room Statistics Updated"
);

/* ---------------- GENERATE STUDENTS ---------------- */

const studentData =
  generateStudents(
    insertedHalls,
    insertedRooms
  );

const insertedStudents =
  await User.insertMany(studentData);

console.log(
  `✅ ${insertedStudents.length} Students Inserted`
);

/* ---------------- UPDATE ROOM OCCUPANTS ---------------- */

for (const student of insertedStudents) {

  const room =
    insertedRooms.find(
      (r) =>
        r._id.toString() ===
        student.roomId.toString()
    );

  if (!room) continue;

  room.occupants.push(student._id);

}

/* ---------------- UPDATE ROOM STATUS ---------------- */

for (const room of insertedRooms) {

  if (
    room.occupants.length === 0
  ) {

    room.status =
      "Available";

  }

  else if (
    room.occupants.length <
    room.capacity
  ) {

    room.status =
      "Partially Occupied";

  }

  else {

    room.status =
      "Full";

  }

  await room.save();

}

console.log(
  "✅ Room Occupancy Updated"
);

/* ---------------- GENERATE NOTICES ---------------- */

const noticeData =
  generateNotices(
    insertedHalls,
    wardenUsers
  );

const insertedNotices =
  await Notice.insertMany(
    noticeData
  );

console.log(
  `✅ ${insertedNotices.length} Notices Inserted`
);

/* ---------------- GENERATE POLLS ---------------- */

const pollData =
  generatePolls(
    insertedHalls,
    wardenUsers
  );

const insertedPolls =
  await Poll.insertMany(
    pollData
  );

console.log(
  `✅ ${insertedPolls.length} Polls Inserted`
);

/* ---------------- GENERATE FINES ---------------- */

const fineData =
  generateFines(
    insertedStudents,
    wardenUsers
  );

const insertedFines =
  await Fine.insertMany(
    fineData
  );

console.log(
  `✅ ${insertedFines.length} Fines Inserted`
);


/* ---------------- GENERATE CERTIFICATES ---------------- */

const certificateData =
  generateCertificates(
    insertedStudents,
    wardenUsers
  );

const insertedCertificates =
  await Certificate.insertMany(
    certificateData
  );

console.log(
  `✅ ${insertedCertificates.length} Certificates Inserted`
);


/* ---------------- GENERATE ISSUES ---------------- */

const issueData =
  generateIssues(
    insertedStudents,
    wardenUsers
  );

const insertedIssues =
  await Issue.insertMany(
    issueData
  );

console.log(
  `✅ ${insertedIssues.length} Issues Inserted`
);

/* ---------------- SUMMARY ---------------- */

console.log("\n==============================");

console.log("🎉 HallDesk Seed Completed");

console.log("==============================");

console.log(
  `🏢 Halls           : ${insertedHalls.length}`
);

console.log(
  `👨‍💼 Wardens        : ${wardenUsers.length}`
);

console.log(
  `🍽️ Mess Managers  : ${messManagerUsers.length}`
);

console.log(
  `👨‍🎓 Students       : ${insertedStudents.length}`
);

console.log(
  `🚪 Rooms           : ${insertedRooms.length}`
);

console.log(
  `📢 Notices         : ${insertedNotices.length}`
);

console.log(
  `🗳️ Polls          : ${insertedPolls.length}`
);

console.log(
  `💰 Fines           : ${insertedFines.length}`
);

console.log(
  `📄 Certificates    : ${insertedCertificates.length}`
);

console.log(
  `🔧 Issues          : ${insertedIssues.length}`
);

console.log("==============================");


await mongoose.connection.close();

console.log("✅ MongoDB Connection Closed");

