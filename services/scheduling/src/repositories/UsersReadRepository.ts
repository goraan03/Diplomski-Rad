import type { Pool, RowDataPacket } from "mysql2/promise";

export interface UserRead {
  id: number; korisnickoIme: string | null; ime: string | null; prezime: string | null;
  uloga: string | null; assignedTrenerId: number | null; blokiran: boolean;
}

export class UsersReadRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(u: Partial<UserRead> & { id: number }): Promise<void> {
    await this.pool.query(
      `INSERT INTO users_read (id, korisnickoIme, ime, prezime, uloga, assigned_trener_id, blokiran)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE korisnickoIme=VALUES(korisnickoIme), ime=VALUES(ime), prezime=VALUES(prezime),
         uloga=VALUES(uloga), assigned_trener_id=VALUES(assigned_trener_id), blokiran=VALUES(blokiran)`,
      [u.id, u.korisnickoIme ?? null, u.ime ?? null, u.prezime ?? null, u.uloga ?? null,
       u.assignedTrenerId ?? null, u.blokiran ? 1 : 0],
    );
  }

  async updateBlocked(id: number, blokiran: boolean): Promise<void> {
    await this.pool.query("UPDATE users_read SET blokiran=? WHERE id=?", [blokiran ? 1 : 0, id]);
  }

  async getById(id: number): Promise<UserRead | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, korisnickoIme, ime, prezime, uloga, assigned_trener_id AS assignedTrenerId, blokiran
       FROM users_read WHERE id=? LIMIT 1`,
      [id],
    );
    if (!rows.length) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id: Number(r.id), korisnickoIme: (r.korisnickoIme as string) ?? null,
      ime: (r.ime as string) ?? null, prezime: (r.prezime as string) ?? null,
      uloga: (r.uloga as string) ?? null,
      assignedTrenerId: r.assignedTrenerId != null ? Number(r.assignedTrenerId) : null,
      blokiran: Number(r.blokiran) === 1,
    };
  }
}
