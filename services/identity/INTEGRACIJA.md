# Identity servis — integracija (Dan 2)

## 1. Dodati u koreni `.env`
```
IDENTITY_PORT=4001
IDENTITY_DB_HOST=127.0.0.1
IDENTITY_DB_PORT=3306
IDENTITY_DB_NAME=fittrack_identity
IDENTITY_DB_USER=identity_user
IDENTITY_DB_PASSWORD=identity_pass
JWT_SECRET=promeni-me-obavezno
JWT_EXPIRES_IN=1d
RABBITMQ_URL=amqp://127.0.0.1:5672
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_LENGTH=6
ADMIN_EMAIL=admin@fittrack.local
ADMIN_PASSWORD=admin123
```

## 2. Pokretanje (lokalno)
```
npm install
npm run migrate -w @fittrack/identity   # kreira seme + admin nalog
npm run dev -w @fittrack/identity        # http://localhost:4001
```

## 3. docker-compose.yml — dodati servis
```yaml
  identity:
    build:
      context: .
      dockerfile: services/identity/Dockerfile
    env_file: .env
    environment:
      IDENTITY_DB_HOST: mysql
      IDENTITY_DB_PORT: "3306"
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on:
      - mysql
      - rabbitmq
    ports:
      - "4001:4001"
```

## 4. Gateway routeTable — prefiksi ka Identity servisu
U `gateway/src/config.ts`, ka meti `http://localhost:4001` (dev) / `http://identity:4001` (docker):
`/auth`, `/admin`, `/client`, `/trainer`

## 5. Endpointi
| Metoda | Putanja | Uloga | Opis |
|---|---|---|---|
| POST | /auth/register | javno | Registracija klijenta |
| POST | /auth/login | javno | 2FA korak 1 (salje OTP), vraca challengeId |
| POST | /auth/login/verify | javno | 2FA korak 2 (challengeId+kod) -> JWT |
| POST | /auth/password/forgot | javno | Zahtev za reset (salje OTP) |
| POST | /auth/password/reset | javno | Potvrda reseta (challengeId+kod+novaLozinka) |
| POST | /auth/password/change | prijavljen | Promena lozinke |
| GET  | /auth/me | prijavljen | Podaci iz tokena |
| GET  | /admin/users?uloga=&q= | admin | Lista korisnika |
| POST | /admin/trainers | admin | Kreiranje trenera |
| PATCH| /admin/users/:id/block | admin | Blokiranje |
| PATCH| /admin/users/:id/unblock | admin | Odblokiranje |
| PATCH| /admin/clients/:id/trainer | admin | Dodela trenera klijentu (trenerId ili null) |
| GET  | /client/me/profile, /trainer/me/profile | prijavljen | Moj profil |
| PUT  | /client/me/profile, /trainer/me/profile | prijavljen | Izmena profila |

## 6. Proveriti u @fittrack/shared (da se poklapa)
- `EventName` clanovi: `EmailOtpRequested` = "email.otp_requested", `UserRegistered` = "user.registered", `TrainerLoggedIn` = "trainer.logged_in", `AuditLog` = "audit.log".
- `signToken(payload)`, `verifyToken(token)`, `extractToken(authHeader)`, tip `JwtPayload { id, korisnickoIme, uloga, blokiran }`.
- `Broker`: `new Broker(url)`, `await broker.connect()`, `broker.publish(routingKey, payload)`.
- `createPool({ host, port, user, password, database })`.
Ako se imena razlikuju, uskladiti importe (mesta su izdvojena u adapters/ i middleware/).
