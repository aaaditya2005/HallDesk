import dotenv from "dotenv";
import cloudinary from "../src/config/cloudinary.js";
import prisma from "../src/config/prisma.js";

dotenv.config();

const demoPrefix = "DEMO-";
const issueStatuses = ["Pending", "Accepted", "In Progress", "Resolved", "Rejected"];
const issueCategories = ["Electrical", "Mess", "Infrastructure", "Cleanliness", "Water", "Internet", "Furniture"];
const issueTitles = [
  "Corridor light not working",
  "Water tap leaking",
  "Ceiling fan making noise",
  "Common area needs cleaning",
  "Wi-Fi signal is weak",
  "Dining hall table needs repair",
  "Bathroom drain is blocked",
  "Window latch is loose",
  "Mess water cooler needs service",
  "Staircase light flickers",
  "Door lock is difficult to use",
  "Notice board glass is cracked",
  "Washing area tap has low pressure",
  "Study room chair needs repair",
  "Common room switch plate is loose",
  "Waste bin area needs attention",
  "Water filter service requested",
  "Dining area exhaust is noisy",
  "Room corridor paint is peeling",
  "Outdoor walkway light is dim",
];
const notes = [
  "Reported by a resident during the evening round. Please inspect and update the hall register.",
  "Several residents mentioned this in the common area. A routine maintenance check is requested.",
  "The issue is intermittent. Please check the nearby fittings and add a note after inspection.",
  "This demo report is for workflow demonstration; coordinate access with the resident before work.",
  "Please review during the next maintenance visit and record the action taken for residents.",
];
const pollOptions = ["Very satisfied", "Satisfied", "Needs improvement"];
const pollTopics = [
  ["Dining hall meal feedback", "Share feedback on meal quality, timing, and variety for the current cycle."],
  ["Common area maintenance priorities", "Choose the improvements residents would like prioritized this month."],
];
const fineReasons = ["Late fee", "Facility damage", "Dining hall charge", "Lost access card"];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomDateBetween = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const demoPdfDataUri = (lines) => {
  const escapeText = (text) => String(text).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const textCommands = lines.map((line, index) => `${index === 0 ? "" : "0 -24 Td "}(${escapeText(line)}) Tj`).join(" ");
  const stream = `BT /F1 14 Tf 54 780 Td ${textCommands} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return `data:application/pdf;base64,${Buffer.from(pdf, "ascii").toString("base64")}`;
};

const uploadFineProof = async (hallNumber, pdfDataUri) => {
  const base64 = pdfDataUri.slice(pdfDataUri.indexOf(",") + 1);
  const buffer = Buffer.from(base64, "base64");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: "halldesk/demo/fine-proofs",
      public_id: `demo-paid-fine-hall-${hallNumber}`,
      resource_type: "raw",
      type: "upload",
      format: "pdf",
      overwrite: true,
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
};

try {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are required to create viewable paid-fine PDF proofs.");
  }

  const halls = await prisma.hall.findMany({ where: { isActive: true }, orderBy: { hallNumber: "asc" } });
  if (!halls.length) throw new Error("No active halls found. Seed halls and rooms first.");

  const hallIds = halls.map((hall) => hall.id);
  const [students, staff, admins, rooms, messManagers] = await Promise.all([
    prisma.user.findMany({ where: { role: "student", hallId: { in: hallIds } }, select: { id: true, name: true, registrationNo: true, hallId: true } }),
    prisma.user.findMany({ where: { role: "warden", hallId: { in: hallIds } }, select: { id: true, hallId: true } }),
    prisma.user.findMany({ where: { role: "admin" }, select: { id: true }, take: 1 }),
    prisma.room.findMany({ where: { hallId: { in: hallIds } }, select: { id: true, hallId: true, roomNumber: true } }),
    prisma.user.findMany({ where: { role: "mess_manager", hallId: { in: hallIds } }, select: { id: true, hallId: true } }),
  ]);
  const adminId = admins[0]?.id;
  if (!adminId) throw new Error("No admin account found to own demo-generated records.");

  const studentsByHall = new Map(halls.map((hall) => [hall.id, students.filter((student) => student.hallId === hall.id)]));
  for (const hall of halls) {
    if (!studentsByHall.get(hall.id)?.length) throw new Error(`Hall ${hall.hallNumber} has no students. Add students before seeding demo data.`);
  }
  const staffByHall = new Map(halls.map((hall) => [hall.id, staff.find((warden) => warden.hallId === hall.id)?.id || adminId]));
  const roomsByHall = new Map(halls.map((hall) => [hall.id, rooms.filter((room) => room.hallId === hall.id)]));
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Upload the proofs before deleting prior demo rows, so a Cloudinary failure preserves the existing demo set.
  const proofUrls = new Map();
  for (const hall of halls) {
    const proofPdf = demoPdfDataUri([
      "HallDesk DEMO PAYMENT RECEIPT",
      `Hall ${hall.hallNumber} - ${hall.hallName}`,
      "Sample paid fine payment proof - not a real transaction.",
      `Generated ${now.toISOString().slice(0, 10)}`,
    ]);
    proofUrls.set(hall.id, await uploadFineProof(hall.hallNumber, proofPdf));
  }

  await prisma.issue.deleteMany({ where: { issueNumber: { startsWith: "DEMO-ISSUE-" } } });
  await prisma.poll.deleteMany({ where: { pollNumber: { startsWith: "DEMO-POLL-" } } });
  await prisma.certificate.deleteMany({ where: { certificateRequestNumber: { startsWith: "DEMO-CERT-" } } });
  await prisma.fine.deleteMany({ where: { fineNumber: { startsWith: "DEMO-FINE-" } } });
  await prisma.notice.deleteMany({ where: { noticeNumber: { startsWith: "DEMO-NOTICE-" } } });

  const issueRows = [];
  const issueDataByNumber = new Map();
  const timelineRows = [];
  for (const hall of halls) {
    const hallStudents = studentsByHall.get(hall.id);
    const hallRooms = roomsByHall.get(hall.id);
    for (let index = 0; index < 20; index += 1) {
      const student = randomItem(hallStudents);
      const room = hallRooms.length ? randomItem(hallRooms) : null;
      const status = ["Pending", "Accepted", "In Progress", "Resolved", "Rejected"][index % 5];
      const createdAt = randomDateBetween(new Date(now.getTime() - 45 * 86400000), now);
      const issueNumber = `DEMO-ISSUE-H${hall.hallNumber}-${String(index + 1).padStart(3, "0")}`;
      const title = issueTitles[index % issueTitles.length];
      const issue = {
        issueNumber,
        title,
        description: randomItem(notes),
        category: issueCategories[index % issueCategories.length],
        status,
        attachments: [],
        attachmentPublicId: [],
        attachmentOriginalName: [],
        reportedById: student.id,
        hallId: hall.id,
        roomId: room?.id || null,
        assignedToId: ["Accepted", "In Progress", "Resolved"].includes(status) ? staffByHall.get(hall.id) : null,
        resolvedById: status === "Resolved" ? staffByHall.get(hall.id) : null,
        lastUpdatedAt: status === "Pending" ? createdAt : randomDateBetween(createdAt, now),
        resolvedAt: status === "Resolved" ? randomDateBetween(createdAt, now) : null,
        rejectionReason: status === "Rejected" ? "Demo review: request redirected to the appropriate maintenance channel." : null,
        isActive: true,
        createdAt,
      };
      issueRows.push(issue);
      issueDataByNumber.set(issueNumber, issue);
    }
  }
  await prisma.issue.createMany({ data: issueRows });
  const createdIssues = await prisma.issue.findMany({
    where: { issueNumber: { startsWith: "DEMO-ISSUE-" } },
    select: { id: true, issueNumber: true },
  });
  for (const issue of createdIssues) {
    const data = issueDataByNumber.get(issue.issueNumber);
    timelineRows.push({ issueId: issue.id, action: "created", remark: "Demo issue submitted by a resident.", byId: data.reportedById, timestamp: data.createdAt });
    if (data.status !== "Pending") {
      timelineRows.push({ issueId: issue.id, action: data.status.toLowerCase().replaceAll(" ", "_"), remark: `Demo workflow status: ${data.status}.`, byId: data.assignedToId || staffByHall.get(data.hallId), timestamp: data.lastUpdatedAt });
    }
  }
  if (timelineRows.length) await prisma.issueTimeline.createMany({ data: timelineRows });

  const pollRows = [];
  const pollMeta = new Map();
  for (const hall of halls) {
    const hallTag = `H${hall.hallNumber}`;
    const hallCreatorId = staffByHall.get(hall.id);
    const pastNumber = `DEMO-POLL-${hallTag}-PAST`;
    const currentNumber = `DEMO-POLL-${hallTag}-CURRENT`;
    const topic = pollTopicsForHall(hall.hallNumber);
    pollRows.push(
      { pollNumber: pastNumber, title: topic.pastTitle, description: "Demo poll: historical dining feedback with sample voting results.", createdById: hallCreatorId, hallId: hall.id, startDate: new Date(startOfToday.getTime() - 14 * 86400000), endDate: new Date(startOfToday.getTime() - 7 * 86400000), status: "Closed", isActive: true },
      { pollNumber: currentNumber, title: topic.currentTitle, description: "Demo poll: current resident feedback survey; votes shown are sample data.", createdById: hallCreatorId, hallId: hall.id, startDate: new Date(startOfToday.getTime() - 1 * 86400000), endDate: new Date(startOfToday.getTime() + 6 * 86400000), status: "Active", isActive: true },
    );
    pollMeta.set(pastNumber, { hall, ended: true });
    pollMeta.set(currentNumber, { hall, ended: false });
  }
  await prisma.poll.createMany({ data: pollRows });
  const demoPolls = await prisma.poll.findMany({ where: { pollNumber: { startsWith: "DEMO-POLL-" } }, select: { id: true, pollNumber: true } });
  const pollIdsByNumber = new Map(demoPolls.map((poll) => [poll.pollNumber, poll.id]));
  const optionRows = [];
  for (const poll of demoPolls) for (const optionText of pollOptions) optionRows.push({ pollId: poll.id, optionText, voteCount: 0 });
  await prisma.pollOption.createMany({ data: optionRows });
  const optionsByPoll = new Map();
  const savedOptions = await prisma.pollOption.findMany({ where: { pollId: { in: demoPolls.map((poll) => poll.id) } }, orderBy: [{ pollId: "asc" }, { id: "asc" }] });
  for (const option of savedOptions) optionsByPoll.set(option.pollId, [...(optionsByPoll.get(option.pollId) || []), option]);

  const voteRows = [];
  const optionVoteCounts = new Map(savedOptions.map((option) => [option.id, 0]));
  const pollVoteCounts = new Map(demoPolls.map((poll) => [poll.id, 0]));
  for (const poll of demoPolls) {
    const { hall, ended } = pollMeta.get(poll.pollNumber);
    const hallStudents = studentsByHall.get(hall.id);
    const pollOptionsSorted = optionsByPoll.get(poll.id);
    const voterCount = Math.min(ended ? 24 : 9, hallStudents.length);
    for (const student of hallStudents.slice(0, voterCount)) {
      const selectedIndex = Math.floor(Math.random() * pollOptionsSorted.length);
      const votedAt = ended
        ? randomDateBetween(new Date(startOfToday.getTime() - 14 * 86400000), new Date(startOfToday.getTime() - 7 * 86400000))
        : randomDateBetween(new Date(startOfToday.getTime() - 1 * 86400000), now);
      voteRows.push({ pollId: poll.id, studentId: student.id, selectedOption: pollOptionsSorted[selectedIndex].optionText, selectedIndex, votedAt });
      optionVoteCounts.set(pollOptionsSorted[selectedIndex].id, optionVoteCounts.get(pollOptionsSorted[selectedIndex].id) + 1);
      pollVoteCounts.set(poll.id, pollVoteCounts.get(poll.id) + 1);
    }
  }
  if (voteRows.length) await prisma.vote.createMany({ data: voteRows, skipDuplicates: true });
  for (const option of savedOptions) {
    await prisma.pollOption.update({ where: { id: option.id }, data: { voteCount: optionVoteCounts.get(option.id) } });
  }
  for (const poll of demoPolls) {
    await prisma.poll.update({ where: { id: poll.id }, data: { totalVotes: pollVoteCounts.get(poll.id) } });
  }

  const certificateRows = [];
  const fineRows = [];
  const noticeRows = [];
  for (const hall of halls) {
    const hallStudents = studentsByHall.get(hall.id);
    const issuedById = staffByHall.get(hall.id);
    const hallProofUrl = proofUrls.get(hall.id);

    for (let index = 0; index < 3; index += 1) {
      const student = randomItem(hallStudents);
      const status = ["Pending", "Approved", "Rejected"][index];
      const certificateType = index === 0 ? "Leave" : "Hostel Bonafide";
      const certificateRequestNumber = `DEMO-CERT-H${hall.hallNumber}-${String(index + 1).padStart(2, "0")}`;
      const approvedAt = status === "Approved" ? new Date(now.getTime() - 2 * 86400000) : null;
      certificateRows.push({
        certificateRequestNumber,
        certificateType,
        studentId: student.id,
        hallId: hall.id,
        leaveFromDate: certificateType === "Leave" ? new Date(now.getTime() + 3 * 86400000) : null,
        leaveToDate: certificateType === "Leave" ? new Date(now.getTime() + 7 * 86400000) : null,
        parentPhone: "9000000000",
        reason: certificateType === "Leave" ? "Demo request: family visit during the term break." : null,
        purpose: certificateType === "Hostel Bonafide" ? "Demo proof of hostel residence for an academic application." : null,
        status,
        approvedById: status === "Pending" ? null : issuedById,
        approvedAt,
        rejectionReason: status === "Rejected" ? "Demo request: please attach the required supporting details and resubmit." : null,
        certificatePdfDataUri: status === "Approved" ? demoPdfDataUri(["HALLDESK DEMO CERTIFICATE", `Hall ${hall.hallNumber} - ${hall.hallName}`, `Issued to ${student.name}`, `Roll / registration: ${student.rollNo || student.registrationNo}`, "Synthetic demonstration document - not an official certificate."]) : null,
        certificatePdfFirstDownloadedAt: status === "Approved" ? null : null,
        certificatePdfExpiresAt: status === "Approved" ? new Date(now.getTime() + 5 * 86400000) : null,
        remarks: status === "Approved" ? "Demo approval for interface demonstration." : status === "Rejected" ? "Demo review note included for workflow preview." : null,
        isActive: true,
        createdAt: randomDateBetween(new Date(now.getTime() - 12 * 86400000), now),
      });
    }

    for (let index = 0; index < 4; index += 1) {
      const student = randomItem(hallStudents);
      const status = ["Pending", "Paid", "Verification Pending", "Waived"][index];
      fineRows.push({
        fineNumber: `DEMO-FINE-H${hall.hallNumber}-${String(index + 1).padStart(2, "0")}`,
        studentId: student.id,
        hallId: hall.id,
        amount: [250, 500, 150, 100][index],
        reason: fineReasons[index],
        description: `Demo fine note: ${fineReasons[index].toLowerCase()} example for hall workflow preview. No real payment is due.`,
        paymentProcedure: "Both",
        paymentDeadline: new Date(now.getTime() + (index === 0 ? -2 : 10) * 86400000),
        issuedById,
        status,
        issuedAt: randomDateBetween(new Date(now.getTime() - 20 * 86400000), now),
        paidAt: status === "Paid" ? new Date(now.getTime() - 1 * 86400000) : null,
        paymentProofUrl: ["Paid", "Verification Pending"].includes(status) ? hallProofUrl : null,
        paymentProofFileName: ["Paid", "Verification Pending"].includes(status) ? `demo-payment-proof-hall-${hall.hallNumber}.pdf` : null,
        remarks: status === "Paid" ? "Demo receipt attached; synthetic data only." : status === "Verification Pending" ? "Demo proof awaiting warden review." : status === "Waived" ? "Demo waiver note." : null,
        isActive: true,
      });
    }

    const hallMessManager = messManagers.find((manager) => manager.hallId === hall.id);
    if (hallMessManager) {
      fineRows.push({
        fineNumber: `DEMO-FINE-H${hall.hallNumber}-MM`,
        studentId: hallMessManager.id,
        hallId: hall.id,
        amount: 350,
        reason: "Demo staff account fine",
        description: "Synthetic paid-fine example for demonstrating the Mess Manager proof viewer. No real payment is due.",
        paymentProcedure: "Both",
        paymentDeadline: new Date(now.getTime() - 3 * 86400000),
        issuedById,
        status: "Paid",
        issuedAt: new Date(now.getTime() - 8 * 86400000),
        paidAt: new Date(now.getTime() - 4 * 86400000),
        paymentProofUrl: hallProofUrl,
        paymentProofFileName: `demo-manager-payment-proof-hall-${hall.hallNumber}.pdf`,
        remarks: "Synthetic demo proof only.",
        isActive: true,
      });
    }

    for (let index = 0; index < 2; index += 1) {
      noticeRows.push({
        noticeNumber: `DEMO-NOTICE-H${hall.hallNumber}-${String(index + 1).padStart(2, "0")}`,
        title: index === 0 ? `Hall ${hall.hallNumber}: maintenance schedule` : `Hall ${hall.hallNumber}: resident information`,
        description: index === 0
          ? "Demo notice: routine maintenance checks are planned this week. Please keep shared areas clear and report urgent issues through HallDesk."
          : "Demo notice: this sample announcement is included to preview hall notices and dashboard cards. It contains no official instruction.",
        createdById: issuedById,
        hallId: hall.id,
        attachment: [],
        attachmentUrl: [],
        attachmentPublicId: [],
        isActive: true,
        expiresAt: index === 0 ? new Date(now.getTime() + 14 * 86400000) : null,
        status: "Active",
      });
    }
  }

  await prisma.certificate.createMany({ data: certificateRows });
  await prisma.fine.createMany({ data: fineRows });
  await prisma.notice.createMany({ data: noticeRows });

  console.log(`Demo seed complete for ${halls.length} active halls.`);
  console.log(`Issues: ${issueRows.length} (${issueRows.length / halls.length} per hall); polls: ${pollRows.length}; votes: ${voteRows.length}.`);
  console.log(`Certificates: ${certificateRows.length}; fines: ${fineRows.length}; notices: ${noticeRows.length}.`);
  console.log("Demo records are prefixed DEMO-; approved certificate PDFs are embedded, and paid-fine proofs are available through Cloudinary.");
} catch (error) {
  console.error("Demo data seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function pollTopicsForHall(hallNumber) {
  return {
    pastTitle: `Hall ${hallNumber}: meal feedback - previous cycle`,
    currentTitle: `Hall ${hallNumber}: resident priorities - current poll`,
  };
}
