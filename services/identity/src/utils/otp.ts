import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function generisiKod(duzina = 6): string {
  const max = 10 ** duzina;
  const broj = crypto.randomInt(0, max);
  return broj.toString().padStart(duzina, "0");
}

export function hashKoda(kod: string): Promise<string> {
  return bcrypt.hash(kod, 8);
}

export function proveriKod(kod: string, hash: string): Promise<boolean> {
  return bcrypt.compare(kod, hash);
}
