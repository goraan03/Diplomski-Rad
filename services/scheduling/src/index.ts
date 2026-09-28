import { Broker } from "@fittrack/shared";
import { config } from "./config";
import { pool } from "./db/pool";
import { TrainingTermsRepository } from "./repositories/TrainingTermsRepository";
import { TrainingEnrollmentsRepository } from "./repositories/TrainingEnrollmentsRepository";
import { UsersReadRepository } from "./repositories/UsersReadRepository";
import { ProgramsReadRepository } from "./repositories/ProgramsReadRepository";
import { EventAuditLogger } from "./adapters/EventAuditLogger";
import { BrokerEventPublisher } from "./adapters/BrokerEventPublisher";
import { TrainerTermsService } from "./services/TrainerTermsService";
import { ClientBookingService } from "./services/ClientBookingService";
import { ProjectionConsumer } from "./sync/ProjectionConsumer";
import { createApp } from "./app";

async function main(): Promise<void> {
  const broker = new Broker({ url: config.rabbitmqUrl, source: "scheduling" });
  try {
    await broker.connect();
    // eslint-disable-next-line no-console
    console.log("[scheduling] povezan na RabbitMQ");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[scheduling] RabbitMQ nedostupan, nastavljam bez dogadjaja:", (e as Error).message);
  }

  const termsRepo = new TrainingTermsRepository(pool);
  const enrollRepo = new TrainingEnrollmentsRepository(pool);
  const usersReadRepo = new UsersReadRepository(pool);
  const programsReadRepo = new ProgramsReadRepository(pool);

  const audit = new EventAuditLogger(broker);
  const events = new BrokerEventPublisher(broker);

  const trainerTerms = new TrainerTermsService(termsRepo, enrollRepo, audit, events);
  const clientBooking = new ClientBookingService(termsRepo, enrollRepo, usersReadRepo, audit, events);

  try {
    await new ProjectionConsumer(broker, usersReadRepo, programsReadRepo).start();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[scheduling] projekcije nisu pokrenute:", (e as Error).message);
  }

  const app = createApp({ trainer: { terms: trainerTerms }, client: { booking: clientBooking } });
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[scheduling] servis slusa na portu ${config.port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[scheduling] fatalna greska pri pokretanju:", e);
  process.exit(1);
});
