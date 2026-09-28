import { EventName, type Broker } from "@fittrack/shared";
import type { UserRepository } from "../repositories/UserRepository";
import type { IEventPublisher } from "../ports/IEventPublisher";

export class ClientRequestConsumer {
  constructor(
    private readonly broker: Broker,
    private readonly users: UserRepository,
    private readonly events: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    await this.broker.consume(
      "identity.client_requests",
      [EventName.ClientRequestApproved],
      async (payload) => {
        if (payload == null || typeof payload !== "object") return;
        const data = payload as Record<string, unknown>;
        const clientId = Number(data.clientId);
        const trainerId = Number(data.trainerId);
        if (!Number.isInteger(clientId) || clientId <= 0 || !Number.isInteger(trainerId) || trainerId <= 0) return;

        await this.users.postaviTrenera(clientId, trainerId);
        const user = await this.users.nadjiPoId(clientId);
        if (!user) return;
        await this.events.objavi(EventName.UserUpdated, {
          userId: user.id,
          korisnickoIme: user.korisnickoIme,
          email: user.korisnickoIme,
          uloga: user.uloga,
          ime: user.ime,
          prezime: user.prezime,
          assignedTrenerId: user.assignedTrenerId,
          blokiran: user.blokiran,
        });
      },
    );
  }
}