import { Request, Response, NextFunction } from "express";
import { extractToken, verifyToken, JwtPayload } from "@fittrack/shared";
import { config } from "../config";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Provera JWT-a na IVICI sistema. Ako je token validan, korisnicki podaci se
 * prosledjuju servisu iza gateway-a kroz X-User-* zaglavlja (i original Authorization
 * ostaje, pa servis moze i sam da verifikuje — odbrana u dubinu).
 */
export function edgeAuth(roles?: string[]) {
  const allowed = roles?.map((r) => r.toLowerCase().trim());
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractToken(req.headers as Record<string, unknown>);
    if (!token) {
      res.status(401).json({ success: false, message: "Token is missing" });
      return;
    }
    try {
      const user = verifyToken(token, config.jwtSecret);
      if (allowed && !allowed.includes(String(user.uloga).toLowerCase().trim())) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      req.user = user;
      req.headers["x-user-id"] = String(user.id);
      req.headers["x-user-role"] = String(user.uloga);
      req.headers["x-user-email"] = String(user.korisnickoIme);
      next();
    } catch {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
}