-- Blockchain sync tables + optional users investment columns (MySQL fallback)
-- Equivalent to migration 2026_07_23_120000_create_blockchain_sync_tables.php

CREATE TABLE IF NOT EXISTS `blockchain_package_activations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `wallet` VARCHAR(80) NULL,
  `package_amount` DECIMAL(18,8) NOT NULL DEFAULT 0,
  `package_cycle` INT UNSIGNED NULL,
  `tx_hash` VARCHAR(80) NOT NULL,
  `approve_tx_hash` VARCHAR(80) NULL,
  `block_number` BIGINT UNSIGNED NULL,
  `token_amount` VARCHAR(80) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'verified',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blockchain_package_activations_tx_hash_unique` (`tx_hash`),
  KEY `blockchain_package_activations_user_id_index` (`user_id`),
  KEY `blockchain_package_activations_wallet_index` (`wallet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `blockchain_income_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `wallet` VARCHAR(80) NULL,
  `income_type` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(18,8) NOT NULL DEFAULT 0,
  `tx_hash` VARCHAR(80) NOT NULL,
  `log_index` INT UNSIGNED NOT NULL DEFAULT 0,
  `block_number` BIGINT UNSIGNED NULL,
  `mirrored_to_ledger` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blockchain_income_events_tx_log_unique` (`tx_hash`, `log_index`),
  KEY `blockchain_income_events_user_id_index` (`user_id`),
  KEY `blockchain_income_events_wallet_index` (`wallet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add users columns if missing (safe to re-run)

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='self_investment'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `self_investment` DECIMAL(18,8) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='team_investment'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `team_investment` DECIMAL(18,8) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='direct_business'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `direct_business` DECIMAL(18,8) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='total_earning'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `total_earning` DECIMAL(18,8) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='total_return'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `total_return` DECIMAL(18,8) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='package_cycle'),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `package_cycle` INT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
