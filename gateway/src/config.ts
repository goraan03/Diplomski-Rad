import path from "path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

import { envNum, envOr, requireEnv } from "@fittrack/shared";

export const config = {
  port: envNum("PORT", 4000),
  jwtSecret: requireEnv("JWT_SECRET"),
  corsOrigin: envOr("CORS_ORIGIN", "http://localhost:5173"),
  identityUrl: envOr("IDENTITY_URL", "http://localhost:4001"),
  coachingUrl: envOr("COACHING_URL", "http://localhost:4002"),
  schedulingUrl: envOr("SCHEDULING_URL", "http://localhost:4003"),
  auditUrl: envOr("AUDIT_URL", "http://localhost:4004"),
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
  { prefix: "/api/admin/clients", target: () => config.identityUrl, protected: true, roles: ["admin"] },
  { prefix: "/api/audit", target: () => config.auditUrl, protected: true, roles: ["admin"] },

  // ── Coaching ──
  { prefix: "/api/trainer/exercises", target: () => config.coachingUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/trainer/programs", target: () => config.coachingUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/trainer/requests", target: () => config.coachingUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/trainer/workouts", target: () => config.coachingUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/client/programs", target: () => config.coachingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/requests", target: () => config.coachingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/trainer", target: () => config.coachingUrl, protected: true, roles: ["klijent"] },

  // ── Scheduling ──
  { prefix: "/api/trainer/terms", target: () => config.schedulingUrl, protected: true, roles: ["trener"] },
  { prefix: "/api/client/terms", target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/schedule", target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/history", target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/upcoming", target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
  { prefix: "/api/client/stats", target: () => config.schedulingUrl, protected: true, roles: ["klijent"] },
];