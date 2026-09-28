# Coaching servis — integracija

## 1. Dodati u koreni `.env`
```
COACHING_PORT=4002
COACHING_DB_HOST=127.0.0.1
COACHING_DB_PORT=3306
COACHING_DB_NAME=fittrack_coaching
COACHING_DB_USER=coaching_user
COACHING_DB_PASSWORD=coaching_pass
# JWT_SECRET, RABBITMQ_URL i Identity promenljive iz services/identity/INTEGRACIJA.md
```

## 2. Pokretanje (lokalno)
```
npm install
npm run build -w @fittrack/shared
npm run build -w @fittrack/identity
npm run build -w @fittrack/coaching
npm run migrate -w @fittrack/identity
npm run migrate -w @fittrack/coaching
npm run dev -w @fittrack/identity        # http://localhost:4001, poseban terminal
npm run dev -w @fittrack/coaching        # http://localhost:4002, poseban terminal
npm run dev -w @fittrack/gateway         # gateway na http://localhost:4000
```
Lokalni URL-ovi servisa koriste putanje iz tabele endpointa; preko gateway-a koriste `/api` prefiks, npr. `/api/trainer/exercises`.

## 3. Docker Compose
Identity i Coaching servisi su definisani u korenom `docker-compose.yml`. Compose koristi MySQL/RabbitMQ i HTTP healthcheck-e, pokrece migracije pri startu i ceka da oba API-ja budu spremna pre gateway-a.
Pokretanje zahteva koreni `.env` sa promenljivama iz ovog odeljka i `services/identity/INTEGRACIJA.md`:
```
docker compose up --build
```

## 4. Gateway rutiranje
Aktivne rute u `gateway/src/config.ts` ciljaju `COACHING_URL` (`http://localhost:4002` lokalno, `http://coaching:4002` u Compose-u).
Gateway javne Coaching putanje imaju `/api` prefiks i uklanja ga pre prosledjivanja. Identity zadrzava `/api/client/me/profile` i `/api/trainer/me/profile`; Coaching dobija samo rute navedene u endpoint tabeli, tako da nema sudara.

## 5. Endpointi
### Trener (uloga `trener`; trainerId iz tokena)
| Metoda | Putanja | Opis |
|---|---|---|
| GET/POST | /trainer/exercises | Lista / kreiranje vezbe |
| PUT/DELETE | /trainer/exercises/:id | Izmena / brisanje |
| GET/POST | /trainer/programs | Lista / kreiranje programa |
| PUT | /trainer/programs/:id | Izmena programa |
| GET | /trainer/programs/:id | Detalji (program + vezbe) |
| PUT | /trainer/programs/:id/exercises | Zamena vezbi u programu (`{items:[...]}`) |
| POST | /trainer/programs/:id/assign | Dodela klijentu (`{clientId}`) |
| GET | /trainer/programs/:id/clients | Dodeljeni klijenti |
| GET | /trainer/requests | Zahtevi na cekanju |
| POST | /trainer/requests/:id/approve | Odobri |
| POST | /trainer/requests/:id/reject | Odbij |
| POST | /trainer/workouts | Belezenje treninga (`{termId?,clientId,startTime,endTime,notes?,logs:[]}`) |

### Klijent (uloga `klijent`; clientId iz tokena)
| Metoda | Putanja | Opis |
|---|---|---|
| GET | /client/programs?q=&level= | Programi mog trenera + javni |
| GET | /client/programs/:id | Detalji programa |
| POST | /client/requests | Slanje zahteva treneru (`{trainerId}`) |
| GET | /client/requests/status?trainerId= | Status zahteva |
| GET | /client/trainer | Moj (odobreni) trener |

## 6. Ukrstene zavisnosti (dogadjaji)
Objavljeni dogadjaji (rutirajuci kljucevi): `program.assigned`, `client_request.created`,
`client_request.approved`, `client_request.rejected`, `workout.recorded`.
- Na odobrenje zahteva Coaching objavljuje `client_request.approved {clientId,trainerId}`.
  Identity consumer postavlja `users.assigned_trener_id` i objavljuje `user.updated`.
- Provera limita plana trenera (Billing `plan.max_clients`) pri odobrenju je **odlozena** za Dan 4/5
  (Billing servis jos ne postoji) — mesto je oznaceno u `ClientRequestsService.odobri`.
- Ime klijenta/trenera se cita iz lokalne projekcije `users_read` (LEFT JOIN, NULL dok se ne napuni).
  Projekciju puni `sync/UserProjectionConsumer` iz Identity dogadjaja preko reda `coaching.users_read`.

## 7. Proveriti u @fittrack/shared
- `EventName.AuditLog` = "audit.log" (koristi `EventAuditLogger`).
- `Broker`: `new Broker({ url, source })`, `connect()`, `publish(eventName, payload)`, `consume(queue, eventNames, handler)`.
- `EventName` sadrzi Identity i Coaching routing kljuceve.
- `verifyToken(token, secret)`, `extractToken(headers)`, `JwtPayload`.
- `createPool({ host, port, user, password, database })`.
