import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface HistoryRow {
  id: number; startAt: Date; programTitle: string | null; trainerName: string | null;
  status: string; rating: number | null; feedback: string | null;
}
export interface UpcomingRow {
  id: number; title: string | null; type: string; startsAt: Date; durationMin: number;
  enrolledCount: number; capacity: number; trainerName: string | null;
}
export interface WeeklyRow {
  termId: number; startAt: Date; dur: number; type: string;
  programId: number | null; programTitle: string | null; trainerName: string | null; completed: number;
}

export class TrainingEnrollmentsRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserAndTerm(userId: number, termId: number): Promise<{ id: number; status: string } | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT id, status FROM training_enrollments WHERE term_id=? AND user_id=? LIMIT 1",
      [termId, userId],
    );
    if (!rows.length) return null;
    const r = rows[0] as { id: number; status: string };
    return { id: r.id, status: r.status };
  }

  async createEnrollment(termId: number, userId: number): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      "INSERT INTO training_enrollments (term_id, user_id) VALUES (?, ?)",
      [termId, userId],
    );
    return res.insertId;
  }

  async reactivateEnrollment(id: number): Promise<void> {
    await this.pool.query(
      "UPDATE training_enrollments SET status='enrolled', rating=NULL, feedback=NULL WHERE id=?",
      [id],
    );
  }

  async cancelEnrollment(id: number): Promise<void> {
    await this.pool.query("UPDATE training_enrollments SET status='canceled_by_user' WHERE id=?", [id]);
  }

  async getActiveEnrollmentWithTerm(userId: number, termId: number): Promise<{ enrollmentId: number; termStartAt: Date } | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT e.id AS enrollmentId, t.start_at AS startAt
       FROM training_enrollments e JOIN training_terms t ON t.id=e.term_id
       WHERE e.user_id=? AND e.term_id=? AND e.status='enrolled' LIMIT 1`,
      [userId, termId],
    );
    if (!rows.length) return null;
    const r = rows[0] as { enrollmentId: number; startAt: string };
    return { enrollmentId: r.enrollmentId, termStartAt: new Date(r.startAt) };
  }

  async setRating(termId: number, userId: number, rating: number, feedback: string | null): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      "UPDATE training_enrollments SET rating=?, feedback=? WHERE term_id=? AND user_id=? AND status IN ('enrolled','attended')",
      [rating, feedback, termId, userId],
    );
    return res.affectedRows;
  }

  async markSessionCompleted(termId: number, userId: number): Promise<void> {
    await this.pool.query(
      "UPDATE training_enrollments SET session_completed=1, status='attended', attended_at=NOW() WHERE term_id=? AND user_id=?",
      [termId, userId],
    );
  }

  async getEnrolledUsers(termId: number): Promise<Array<{ userId: number; ime: string | null; prezime: string | null }>> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT te.user_id AS userId, ur.ime AS ime, ur.prezime AS prezime
       FROM training_enrollments te
       LEFT JOIN users_read ur ON ur.id = te.user_id
       WHERE te.term_id=? AND te.status IN ('enrolled','attended')`,
      [termId],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      userId: Number(r.userId), ime: (r.ime as string) ?? null, prezime: (r.prezime as string) ?? null,
    }));
  }

  async listHistory(userId: number): Promise<HistoryRow[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT e.id, e.status, e.rating, e.feedback, t.start_at AS startAt,
              p.title AS programTitle, CONCAT(COALESCE(u.ime,''),' ',COALESCE(u.prezime,'')) AS trainerName
       FROM training_enrollments e
       JOIN training_terms t ON t.id=e.term_id
       LEFT JOIN programs_read p ON p.id=t.program_id
       LEFT JOIN users_read u ON u.id=t.trainer_id
       WHERE e.user_id=? AND t.start_at < NOW()
       ORDER BY t.start_at DESC LIMIT 100`,
      [userId],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      id: Number(r.id), startAt: new Date(r.startAt as string), programTitle: (r.programTitle as string) ?? null,
      trainerName: ((r.trainerName as string) ?? "").trim() || null, status: r.status as string,
      rating: r.rating != null ? Number(r.rating) : null, feedback: (r.feedback as string) ?? null,
    }));
  }

  async listUpcoming(userId: number, limit: number): Promise<UpcomingRow[]> {
    const lim = Math.max(1, Math.min(100, Number(limit || 10)));
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT t.id, p.title AS title, t.type, t.start_at AS startsAt, t.duration_min AS durationMin,
              t.enrolled_count AS enrolledCount, t.capacity,
              CONCAT(COALESCE(tr.ime,''),' ',COALESCE(tr.prezime,'')) AS trainerName
       FROM training_enrollments e
       JOIN training_terms t ON t.id=e.term_id
       LEFT JOIN programs_read p ON p.id=t.program_id
       LEFT JOIN users_read tr ON tr.id=t.trainer_id
       WHERE e.user_id=? AND e.status='enrolled' AND t.canceled=0 AND t.start_at >= NOW()
       ORDER BY t.start_at ASC LIMIT ${lim}`,
      [userId],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      id: Number(r.id), title: (r.title as string) ?? null, type: r.type as string,
      startsAt: new Date(r.startsAt as string), durationMin: Number(r.durationMin || 0),
      enrolledCount: Number(r.enrolledCount || 0), capacity: Number(r.capacity || 0),
      trainerName: ((r.trainerName as string) ?? "").trim() || null,
    }));
  }

  async getWeeklySchedule(userId: number, weekStart: Date, weekEnd: Date): Promise<WeeklyRow[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT e.term_id AS termId, t.start_at AS startAt, t.duration_min AS dur, t.type,
              t.program_id AS programId, p.title AS programTitle,
              CONCAT(COALESCE(u.ime,''),' ',COALESCE(u.prezime,'')) AS trainerName,
              COALESCE(MAX(e.session_completed),0) AS completed
       FROM training_enrollments e
       JOIN training_terms t ON t.id=e.term_id
       LEFT JOIN programs_read p ON p.id=t.program_id
       LEFT JOIN users_read u ON u.id=t.trainer_id
       WHERE e.user_id=? AND t.start_at>=? AND t.start_at<? AND e.status IN ('enrolled','attended') AND t.canceled=0
       GROUP BY e.term_id
       ORDER BY t.start_at`,
      [userId, weekStart, weekEnd],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      termId: Number(r.termId), startAt: new Date(r.startAt as string), dur: Number(r.dur || 0),
      type: r.type as string, programId: r.programId != null ? Number(r.programId) : null,
      programTitle: (r.programTitle as string) ?? null,
      trainerName: ((r.trainerName as string) ?? "").trim() || null, completed: Number(r.completed || 0),
    }));
  }

  async getStats(userId: number): Promise<{ total: number; avgRating: number | null; completedCount: number; totalMinutes: number }> {
    const [rr] = await this.pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total, AVG(rating) AS avgRating FROM training_enrollments WHERE user_id=? AND rating IS NOT NULL",
      [userId],
    );
    const [cc] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(t.duration_min),0) AS mins
       FROM training_enrollments e JOIN training_terms t ON t.id=e.term_id
       WHERE e.user_id=? AND e.status IN ('enrolled','attended') AND t.start_at < NOW()`,
      [userId],
    );
    const a = rr[0] as { total: number; avgRating: number | null };
    const b = cc[0] as { cnt: number; mins: number };
    return {
      total: Number(a.total || 0), avgRating: a.avgRating != null ? Number(a.avgRating) : null,
      completedCount: Number(b.cnt || 0), totalMinutes: Number(b.mins || 0),
    };
  }
}
