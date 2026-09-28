import express, { RequestHandler } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config, routeTable } from "./config";
import { edgeAuth } from "./middleware/authenticate";

const app = express();

// ── CORS ──
const allowedOrigins = config.corsOrigin.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Auth-Token"],
  })
);

// ── Rate limiting (osnovna zastita ivice) ──
app.use(
  rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false })
);

// ── Health ──
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", service: "gateway", timestamp: new Date().toISOString() });
});

// ── Rutiranje ──
// Proxy se montira na root, a interni servisi dobijaju putanju bez javnog /api prefiksa.
// Proxy se namerno montira PRE bilo kakvog parsiranja tela — telo prolazi netaknuto.
for (const rule of routeTable) {
  const handlers: RequestHandler[] = [];

  if (rule.protected) {
    const auth = edgeAuth(rule.roles);
    handlers.push((req, res, next) => {
      if (!req.path.startsWith(rule.prefix)) return next();
      return auth(req, res, next);
    });
  }

  handlers.push(
    createProxyMiddleware({
      target: rule.target(),
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (path) => path.replace(/^\/api(?=\/|$)/, ""),
      pathFilter: (path: string) => path.startsWith(rule.prefix),
    }) as unknown as RequestHandler
  );

  app.use(...handlers);
  console.log(`[gateway] ruta ${rule.prefix} -> ${rule.target()}${rule.protected ? " (JWT)" : ""}`);
}

// ── Strangler fallback: nemapirane /api rute -> stari monolit ──
if (config.legacyUrl) {
  app.use(
    createProxyMiddleware({
      target: config.legacyUrl,
      changeOrigin: true,
      xfwd: true,
      pathFilter: (path: string) => path.startsWith("/api"),
    }) as unknown as RequestHandler
  );
  console.log(`[gateway] strangler fallback /api -> ${config.legacyUrl}`);
} else {
  app.use("/api", (_req, res) => {
    res.status(501).json({ success: false, message: "Ruta jos nije migrirana (nema LEGACY_URL)" });
  });
}

export default app;