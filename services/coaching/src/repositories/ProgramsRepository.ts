import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { Nivo, Program, ProgramExercise } from "../domain/models";

interface PRow extends RowDataPacket {
  id: number; trainerId: number; title: string; description: string | null;
  level: Nivo; isPublic: number; createdAt: Date;
}
const mapP = (r: PRow): Program => ({
  id: r.id, trainerId: r.trainerId, title: r.title, description: r.description,
  level: r.level, isPublic: !!r.isPublic, createdAt: new Date(r.createdAt),
});

export interface ProgramSaDodelama extends Program { assignedClientIds: number[]; }
export interface StavkaDetalja extends ProgramExercise { name: string; }
export interface DodeljeniKlijent {
  id: number; ime: string; prezime: string; korisnickoIme: string | null;
  status: string; assignedAt: Date;
}

export class ProgramsRepository {
  constructor(private readonly pool: Pool) {}

  async listByTrainer(trainerId: number): Promise<ProgramSaDodelama[]> {
    const [rows] = await this.pool.query<PRow[]>(
      `SELECT id, trainer_id AS trainerId, title, description, level, is_public AS isPublic, created_at AS createdAt
       FROM programs WHERE trainer_id=? ORDER BY created_at DESC`,
      [trainerId],
    );
    const programi = rows.map((r) => ({ ...mapP(r), assignedClientIds: [] as number[] }));
    if (!programi.length) return programi;
    const ids = programi.map((p) => p.id);
    const [ar] = await this.pool.query<RowDataPacket[]>(
      `SELECT program_id AS programId, client_id AS clientId FROM client_programs
       WHERE program_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const mapa = new Map<number, number[]>();
    for (const r of ar as Array<{ programId: number; clientId: number }>) {
      const a = mapa.get(r.programId) ?? [];
      a.push(Number(r.clientId));
      mapa.set(Number(r.programId), a);
    }
    programi.forEach((p) => { p.assignedClientIds = mapa.get(p.id) ?? []; });
    return programi;
  }

  async getById(id: number): Promise<Program | null> {
    const [rows] = await this.pool.query<PRow[]>(
      `SELECT id, trainer_id AS trainerId, title, description, level, is_public AS isPublic, created_at AS createdAt
       FROM programs WHERE id=? LIMIT 1`,
      [id],
    );
    return rows.length ? mapP(rows[0]) : null;
  }

  async create(trainerId: number, d: { title: string; description: string | null; level: Nivo; isPublic: boolean }): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO programs (trainer_id, title, description, level, is_public) VALUES (?, ?, ?, ?, ?)`,
      [trainerId, d.title, d.description, d.level, d.isPublic ? 1 : 0],
    );
    return res.insertId;
  }

  async update(trainerId: number, id: number, d: Partial<{ title: string; description: string | null; level: Nivo; isPublic: boolean }>): Promise<void> {
    const polja: string[] = []; const arg: Array<string | number | null> = [];
    if (d.title !== undefined) { polja.push("title=?"); arg.push(d.title); }
    if (d.description !== undefined) { polja.push("description=?"); arg.push(d.description); }
    if (d.level !== undefined) { polja.push("level=?"); arg.push(d.level); }
    if (d.isPublic !== undefined) { polja.push("is_public=?"); arg.push(d.isPublic ? 1 : 0); }
    if (!polja.length) return;
    arg.push(trainerId, id);
    await this.pool.query(`UPDATE programs SET ${polja.join(", ")} WHERE trainer_id=? AND id=?`, arg);
  }

