import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Nedostaje obavezna promenljiva okruzenja: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.AUDIT_PORT ?? 4004),
  db: {
    host: process.env.AUDIT_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.AUDIT_DB_PORT ?? process.env.DB_PORT ?? 3306),
    database: process.env.AUDIT_DB_NAME ?? "fittrack_audit",
    user: req("AUDIT_DB_USER"),
    password: req("AUDIT_DB_PASSWORD"),
  },
  jwt: { secret: req("JWT_SECRET") },
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://127.0.0.1:5672",
};