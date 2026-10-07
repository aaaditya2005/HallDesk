import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

export const isProduction = process.env.NODE_ENV === "production";
export const allowedOrigins = (process.env.CORS_ORIGINS || (isProduction ? "" : defaultOrigins.join(",")))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  credentials: true,
  maxAge: 86400,
};

export const validateSecurityConfiguration = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }
  if (isProduction && allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one trusted frontend origin in production.");
  }
  if (Boolean(process.env.HTTPS_KEY_PATH) !== Boolean(process.env.HTTPS_CERT_PATH)) {
    throw new Error("HTTPS_KEY_PATH and HTTPS_CERT_PATH must be configured together.");
  }
  if (isProduction && !process.env.HTTPS_TERMINATED_AT_PROXY && (!process.env.HTTPS_KEY_PATH || !process.env.HTTPS_CERT_PATH)) {
    throw new Error("Production requires HTTPS_KEY_PATH/HTTPS_CERT_PATH or HTTPS_TERMINATED_AT_PROXY=true.");
  }
  if (process.env.HTTPS_TERMINATED_AT_PROXY === "true" && process.env.TRUST_PROXY !== "true") {
    throw new Error("TRUST_PROXY=true is required when HTTPS_TERMINATED_AT_PROXY=true.");
  }
  if (process.env.HTTPS_KEY_PATH && !fs.existsSync(process.env.HTTPS_KEY_PATH)) {
    throw new Error("HTTPS_KEY_PATH does not point to a readable file.");
  }
  if (process.env.HTTPS_CERT_PATH && !fs.existsSync(process.env.HTTPS_CERT_PATH)) {
    throw new Error("HTTPS_CERT_PATH does not point to a readable file.");
  }
};