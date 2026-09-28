import type { TrainingTermsRepository } from "../repositories/TrainingTermsRepository";
import type { TrainingEnrollmentsRepository } from "../repositories/TrainingEnrollmentsRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { SCHEDULING_EVENTS } from "../adapters/BrokerEventPublisher";
import type { TrainingType } from "../domain/models";
import { BadRequest, Forbidden, NotFound } from "../utils/errors";

export class TrainerTermsService {
  constructor(
    private readonly terms: TrainingTermsRepository,
    private readonly enrollments: TrainingEnrollmentsRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async kreiraj(trainerId: number, d: { programId: number | null; type: TrainingType; startAt: string; durationMin: number; capacity: number }) {
    const start = new Date(d.startAt);
    if (start.getTime() <= Date.now()) throw BadRequest("Termin mora biti u buducnosti");
    const capacity = d.type === "individual" ? 1 : d.capacity;
    const id = await this.terms.create({ trainerId, programId: d.programId, type: d.type, startAt: start, durationMin: d.durationMin, capacity });
    await this.events.objavi(SCHEDULING_EVENTS.TermCreated, { termId: id, trainerId, startAt: start.toISOString() });
    await this.audit.zabelezi("termin_kreiran", { termId: id }, trainerId);
    return (await this.terms.getById(id))!;
  }

  async listaMojih(trainerId: number, fromISO?: string, toISO?: string) {
    const from = fromISO ? new Date(fromISO) : new Date();
    const to = toISO ? new Date(toISO) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return this.terms.listForTrainer(trainerId, from, to);
  }

  async otkazi(trainerId: number, termId: number) {
    const term = await this.terms.getById(termId);
    if (!term) throw NotFound("Termin nije pronadjen");
    if (term.trainerId !== trainerId) throw Forbidden("Termin ne pripada vama");
    if (term.canceled) throw BadRequest("Termin je vec otkazan");
    const upisani = await this.enrollments.getEnrolledUsers(termId);
    await this.terms.cancelTerm(termId);
    await this.events.objavi(SCHEDULING_EVENTS.TermCanceled, {
      termId, trainerId, startAt: term.startAt.toISOString(), clientIds: upisani.map((u) => u.userId),
    });
    await this.audit.zabelezi("termin_otkazan", { termId, upisanih: upisani.length }, trainerId);
  }

  async upisani(trainerId: number, termId: number) {
    const term = await this.terms.getById(termId);
    if (!term || term.trainerId !== trainerId) throw NotFound("Termin nije pronadjen");
    return this.enrollments.getEnrolledUsers(termId);
  }

  async oznaciOdrzano(trainerId: number, termId: number, userId: number) {
    const term = await this.terms.getById(termId);
    if (!term || term.trainerId !== trainerId) throw NotFound("Termin nije pronadjen");
    await this.enrollments.markSessionCompleted(termId, userId);
    await this.events.objavi(SCHEDULING_EVENTS.SessionCompleted, { termId, trainerId, clientId: userId });
    await this.audit.zabelezi("trening_oznacen_odrzan", { termId, userId }, trainerId);
  }
}
