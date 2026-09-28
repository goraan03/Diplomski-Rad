import express from "express";
import cors from "cors";
import { ok } from "./http/response";
import { errorHandler } from "./http/middleware/errorHandler";
import { trainerRouter, type TrainerDeps } from "./http/controllers/TrainerController";
import { clientRouter, type ClientDeps } from "./http/controllers/ClientController";

export interface AppDeps {
  trainer: TrainerDeps;
  client: ClientDeps;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json(ok({ status: "ok", servis: "coaching" }));
  });

  app.use("/trainer", trainerRouter(deps.trainer));
  app.use("/client", clientRouter(deps.client));

  app.use(errorHandler);
  return app;
}
