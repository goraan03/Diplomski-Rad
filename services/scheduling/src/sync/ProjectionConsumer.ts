import { EventName, type Broker } from "@fittrack/shared";
import type { UsersReadRepository } from "../repositories/UsersReadRepository";
import type { ProgramsReadRepository } from "../repositories/ProgramsReadRepository";

/**
 * Puni lokalne projekcije iz Identity i Coaching događaja.
 */
export class ProjectionConsumer {
  constructor(
    private readonly broker: Broker,
    private readonly usersRead: UsersReadRepository,
    private readonly programsRead: ProgramsReadRepository,
  ) {}

  async start(): Promise<void> {
    await this.broker.consume(
      "scheduling.projections",
      [
        EventName.UserRegistered,
        EventName.UserUpdated,
        EventName.TrainerCreated,
        EventName.UserBlocked,
        EventName.ProgramCreated,
        EventName.ProgramUpdated,
      ],
      async (payload, routingKey) => {
        if (payload == null || typeof payload !== "object") return;
        const p = payload as Record<string, unknown>;
        if (routingKey === EventName.ProgramCreated || routingKey === EventName.ProgramUpdated) {
          const id = p.id ?? p.programId;
          if (id == null) return;
          await this.programsRead.upsert({
            id: Number(id),
            title: (p.title as string) ?? null,
            level: (p.level as string) ?? null,
            trainerId: p.trainerId != null ? Number(p.trainerId) : null,
          });
          return;
        }
        const id = p.userId ?? p.id;
        if (id == null) return;
        if (routingKey === EventName.UserBlocked) {
          await this.usersRead.updateBlocked(Number(id), p.blocked === true || p.blocked === 1);
          return;
        }
        await this.usersRead.upsert({
          id: Number(id),
          korisnickoIme: (p.korisnickoIme as string) ?? (p.email as string) ?? null,
          ime: (p.ime as string) ?? null,
          prezime: (p.prezime as string) ?? null,
          uloga: (p.uloga as string) ?? (routingKey === EventName.TrainerCreated ? "trener" : null),
          assignedTrenerId: p.assignedTrenerId != null ? Number(p.assignedTrenerId) : null,
          blokiran: p.blokiran === true || p.blokiran === 1,
        });
      },
    );
    // eslint-disable-next-line no-console
    console.log("[scheduling] projekcije aktivne");
  }
}
