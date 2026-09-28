import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Nedostaje obavezna promenljiva okruzenja: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.COACHING_PORT ?? 4002),
  db: {
    host: process.env.COACHING_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.COACHING_DB_PORT ?? process.env.DB_PORT ?? 3306),
    database: process.env.COACHING_DB_NAME ?? "fittrack_coaching",
    user: req("COACHING_DB_USER"),
    password: req("COACHING_DB_PASSWORD"),
  },
  jwt: { secret: req("JWT_SECRET") },
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://127.0.0.1:5672",
};
