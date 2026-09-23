import path from "path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

import { envNum, envOr, requireEnv } from "@fittrack/shared";

export const config = {
  port: envNum("PORT", 4000),
  jwtSecret: requireEnv("JWT_SECRET"),
  corsOrigin: envOr("CORS_ORIGIN", "http://localhost:5173"),
  identityUrl: envOr("IDENTITY_URL", "http://localhost:4001"),
  legacyUrl: envOr("LEGACY_URL", ""),
};


export interface RouteRule {
  prefix: string;
  target: () => string;
  protected: boolean;
  roles?: string[];
}

export const routeTable: RouteRule[] = [
  // ── Identity servis (Korak 2) ──
  { prefix: "/api/auth", target: () => config.identityUrl, protected: false },
  { prefix: "/api/client/me/profile", target: () => config.identityUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/trainer/me/profile", target: () => config.identityUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/admin/users", target: () => config.identityUrl, protected: true, roles: ["admin"] },
  { prefix: "/api/admin/trainers", target: () => config.identityUrl, protected: true, roles: ["admin"] },

  // ── Coaching / Scheduling / Billing (dodaju se u narednim koracima) ──
  // { prefix: "/api/trainer", target: () => config.coachingUrl, protected: true, roles: ["trener"] },
  // { prefix: "/api/client",  target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
];