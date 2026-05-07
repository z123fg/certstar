import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import logger from "./logger";
import authRoutes from "./routes/auth";
import certRoutes from "./routes/cert";
import stsRoutes from "./routes/sts";
import inquiryRoutes from "./routes/inquiry";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

if (allowedOrigins.length === 0) {
    logger.warn("ALLOWED_ORIGIN is not set — all cross-origin requests will be blocked");
}

app.use(pinoHttp({ logger }));
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
app.use(express.json({ limit: "20mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/certs", certRoutes);
app.use("/api/sts", stsRoutes);
app.use("/api/inquiry", inquiryRoutes);

export default app;
