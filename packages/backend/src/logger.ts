import pino from "pino";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
}

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev && {
    transport: {
      targets: [
        {
          target: "pino-pretty",
          options: { colorize: true, ignore: "pid,hostname" },
          level: "info",
        },
        {
          target: "pino/file",
          options: { destination: path.join(process.cwd(), "logs/app.log") },
          level: "info",
        },
      ],
    },
  }),
});

export default logger;
