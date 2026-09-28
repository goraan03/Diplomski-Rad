import { Broker } from "@fittrack/shared";
import { config } from "./config";
import { pool } from "./db/pool";
import { ExercisesRepository } from "./repositories/ExercisesRepository";
import { ProgramsRepository } from "./repositories/ProgramsRepository";
import { ClientRequestsRepository } from "./repositories/ClientRequestsRepository";
import { WorkoutRepository } from "./repositories/WorkoutRepository";
import { UsersReadRepository } from "./repositories/UsersReadRepository";
import { EventAuditLogger } from "./adapters/EventAuditLogger";
import { BrokerEventPublisher } from "./adapters/BrokerEventPublisher";
import { ExercisesService } from "./services/ExercisesService";
import { ProgramsService } from "./services/ProgramsService";
import { ClientRequestsService } from "./services/ClientRequestsService";
import { WorkoutService } from "./services/WorkoutService";
import { UserProjectionConsumer } from "./sync/UserProjectionConsumer";
import { createApp } from "./app";

async function main(): Promise<void> {
  const broker = new Broker({ url: config.rabbitmqUrl, source: "coaching" });
  try {
    await broker.connect();
    // eslint-disable-next-line no-console
    console.log("[coaching] povezan na RabbitMQ");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[coaching] RabbitMQ nedostupan, nastavljam bez dogadjaja:", (e as Error).message);
  }

  const exercisesRepo = new ExercisesRepository(pool);
  const programsRepo = new ProgramsRepository(pool);
  const requestsRepo = new ClientRequestsRepository(pool);
  const workoutRepo = new WorkoutRepository(pool);
  const usersReadRepo = new UsersReadRepository(pool);

  const audit = new EventAuditLogger(broker);
  const events = new BrokerEventPublisher(broker);

  const exercisesSvc = new ExercisesService(exercisesRepo, audit);
  const programsSvc = new ProgramsService(programsRepo, exercisesRepo, requestsRepo, audit, events);
  const requestsSvc = new ClientRequestsService(requestsRepo, usersReadRepo, audit, events);
  const workoutSvc = new WorkoutService(workoutRepo, audit, events);

  // Projekcija korisnika (guard za slucaj da Broker jos nema subscribe)
  try {
    await new UserProjectionConsumer(broker, usersReadRepo).start();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[coaching] projekcija users_read nije pokrenuta:", (e as Error).message);
  }

  const app = createApp({
    trainer: { exercises: exercisesSvc, programs: programsSvc, requests: requestsSvc, workouts: workoutSvc },
    client: { programs: programsSvc, requests: requestsSvc },
  });

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[coaching] servis slusa na portu ${config.port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[coaching] fatalna greska pri pokretanju:", e);
  process.exit(1);
});
