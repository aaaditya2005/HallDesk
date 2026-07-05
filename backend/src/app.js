import express from "express";
import cors from "cors";
import hallRoutes from "./routes/hallRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("HallDesk API Running...");
});

app.use("/api/issues", issueRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/halls", hallRoutes);
app.use("/api/auth", authRoutes);

export default app;