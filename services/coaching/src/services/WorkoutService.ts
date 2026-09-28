import type { WorkoutRepository } from "../repositories/WorkoutRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { COACHING_EVENTS } from "../adapters/BrokerEventPublisher";
import type { WorkoutLogItem } from "../domain/models";
import { BadRequest, Conflict } from "../utils/errors";

export class WorkoutService {
  constructor(
    private readonly repo: WorkoutRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async zabelezi(trainerId: number, d: {
    termId: number | null; clientId: number; startTime: string; endTime: string;
    notes: string | null; logs: WorkoutLogItem[];
  }): Promise<number> {
    const start = new Date(d.startTime);
    const end = new Date(d.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw BadRequest("Neispravan datum/vreme");
    if (end <= start) throw BadRequest("Kraj mora biti posle pocetka");

    if (d.termId != null && (await this.repo.hasSessionForTerm(d.termId))) {
      throw Conflict("Za ovaj termin trening je vec zabelezen");
    }

    const sessionId = await this.repo.saveSession({
      termId: d.termId, trainerId, clientId: d.clientId,
      startTime: start, endTime: end, notes: d.notes, logs: d.logs,
    });

    await this.events.objavi(COACHING_EVENTS.WorkoutRecorded, {
      sessionId, termId: d.termId, trainerId, clientId: d.clientId,
    });
    await this.audit.zabelezi("trening_zabelezen", { sessionId, clientId: d.clientId }, trainerId);
    return sessionId;
  }
}
