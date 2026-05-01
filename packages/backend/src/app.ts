import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import certRoutes from "./routes/cert";
import stsRoutes from "./routes/sts";

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json({ limit: "20mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/certs", certRoutes);
app.use("/api/sts", stsRoutes);

export default app;
