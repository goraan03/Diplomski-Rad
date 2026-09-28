import express from "express";
import cors from "cors";
import { auditRouter } from "./http/AuditController";
import type { AuditRepository } from "./repositories/AuditRepository";

export function createApp(repo: AuditRepository): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok", servis: "audit" } }));
  app.use("/", auditRouter(repo));
  return app;
}