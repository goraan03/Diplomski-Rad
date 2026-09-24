import { Router } from "express";
import type { AuthService } from "../../services/AuthService";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { validatori } from "../validators";

export function authRouter(auth: AuthService): Router {
  const r = Router();

  r.post("/register", asyncHandler(async (req, res) => {
    const d = validatori.registracija(req.body ?? {});
    const korisnik = await auth.registrujKlijenta(d);
    res.status(201).json(ok(korisnik, "Registracija uspesna"));
  }));

  // 2FA korak 1
  r.post("/login", asyncHandler(async (req, res) => {
    const { korisnickoIme, lozinka } = validatori.prijava(req.body ?? {});
    const rez = await auth.prijava(korisnickoIme, lozinka);
    res.json(ok(rez, "Kod za potvrdu je poslat"));
  }));

  // 2FA korak 2
  r.post("/login/verify", asyncHandler(async (req, res) => {
    const { challengeId, kod } = validatori.potvrdaOtp(req.body ?? {});
    const rez = await auth.potvrdiPrijavu(challengeId, kod);
    res.json(ok(rez, "Prijava uspesna"));
  }));

  r.post("/password/forgot", asyncHandler(async (req, res) => {
    const { korisnickoIme } = validatori.zahtevReset(req.body ?? {});
    const rez = await auth.zatraziResetLozinke(korisnickoIme);
    res.json(ok(rez, "Ako nalog postoji, kod je poslat"));
  }));

  r.post("/password/reset", asyncHandler(async (req, res) => {
    const { challengeId, kod, novaLozinka } = validatori.potvrdaReset(req.body ?? {});
    await auth.potvrdiReset(challengeId, kod, novaLozinka);
    res.json(ok(undefined, "Lozinka je promenjena"));
  }));

  r.post("/password/change", authenticate, asyncHandler(async (req, res) => {
    const { staraLozinka, novaLozinka } = validatori.promenaLozinke(req.body ?? {});
    await auth.promeniLozinku(req.korisnik!.id, staraLozinka, novaLozinka);
    res.json(ok(undefined, "Lozinka je promenjena"));
  }));

  r.get("/me", authenticate, asyncHandler(async (req, res) => {
    res.json(ok(req.korisnik));
  }));

  return r;
}
