import type { Request, Response, NextFunction, RequestHandler } from "express";
export interface ApiResponse<T = unknown> { success: boolean; message?: string; data?: T; }
export const ok = <T>(data?: T, message?: string): ApiResponse<T> => ({
  success: true, ...(message ? { message } : {}), ...(data !== undefined ? { data } : {}),
});
export const fail = (message: string): ApiResponse => ({ success: false, message });
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
