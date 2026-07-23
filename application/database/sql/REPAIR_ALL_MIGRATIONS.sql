-- ============================================================================
-- Quantara — FULL Laravel migration history + schema repair (ONE FILE)
-- ============================================================================
-- Safe to re-run. Does NOT drop tables. Does NOT delete data.
--
-- What this does:
--  1) Ensures `migrations` table exists
--  2) Adds any MISSING columns / indexes / unique keys required by migrations
--  3) Marks migrations as RAN when their target objects already exist
--  4) Leaves truly missing CREATE migrations pending for `php artisan migrate`
--
-- After this file:
--   php artisan migrate
-- must succeed without "table already exists" errors.
-- ============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @db := DATABASE();

-- --------------------------------------------------------------------------
-- 0) migrations table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Next batch = MAX(batch)+1 (or 1 if empty)
SET @next_batch := (SELECT IFNULL(MAX(`batch`), 0) + 1 FROM `migrations`);

-- Helper procedure: insert migration row if missing
DROP PROCEDURE IF EXISTS quantara_mark_migration;
DELIMITER $$
CREATE PROCEDURE quantara_mark_migration(IN mig_name VARCHAR(255), IN batch_no INT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM `migrations`
    WHERE `migration` COLLATE utf8mb4_unicode_ci = mig_name COLLATE utf8mb4_unicode_ci
  ) THEN
    INSERT INTO `migrations` (`migration`, `batch`) VALUES (mig_name, batch_no);
  END IF;
END$$
DELIMITER ;

