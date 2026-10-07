import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/authUtils.js";
import firstNames from "./data/firstNames.js";
import lastNames from "./data/lastNames.js";

dotenv.config();

const batches = [
  { prefix: "22", currentYear: 4, boysHallByDepartment: { default: 3, CS: 1, ME: 1, BT: 1, CH: 1 } },
  { prefix: "23", currentYear: 3, boysHallByDepartment: { default: 9, CS: 2, ME: 2, BT: 2, CH: 2 } },
  { prefix: "24", currentYear: 2, boysHallByDepartment: { default: 14 } },
  { prefix: "25", currentYear: 1, boysHallByDepartment: { default: 11 } },
];

const departments = [
  ["BT", "Biotechnology", "BT"],
  ["CE", "Civil Engineering", "CE"],
  ["CH", "Chemical Engineering", "CHE"],
  ["EC", "Electronics and Communication Engineering", "EC"],
  ["CS", "Computer Science and Engineering", "CSE"],
  ["EE", "Electrical Engineering", "EE"],
  ["ME", "Mechanical Engineering", "ME"],
  ["MM", "Metallurgical and Materials Engineering", "MM"],
];

const femaleNames = new Set(["Aditi", "Ananya", "Ankita", "Anushka", "Arpita", "Divya", "Ishita", "Kajal", "Kashish", "Khushi", "Komal", "Megha", "Monalisa", "Muskan", "Neha", "Nikita", "Pallavi", "Pooja", "Pragya", "Priya", "Radhika", "Rashmi", "Riya", "Sakshi", "Shalini", "Shreya", "Shruti", "Sneha", "Sonali", "Swati", "Tanisha", "Vaishnavi"]);
const boysFirstNames = firstNames.filter((name) => !femaleNames.has(name));
const girlsFirstNames = firstNames.filter((name) => femaleNames.has(name));

const getName = (index, gender, batchIndex) => {
  const names = gender === "Female" ? girlsFirstNames : boysFirstNames;
  return `${names[(index + batchIndex * 11) % names.length]} ${lastNames[Math.floor((index + batchIndex * 11) / names.length) % lastNames.length]}`;
};

const getPhone = (batchIndex, index, offset) => `9${batchIndex + 1}${offset}${String(index + 1).padStart(7, "0")}`.slice(0, 10);

const buildStudent = ({ batch, batchIndex, index, gender, hallId, department, sequence }) => {
  const [departmentCode, branch, rollCode] = department;
  const registrationNo = `${batch.prefix}U${String((gender === "Female" ? 1000 : 0) + index + 1).padStart(5, "0")}`;
  const rollNo = `${batch.prefix}${rollCode}8${String(sequence).padStart(3, "0")}`;
  return {
    name: getName(index, gender, batchIndex),
    username: registrationNo,
    email: `${registrationNo.toLowerCase()}@student.halldesk.local`,
    password: registrationNo,
    phone: getPhone(batchIndex, index, gender === "Female" ? 7 : 3),
    role: "student",
    hallId,
    registrationNo,
    rollNo,
    department: departmentCode,
    branch,
    course: "B.Tech",
    currentYear: batch.currentYear,
    parentPhone: getPhone(batchIndex, index, gender === "Female" ? 8 : 4),
    gender,
  };
};

try {
  const halls = await prisma.hall.findMany({
    where: { hallNumber: { in: [1, 2, 3, 9, 11, 13, 14] } },
    select: { id: true, hallNumber: true },
  });
  const hallsByNumber = new Map(halls.map((hall) => [hall.hallNumber, hall.id]));
  for (const hallNumber of [1, 2, 3, 9, 11, 13, 14]) {
    if (!hallsByNumber.has(hallNumber)) throw new Error(`Hall ${hallNumber} does not exist. Run hallsRoomsOnly.js first.`);
  }

  const students = [];
  for (const [batchIndex, batch] of batches.entries()) {
    const counters = new Map();
    for (let index = 0; index < 100; index += 1) {
      const department = departments[index % departments.length];
      const hallNumber = batch.boysHallByDepartment[department[0]] || batch.boysHallByDepartment.default;
      const key = department[0];
      counters.set(key, (counters.get(key) || 0) + 1);
      students.push(buildStudent({ batch, batchIndex, index, gender: "Male", hallId: hallsByNumber.get(hallNumber), department, sequence: counters.get(key) }));
    }
    const girlCounters = new Map();
    for (let index = 0; index < 30; index += 1) {
      const department = departments[(index + 3) % departments.length];
      const key = department[0];
      girlCounters.set(key, (girlCounters.get(key) || 0) + 1);
      students.push(buildStudent({ batch, batchIndex, index, gender: "Female", hallId: hallsByNumber.get(13), department, sequence: girlCounters.get(key) }));
    }
  }

  const passwords = new Map();
  for (const student of students) {
    if (!passwords.has(student.password)) passwords.set(student.password, await hashPassword(student.password));
    student.password = passwords.get(student.password);
  }

  const existingStudents = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
  const studentIds = existingStudents.map((student) => student.id);
  if (studentIds.length) {
    await prisma.user.updateMany({ where: { id: { in: studentIds } }, data: { roomId: null } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: studentIds } } });
    await prisma.issueSupporter.deleteMany({ where: { userId: { in: studentIds } } });
    await prisma.vote.deleteMany({ where: { userId: { in: studentIds } } });
    await prisma.residenceHistory.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.certificate.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.fine.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.issue.deleteMany({ where: { OR: [{ reportedById: { in: studentIds } }, { assignedToId: { in: studentIds } }, { resolvedById: { in: studentIds } }] } });
    await prisma.user.deleteMany({ where: { id: { in: studentIds } } });
  }

  await prisma.user.createMany({ data: students });
  console.log(`Student reset and seed complete. Created ${students.length} students.`);
  console.log("Batches: 22=final, 23=third, 24=second, 25=first year.");
  console.log("Each batch: 100 boys and 30 girls. Roll numbers restart at 001 per department.");
} catch (error) {
  console.error("Student reset and seed error:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
