import { Broker } from "@fittrack/shared";
import { config } from "./config";
import { pool } from "./db/pool";
import { AuditRepository } from "./repositories/AuditRepository";
import { AuditConsumer } from "./sync/AuditConsumer";
import { createApp } from "./app";

async function main(): Promise<void> {
  const broker = new Broker({ url: config.rabbitmqUrl, source: "audit" });
  try {
    await broker.connect();
    console.log("[audit] povezan na RabbitMQ");
  } catch (e) {
    console.warn("[audit] RabbitMQ nedostupan:", (e as Error).message);
  }

  const repo = new AuditRepository(pool);
  try {
    await new AuditConsumer(broker, repo).start();
  } catch (e) {
    console.warn("[audit] konzumer nije pokrenut:", (e as Error).message);
  }

  const app = createApp(repo);
  app.listen(config.port, () => console.log(`[audit] servis slusa na portu ${config.port}`));
}

main().catch((e) => {
  console.error("[audit] fatalna greska pri pokretanju:", e);
  process.exit(1);
});