import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Nedostaje obavezna promenljiva okruzenja: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.IDENTITY_PORT ?? 4001),
  db: {
    host: process.env.IDENTITY_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.IDENTITY_DB_PORT ?? process.env.DB_PORT ?? 3306),
    database: process.env.IDENTITY_DB_NAME ?? "fittrack_identity",
    user: req("IDENTITY_DB_USER"),
    password: req("IDENTITY_DB_PASSWORD"),
  },
  jwt: {
    secret: req("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  },
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://127.0.0.1:5672",
  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    length: Number(process.env.OTP_LENGTH ?? 6),
  },
  admin: {
    korisnickoIme: process.env.ADMIN_EMAIL ?? "admin@fittrack.local",
    lozinka: process.env.ADMIN_PASSWORD ?? "admin123",
  },
};
