import type { ClientRequestsRepository } from "../repositories/ClientRequestsRepository";
import type { UsersReadRepository } from "../repositories/UsersReadRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { COACHING_EVENTS } from "../adapters/BrokerEventPublisher";
import { BadRequest, Conflict, NotFound } from "../utils/errors";
import type { StatusZahteva } from "../domain/models";

export class ClientRequestsService {
  constructor(
    private readonly requests: ClientRequestsRepository,
    private readonly usersRead: UsersReadRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async posalji(clientId: number, trainerId: number): Promise<void> {
    // Ako projekcija postoji, proveri da je meta zaista trener; ako ne, ne blokiramo (read model se puni Dan 5).
    const meta = await this.usersRead.getById(trainerId);
    if (meta && meta.uloga !== "trener") throw BadRequest("Navedeni korisnik nije trener");

    const postojeci = await this.requests.getByClientAndTrainer(clientId, trainerId);
    if (postojeci?.status === "approved") throw Conflict("Vec ste dodeljeni ovom treneru");
    if (postojeci?.status === "pending") throw Conflict("Zahtev je vec poslat i ceka odgovor");

    await this.requests.create(clientId, trainerId);
    await this.events.objavi(COACHING_EVENTS.ClientRequestCreated, { clientId, trainerId });
    await this.audit.zabelezi("zahtev_poslat", { trainerId }, clientId);
  }

  getPending(trainerId: number) {
    return this.requests.getPendingForTrainer(trainerId);
  }

  async odobri(trainerId: number, requestId: number): Promise<void> {
    const req = await this.requests.getById(requestId);
    if (!req || req.trainerId !== trainerId) throw NotFound("Zahtev nije pronadjen");
    if (req.status !== "pending") throw BadRequest("Zahtev nije na cekanju");

    // NAPOMENA: provera limita plana (Billing) i postavljanje users.assigned_trener_id (Identity)
    // realizuju se kao saga preko dogadjaja — Billing/Identity ih obradjuju (Dan 4/5).
    await this.requests.approve(requestId);
    await this.events.objavi(COACHING_EVENTS.ClientRequestApproved, { clientId: req.clientId, trainerId });
    await this.audit.zabelezi("zahtev_odobren", { requestId, clientId: req.clientId }, trainerId);
  }

  async odbij(trainerId: number, requestId: number): Promise<void> {
    const req = await this.requests.getById(requestId);
    if (!req || req.trainerId !== trainerId) throw NotFound("Zahtev nije pronadjen");
    if (req.status !== "pending") throw BadRequest("Zahtev nije na cekanju");

    await this.requests.reject(requestId);
    await this.events.objavi(COACHING_EVENTS.ClientRequestRejected, { clientId: req.clientId, trainerId });
    await this.audit.zabelezi("zahtev_odbijen", { requestId, clientId: req.clientId }, trainerId);
  }

  status(clientId: number, trainerId: number): Promise<StatusZahteva | null> {
    return this.requests.getStatusForClient(clientId, trainerId);
  }

  mojTrener(clientId: number): Promise<number | null> {
    return this.requests.getApprovedTrainerForClient(clientId);
  }
}
