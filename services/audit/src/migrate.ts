import fs from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";

async function main(): Promise<void> {
  const sirovo = fs.readFileSync(path.resolve(__dirname, "../sql/001_schema.sql"), "utf-8");
  const iskazi = sirovo
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const q of iskazi) await pool.query(q);
  console.log(`[audit] primenjeno iskaza: ${iskazi.length}`);
  await pool.end();
}

main().catch((e) => {
  console.error("[audit] migracija neuspesna:", e);
  process.exit(1);
});