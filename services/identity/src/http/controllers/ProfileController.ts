import { Router } from "express";
import type { ProfileService } from "../../services/ProfileService";
import { asyncHandler, ok } from "../response";
import { authenticate } from "../middleware/authenticate";
import { validatori } from "../validators";

export function profileRouter(profil: ProfileService): Router {
  const r = Router();
  r.use(authenticate);

  r.get("/me/profile", asyncHandler(async (req, res) => {
    const p = await profil.mojProfil(req.korisnik!.id);
    res.json(ok(p));
  }));

  r.put("/me/profile", asyncHandler(async (req, res) => {
    const izmena = validatori.izmenaProfila(req.body ?? {});
    const p = await profil.izmeniProfil(req.korisnik!.id, izmena);
    res.json(ok(p, "Profil je azuriran"));
  }));

  return r;
}
