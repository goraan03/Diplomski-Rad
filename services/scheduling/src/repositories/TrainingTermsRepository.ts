import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { TrainingTerm, TrainingType } from "../domain/models";
import { uMysqlDatetime } from "../utils/dates";

interface TRow extends RowDataPacket {
  id: number; trainerId: number; programId: number | null; type: TrainingType;
  startAt: Date; durationMin: number; capacity: number; enrolledCount: number; canceled: number;
}
const map = (r: TRow): TrainingTerm => ({
  id: r.id, trainerId: r.trainerId, programId: r.programId ?? null, type: r.type,
  startAt: new Date(r.startAt), durationMin: Number(r.durationMin || 0),
  capacity: Number(r.capacity || 0), enrolledCount: Number(r.enrolledCount || 0), canceled: !!r.canceled,
});

const SEL = `id, trainer_id AS trainerId, program_id AS programId, type, start_at AS startAt,
             duration_min AS durationMin, capacity, enrolled_count AS enrolledCount, canceled`;

export interface DostupanTermin {
  id: number; startAt: string; durationMin: number; type: TrainingType;
  capacity: number; enrolledCount: number; status: "free" | "full"; isEnrolled: boolean;
  program: { id: number | null; title: string | null; level: string | null };
  trainer: { id: number; name: string | null };
}

export class TrainingTermsRepository {
  constructor(private readonly pool: Pool) {}

  async getById(id: number): Promise<TrainingTerm | null> {
    const [rows] = await this.pool.query<TRow[]>(`SELECT ${SEL} FROM training_terms WHERE id=? LIMIT 1`, [id]);
    return rows.length ? map(rows[0]) : null;
  }

  async create(d: { trainerId: number; programId: number | null; type: TrainingType; startAt: Date; durationMin: number; capacity: number }): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO training_terms (trainer_id, program_id, type, start_at, duration_min, capacity, enrolled_count, canceled)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [d.trainerId, d.programId, d.type, uMysqlDatetime(d.startAt), d.durationMin, d.capacity],
    );
    return res.insertId;
  }

  async listForTrainer(trainerId: number, from: Date, to: Date): Promise<TrainingTerm[]> {
    const [rows] = await this.pool.query<TRow[]>(
      `SELECT ${SEL} FROM training_terms WHERE trainer_id=? AND start_at BETWEEN ? AND ? ORDER BY start_at ASC`,
      [trainerId, uMysqlDatetime(from), uMysqlDatetime(to)],
    );
    return rows.map(map);
  }

  async getAvailableTerms(
    trainerId: number, from: Date, to: Date, userId: number,
    type?: TrainingType, programId?: number, status?: "free" | "full",
  ): Promise<DostupanTermin[]> {
    const where = ["t.trainer_id=?", "t.canceled=0", "t.start_at BETWEEN ? AND ?"];
    const args: unknown[] = [trainerId, uMysqlDatetime(from), uMysqlDatetime(to)];
    if (type) { where.push("t.type=?"); args.push(type); }
    if (programId) { where.push("t.program_id=?"); args.push(programId); }
    if (status === "free") where.push("t.enrolled_count < t.capacity");
    if (status === "full") where.push("t.enrolled_count >= t.capacity");

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT t.id, t.start_at AS startAt, t.duration_min AS durationMin, t.type, t.capacity,
              t.enrolled_count AS enrolledCount, t.program_id AS programId,
              p.title AS programTitle, p.level AS level,
              u.ime AS trainerIme, u.prezime AS trainerPrezime, t.trainer_id AS trainerId,
              CASE WHEN e.id IS NULL THEN 0 ELSE 1 END AS isEnrolled
       FROM training_terms t
       LEFT JOIN programs_read p ON p.id = t.program_id
       LEFT JOIN users_read u ON u.id = t.trainer_id
       LEFT JOIN training_enrollments e ON e.term_id = t.id AND e.user_id = ? AND e.status = 'enrolled'
       WHERE ${where.join(" AND ")}
       ORDER BY t.start_at ASC`,
      [userId, ...args],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => {
      const cap = Number(r.capacity || 0); const cnt = Number(r.enrolledCount || 0);
      const ime = (r.trainerIme as string) ?? ""; const pr = (r.trainerPrezime as string) ?? "";
      const name = `${ime} ${pr}`.trim();
      return {
        id: Number(r.id), startAt: new Date(r.startAt as string).toISOString(),
        durationMin: Number(r.durationMin || 0), type: r.type as TrainingType,
        capacity: cap, enrolledCount: cnt, status: cnt >= cap ? "full" : "free",
        isEnrolled: Number(r.isEnrolled) === 1,
        program: { id: r.programId != null ? Number(r.programId) : null, title: (r.programTitle as string) ?? null, level: (r.level as string) ?? null },
        trainer: { id: Number(r.trainerId), name: name || null },
      };
    });
  }

  async incrementEnrolledCount(termId: number): Promise<void> {
    await this.pool.query("UPDATE training_terms SET enrolled_count = enrolled_count + 1 WHERE id=?", [termId]);
  }
  async decrementEnrolledCount(termId: number): Promise<void> {
    await this.pool.query("UPDATE training_terms SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id=?", [termId]);
  }
  async cancelTerm(termId: number): Promise<void> {
    await this.pool.query("UPDATE training_terms SET canceled=1 WHERE id=?", [termId]);
  }
  async setProgram(termId: number, programId: number | null): Promise<void> {
    await this.pool.query("UPDATE training_terms SET program_id=? WHERE id=?", [programId, termId]);
  }
}
