import bcrypt from "bcryptjs";

const RUNDE = 10;

export function hashLozinke(plain: string): Promise<string> {
  return bcrypt.hash(plain, RUNDE);
}

export function proveriLozinku(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
