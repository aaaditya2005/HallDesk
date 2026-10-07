import prisma from "../config/prisma.js";

const PDF_RETENTION_DAYS = 7;
const PDF_RETENTION_MS = PDF_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const migrateExpirationDates = async () => {
  try {
    const certsToUpdate = await prisma.certificate.findMany({
      where: {
        status: "Approved",
        certificatePdfExpiresAt: null,
        approvedAt: { not: null },
      },
    });

    let updatedCount = 0;
    for (const cert of certsToUpdate) {
      if (cert.approvedAt) {
        await prisma.certificate.update({
          where: { id: cert.id },
          data: {
            certificatePdfExpiresAt: new Date(new Date(cert.approvedAt).getTime() + PDF_RETENTION_MS),
          },
        });
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      console.log(`✓ Migration complete: ${updatedCount} certificates updated with expiration dates`);
    }
    return updatedCount;
  } catch (error) {
    console.error("Migration failed:", error.message);
    throw error;
  }
};
