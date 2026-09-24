import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { Pol, Uloga, User } from "../domain/User";

interface UserRow extends RowDataPacket {
  id: number;
  korisnickoIme: string;
  lozinka: string;
  uloga: Uloga;
  ime: string;
  prezime: string;
  datumRodjenja: string | null;
  pol: Pol | null;
  blokiran: number;
  assigned_trener_id: number | null;
  created_at: Date;
  updated_at: Date;
}

function mapiraj(r: UserRow): User {
  return {
    id: r.id,
    korisnickoIme: r.korisnickoIme,
    lozinka: r.lozinka,
    uloga: r.uloga,
    ime: r.ime,
    prezime: r.prezime,
    datumRodjenja: r.datumRodjenja,
    pol: r.pol,
    blokiran: r.blokiran === 1,
    assignedTrenerId: r.assigned_trener_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface NoviKorisnik {
  korisnickoIme: string;
  lozinka: string;
  uloga: Uloga;
  ime: string;
  prezime: string;
  datumRodjenja?: string | null;
  pol?: Pol | null;
  assignedTrenerId?: number | null;
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async nadjiPoId(id: number): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows.length ? mapiraj(rows[0]) : null;
  }

  async nadjiPoKorisnickomImenu(korisnickoIme: string): Promise<User | null> {
    const [rows] = await this.pool.query<UserRow[]>(
      "SELECT * FROM users WHERE korisnickoIme = ? LIMIT 1",
      [korisnickoIme],
    );
    return rows.length ? mapiraj(rows[0]) : null;
  }

  async postoji(korisnickoIme: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT 1 FROM users WHERE korisnickoIme = ? LIMIT 1",
      [korisnickoIme],
    );
    return rows.length > 0;
  }

  async kreiraj(k: NoviKorisnik): Promise<User> {
    const [res] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO users (korisnickoIme, lozinka, uloga, ime, prezime, datumRodjenja, pol, assigned_trener_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        k.korisnickoIme,
        k.lozinka,
        k.uloga,
        k.ime,
        k.prezime,
        k.datumRodjenja ?? null,
        k.pol ?? null,
        k.assignedTrenerId ?? null,
      ],
    );
    const kreiran = await this.nadjiPoId(res.insertId);
    if (!kreiran) throw new Error("Neuspesno kreiranje korisnika");
    return kreiran;
  }

  async azurirajProfil(
    id: number,
    p: { ime?: string; prezime?: string; datumRodjenja?: string | null; pol?: Pol | null },
  ): Promise<void> {
    const polja: string[] = [];
    const vrednosti: unknown[] = [];
    if (p.ime !== undefined) { polja.push("ime = ?"); vrednosti.push(p.ime); }
    if (p.prezime !== undefined) { polja.push("prezime = ?"); vrednosti.push(p.prezime); }
    if (p.datumRodjenja !== undefined) { polja.push("datumRodjenja = ?"); vrednosti.push(p.datumRodjenja); }
    if (p.pol !== undefined) { polja.push("pol = ?"); vrednosti.push(p.pol); }
    if (!polja.length) return;
    vrednosti.push(id);
    await this.pool.query(`UPDATE users SET ${polja.join(", ")} WHERE id = ?`, vrednosti);
  }

  async azurirajLozinku(id: number, hash: string): Promise<void> {
    await this.pool.query("UPDATE users SET lozinka = ? WHERE id = ?", [hash, id]);
  }

  async postaviBlokiran(id: number, blokiran: boolean): Promise<void> {
    await this.pool.query("UPDATE users SET blokiran = ? WHERE id = ?", [blokiran ? 1 : 0, id]);
  }

  async postaviTrenera(klijentId: number, trenerId: number | null): Promise<void> {
    await this.pool.query("UPDATE users SET assigned_trener_id = ? WHERE id = ?", [trenerId, klijentId]);
  }

  async lista(filter: { uloga?: Uloga; q?: string } = {}): Promise<User[]> {
    const uslovi: string[] = [];
    const vrednosti: unknown[] = [];
    if (filter.uloga) { uslovi.push("uloga = ?"); vrednosti.push(filter.uloga); }
    if (filter.q) {
      uslovi.push("(korisnickoIme LIKE ? OR ime LIKE ? OR prezime LIKE ?)");
      const like = `%${filter.q}%`;
      vrednosti.push(like, like, like);
    }
    const where = uslovi.length ? `WHERE ${uslovi.join(" AND ")}` : "";
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT * FROM users ${where} ORDER BY created_at DESC`,
      vrednosti,
    );
    return rows.map(mapiraj);
  }
}
