CREATE TABLE IF NOT EXISTS training_terms (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id     INT NOT NULL,
  program_id     INT NULL,
  type           ENUM('individual','group') NOT NULL DEFAULT 'individual',
  start_at       DATETIME NOT NULL,
  duration_min   INT NOT NULL,
  capacity       INT NOT NULL DEFAULT 1,
  enrolled_count INT NOT NULL DEFAULT 0,
  canceled       TINYINT(1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tt_trainer (trainer_id),
  INDEX idx_tt_start (start_at),
  INDEX idx_tt_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_enrollments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  term_id           INT NOT NULL,
  user_id           INT NOT NULL,
  status            ENUM('enrolled','attended','canceled_by_user','canceled_by_trainer') NOT NULL DEFAULT 'enrolled',
  rating            TINYINT NULL,
  feedback          TEXT NULL,
  session_completed TINYINT(1) NOT NULL DEFAULT 0,
  attended_at       DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_term_user (term_id, user_id),
  CONSTRAINT fk_te_term FOREIGN KEY (term_id) REFERENCES training_terms(id) ON DELETE CASCADE,
  INDEX idx_te_user (user_id),
  INDEX idx_te_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Projekcije (read model) — pune ih konzumeri Identity/Coaching dogadjaja (Dan 5).
CREATE TABLE IF NOT EXISTS users_read (
  id                 INT PRIMARY KEY,
  korisnickoIme      VARCHAR(190) NULL,
  ime                VARCHAR(100) NULL,
  prezime            VARCHAR(100) NULL,
  uloga              VARCHAR(20) NULL,
  assigned_trener_id INT NULL,
  blokiran           TINYINT(1) NOT NULL DEFAULT 0,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS programs_read (
  id         INT PRIMARY KEY,
  title      VARCHAR(200) NULL,
  level      VARCHAR(20) NULL,
  trainer_id INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
