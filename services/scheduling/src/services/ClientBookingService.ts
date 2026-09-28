import type { TrainingTermsRepository } from "../repositories/TrainingTermsRepository";
import type { TrainingEnrollmentsRepository } from "../repositories/TrainingEnrollmentsRepository";
import type { UsersReadRepository } from "../repositories/UsersReadRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { SCHEDULING_EVENTS } from "../adapters/BrokerEventPublisher";
import type { TrainingType } from "../domain/models";
import { BadRequest, Conflict, Forbidden, NotFound } from "../utils/errors";
import { config } from "../config";
import { pocetakNedelje } from "../utils/dates";

export class ClientBookingService {
  constructor(
    private readonly terms: TrainingTermsRepository,
    private readonly enrollments: TrainingEnrollmentsRepository,
    private readonly usersRead: UsersReadRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  // Trener klijenta: iz projekcije (assigned_trener_id); moze se zadati i eksplicitno.
  private async trenerKlijenta(clientId: number, eksplicitni?: number): Promise<number> {
    if (eksplicitni) return eksplicitni;
    const meta = await this.usersRead.getById(clientId);
    if (meta?.assignedTrenerId) return meta.assignedTrenerId;
    throw BadRequest("Nemate dodeljenog trenera (ili navedite trainerId)");
  }

  async dostupniTermini(
    clientId: number,
    params: { fromISO?: string; toISO?: string; type?: TrainingType; programId?: number; status?: "free" | "full"; trainerId?: number },
  ) {
    const trainerId = await this.trenerKlijenta(clientId, params.trainerId);
    const from = params.fromISO ? new Date(params.fromISO) : new Date();
    const to = params.toISO ? new Date(params.toISO) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return this.terms.getAvailableTerms(trainerId, from, to, clientId, params.type, params.programId, params.status);
  }

  async upisi(clientId: number, termId: number) {
    const term = await this.terms.getById(termId);
    if (!term) throw NotFound("Termin nije pronadjen");
    if (term.canceled) throw BadRequest("Termin je otkazan");

    // Ako projekcija zna trenera klijenta, proveri da termin pripada bas njemu.
    const meta = await this.usersRead.getById(clientId);
    if (meta?.assignedTrenerId && meta.assignedTrenerId !== term.trainerId) {
      throw Forbidden("Termin pripada drugom treneru");
    }

    const start = term.startAt.getTime();
    if (start - Date.now() < config.bookingWindowMin * 60000) throw BadRequest("Prekasno za upis na ovaj termin");

    const postojeci = await this.enrollments.findByUserAndTerm(clientId, termId);
    if (postojeci) {
      if (postojeci.status === "enrolled") throw Conflict("Vec ste upisani");
      if (term.enrolledCount >= term.capacity) throw Conflict("Termin je popunjen");
      await this.enrollments.reactivateEnrollment(postojeci.id);
    } else {
      if (term.enrolledCount >= term.capacity) throw Conflict("Termin je popunjen");
      await this.enrollments.createEnrollment(termId, clientId);
    }
    await this.terms.incrementEnrolledCount(termId);
    await this.events.objavi(SCHEDULING_EVENTS.TermBooked, {
      termId, clientId, trainerId: term.trainerId, startAt: term.startAt.toISOString(),
    });
    await this.audit.zabelezi("termin_upisan", { termId }, clientId);
  }

  async otkazi(clientId: number, termId: number) {
    const enr = await this.enrollments.getActiveEnrollmentWithTerm(clientId, termId);
    if (!enr) throw BadRequest("Niste upisani na ovaj termin");
    if (enr.termStartAt.getTime() - Date.now() < config.bookingWindowMin * 60000) {
      throw BadRequest("Prekasno za otkazivanje");
    }
    await this.enrollments.cancelEnrollment(enr.enrollmentId);
    await this.terms.decrementEnrolledCount(termId);
    const term = await this.terms.getById(termId);
    await this.events.objavi(SCHEDULING_EVENTS.EnrollmentCanceled, {
      termId, clientId, trainerId: term?.trainerId ?? null, startAt: term?.startAt.toISOString() ?? null,
    });
    await this.audit.zabelezi("termin_otkazan_klijent", { termId }, clientId);
  }

  async oceni(clientId: number, termId: number, rating: number, feedback: string | null) {
    const term = await this.terms.getById(termId);
    if (!term) throw NotFound("Termin nije pronadjen");
    if (term.startAt.getTime() > Date.now()) throw BadRequest("Termin jos nije odrzan");
    const pogodjeno = await this.enrollments.setRating(termId, clientId, rating, feedback);
    if (pogodjeno === 0) throw BadRequest("Nemate upis koji se moze oceniti");
    await this.events.objavi(SCHEDULING_EVENTS.TermRated, { termId, clientId, trainerId: term.trainerId, rating });
    await this.audit.zabelezi("termin_ocenjen", { termId, rating }, clientId);
  }

  raspored(clientId: number, weekStartISO?: string) {
    const start = weekStartISO ? pocetakNedelje(new Date(weekStartISO)) : pocetakNedelje(new Date());
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return this.enrollments.getWeeklySchedule(clientId, start, end);
  }
  istorija(clientId: number) { return this.enrollments.listHistory(clientId); }
  predstojeci(clientId: number, limit: number) { return this.enrollments.listUpcoming(clientId, limit); }
  statistika(clientId: number) { return this.enrollments.getStats(clientId); }
}
