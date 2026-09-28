CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  servis     VARCHAR(40) NOT NULL,
  akcija     VARCHAR(120) NOT NULL,
  user_id    INT NULL,
  detalji    JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_servis (servis),
  INDEX idx_audit_akcija (akcija),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;