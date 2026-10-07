import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";

dotenv.config();

const departmentCodes = {
  BT: "BT",
  CE: "CE",
  CH: "CHE",
  CS: "CSE",
  EC: "EC",
  EE: "EE",
  ME: "ME",
  MM: "MM",
};

try {
  const students = await prisma.user.findMany({
    where: { role: "student", registrationNo: { not: null } },
    select: { id: true, registrationNo: true, department: true },
    orderBy: [{ registrationNo: "asc" }, { id: "asc" }],
  });

  const counters = new Map();
  let updated = 0;
    await prisma.user.updateMany({ where: { role: "student" }, data: { rollNo: null } });

  for (const student of students) {
    const batch = String(student.registrationNo).slice(0, 2);
    const code = departmentCodes[student.department] || student.department;
    if (!/^\d{2}$/.test(batch) || !code) throw new Error(`Cannot build roll number for ${student.registrationNo}.`);

    const key = `${batch}:${code}`;
    const sequence = (counters.get(key) || 0) + 1;
    counters.set(key, sequence);
    const rollNo = `${batch}${code}8${String(sequence).padStart(3, "0")}`;
    await prisma.user.update({ where: { id: student.id }, data: { rollNo } });
    updated += 1;
  }

  console.log(`Student roll-number backfill complete. Updated: ${updated}`);
  for (const [key, count] of counters) console.log(`${key}: ${count} students`);
} catch (error) {
  console.error("Student roll-number backfill error:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
