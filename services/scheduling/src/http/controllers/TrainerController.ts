import { Router } from "express";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validatori } from "../validators";
import { BadRequest } from "../../utils/errors";
import type { TrainerTermsService } from "../../services/TrainerTermsService";

function idParam(v: string | string[]): number {
  if (typeof v !== "string") throw BadRequest("Neispravan id u putanji");
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest("Neispravan id u putanji");
  return n;
}

export interface TrainerDeps { terms: TrainerTermsService; }

export function trainerRouter(d: TrainerDeps): Router {
  const r = Router();
  r.use(authenticate, authorize("trener"));
  const tid = (req: { korisnik?: { id: number } }) => req.korisnik!.id;

  r.get("/terms", asyncHandler(async (req, res) => {
    const from = (req.query.from as string) || undefined;
    const to = (req.query.to as string) || undefined;
    res.json(ok(await d.terms.listaMojih(tid(req), from, to)));
  }));
  r.post("/terms", asyncHandler(async (req, res) => {
    const t = await d.terms.kreiraj(tid(req), validatori.kreirajTermin(req.body ?? {}));
    res.status(201).json(ok(t, "Termin kreiran"));
  }));
  r.post("/terms/:id/cancel", asyncHandler(async (req, res) => {
    await d.terms.otkazi(tid(req), idParam(req.params.id));
    res.json(ok(undefined, "Termin otkazan"));
  }));
  r.get("/terms/:id/enrollments", asyncHandler(async (req, res) => {
    res.json(ok(await d.terms.upisani(tid(req), idParam(req.params.id))));
  }));
  r.post("/terms/:id/complete", asyncHandler(async (req, res) => {
    const userId = Number((req.body ?? {}).userId);
    if (!Number.isInteger(userId) || userId <= 0) throw BadRequest("Neispravan userId");
    await d.terms.oznaciOdrzano(tid(req), idParam(req.params.id), userId);
    res.json(ok(undefined, "Trening oznacen kao odrzan"));
  }));

  return r;
}
