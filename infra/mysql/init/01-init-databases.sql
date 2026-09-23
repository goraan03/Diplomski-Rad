CREATE DATABASE IF NOT EXISTS fittrack_identity   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fittrack_coaching   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fittrack_scheduling CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fittrack_billing    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fittrack_audit      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'identity_user'@'%'   IDENTIFIED BY 'identity_pass';
CREATE USER IF NOT EXISTS 'coaching_user'@'%'   IDENTIFIED BY 'coaching_pass';
CREATE USER IF NOT EXISTS 'scheduling_user'@'%' IDENTIFIED BY 'scheduling_pass';
CREATE USER IF NOT EXISTS 'billing_user'@'%'    IDENTIFIED BY 'billing_pass';
CREATE USER IF NOT EXISTS 'audit_user'@'%'      IDENTIFIED BY 'audit_pass';

GRANT ALL PRIVILEGES ON fittrack_identity.*   TO 'identity_user'@'%';
GRANT ALL PRIVILEGES ON fittrack_coaching.*   TO 'coaching_user'@'%';
GRANT ALL PRIVILEGES ON fittrack_scheduling.* TO 'scheduling_user'@'%';
GRANT ALL PRIVILEGES ON fittrack_billing.*    TO 'billing_user'@'%';
GRANT ALL PRIVILEGES ON fittrack_audit.*      TO 'audit_user'@'%';

FLUSH PRIVILEGES;