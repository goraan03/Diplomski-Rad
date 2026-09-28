import type { Pool, RowDataPacket } from "mysql2/promise";

export interface AuditZapis {
  servis: string;
  akcija: string;
  userId: number | null;
  detalji: Record<string, unknown> | null;
}

export class AuditRepository {
  constructor(private readonly pool: Pool) {}

  async upisi(z: AuditZapis): Promise<void> {
    await this.pool.query(
      "INSERT INTO audit_log (servis, akcija, user_id, detalji) VALUES (?, ?, ?, ?)",
      [z.servis, z.akcija, z.userId, z.detalji ? JSON.stringify(z.detalji) : null],
    );
  }

  async lista(f: { servis?: string; akcija?: string; userId?: number; limit?: number }): Promise<RowDataPacket[]> {
    const uslovi: string[] = [];
    const arg: unknown[] = [];
    if (f.servis) { uslovi.push("servis = ?"); arg.push(f.servis); }
    if (f.akcija) { uslovi.push("akcija = ?"); arg.push(f.akcija); }
    if (f.userId) { uslovi.push("user_id = ?"); arg.push(f.userId); }
    const where = uslovi.length ? `WHERE ${uslovi.join(" AND ")}` : "";
    const lim = Math.max(1, Math.min(500, Number(f.limit ?? 100)));
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, servis, akcija, user_id AS userId, detalji, created_at AS createdAt
       FROM audit_log ${where} ORDER BY created_at DESC LIMIT ${lim}`,
      arg,
    );
    return rows;
  }
}