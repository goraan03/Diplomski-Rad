import { Router } from "express";
import type { UserAdminService } from "../../services/UserAdminService";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validatori } from "../validators";
import { BadRequest } from "../../utils/errors";
import type { Uloga } from "../../domain/User";

export function adminRouter(admin: UserAdminService): Router {
  const r = Router();
  r.use(authenticate, authorize("admin"));

  r.get("/users", asyncHandler(async (req, res) => {
    const uloga = req.query.uloga as Uloga | undefined;
    const q = req.query.q as string | undefined;
    const lista = await admin.lista({ uloga, q });
    res.json(ok(lista));
  }));

  r.post("/trainers", asyncHandler(async (req, res) => {
    const d = validatori.noviTrener(req.body ?? {});
    const trener = await admin.kreirajTrenera(d, req.korisnik!.id);
    res.status(201).json(ok(trener, "Trener je kreiran"));
  }));

  r.patch("/users/:id/block", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw BadRequest("Neispravan id");
    await admin.postaviBlokiran(id, true, req.korisnik!.id);
    res.json(ok(undefined, "Korisnik je blokiran"));
  }));

  r.patch("/users/:id/unblock", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw BadRequest("Neispravan id");
    await admin.postaviBlokiran(id, false, req.korisnik!.id);
    res.json(ok(undefined, "Korisnik je odblokiran"));
  }));

  r.patch("/clients/:id/trainer", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw BadRequest("Neispravan id");
    const { trenerId } = validatori.dodelaTrenera(req.body ?? {});
    await admin.dodeliTrenera(id, trenerId, req.korisnik!.id);
    res.json(ok(undefined, "Trener je dodeljen"));
  }));

  return r;
}
