import dotenv from "dotenv";
import http from "http";
import https from "https";
import fs from "fs";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import initSocket from "./src/socket.js";
import { cleanupExpiredCertificatePdfs } from "./src/controllers/certificateController.js";
import { migrateExpirationDates } from "./src/utils/migrateExpirationDates.js";
import { validateSecurityConfiguration } from "./src/config/security.js";

dotenv.config();

validateSecurityConfiguration();

const PORT = process.env.PORT || 5000;
const server = process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH
  ? https.createServer({
    key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
    cert: fs.readFileSync(process.env.HTTPS_CERT_PATH),
  }, app)
  : http.createServer(app);
initSocket(server);

const startServer = async () => {
  await connectDB();
  server.listen(PORT, async () => {
    console.log(`Server running on ${server instanceof https.Server ? "https" : "http"} port ${PORT}`);

    try {
      await migrateExpirationDates();
    } catch (error) {
      console.error("Migration error:", error.message);
    }
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});

setInterval(() => {
  cleanupExpiredCertificatePdfs().catch((error) => {
    console.warn("Certificate PDF cleanup failed:", error.message);
  });
}, 60 * 60 * 1000);

const shutdown = (signal) => {
  console.log(`${signal} received. Closing server.`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
