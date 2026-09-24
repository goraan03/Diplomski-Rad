import { BadRequest } from "../utils/errors";
import type { Pol } from "../domain/User";

type Telo = Record<string, unknown>;

function str(telo: Telo, polje: string, obavezno = true, min = 1, max = 255): string | undefined {
  const v = telo[polje];
  if (v === undefined || v === null || v === "") {
    if (obavezno) throw BadRequest(`Polje '${polje}' je obavezno`);
    return undefined;
  }
  if (typeof v !== "string") throw BadRequest(`Polje '${polje}' mora biti tekst`);
  const t = v.trim();
  if (t.length < min) throw BadRequest(`Polje '${polje}' mora imati najmanje ${min} znakova`);
  if (t.length > max) throw BadRequest(`Polje '${polje}' je predugacko`);
  return t;
}

function pol(telo: Telo): Pol | null | undefined {
  const v = telo["pol"];
  if (v === undefined || v === null || v === "") return undefined;
  if (v !== "muski" && v !== "zenski" && v !== "ostalo") throw BadRequest("Neispravna vrednost polja 'pol'");
  return v;
}

function ceoBroj(telo: Telo, polje: string): number {
  const v = telo[polje];
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest(`Polje '${polje}' mora biti pozitivan ceo broj`);
  return n;
}

export const validatori = {
  registracija(telo: Telo) {
    return {
      korisnickoIme: str(telo, "korisnickoIme", true, 3, 190)!,
      lozinka: str(telo, "lozinka", true, 6, 128)!,
      ime: str(telo, "ime", true, 1, 100)!,
      prezime: str(telo, "prezime", true, 1, 100)!,
      datumRodjenja: str(telo, "datumRodjenja", false) ?? null,
      pol: pol(telo) ?? null,
    };
  },
  prijava(telo: Telo) {
    return {
      korisnickoIme: str(telo, "korisnickoIme", true, 3, 190)!,
      lozinka: str(telo, "lozinka", true, 1, 128)!,
    };
  },
  potvrdaOtp(telo: Telo) {
    return {
      challengeId: ceoBroj(telo, "challengeId"),
      kod: str(telo, "kod", true, 4, 12)!,
    };
  },
  zahtevReset(telo: Telo) {
    return { korisnickoIme: str(telo, "korisnickoIme", true, 3, 190)! };
  },
  potvrdaReset(telo: Telo) {
    return {
      challengeId: ceoBroj(telo, "challengeId"),
      kod: str(telo, "kod", true, 4, 12)!,
      novaLozinka: str(telo, "novaLozinka", true, 6, 128)!,
    };
  },
  promenaLozinke(telo: Telo) {
    return {
      staraLozinka: str(telo, "staraLozinka", true, 1, 128)!,
      novaLozinka: str(telo, "novaLozinka", true, 6, 128)!,
    };
  },
  noviTrener(telo: Telo) {
    return {
      korisnickoIme: str(telo, "korisnickoIme", true, 3, 190)!,
      lozinka: str(telo, "lozinka", true, 6, 128)!,
      ime: str(telo, "ime", true, 1, 100)!,
      prezime: str(telo, "prezime", true, 1, 100)!,
    };
  },
  izmenaProfila(telo: Telo) {
    return {
      ime: str(telo, "ime", false, 1, 100),
      prezime: str(telo, "prezime", false, 1, 100),
      datumRodjenja: telo["datumRodjenja"] === undefined ? undefined : (str(telo, "datumRodjenja", false) ?? null),
      pol: pol(telo),
    };
  },
  dodelaTrenera(telo: Telo) {
    const raw = telo["trenerId"];
    const trenerId = raw === null ? null : ceoBroj(telo, "trenerId");
    return { trenerId };
  },
};