  async getExercises(programId: number): Promise<StavkaDetalja[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT pe.program_id AS programId, pe.exercise_id AS exerciseId, pe.position, pe.sets, pe.reps,
              pe.tempo, pe.rest_sec AS restSec, pe.notes, e.name
       FROM program_exercises pe JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_id = ? ORDER BY pe.position ASC`,
      [programId],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      programId: Number(r.programId), exerciseId: Number(r.exerciseId), position: Number(r.position ?? 0),
      sets: r.sets != null ? Number(r.sets) : null, reps: (r.reps as string) ?? null,
      tempo: (r.tempo as string) ?? null, restSec: r.restSec != null ? Number(r.restSec) : null,
      notes: (r.notes as string) ?? null, name: r.name as string,
    }));
  }

  async replaceExercises(programId: number, stavke: Omit<ProgramExercise, "programId">[]): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("DELETE FROM program_exercises WHERE program_id=?", [programId]);
      if (stavke.length) {
        const v: string[] = []; const arg: Array<string | number | null> = [];
        for (const it of stavke) {
          v.push("(?,?,?,?,?,?,?,?)");
          arg.push(programId, it.exerciseId, it.position, it.sets ?? null, it.reps ?? null, it.tempo ?? null, it.restSec ?? null, it.notes ?? null);
        }
        await conn.execute(
          `INSERT INTO program_exercises (program_id, exercise_id, position, sets, reps, tempo, rest_sec, notes) VALUES ${v.join(",")}`,
          arg,
        );
      }
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch { /* ignore */ }
      throw e;
    } finally {
      conn.release();
    }
  }

  async assignToClient(programId: number, clientId: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO client_programs (program_id, client_id, status, assigned_at)
       VALUES (?, ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE status='active', assigned_at=NOW()`,
      [programId, clientId],
    );
  }

  async listAssignedClients(trainerId: number, programId: number): Promise<DodeljeniKlijent[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ur.id AS id, ur.ime AS ime, ur.prezime AS prezime, ur.korisnickoIme AS korisnickoIme,
              cp.status AS status, cp.assigned_at AS assignedAt
       FROM client_programs cp
       JOIN programs p ON p.id = cp.program_id
       LEFT JOIN users_read ur ON ur.id = cp.client_id
       WHERE cp.program_id = ? AND p.trainer_id = ?
       ORDER BY cp.assigned_at DESC`,
      [programId, trainerId],
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      id: Number(r.id), ime: (r.ime as string) ?? "", prezime: (r.prezime as string) ?? "",
      korisnickoIme: (r.korisnickoIme as string) ?? null, status: r.status as string,
      assignedAt: new Date(r.assignedAt as string),
    }));
  }

  // ── klijentski pogled ──
  async listVisibleForClient(p: { clientId: number; trainerId: number | null; q?: string; level?: Nivo }): Promise<Program[]> {
    const where = ["(p.is_public = 1 OR (p.trainer_id = ? AND cp.client_id IS NOT NULL))"];
    const arg: unknown[] = [p.trainerId ?? 0];
    if (p.q) { where.push("(p.title LIKE ? OR p.description LIKE ?)"); arg.push(`%${p.q}%`, `%${p.q}%`); }
    if (p.level) { where.push("p.level = ?"); arg.push(p.level); }
    const [rows] = await this.pool.query<PRow[]>(
      `SELECT p.id, p.trainer_id AS trainerId, p.title, p.description, p.level, p.is_public AS isPublic, p.created_at AS createdAt
       FROM programs p
       LEFT JOIN client_programs cp ON cp.program_id = p.id AND cp.client_id = ?
       WHERE ${where.join(" AND ")} AND (p.is_public = 1 OR cp.client_id IS NOT NULL)
       ORDER BY p.created_at DESC LIMIT 200`,
      [p.clientId, ...arg],
    );
    return rows.map(mapP);
  }

  async getDetailsVisibleForClient(programId: number, trainerId: number, clientId: number): Promise<{ program: Program; exercises: StavkaDetalja[] } | null> {
    const [rows] = await this.pool.query<PRow[]>(
      `SELECT p.id, p.trainer_id AS trainerId, p.title, p.description, p.level, p.is_public AS isPublic, p.created_at AS createdAt
       FROM programs p
       LEFT JOIN client_programs cp ON cp.program_id = p.id AND cp.client_id = ?
       WHERE p.id = ? AND p.trainer_id = ? AND (p.is_public = 1 OR cp.client_id IS NOT NULL) LIMIT 1`,
      [clientId, programId, trainerId],
    );
    if (!rows.length) return null;
    const exercises = await this.getExercises(programId);
    return { program: mapP(rows[0]), exercises };
  }
}
