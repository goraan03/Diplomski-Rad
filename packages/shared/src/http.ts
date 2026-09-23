import { Request, Response, NextFunction, RequestHandler } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
export function ok<T>(res: Response, data?: T, message = "OK", status = 200): void {
  res.status(status).json({ success: true, message, data } as ApiResponse<T>);
}
export function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message } as ApiResponse);
}
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
}