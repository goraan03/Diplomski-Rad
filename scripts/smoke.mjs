// FitTrack end-to-end smoke test (Node 18+).
// Run with: node scripts/smoke.mjs
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import readline from "node:readline/promises";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);

function loadEnvFile() {
  try {
    const contents = readFileSync(new URL(".env", root), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch {
    // Environment variables can be provided directly instead of through .env.
  }
}

loadEnvFile();

const API = process.env.API_URL ?? `http://localhost:${process.env.GATEWAY_PORT ?? 4000}`;
const ID = process.env.ID_URL ?? "http://localhost:4001";
const CO = process.env.CO_URL ?? "http://localhost:4002";
const SC = process.env.SC_URL ?? "http://localhost:4003";
const AU = process.env.AU_URL ?? "http://localhost:4004";
const NO = process.env.NO_URL ?? "http://localhost:4005";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@fittrack.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const color = { green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" };
let passed = 0;
let failed = 0;

async function call(method, base, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: {}, error: error.message };
  }
}

function check(name, condition, details = "") {
  if (condition) {
    passed++;
    console.log(`${color.green}✓${color.reset} ${name}`);
  } else {
    failed++;
    console.log(`${color.red}✗ ${name}${color.reset} ${color.dim}${details}${color.reset}`);
  }
}

function findOtp(logs, email) {
  let matchingEmail = false;
  for (const line of logs.split(/\r?\n/)) {
    if (line.includes(`-> ${email} |`)) matchingEmail = true;
    const code = line.match(/Vas kod za .* je:\s*(\d+)/);
    if (matchingEmail && code) return code[1];
    if (matchingEmail && line.includes("-> ") && !line.includes(`-> ${email} |`)) matchingEmail = false;
  }
  return null;
}

async function getOtp(email, since) {
  if (process.env.SMOKE_MANUAL_OTP === "1") return askForOtp(email);

  const sinceArg = new Date(since.getTime() - 2000).toISOString();
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const { stdout } = await execFileAsync("docker", [
        "compose", "logs", "--no-color", "--no-log-prefix", "--since", sinceArg, "notification",
      ], { cwd: new URL("../", import.meta.url), timeout: 3000, maxBuffer: 1024 * 1024 });
      const otp = findOtp(stdout, email);
      if (otp) return otp;
    } catch {
      return askForOtp(email);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return askForOtp(email);
}

async function askForOtp(email) {
  return (await rl.question(`${color.yellow}Unesi OTP za ${email} (Notification log): ${color.reset}`)).trim();
}

async function login(email, password, label) {
  const requestedAt = new Date();
  const first = await call("POST", API, "/api/auth/login", {
    body: { korisnickoIme: email, lozinka: password },
  });
  const challengeId = first.data?.data?.challengeId;
  check(`login step 1 — ${label}`, first.status === 200 && challengeId,
    `status=${first.status} ${first.error ?? JSON.stringify(first.data)}`);
  if (!challengeId) return null;

  let code = first.data?.data?.devKod ?? first.data?.data?.kod;
  if (!code) code = await getOtp(email, requestedAt);
  const second = await call("POST", API, "/api/auth/login/verify", {
    body: { challengeId, kod: code },
  });
  const token = second.data?.data?.token;
  check(`login step 2 — ${label}`, second.status === 200 && token,
    `status=${second.status} ${second.error ?? JSON.stringify(second.data)}`);
  return token ?? null;
}

async function main() {
  const timestamp = Date.now();
  console.log(`\n${color.dim}=== FitTrack end-to-end smoke test via ${API} ===${color.reset}\n`);

  for (const [name, base] of [["identity", ID], ["coaching", CO], ["scheduling", SC], ["audit", AU], ["notification", NO]]) {
    const response = await call("GET", base, "/health");
    check(`health: ${name}`, response.status === 200,
      `status=${response.status} ${response.error ?? ""}`);
  }
  const gatewayHealth = await call("GET", API, "/health");
  check("health: gateway", gatewayHealth.status === 200, `status=${gatewayHealth.status} ${gatewayHealth.error ?? ""}`);

  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
  if (!adminToken) return;

  const clientEmail = `smoke_client_${timestamp}@test.local`;
  const registration = await call("POST", API, "/api/auth/register", {
    body: { korisnickoIme: clientEmail, lozinka: "Lozinka123", ime: "Smoke", prezime: "Klijent" },
  });
  const clientId = registration.data?.data?.id;
  check("registracija klijenta", registration.status === 201 && clientId,
    `status=${registration.status} ${registration.error ?? JSON.stringify(registration.data)}`);

  const trainerEmail = `smoke_trainer_${timestamp}@test.local`;
  const trainerRegistration = await call("POST", API, "/api/admin/trainers", {
    token: adminToken,
    body: { korisnickoIme: trainerEmail, lozinka: "Lozinka123", ime: "Smoke", prezime: "Trener" },
  });
  const trainerId = trainerRegistration.data?.data?.id;
  check("admin kreira trenera", trainerRegistration.status === 201 && trainerId,
    `status=${trainerRegistration.status} ${trainerRegistration.error ?? JSON.stringify(trainerRegistration.data)}`);

  const users = await call("GET", API, "/api/admin/users", { token: adminToken });
  check("admin lista korisnika", users.status === 200 && Array.isArray(users.data?.data), `status=${users.status}`);

  if (!trainerId || !clientId) return;
  const trainerToken = await login(trainerEmail, "Lozinka123", "trener");
  const clientToken = await login(clientEmail, "Lozinka123", "klijent");
  if (!trainerToken || !clientToken) return;

  const profile = await call("GET", API, "/api/client/me/profile", { token: clientToken });
  check("klijent — moj profil preko gateway-a", profile.status === 200, `status=${profile.status}`);

  const request = await call("POST", API, "/api/client/requests", {
    token: clientToken, body: { trainerId },
  });
  check("klijent šalje zahtev treneru", request.status === 201,
    `status=${request.status} ${request.error ?? JSON.stringify(request.data)}`);

  const pending = await call("GET", API, "/api/trainer/requests", { token: trainerToken });
  const pendingItems = Array.isArray(pending.data?.data) ? pending.data.data : [];
  const pendingRequest = pendingItems.find((item) => Number(item.clientId) === clientId && Number(item.trainerId) === trainerId);
  check("trener vidi svoj zahtev na čekanju", pending.status === 200 && pendingRequest,
    `status=${pending.status} ${JSON.stringify(pending.data)}`);
  if (pendingRequest) {
    const approval = await call("POST", API, `/api/trainer/requests/${pendingRequest.id}/approve`, { token: trainerToken });
    check("trener odobrava zahtev", approval.status === 200, `status=${approval.status}`);
  }

  const exercise = await call("POST", API, "/api/trainer/exercises", {
    token: trainerToken,
    body: { name: "Smoke čučanj", muscleGroup: "noge", level: "beginner" },
  });
  const exerciseId = exercise.data?.data?.id;
  check("trener kreira vežbu", exercise.status === 201 && exerciseId, `status=${exercise.status}`);

  const program = await call("POST", API, "/api/trainer/programs", {
    token: trainerToken,
    body: { title: `Smoke program ${timestamp}`, level: "beginner", isPublic: false },
  });
  const programId = program.data?.data?.id;
  check("trener kreira program", program.status === 201 && programId, `status=${program.status}`);

  if (programId && exerciseId) {
    const items = await call("PUT", API, `/api/trainer/programs/${programId}/exercises`, {
      token: trainerToken,
      body: { items: [{ exerciseId, position: 0, sets: 3, reps: "10", restSec: 60 }] },
    });
    check("trener dodaje vežbu u program", items.status === 200, `status=${items.status}`);

    const assignment = await call("POST", API, `/api/trainer/programs/${programId}/assign`, {
      token: trainerToken, body: { clientId },
    });
    check("trener dodeljuje program klijentu", assignment.status === 200, `status=${assignment.status}`);
  }

  const clientPrograms = await call("GET", API, "/api/client/programs", { token: clientToken });
  check("klijent vidi programe preko gateway-a", clientPrograms.status === 200 && Array.isArray(clientPrograms.data?.data),
    `status=${clientPrograms.status}`);

  const startAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const term = await call("POST", API, "/api/trainer/terms", {
    token: trainerToken,
    body: { type: "individual", startAt, durationMin: 60, capacity: 1, programId: programId ?? null },
  });
  const termId = term.data?.data?.id;
  check("trener kreira termin", term.status === 201 && termId, `status=${term.status} ${JSON.stringify(term.data)}`);

  const available = await call("GET", API, `/api/client/terms?trainerId=${trainerId}`, { token: clientToken });
  check("klijent vidi dostupne termine", available.status === 200 && Array.isArray(available.data?.data),
    `status=${available.status}`);

  if (termId) {
    const booking = await call("POST", API, `/api/client/terms/${termId}/book`, { token: clientToken });
    check("klijent se upisuje na termin", booking.status === 201, `status=${booking.status}`);

    const upcoming = await call("GET", API, "/api/client/upcoming", { token: clientToken });
    check("klijent vidi predstojeći trening", upcoming.status === 200 && (upcoming.data?.data?.length ?? 0) >= 1,
      `status=${upcoming.status}`);

    const enrollments = await call("GET", API, `/api/trainer/terms/${termId}/enrollments`, { token: trainerToken });
    check("trener vidi upisane klijente", enrollments.status === 200, `status=${enrollments.status}`);
  }

  const adminAssignment = await call("PATCH", API, `/api/admin/clients/${clientId}/trainer`, {
    token: adminToken, body: { trenerId: null },
  });
  check("gateway prosleđuje Identity admin dodelu trenera", adminAssignment.status === 200,
    `status=${adminAssignment.status}`);

  const audit = await call("GET", API, "/api/audit?limit=20", { token: adminToken });
  check("admin čita audit preko gateway-a", audit.status === 200 && Array.isArray(audit.data?.data),
    `status=${audit.status} ${audit.error ?? ""}`);
}

try {
  await main();
} catch (error) {
  console.error("Greška u testu:", error.message);
  failed++;
} finally {
  console.log(`\n${color.dim}———————————————${color.reset}`);
  console.log(`${color.green}PROŠLO: ${passed}${color.reset}   ${failed ? color.red : color.dim}PALO: ${failed}${color.reset}\n`);
  rl.close();
  process.exitCode = failed ? 1 : 0;
}