import { Router } from "express";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validatori } from "../validators";
import { BadRequest } from "../../utils/errors";
import type { ClientBookingService } from "../../services/ClientBookingService";
import type { TrainingType } from "../../domain/models";

function idParam(v: string | string[]): number {
  if (typeof v !== "string") throw BadRequest("Neispravan id u putanji");
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest("Neispravan id u putanji");
  return n;
}

export interface ClientDeps { booking: ClientBookingService; }

export function clientRouter(d: ClientDeps): Router {
  const r = Router();
  r.use(authenticate, authorize("klijent"));
  const cid = (req: { korisnik?: { id: number } }) => req.korisnik!.id;

  r.get("/terms", asyncHandler(async (req, res) => {
    const q = req.query;
    res.json(ok(await d.booking.dostupniTermini(cid(req), {
      fromISO: (q.from as string) || undefined,
      toISO: (q.to as string) || undefined,
      type: (q.type as TrainingType) || undefined,
      programId: q.programId ? Number(q.programId) : undefined,
      status: (q.status as "free" | "full") || undefined,
      trainerId: q.trainerId ? Number(q.trainerId) : undefined,
    })));
  }));
  r.post("/terms/:id/book", asyncHandler(async (req, res) => {
    await d.booking.upisi(cid(req), idParam(req.params.id));
    res.status(201).json(ok(undefined, "Upisani ste na termin"));
  }));
  r.post("/terms/:id/cancel", asyncHandler(async (req, res) => {
    await d.booking.otkazi(cid(req), idParam(req.params.id));
    res.json(ok(undefined, "Upis otkazan"));
  }));
  r.post("/terms/:id/rate", asyncHandler(async (req, res) => {
    const { rating, feedback } = validatori.ocena(req.body ?? {});
    await d.booking.oceni(cid(req), idParam(req.params.id), rating, feedback);
    res.json(ok(undefined, "Ocena sacuvana"));
  }));
  r.get("/schedule", asyncHandler(async (req, res) => {
    res.json(ok(await d.booking.raspored(cid(req), (req.query.weekStart as string) || undefined)));
  }));
  r.get("/history", asyncHandler(async (req, res) => {
    res.json(ok(await d.booking.istorija(cid(req))));
  }));
  r.get("/upcoming", asyncHandler(async (req, res) => {
    res.json(ok(await d.booking.predstojeci(cid(req), Number(req.query.limit) || 10)));
  }));
  r.get("/stats", asyncHandler(async (req, res) => {
    res.json(ok(await d.booking.statistika(cid(req))));
  }));

  return r;
}
