import express from "express";
import { Broker } from "@fittrack/shared";
import { config } from "./config";
import { Mailer } from "./mail/Mailer";
import { NotificationConsumer } from "./sync/NotificationConsumer";

async function main(): Promise<void> {
  const broker = new Broker({ url: config.rabbitmqUrl, source: "notification" });
  try {
    await broker.connect();
    console.log("[notification] povezan na RabbitMQ");
  } catch (e) {
    console.warn("[notification] RabbitMQ nedostupan:", (e as Error).message);
  }

  const mailer = new Mailer();
  try {
    await new NotificationConsumer(broker, mailer).start();
  } catch (e) {
    console.warn("[notification] konzumer nije pokrenut:", (e as Error).message);
  }

  const app = express();
  app.get("/health", (_req, res) =>
    res.json({ success: true, data: { status: "ok", servis: "notification" } }),
  );
  app.listen(config.port, () => console.log(`[notification] servis slusa na portu ${config.port}`));
}

main().catch((e) => {
  console.error("[notification] fatalna greska pri pokretanju:", e);
  process.exit(1);
});