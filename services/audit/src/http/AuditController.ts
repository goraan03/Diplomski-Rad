import { Router, type Request, type Response, type NextFunction } from "express";
import { verifyToken, extractToken } from "@fittrack/shared";
import { config } from "../config";
import type { AuditRepository } from "../repositories/AuditRepository";

function samoAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req.headers as Record<string, unknown>);
  if (!token) { res.status(401).json({ success: false, message: "Nedostaje token" }); return; }
  try {
    const k = verifyToken(token, config.jwt.secret);
    if (k.uloga !== "admin") { res.status(403).json({ success: false, message: "Samo administrator" }); return; }
    next();
  } catch {
    res.status(401).json({ success: false, message: "Nevazeci token" });
  }
}

export function auditRouter(repo: AuditRepository): Router {
  const r = Router();
  r.get("/audit", samoAdmin, async (req, res, next) => {
    try {
      const rows = await repo.lista({
        servis: (req.query.servis as string) || undefined,
        akcija: (req.query.akcija as string) || undefined,
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  });
  return r;
}