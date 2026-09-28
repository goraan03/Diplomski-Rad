import { Router } from "express";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validatori } from "../validators";
import { BadRequest } from "../../utils/errors";
import type { ProgramsService } from "../../services/ProgramsService";
import type { ClientRequestsService } from "../../services/ClientRequestsService";
import type { Nivo } from "../../domain/models";

function idParam(v: string | string[]): number {
  if (typeof v !== "string") throw BadRequest("Neispravan id u putanji");
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest("Neispravan id u putanji");
  return n;
}

export interface ClientDeps {
  programs: ProgramsService;
  requests: ClientRequestsService;
}

export function clientRouter(d: ClientDeps): Router {
  const r = Router();
  r.use(authenticate, authorize("klijent"));
  const cid = (req: { korisnik?: { id: number } }) => req.korisnik!.id;

  r.get("/programs", asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || undefined;
    const level = (req.query.level as Nivo) || undefined;
    res.json(ok(await d.programs.listForClient(cid(req), q, level)));
  }));
  r.get("/programs/:id", asyncHandler(async (req, res) => {
    res.json(ok(await d.programs.detailsForClient(cid(req), idParam(req.params.id))));
  }));

  r.post("/requests", asyncHandler(async (req, res) => {
    const { trainerId } = validatori.zahtev(req.body ?? {});
    await d.requests.posalji(cid(req), trainerId);
    res.status(201).json(ok(undefined, "Zahtev poslat"));
  }));
  r.get("/requests/status", asyncHandler(async (req, res) => {
    const trainerId = Number(req.query.trainerId);
    if (!Number.isInteger(trainerId) || trainerId <= 0) throw BadRequest("Neispravan trainerId");
    res.json(ok({ status: await d.requests.status(cid(req), trainerId) }));
  }));
  r.get("/trainer", asyncHandler(async (req, res) => {
    res.json(ok({ trainerId: await d.requests.mojTrener(cid(req)) }));
  }));

  return r;
}
