import type { Request, Response, NextFunction } from "express";
import type { Uloga } from "../../domain/User";
import { Forbidden, Unauthorized } from "../../utils/errors";

export const authorize =
  (...dozvoljene: Uloga[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.korisnik) return next(Unauthorized("Niste prijavljeni"));
    if (dozvoljene.length && !dozvoljene.includes(req.korisnik.uloga as Uloga)) {
      return next(Forbidden("Nemate ovlascenje za ovu akciju"));
    }
    next();
  };
