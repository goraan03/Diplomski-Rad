import type { Pool, RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import type { WorkoutLogItem } from "../domain/models";
import { uMysqlDatetime } from "../utils/dates";

export class WorkoutRepository {
  constructor(private readonly pool: Pool) {}

  async hasSessionForTerm(termId: number): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT 1 FROM workout_sessions WHERE term_id=? LIMIT 1",
      [termId],
    );
    return (rows as unknown[]).length > 0;
  }

  async saveSession(data: {
    termId: number | null; trainerId: number; clientId: number;
    startTime: Date; endTime: Date; notes: string | null; logs: WorkoutLogItem[];
  }): Promise<number> {
    const conn: PoolConnection = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO workout_sessions (term_id, trainer_id, client_id, start_time, end_time, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.termId, data.trainerId, data.clientId, uMysqlDatetime(data.startTime), uMysqlDatetime(data.endTime), data.notes],
      );
      const sessionId = res.insertId;
      if (data.logs.length) {
        const v: string[] = []; const arg: Array<string | number | null> = [];
        for (const l of data.logs) {
          v.push("(?,?,?,?,?,?,?)");
          arg.push(sessionId, l.exerciseId, l.setNumber, l.plannedReps ?? null, l.actualReps, l.plannedWeight ?? null, l.actualWeight);
        }
        await conn.execute(
          `INSERT INTO workout_exercise_logs (session_id, exercise_id, set_number, planned_reps, actual_reps, planned_weight, actual_weight)
           VALUES ${v.join(",")}`,
          arg,
        );
      }
      await conn.commit();
      return sessionId;
    } catch (e) {
      try { await conn.rollback(); } catch { /* ignore */ }
      throw e;
    } finally {
      conn.release();
    }
  }
}
