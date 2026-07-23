-- Quantara FINAL QA — approve_tx_hash uniqueness + ensure column
-- Run when `php artisan migrate` cannot execute.
-- Safe / idempotent for MySQL 8+.

SET @db := DATABASE();

-- Ensure ledger table + column
CREATE TABLE IF NOT EXISTS `blockchain_package_activations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `wallet` VARCHAR(42) NULL,
  `package_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `package_cycle` INT UNSIGNED NULL,
  `tx_hash` VARCHAR(80) NOT NULL,
  `approve_tx_hash` VARCHAR(80) NULL,
  `token_amount_wei` VARCHAR(80) NULL,
  `block_number` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bpa_tx_hash_unique` (`tx_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='blockchain_package_activations' AND COLUMN_NAME='approve_tx_hash'
    ),
    'SELECT 1',
    'ALTER TABLE `blockchain_package_activations` ADD COLUMN `approve_tx_hash` VARCHAR(80) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure users.approve_tx_hash
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='approve_tx_hash'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `approve_tx_hash` VARCHAR(80) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Deduplicate approve hashes (keep lowest id)
DELETE bpa1 FROM blockchain_package_activations bpa1
INNER JOIN blockchain_package_activations bpa2
WHERE bpa1.id > bpa2.id
  AND bpa1.approve_tx_hash IS NOT NULL
  AND bpa1.approve_tx_hash <> ''
  AND bpa1.approve_tx_hash = bpa2.approve_tx_hash;

-- Unique index (NULLs allowed multiple times in MySQL)
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA=@db
        AND TABLE_NAME='blockchain_package_activations'
        AND INDEX_NAME='bpa_approve_tx_hash_unique'
    ),
    'SELECT 1',
    'ALTER TABLE `blockchain_package_activations` ADD UNIQUE INDEX `bpa_approve_tx_hash_unique` (`approve_tx_hash`)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'approve_tx_hash_unique_ready' AS status;
