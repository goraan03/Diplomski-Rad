import type { ProgramsRepository } from "../repositories/ProgramsRepository";
import type { ExercisesRepository } from "../repositories/ExercisesRepository";
import type { ClientRequestsRepository } from "../repositories/ClientRequestsRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { COACHING_EVENTS } from "../adapters/BrokerEventPublisher";
import type { Nivo, ProgramExercise } from "../domain/models";
import { BadRequest, Forbidden, NotFound } from "../utils/errors";

export class ProgramsService {
  constructor(
    private readonly programs: ProgramsRepository,
    private readonly exercises: ExercisesRepository,
    private readonly requests: ClientRequestsRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  listByTrainer(trainerId: number) {
    return this.programs.listByTrainer(trainerId);
  }

  async create(trainerId: number, d: { title: string; description: string | null; level: Nivo; isPublic: boolean }) {
    const id = await this.programs.create(trainerId, d);
    await this.events.objavi(COACHING_EVENTS.ProgramCreated, { id, trainerId, title: d.title, level: d.level });
    await this.audit.zabelezi("program_kreiran", { id, title: d.title }, trainerId);
    return (await this.programs.getById(id))!;
  }

  async update(trainerId: number, id: number, d: Partial<{ title: string; description: string | null; level: Nivo; isPublic: boolean }>) {
    const p = await this.programs.getById(id);
    if (!p || p.trainerId !== trainerId) throw NotFound("Program nije pronadjen");
    await this.programs.update(trainerId, id, d);
    const updated = await this.programs.getById(id);
    if (updated) {
      await this.events.objavi(COACHING_EVENTS.ProgramUpdated, {
        id: updated.id,
        trainerId: updated.trainerId,
        title: updated.title,
        level: updated.level,
      });
    }
    await this.audit.zabelezi("program_izmenjen", { id }, trainerId);
    return (await this.programs.getById(id))!;
  }

  async getDetails(trainerId: number, programId: number) {
    const p = await this.programs.getById(programId);
    if (!p || p.trainerId !== trainerId) throw NotFound("Program nije pronadjen");
    const exercises = await this.programs.getExercises(programId);
    return { program: p, exercises };
  }

  async replaceExercises(trainerId: number, programId: number, stavke: Omit<ProgramExercise, "programId">[]) {
    const p = await this.programs.getById(programId);
    if (!p || p.trainerId !== trainerId) throw NotFound("Program nije pronadjen");
    // Sve vezbe moraju pripadati treneru
    for (const it of stavke) {
      const v = await this.exercises.getById(it.exerciseId);
      if (!v || v.trainerId !== trainerId) throw BadRequest(`Vezba ${it.exerciseId} ne pripada treneru`);
    }
    await this.programs.replaceExercises(programId, stavke);
    await this.audit.zabelezi("program_vezbe_azurirane", { programId, broj: stavke.length }, trainerId);
  }

  async assignToClient(trainerId: number, programId: number, clientId: number) {
    const p = await this.programs.getById(programId);
    if (!p || p.trainerId !== trainerId) throw NotFound("Program nije pronadjen");
    const status = await this.requests.getStatusForClient(clientId, trainerId);
    if (status !== "approved") throw Forbidden("Klijent nije vas (nema odobren zahtev)");
    await this.programs.assignToClient(programId, clientId);
    await this.events.objavi(COACHING_EVENTS.ProgramAssigned, { programId, clientId, trainerId });
    await this.audit.zabelezi("program_dodeljen", { programId, clientId }, trainerId);
  }

  listAssignedClients(trainerId: number, programId: number) {
    return this.programs.listAssignedClients(trainerId, programId);
  }

  // ── klijentski pogled ──
  async listForClient(clientId: number, q?: string, level?: Nivo) {
    const trainerId = await this.requests.getApprovedTrainerForClient(clientId);
    return this.programs.listVisibleForClient({ clientId, trainerId, q, level });
  }

  async detailsForClient(clientId: number, programId: number) {
    const trainerId = await this.requests.getApprovedTrainerForClient(clientId);
    if (!trainerId) throw Forbidden("Nemate dodeljenog trenera");
    const d = await this.programs.getDetailsVisibleForClient(programId, trainerId, clientId);
    if (!d) throw NotFound("Program nije dostupan");
    return d;
  }
}
