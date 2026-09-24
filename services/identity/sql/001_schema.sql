-- Identity servis: vlasnik identiteta i autentifikacije
CREATE TABLE IF NOT EXISTS users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  korisnickoIme     VARCHAR(190) NOT NULL UNIQUE,
  lozinka           VARCHAR(255) NOT NULL,
  uloga             ENUM('klijent','trener','admin') NOT NULL DEFAULT 'klijent',
  ime               VARCHAR(100) NOT NULL DEFAULT '',
  prezime           VARCHAR(100) NOT NULL DEFAULT '',
  datumRodjenja     DATE NULL,
  pol               ENUM('muski','zenski','ostalo') NULL,
  blokiran          TINYINT(1) NOT NULL DEFAULT 0,
  assigned_trener_id INT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_uloga (uloga),
  INDEX idx_users_trener (assigned_trener_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OTP / 2FA izazovi (za prijavu i reset lozinke)
CREATE TABLE IF NOT EXISTS auth_challenges (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  namena       ENUM('login','reset') NOT NULL DEFAULT 'login',
  code_hash    VARCHAR(255) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  consumed_at  TIMESTAMP NULL,
  attempts     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_challenge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_challenge_user (user_id),
  INDEX idx_challenge_active (user_id, namena, consumed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
