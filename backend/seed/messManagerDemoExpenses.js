import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";

dotenv.config();

const username = "Mess03";
const demoTitlePrefix = "DEMO-EXPENSE-Mess03-";
const sampleExpenses = [
  { daysAgo: 13, title: "Rice and pulses procurement", description: "Sample bulk purchase for daily meal service. Demo record; not a real transaction.", amount: 18450, category: "Groceries" },
  { daysAgo: 11, title: "Vegetables for weekly menu", description: "Seasonal vegetables procured for the hall kitchen. Demo record; not a real transaction.", amount: 6720, category: "Groceries" },
  { daysAgo: 9, title: "Cooking gas cylinder refill", description: "Kitchen fuel refill for meal preparation. Demo record; not a real transaction.", amount: 3150, category: "Utilities" },
  { daysAgo: 7, title: "Milk and dairy supply", description: "Milk, curd, and paneer supply for the breakfast and dinner menu. Demo record; not a real transaction.", amount: 5280, category: "Groceries" },
  { daysAgo: 5, title: "Kitchen cleaning supplies", description: "Cleaning and sanitation supplies for the kitchen. Demo record; not a real transaction.", amount: 2360, category: "Supplies" },
  { daysAgo: 3, title: "Spices and cooking oil", description: "Cooking oil and spices for the current menu cycle. Demo record; not a real transaction.", amount: 7940, category: "Groceries" },
  { daysAgo: 1, title: "Water filter maintenance", description: "Routine servicing of the kitchen water filter. Demo record; not a real transaction.", amount: 1850, category: "Maintenance" },
];

try {
  const manager = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, role: "mess_manager" },
    select: { id: true, username: true, hallId: true, hall: { select: { hallNumber: true, hallName: true } } },
  });
  if (!manager) throw new Error(`Mess Manager account '${username}' was not found.`);
  if (!manager.hallId) throw new Error(`Mess Manager '${manager.username}' is not assigned to a hall.`);

  await prisma.messExpense.deleteMany({
    where: { createdById: manager.id, title: { startsWith: demoTitlePrefix } },
  });

  const now = new Date();
  const expenses = sampleExpenses.map((expense, index) => {
    const expenseDate = new Date(now);
    expenseDate.setDate(expenseDate.getDate() - expense.daysAgo);
    expenseDate.setHours(12, 0, 0, 0);
    return {
      hallId: manager.hallId,
      createdById: manager.id,
      expenseDate,
      title: `${demoTitlePrefix}${String(index + 1).padStart(2, "0")} ${expense.title}`,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      attachments: [],
      isActive: true,
    };
  });

  await prisma.messExpense.createMany({ data: expenses });
  console.log(`Created ${expenses.length} historical demo expenses for ${manager.username} in Hall ${manager.hall.hallNumber} - ${manager.hall.hallName}.`);
  console.log("All entries are marked DEMO-EXPENSE-Mess03 and contain demo-only notes.");
} catch (error) {
  console.error("Mess Manager demo expense seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
