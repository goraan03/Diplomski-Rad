import type { Request, Response, NextFunction } from "express";
import { verifyToken, extractToken, type JwtPayload } from "@fittrack/shared";
import { Unauthorized } from "../../utils/errors";

declare global {
  namespace Express {
    interface Request {
      korisnik?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(Unauthorized("Nedostaje token za pristup"));
  try {
    req.korisnik = verifyToken(token);
    if (req.korisnik.blokiran) return next(Unauthorized("Nalog je blokiran"));
    next();
  } catch {
    next(Unauthorized("Nevazeci ili istekao token"));
  }
}
