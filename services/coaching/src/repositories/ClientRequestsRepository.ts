import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { ClientRequest, StatusZahteva } from "../domain/models";

interface Row extends RowDataPacket {
  id: number; client_id: number; trainer_id: number; status: StatusZahteva;
  created_at: string; resolved_at: string | null;
}
const map = (r: Row): ClientRequest => ({
  id: r.id, clientId: r.client_id, trainerId: r.trainer_id, status: r.status,
  createdAt: new Date(r.created_at), resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
});

export interface ZahtevSaKlijentom extends ClientRequest { clientName: string; clientEmail: string | null; }

export class ClientRequestsRepository {
  constructor(private readonly pool: Pool) {}

  async create(clientId: number, trainerId: number): Promise<void> {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO trainer_client_requests (client_id, trainer_id, status)
       VALUES (?, ?, 'pending')
       ON DUPLICATE KEY UPDATE status='pending', resolved_at=NULL, created_at=NOW()`,
      [clientId, trainerId],
    );
  }

  async getById(id: number): Promise<ClientRequest | null> {
    const [rows] = await this.pool.query<Row[]>("SELECT * FROM trainer_client_requests WHERE id=? LIMIT 1", [id]);
    return rows.length ? map(rows[0]) : null;
  }

  async getByClientAndTrainer(clientId: number, trainerId: number): Promise<ClientRequest | null> {
    const [rows] = await this.pool.query<Row[]>(
      "SELECT * FROM trainer_client_requests WHERE client_id=? AND trainer_id=? LIMIT 1",
      [clientId, trainerId],
    );
    return rows.length ? map(rows[0]) : null;
  }

  async getPendingForTrainer(trainerId: number): Promise<ZahtevSaKlijentom[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT r.*, CONCAT(COALESCE(ur.ime,''),' ',COALESCE(ur.prezime,'')) AS clientName, ur.korisnickoIme AS clientEmail
       FROM trainer_client_requests r
       LEFT JOIN users_read ur ON ur.id = r.client_id
       WHERE r.trainer_id=? AND r.status='pending'
       ORDER BY r.created_at ASC`,
      [trainerId],
    );
    return (rows as Array<Row & { clientName: string; clientEmail: string | null }>).map((r) => ({
      ...map(r), clientName: (r.clientName ?? "").trim(), clientEmail: r.clientEmail ?? null,
    }));
  }

  async approve(id: number): Promise<void> {
    await this.pool.query("UPDATE trainer_client_requests SET status='approved', resolved_at=NOW() WHERE id=?", [id]);
  }
  async reject(id: number): Promise<void> {
    await this.pool.query("UPDATE trainer_client_requests SET status='rejected', resolved_at=NOW() WHERE id=?", [id]);
  }

  async getStatusForClient(clientId: number, trainerId: number): Promise<StatusZahteva | null> {
    const [rows] = await this.pool.query<Row[]>(
      "SELECT status FROM trainer_client_requests WHERE client_id=? AND trainer_id=? LIMIT 1",
      [clientId, trainerId],
    );
    return rows.length ? (rows[0].status as StatusZahteva) : null;
  }

  // Trener kome je klijent odobren (lokalna zamena za users.assigned_trener_id)
  async getApprovedTrainerForClient(clientId: number): Promise<number | null> {
    const [rows] = await this.pool.query<Row[]>(
      "SELECT trainer_id FROM trainer_client_requests WHERE client_id=? AND status='approved' ORDER BY resolved_at DESC LIMIT 1",
      [clientId],
    );
    return rows.length ? Number(rows[0].trainer_id) : null;
  }
}
