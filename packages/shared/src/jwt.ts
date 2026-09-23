import jwt, { SignOptions } from "jsonwebtoken";

export interface JwtPayload {
  id: number;
  korisnickoIme: string;
  uloga: string;
  blokiran?: boolean;
}

const DEFAULT_EXPIRES = "6h";

export function signToken(payload: JwtPayload, secret: string, expiresIn: SignOptions["expiresIn"] = DEFAULT_EXPIRES): string {
  return jwt.sign(payload, secret, { expiresIn });
}
export function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
export function extractToken(headers: Record<string, unknown>): string | null {
  const rawAuth = (headers["authorization"] as string | undefined) || (headers["Authorization"] as string | undefined);
  if (rawAuth && typeof rawAuth === "string") {
    const t = rawAuth.trim();
    if (t.toLowerCase().startsWith("bearer ")) return t.slice(7).trim();
    if (t) return t;
  }
  const x = headers["x-auth-token"];
  if (typeof x === "string" && x.trim()) return x.trim();
  if (Array.isArray(x) && x.length > 0) return String(x[0]).trim();
  return null;
}