import fs from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";

async function main(): Promise<void> {
  const sirovo = fs.readFileSync(path.resolve(__dirname, "../sql/001_schema.sql"), "utf-8");
  // Ukloni linije-komentare pre deljenja, da ne obore prvi iskaz
  const bezKomentara = sirovo
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const iskazi = bezKomentara
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const q of iskazi) {
    await pool.query(q);
  }
  // eslint-disable-next-line no-console
  console.log(`[coaching] primenjeno iskaza: ${iskazi.length}`);
  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[coaching] migracija neuspesna:", e);
  process.exit(1);
});
