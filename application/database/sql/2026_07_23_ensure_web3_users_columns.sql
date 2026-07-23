-- Ensure Web3 registration columns on users (MySQL fallback)
-- Equivalent to migrations:
--   2026_07_23_064500 / 071000 / 101500 / 102000

SET @db := DATABASE();

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='wallet_addr'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `wallet_addr` VARCHAR(80) NULL, ADD INDEX `users_wallet_addr_index` (`wallet_addr`)'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='transaction_hash'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `transaction_hash` VARCHAR(80) NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='package_tx_hash'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `package_tx_hash` VARCHAR(80) NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='approve_tx_hash'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `approve_tx_hash` VARCHAR(80) NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='chain_id'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `chain_id` INT UNSIGNED NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='package_id'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `package_id` BIGINT UNSIGNED NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='package_amount'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `package_amount` BIGINT UNSIGNED NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='package_cycle'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `package_cycle` INT UNSIGNED NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='registration_block'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `registration_block` BIGINT UNSIGNED NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='registration_timestamp'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `registration_timestamp` TIMESTAMP NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='wallet_status'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `wallet_status` VARCHAR(32) NULL DEFAULT ''unverified'''));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='registration_status'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `registration_status` VARCHAR(32) NULL DEFAULT ''pending'''));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='activation_date'), 'SELECT 1', 'ALTER TABLE `users` ADD COLUMN `activation_date` TIMESTAMP NULL'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
