# Migration History Repair — QA Report

Date: 2026-07-23  
Branch: `cursor/migrate-history-repair-2270`

## Problem

`php artisan migrate` failed with:

```
SQLSTATE[42S01]: Table 'roi_tier_masters' already exists
```

Tables existed (with data) but were missing from the Laravel `migrations` table.

## Solution (no data loss)

### 1. One SQL repair file

`application/database/sql/REPAIR_ALL_MIGRATIONS.sql`

- Creates `migrations` if missing
- Adds **missing columns / indexes / unique keys** via information_schema checks
- **INSERT INTO migrations** for every migration whose objects already exist
- Leaves true CREATE gaps pending for artisan
- Safe to re-run; never DROP / DELETE

### 2. Idempotent migrations

All CREATE / ALTER migrations now guard with `Schema::hasTable` / `hasColumn` / index checks so a future drift cannot recreate existing tables.

### 3. Artisan helper

```bash
php artisan migrate:repair
```

(or run the SQL with the mysql client, then `php artisan migrate`)

## Verified locally (simulated broken production DB)

| Check | Result |
|-------|--------|
| Pre-repair: `roi_tier_masters` exists with 1 row | Yes |
| Pre-repair: `users` has 1 row | Yes |
| Pre-repair: migrations history empty / out of sync | Yes |
| Repair SQL applied | OK |
| Users / ROI data preserved | **1 / 1** |
| Missing columns added (`approve_tx_hash`, `roi_tier_id`, `w_type`, …) | OK |
| `php artisan migrate` | Created only pending `blockchain_*` tables — **no “already exists”** |
| Second `php artisan migrate` | `Nothing to migrate` |
| `migrate:status` | **17/17 Ran** |

## How to run on production

```bash
# From the app database
mysql -u USER -p DATABASE < application/database/sql/REPAIR_ALL_MIGRATIONS.sql

php artisan migrate
php artisan migrate:status
```

## Files changed

- `application/database/sql/REPAIR_ALL_MIGRATIONS.sql` (**primary deliverable**)
- All migrations under `application/database/migrations/*.php` (idempotent)
- `application/app/Console/Commands/RepairMigrationsCommand.php`
