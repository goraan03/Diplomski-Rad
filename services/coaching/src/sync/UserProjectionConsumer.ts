import { EventName, type Broker } from "@fittrack/shared";
import type { UsersReadRepository } from "../repositories/UsersReadRepository";

/**
 * Puni lokalnu projekciju `users_read` iz Identity događaja.
 */
export class UserProjectionConsumer {
  constructor(
    private readonly broker: Broker,
    private readonly usersRead: UsersReadRepository,
  ) {}

  async start(): Promise<void> {
    await this.broker.consume(
      "coaching.users_read",
      [EventName.UserRegistered, EventName.UserUpdated, EventName.TrainerCreated, EventName.UserBlocked],
      async (payload, routingKey) => {
        if (payload == null || typeof payload !== "object") return;
        const p = payload as Record<string, unknown>;
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
    console.log("[coaching] projekcija users_read aktivna");
  }
}
