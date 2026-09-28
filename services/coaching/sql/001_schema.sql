-- Coaching servis: vezbe, programi, dodela klijentima, zahtevi, treninzi

CREATE TABLE IF NOT EXISTS exercises (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id   INT NOT NULL,
  name         VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  muscle_group VARCHAR(80) NOT NULL,
  equipment    VARCHAR(80) NOT NULL DEFAULT 'none',
  level        ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  video_url    VARCHAR(500) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ex_trainer (trainer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS programs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id  INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  level       ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  is_public   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_trainer (trainer_id),
  INDEX idx_pr_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS program_exercises (
  program_id  INT NOT NULL,
  exercise_id INT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  sets        INT NULL,
  reps        VARCHAR(50) NULL,
  tempo       VARCHAR(50) NULL,
  rest_sec    INT NULL,
  notes       TEXT NULL,
  PRIMARY KEY (program_id, exercise_id),
  CONSTRAINT fk_pe_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_pe_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  INDEX idx_pe_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS client_programs (
  program_id  INT NOT NULL,
  client_id   INT NOT NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (program_id, client_id),
  CONSTRAINT fk_cp_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  INDEX idx_cp_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trainer_client_requests (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NOT NULL,
  trainer_id  INT NOT NULL,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  UNIQUE KEY uq_client_trainer (client_id, trainer_id),
  INDEX idx_req_trainer (trainer_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workout_sessions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  term_id    INT NULL,
  trainer_id INT NOT NULL,
  client_id  INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time   DATETIME NOT NULL,
  notes      TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ws_trainer (trainer_id),
  INDEX idx_ws_client (client_id),
  INDEX idx_ws_term (term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workout_exercise_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  session_id     INT NOT NULL,
  exercise_id    INT NOT NULL,
  set_number     INT NOT NULL,
  planned_reps   VARCHAR(50) NULL,
  actual_reps    INT NOT NULL,
  planned_weight DECIMAL(6,2) NULL,
  actual_weight  DECIMAL(6,2) NOT NULL,
  CONSTRAINT fk_wl_session FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  INDEX idx_wl_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Projekcija korisnika (read model) — puni je konzumer Identity dogadjaja (Dan 5).
-- Sluzi samo za prikaz imena; poslovna logika ne zavisi od nje.
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
