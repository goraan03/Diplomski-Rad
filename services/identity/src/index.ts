import { Broker } from "@fittrack/shared";
import { config } from "./config";
import { pool } from "./db/pool";
import { UserRepository } from "./repositories/UserRepository";
import { AuthChallengeRepository } from "./repositories/AuthChallengeRepository";
import { EventNotifier } from "./adapters/EventNotifier";
import { EventAuditLogger } from "./adapters/EventAuditLogger";
import { BrokerEventPublisher } from "./adapters/BrokerEventPublisher";
import { AuthService } from "./services/AuthService";
import { UserAdminService } from "./services/UserAdminService";
import { ProfileService } from "./services/ProfileService";
import { createApp } from "./app";

async function main(): Promise<void> {
  const broker = new Broker(config.rabbitmqUrl);
  // Graceful degradation: ako RabbitMQ nije dostupan, servis i dalje radi.
  try {
    await broker.connect();
    // eslint-disable-next-line no-console
    console.log("[identity] povezan na RabbitMQ");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[identity] RabbitMQ nedostupan, nastavljam bez dogadjaja:", (e as Error).message);
  }

  const users = new UserRepository(pool);
  const challenges = new AuthChallengeRepository(pool);
  const notifier = new EventNotifier(broker);
  const audit = new EventAuditLogger(broker);
  const events = new BrokerEventPublisher(broker);

  const auth = new AuthService(users, challenges, notifier, audit, events);
  const admin = new UserAdminService(users, notifier, audit);
  const profil = new ProfileService(users, audit);

  const app = createApp({ auth, admin, profil });
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[identity] servis slusa na portu ${config.port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[identity] fatalna greska pri pokretanju:", e);
  process.exit(1);
});
