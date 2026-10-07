import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsOptions } from "./config/security.js";
import { rejectInvalidRequest } from "./middleware/validation.js";
import hallRoutes from "./routes/hallRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import messRoutes from "./routes/messRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import fineRoutes from "./routes/fineRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import path from "path";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api/auth/"),
  message: { success: false, message: "Too many requests. Please try again later." },
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb", parameterLimit: 100 }));
app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);
app.get("/", (req, res) => {
  res.send("HallDesk API Running...");
});

app.use("/api/issues", issueRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/halls", hallRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/mess", messRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit", auditRoutes);

app.use(rejectInvalidRequest);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ success: false, message: error.message });
  }
  if (error?.type === "entity.too.large" || error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "Request or file is too large." });
  }
  if (error?.name === "MulterError" || error?.message?.includes("Only images")) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error." });
});

export default app;