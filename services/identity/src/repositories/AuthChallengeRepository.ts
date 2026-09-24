import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { AuthChallenge, NamenaIzazova } from "../domain/AuthChallenge";
import { uMysqlDatetime } from "../utils/dates";

interface ChallengeRow extends RowDataPacket {
  id: number;
  user_id: number;
  namena: NamenaIzazova;
  code_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  attempts: number;
  created_at: Date;
}

function mapiraj(r: ChallengeRow): AuthChallenge {
  return {
    id: r.id,
    userId: r.user_id,
    namena: r.namena,
    codeHash: r.code_hash,
    expiresAt: r.expires_at,
    consumedAt: r.consumed_at,
    attempts: r.attempts,
    createdAt: r.created_at,
  };
}

export class AuthChallengeRepository {
  constructor(private readonly pool: Pool) {}

  // Ponisti sve ranije aktivne izazove iste namene za korisnika
  async ponistiAktivne(userId: number, namena: NamenaIzazova): Promise<void> {
    await this.pool.query(
      "UPDATE auth_challenges SET consumed_at = NOW() WHERE user_id = ? AND namena = ? AND consumed_at IS NULL",
      [userId, namena],
    );
  }

  async kreiraj(userId: number, namena: NamenaIzazova, codeHash: string, expiresAt: Date): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      "INSERT INTO auth_challenges (user_id, namena, code_hash, expires_at) VALUES (?, ?, ?, ?)",
      [userId, namena, codeHash, uMysqlDatetime(expiresAt)],
    );
    return res.insertId;
  }

  async nadjiAktivan(userId: number, namena: NamenaIzazova): Promise<AuthChallenge | null> {
    const [rows] = await this.pool.query<ChallengeRow[]>(
      `SELECT * FROM auth_challenges
       WHERE user_id = ? AND namena = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId, namena],
    );
    return rows.length ? mapiraj(rows[0]) : null;
  }

  async nadjiPoId(id: number): Promise<AuthChallenge | null> {
    const [rows] = await this.pool.query<ChallengeRow[]>(
      "SELECT * FROM auth_challenges WHERE id = ? LIMIT 1",
      [id],
    );
    return rows.length ? mapiraj(rows[0]) : null;
  }

  async povecajPokusaje(id: number): Promise<void> {
    await this.pool.query("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?", [id]);
  }

  async oznaciIskoriscen(id: number): Promise<void> {
    await this.pool.query("UPDATE auth_challenges SET consumed_at = NOW() WHERE id = ?", [id]);
  }
}
