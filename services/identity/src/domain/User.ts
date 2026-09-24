export type Uloga = "klijent" | "trener" | "admin";
export type Pol = "muski" | "zenski" | "ostalo";

export interface User {
  id: number;
  korisnickoIme: string;      // koristi se i kao adresa za OTP
  lozinka: string;            // bcrypt hes
  uloga: Uloga;
  ime: string;
  prezime: string;
  datumRodjenja: string | null;
  pol: Pol | null;
  blokiran: boolean;
  assignedTrenerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JavniProfil {
  id: number;
  korisnickoIme: string;
  uloga: Uloga;
  ime: string;
  prezime: string;
  datumRodjenja: string | null;
  pol: Pol | null;
  blokiran: boolean;
  assignedTrenerId: number | null;
}

export function uJavniProfil(u: User): JavniProfil {
  return {
    id: u.id,
    korisnickoIme: u.korisnickoIme,
    uloga: u.uloga,
    ime: u.ime,
    prezime: u.prezime,
    datumRodjenja: u.datumRodjenja,
    pol: u.pol,
    blokiran: u.blokiran,
    assignedTrenerId: u.assignedTrenerId,
  };
}
