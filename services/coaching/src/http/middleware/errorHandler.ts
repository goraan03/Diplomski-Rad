import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/errors";
import { fail } from "../response";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json(fail(err.message));
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[coaching] neocekivana greska:", err);
  res.status(500).json(fail("Interna greska servera"));
}