-- Helper: add column if missing
DROP PROCEDURE IF EXISTS quantara_add_column;
DELIMITER $$
CREATE PROCEDURE quantara_add_column(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @ddl := CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', col_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Helper: add index if missing
DROP PROCEDURE IF EXISTS quantara_add_index;
DELIMITER $$
CREATE PROCEDURE quantara_add_index(
  IN tbl VARCHAR(64),
  IN idx VARCHAR(64),
  IN idx_def TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @ddl := CONCAT('ALTER TABLE `', tbl, '` ADD ', idx_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- ==========================================================================
-- 1) SCHEMA REPAIR — columns expected by migrations / app
-- ==========================================================================

-- users (web3 + MLM investment fields)
CALL quantara_add_column('users', 'wallet_addr', '`wallet_addr` VARCHAR(80) NULL');
CALL quantara_add_column('users', 'transaction_hash', '`transaction_hash` VARCHAR(80) NULL');
CALL quantara_add_column('users', 'package_tx_hash', '`package_tx_hash` VARCHAR(80) NULL');
CALL quantara_add_column('users', 'approve_tx_hash', '`approve_tx_hash` VARCHAR(80) NULL');
CALL quantara_add_column('users', 'chain_id', '`chain_id` INT UNSIGNED NULL');
CALL quantara_add_column('users', 'package_id', '`package_id` BIGINT UNSIGNED NULL');
CALL quantara_add_column('users', 'package_amount', '`package_amount` BIGINT UNSIGNED NULL');
CALL quantara_add_column('users', 'package_cycle', '`package_cycle` INT UNSIGNED NULL');
CALL quantara_add_column('users', 'registration_block', '`registration_block` BIGINT UNSIGNED NULL');
CALL quantara_add_column('users', 'registration_timestamp', '`registration_timestamp` TIMESTAMP NULL');
CALL quantara_add_column('users', 'wallet_status', '`wallet_status` VARCHAR(32) NULL DEFAULT ''unverified''');
CALL quantara_add_column('users', 'registration_status', '`registration_status` VARCHAR(32) NULL DEFAULT ''pending''');
CALL quantara_add_column('users', 'activation_date', '`activation_date` TIMESTAMP NULL');
CALL quantara_add_column('users', 'booster_evaluated_at', '`booster_evaluated_at` DATETIME NULL');
CALL quantara_add_column('users', 'self_investment', '`self_investment` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('users', 'team_investment', '`team_investment` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('users', 'direct_business', '`direct_business` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('users', 'total_earning', '`total_earning` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('users', 'total_return', '`total_return` DECIMAL(18,8) NOT NULL DEFAULT 0');

CALL quantara_add_index('users', 'users_wallet_addr_index', 'INDEX `users_wallet_addr_index` (`wallet_addr`)');
CALL quantara_add_index('users', 'users_transaction_hash_unique', 'UNIQUE INDEX `users_transaction_hash_unique` (`transaction_hash`)');
CALL quantara_add_index('users', 'users_package_tx_hash_unique', 'UNIQUE INDEX `users_package_tx_hash_unique` (`package_tx_hash`)');

-- staked_users (ALTER migration 020006)
CALL quantara_add_column('staked_users', 'roi_tier_id', '`roi_tier_id` BIGINT UNSIGNED NULL');
CALL quantara_add_column('staked_users', 'capital_withdrawn_at', '`capital_withdrawn_at` DATETIME NULL');

-- withdrawal_requests (ALTER migration 020007)
CALL quantara_add_column('withdrawal_requests', 'w_type', '`w_type` TINYINT NOT NULL DEFAULT 0 COMMENT ''0=income, 1=capital''');
CALL quantara_add_column('withdrawal_requests', 'staked_user_id', '`staked_user_id` BIGINT UNSIGNED NULL');
CALL quantara_add_column('withdrawal_requests', 'charge_percent', '`charge_percent` DECIMAL(5,2) NULL');

-- roi_tier_masters columns (if table exists but incomplete)
CALL quantara_add_column('roi_tier_masters', 'min_amount', '`min_amount` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('roi_tier_masters', 'max_amount', '`max_amount` DECIMAL(18,2) NULL');
CALL quantara_add_column('roi_tier_masters', 'daily_percent', '`daily_percent` DECIMAL(6,3) NOT NULL DEFAULT 0');
CALL quantara_add_column('roi_tier_masters', 'is_active', '`is_active` TINYINT(1) NOT NULL DEFAULT 1');
CALL quantara_add_column('roi_tier_masters', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('roi_tier_masters', 'updated_at', '`updated_at` TIMESTAMP NULL');

-- turnover_reward_masters
CALL quantara_add_column('turnover_reward_masters', 'milestone_order', '`milestone_order` INT UNSIGNED NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_masters', 'turnover_amount', '`turnover_amount` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_masters', 'cash_reward', '`cash_reward` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_masters', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('turnover_reward_masters', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('turnover_reward_masters', 'turnover_reward_masters_milestone_order_unique', 'UNIQUE INDEX `turnover_reward_masters_milestone_order_unique` (`milestone_order`)');

-- turnover_reward_achievers
CALL quantara_add_column('turnover_reward_achievers', 'member_id', '`member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'reward_id', '`reward_id` BIGINT UNSIGNED NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'leg1_business', '`leg1_business` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'leg2_business', '`leg2_business` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'leg3_business', '`leg3_business` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'cash_reward', '`cash_reward` DECIMAL(18,2) NOT NULL DEFAULT 0');
CALL quantara_add_column('turnover_reward_achievers', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('turnover_reward_achievers', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('turnover_reward_achievers', 'member_reward_unique', 'UNIQUE INDEX `member_reward_unique` (`member_id`, `reward_id`)');
CALL quantara_add_index('turnover_reward_achievers', 'turnover_reward_achievers_member_id_index', 'INDEX `turnover_reward_achievers_member_id_index` (`member_id`)');

-- booster_achievers
CALL quantara_add_column('booster_achievers', 'member_id', '`member_id` BIGINT UNSIGNED NOT NULL');
CALL quantara_add_column('booster_achievers', 'tier_directs', '`tier_directs` INT UNSIGNED NOT NULL DEFAULT 0');
CALL quantara_add_column('booster_achievers', 'bonus_percent', '`bonus_percent` DECIMAL(5,3) NOT NULL DEFAULT 0');
CALL quantara_add_column('booster_achievers', 'achieved_at', '`achieved_at` DATETIME NOT NULL');
CALL quantara_add_column('booster_achievers', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('booster_achievers', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('booster_achievers', 'booster_achievers_member_id_unique', 'UNIQUE INDEX `booster_achievers_member_id_unique` (`member_id`)');

-- blockchain_package_activations
CALL quantara_add_column('blockchain_package_activations', 'user_id', '`user_id` BIGINT UNSIGNED NOT NULL');
CALL quantara_add_column('blockchain_package_activations', 'wallet', '`wallet` VARCHAR(80) NULL');
CALL quantara_add_column('blockchain_package_activations', 'package_amount', '`package_amount` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('blockchain_package_activations', 'package_cycle', '`package_cycle` INT UNSIGNED NULL');
CALL quantara_add_column('blockchain_package_activations', 'tx_hash', '`tx_hash` VARCHAR(80) NOT NULL');
CALL quantara_add_column('blockchain_package_activations', 'approve_tx_hash', '`approve_tx_hash` VARCHAR(80) NULL');
CALL quantara_add_column('blockchain_package_activations', 'block_number', '`block_number` BIGINT UNSIGNED NULL');
CALL quantara_add_column('blockchain_package_activations', 'token_amount', '`token_amount` VARCHAR(80) NULL');
CALL quantara_add_column('blockchain_package_activations', 'status', '`status` VARCHAR(32) NOT NULL DEFAULT ''verified''');
CALL quantara_add_column('blockchain_package_activations', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('blockchain_package_activations', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('blockchain_package_activations', 'blockchain_package_activations_tx_hash_unique', 'UNIQUE INDEX `blockchain_package_activations_tx_hash_unique` (`tx_hash`)');
CALL quantara_add_index('blockchain_package_activations', 'blockchain_package_activations_user_id_index', 'INDEX `blockchain_package_activations_user_id_index` (`user_id`)');
CALL quantara_add_index('blockchain_package_activations', 'blockchain_package_activations_wallet_index', 'INDEX `blockchain_package_activations_wallet_index` (`wallet`)');
CALL quantara_add_index('blockchain_package_activations', 'bpa_approve_tx_hash_unique', 'UNIQUE INDEX `bpa_approve_tx_hash_unique` (`approve_tx_hash`)');

-- blockchain_sync_cursors
CREATE TABLE IF NOT EXISTS `blockchain_sync_cursors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `last_block` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blockchain_sync_cursors_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- blockchain_income_events
CALL quantara_add_column('blockchain_income_events', 'user_id', '`user_id` BIGINT UNSIGNED NOT NULL');
CALL quantara_add_column('blockchain_income_events', 'wallet', '`wallet` VARCHAR(80) NULL');
CALL quantara_add_column('blockchain_income_events', 'income_type', '`income_type` VARCHAR(64) NOT NULL');
CALL quantara_add_column('blockchain_income_events', 'amount', '`amount` DECIMAL(18,8) NOT NULL DEFAULT 0');
CALL quantara_add_column('blockchain_income_events', 'tx_hash', '`tx_hash` VARCHAR(80) NOT NULL');
CALL quantara_add_column('blockchain_income_events', 'log_index', '`log_index` INT UNSIGNED NOT NULL DEFAULT 0');
CALL quantara_add_column('blockchain_income_events', 'block_number', '`block_number` BIGINT UNSIGNED NULL');
CALL quantara_add_column('blockchain_income_events', 'mirrored_to_ledger', '`mirrored_to_ledger` TINYINT(1) NOT NULL DEFAULT 0');
CALL quantara_add_column('blockchain_income_events', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('blockchain_income_events', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('blockchain_income_events', 'blockchain_income_events_tx_log_unique', 'UNIQUE INDEX `blockchain_income_events_tx_log_unique` (`tx_hash`, `log_index`)');
CALL quantara_add_index('blockchain_income_events', 'blockchain_income_events_user_id_index', 'INDEX `blockchain_income_events_user_id_index` (`user_id`)');
CALL quantara_add_index('blockchain_income_events', 'blockchain_income_events_wallet_index', 'INDEX `blockchain_income_events_wallet_index` (`wallet`)');

-- password_reset_tokens / failed_jobs / personal_access_tokens / admins column sanity
CALL quantara_add_column('failed_jobs', 'uuid', '`uuid` VARCHAR(255) NOT NULL');
CALL quantara_add_column('failed_jobs', 'connection', '`connection` TEXT NOT NULL');
CALL quantara_add_column('failed_jobs', 'queue', '`queue` TEXT NOT NULL');
CALL quantara_add_column('failed_jobs', 'payload', '`payload` LONGTEXT NOT NULL');
CALL quantara_add_column('failed_jobs', 'exception', '`exception` LONGTEXT NOT NULL');
CALL quantara_add_column('failed_jobs', 'failed_at', '`failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL quantara_add_index('failed_jobs', 'failed_jobs_uuid_unique', 'UNIQUE INDEX `failed_jobs_uuid_unique` (`uuid`)');

CALL quantara_add_column('personal_access_tokens', 'tokenable_type', '`tokenable_type` VARCHAR(255) NOT NULL');
CALL quantara_add_column('personal_access_tokens', 'tokenable_id', '`tokenable_id` BIGINT UNSIGNED NOT NULL');
CALL quantara_add_column('personal_access_tokens', 'name', '`name` VARCHAR(255) NOT NULL');
CALL quantara_add_column('personal_access_tokens', 'token', '`token` VARCHAR(64) NOT NULL');
CALL quantara_add_column('personal_access_tokens', 'abilities', '`abilities` TEXT NULL');
CALL quantara_add_column('personal_access_tokens', 'last_used_at', '`last_used_at` TIMESTAMP NULL');
CALL quantara_add_column('personal_access_tokens', 'expires_at', '`expires_at` TIMESTAMP NULL');
CALL quantara_add_column('personal_access_tokens', 'created_at', '`created_at` TIMESTAMP NULL');
CALL quantara_add_column('personal_access_tokens', 'updated_at', '`updated_at` TIMESTAMP NULL');
CALL quantara_add_index('personal_access_tokens', 'personal_access_tokens_token_unique', 'UNIQUE INDEX `personal_access_tokens_token_unique` (`token`)');
CALL quantara_add_index('personal_access_tokens', 'personal_access_tokens_tokenable_type_tokenable_id_index', 'INDEX `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`)');

-- ==========================================================================
-- 2) MARK MIGRATIONS AS RAN when their primary objects already exist
-- ==========================================================================

-- create_users_table
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2014_10_12_000000_create_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- password_reset_tokens
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='password_reset_tokens');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2014_10_12_100000_create_password_reset_tokens_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- failed_jobs
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='failed_jobs');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2019_08_19_000000_create_failed_jobs_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- personal_access_tokens
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='personal_access_tokens');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2019_12_14_000001_create_personal_access_tokens_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- admins
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='admins');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2024_01_17_051723_create_admins_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- roi_tier_masters  *** the failing one ***
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='roi_tier_masters');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_09_020001_create_roi_tier_masters_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- turnover_reward_masters
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='turnover_reward_masters');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_09_020002_create_turnover_reward_masters_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- turnover_reward_achievers
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='turnover_reward_achievers');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_09_020003_create_turnover_reward_achievers_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- booster_achievers
SET @exists := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='booster_achievers');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_09_020004_create_booster_achievers_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- add_booster_evaluated_at — mark if column exists OR users table missing column already added by this script
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='booster_evaluated_at');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_09_020005_add_booster_evaluated_at_to_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- staked_users roi columns — mark ONLY when columns present (table may be legacy)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='staked_users' AND COLUMN_NAME='roi_tier_id');
SET @sql := IF(@col > 0, "CALL quantara_mark_migration('2026_07_09_020006_add_roi_tier_columns_to_staked_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- withdrawal_requests capital columns — mark ONLY when columns present
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='withdrawal_requests' AND COLUMN_NAME='w_type');
SET @sql := IF(@col > 0, "CALL quantara_mark_migration('2026_07_09_020007_add_capital_columns_to_withdrawal_requests_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- web3 registration fields — mark if transaction_hash exists
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='transaction_hash');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_23_064500_add_web3_registration_fields_to_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- unique package_tx_hash
SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND INDEX_NAME='users_package_tx_hash_unique');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_23_071000_add_unique_package_tx_hash_to_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- approve_tx / package_amount
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='approve_tx_hash');
SET @sql := IF(@exists > 0, "CALL quantara_mark_migration('2026_07_23_101500_add_approve_tx_and_package_amount_to_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ensure web3 columns — mark if wallet_addr + activation_date present (ensure migration complete)
SET @w := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='wallet_addr');
SET @a := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='activation_date');
SET @sql := IF(@w > 0 AND @a > 0, "CALL quantara_mark_migration('2026_07_23_102000_ensure_web3_registration_columns_on_users_table', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- blockchain sync tables — mark if BOTH tables exist OR both absent? 
-- If either exists, still mark only when both exist (migration creates both). If only one exists, columns were repaired above; mark when both present.
SET @p := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='blockchain_package_activations');
SET @i := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='blockchain_income_events');
SET @sql := IF(@p > 0 AND @i > 0, "CALL quantara_mark_migration('2026_07_23_120000_create_blockchain_sync_tables', @next_batch)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================================================
-- 3) Cleanup helpers
-- ==========================================================================
DROP PROCEDURE IF EXISTS quantara_mark_migration;
DROP PROCEDURE IF EXISTS quantara_add_column;
DROP PROCEDURE IF EXISTS quantara_add_index;

-- ==========================================================================
-- 4) Verification report
-- ==========================================================================
SELECT 'migrations_recorded' AS metric, COUNT(*) AS value FROM `migrations`
UNION ALL
SELECT 'roi_tier_masters_exists', COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='roi_tier_masters'
UNION ALL
SELECT 'users_approve_tx_hash', COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='approve_tx_hash'
UNION ALL
SELECT 'users_wallet_addr', COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='wallet_addr';

SELECT `migration`, `batch` FROM `migrations` ORDER BY `id`;
