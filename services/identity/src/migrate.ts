import fs from "node:fs";
import path from "node:path";
import { pool } from "./db/pool";
import { config } from "./config";
import { hashLozinke } from "./utils/password";
import { UserRepository } from "./repositories/UserRepository";

async function main(): Promise<void> {
  const putanja = path.resolve(__dirname, "../sql/001_schema.sql");
  const sql = fs.readFileSync(putanja, "utf-8");
  const iskazi = sql
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const q of iskazi) {
    await pool.query(q);
  }
  // eslint-disable-next-line no-console
  console.log(`[identity] primenjeno iskaza: ${iskazi.length}`);

  const users = new UserRepository(pool);
  if (!(await users.postoji(config.admin.korisnickoIme))) {
    const hash = await hashLozinke(config.admin.lozinka);
    await users.kreiraj({
      korisnickoIme: config.admin.korisnickoIme,
      lozinka: hash,
      uloga: "admin",
      ime: "Administrator",
      prezime: "",
    });
    // eslint-disable-next-line no-console
    console.log(`[identity] admin nalog kreiran: ${config.admin.korisnickoIme}`);
  } else {
    // eslint-disable-next-line no-console
    console.log("[identity] admin nalog vec postoji");
  }

  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[identity] migracija neuspesna:", e);
  process.exit(1);
});
