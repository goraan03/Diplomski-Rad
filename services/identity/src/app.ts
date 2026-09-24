import express from "express";
import cors from "cors";
import { authRouter } from "./http/controllers/AuthController";
import { adminRouter } from "./http/controllers/AdminUserController";
import { profileRouter } from "./http/controllers/ProfileController";
import { errorHandler } from "./http/middleware/errorHandler";
import { ok } from "./http/response";
import type { AuthService } from "./services/AuthService";
import type { UserAdminService } from "./services/UserAdminService";
import type { ProfileService } from "./services/ProfileService";

export interface AppDeps {
  auth: AuthService;
  admin: UserAdminService;
  profil: ProfileService;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json(ok({ status: "ok", servis: "identity" }));
  });

  app.use("/auth", authRouter(deps.auth));
  app.use("/admin", adminRouter(deps.admin));
  // Profil je zajednicki; gateway prosledjuje /client/* i /trainer/*
  app.use("/client", profileRouter(deps.profil));
  app.use("/trainer", profileRouter(deps.profil));

  app.use(errorHandler);
  return app;
}
