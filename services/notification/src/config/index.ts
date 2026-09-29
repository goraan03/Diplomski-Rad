import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

export const config = {
  port: Number(process.env.NOTIFICATION_PORT ?? 4005),
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://127.0.0.1:5672",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "FitTrack <no-reply@fittrack.local>",
  },
};