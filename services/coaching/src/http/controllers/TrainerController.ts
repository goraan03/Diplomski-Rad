import { Router } from "express";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validatori } from "../validators";
import { BadRequest } from "../../utils/errors";
import type { ExercisesService } from "../../services/ExercisesService";
import type { ProgramsService } from "../../services/ProgramsService";
import type { ClientRequestsService } from "../../services/ClientRequestsService";
import type { WorkoutService } from "../../services/WorkoutService";

function idParam(v: string | string[]): number {
  if (typeof v !== "string") throw BadRequest("Neispravan id u putanji");
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest("Neispravan id u putanji");
  return n;
}

export interface TrainerDeps {
  exercises: ExercisesService;
  programs: ProgramsService;
  requests: ClientRequestsService;
  workouts: WorkoutService;
}

export function trainerRouter(d: TrainerDeps): Router {
  const r = Router();
  r.use(authenticate, authorize("trener"));
  const tid = (req: { korisnik?: { id: number } }) => req.korisnik!.id;

  // Vezbe
  r.get("/exercises", asyncHandler(async (req, res) => {
    res.json(ok(await d.exercises.list(tid(req))));
  }));
  r.post("/exercises", asyncHandler(async (req, res) => {
    const v = await d.exercises.create(tid(req), validatori.vezba(req.body ?? {}));
    res.status(201).json(ok(v, "Vezba kreirana"));
  }));
  r.put("/exercises/:id", asyncHandler(async (req, res) => {
    const v = await d.exercises.update(tid(req), idParam(req.params.id), validatori.vezbaIzmena(req.body ?? {}));
    res.json(ok(v, "Vezba izmenjena"));
  }));
  r.delete("/exercises/:id", asyncHandler(async (req, res) => {
    await d.exercises.delete(tid(req), idParam(req.params.id));
    res.json(ok(undefined, "Vezba obrisana"));
  }));

  // Programi
  r.get("/programs", asyncHandler(async (req, res) => {
    res.json(ok(await d.programs.listByTrainer(tid(req))));
  }));
  r.post("/programs", asyncHandler(async (req, res) => {
    const p = await d.programs.create(tid(req), validatori.program(req.body ?? {}));
    res.status(201).json(ok(p, "Program kreiran"));
  }));
  r.put("/programs/:id", asyncHandler(async (req, res) => {
    const p = await d.programs.update(tid(req), idParam(req.params.id), validatori.programIzmena(req.body ?? {}));
    res.json(ok(p, "Program izmenjen"));
  }));
  r.get("/programs/:id", asyncHandler(async (req, res) => {
    res.json(ok(await d.programs.getDetails(tid(req), idParam(req.params.id))));
  }));
  r.put("/programs/:id/exercises", asyncHandler(async (req, res) => {
    const stavke = validatori.programVezbe(req.body ?? {});
    await d.programs.replaceExercises(tid(req), idParam(req.params.id), stavke);
    res.json(ok(undefined, "Vezbe programa azurirane"));
  }));
  r.post("/programs/:id/assign", asyncHandler(async (req, res) => {
    const { clientId } = validatori.dodela(req.body ?? {});
    await d.programs.assignToClient(tid(req), idParam(req.params.id), clientId);
    res.json(ok(undefined, "Program dodeljen klijentu"));
  }));
  r.get("/programs/:id/clients", asyncHandler(async (req, res) => {
    res.json(ok(await d.programs.listAssignedClients(tid(req), idParam(req.params.id))));
  }));

  // Zahtevi klijenata
  r.get("/requests", asyncHandler(async (req, res) => {
    res.json(ok(await d.requests.getPending(tid(req))));
  }));
  r.post("/requests/:id/approve", asyncHandler(async (req, res) => {
    await d.requests.odobri(tid(req), idParam(req.params.id));
    res.json(ok(undefined, "Zahtev odobren"));
  }));
  r.post("/requests/:id/reject", asyncHandler(async (req, res) => {
    await d.requests.odbij(tid(req), idParam(req.params.id));
    res.json(ok(undefined, "Zahtev odbijen"));
  }));

  // Treninzi
  r.post("/workouts", asyncHandler(async (req, res) => {
    const p = validatori.trening(req.body ?? {});
    const sessionId = await d.workouts.zabelezi(tid(req), p);
    res.status(201).json(ok({ sessionId }, "Trening zabelezen"));
  }));

  return r;
}
