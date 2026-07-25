#!/usr/bin/env php
<?php

/**
 * Phase 2 — Laravel contribution ledger verification.
 *
 * Reads scripts/qa/reports/phase2-handoff.json (or --handoff=),
 * registers User1/2/3 via API (or ensures rows exist), syncs income indexer,
 * and asserts ewallet_logs / blockchain_income_events USD totals.
 *
 *   php scripts/phase2-laravel-contribution.php --api=http://127.0.0.1:8000
 */

declare(strict_types=1);

use App\Models\User;
use App\Services\BlockchainIncomeIndexer;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

function arg(string $name, ?string $default = null): ?string
{
    global $argv;
    foreach ($argv as $a) {
        if (str_starts_with($a, "--{$name}=")) {
            return substr($a, strlen($name) + 3);
        }
    }
    return $default;
}

function pass(string $m): void { echo "PASS: {$m}\n"; }
function fail(string $m): never { fwrite(STDERR, "FAIL: {$m}\n"); exit(1); }

$api = rtrim((string) arg('api', 'http://127.0.0.1:8000'), '/');
$handoffPath = (string) arg(
    'handoff',
    dirname(__DIR__, 2) . '/smart-contracts/scripts/qa/reports/phase2-handoff.json'
);

if (!is_file($handoffPath)) {
    fail("Handoff file missing: {$handoffPath} — run qa:phase2 with QA_LARAVEL=1 first");
}

$handoff = json_decode((string) file_get_contents($handoffPath), true);
if (!is_array($handoff)) {
    fail('Invalid handoff JSON');
}

echo "════════════════════════════════════════\n";
echo " Phase 2 — Laravel Contribution QA\n";
echo "════════════════════════════════════════\n";

// Ensure schema
if (!Schema::hasTable('ewallet_logs') || !Schema::hasTable('coin_rate_masters')) {
    fail('Run php artisan migrate — ewallet_logs / coin_rate_masters required');
}
$rate = (float) getcoinrate();
pass("coin rate = {$rate}");

$rootWallet = strtolower((string) $handoff['root']);
$root = User::query()->where('username', 'root')->first()
    ?? User::query()->orderBy('id')->first();
if ($root === null) {
    fail('Root user missing');
}
$root->wallet_addr = $rootWallet;
$root->status = 0;
$root->package_amount = 50;
$root->save();
pass("Root wallet synced {$rootWallet}");

$tokenAmount = (string) ($handoff['tokenAmount'] ?? '');

function apiRegister(string $api, array $payload): array
{
    $ch = curl_init($api . '/api/auth/register');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'X-Requested-With: XMLHttpRequest',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode((string) $body, true);
    if (!is_array($json)) {
        return ['success' => false, 'error' => "HTTP {$status} non-json"];
    }
    return $json;
}

foreach (['user1', 'user2', 'user3'] as $key) {
    $row = $handoff['users'][$key] ?? null;
    if (!is_array($row)) {
        fail("handoff.users.{$key} missing");
    }
    $wallet = strtolower((string) $row['wallet']);
    $existing = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$wallet])->first();
    if ($existing !== null) {
        pass("{$key} already in DB id={$existing->id}");
        continue;
    }

    $json = apiRegister($api, [
        'firstname' => ucfirst($key),
        'lastname' => 'Phase2',
        'email' => $key . '_' . time() . '@quantara.test',
        'password' => 'secret12',
        'wallet' => $wallet,
        'sponsor_id' => strtolower((string) $row['sponsor']),
        'tx_hash' => strtolower((string) $row['register']),
        'package_amount' => 50,
        'package_tx_hash' => strtolower((string) $row['activate']),
        'approve_tx_hash' => strtolower((string) $row['approve']),
        'token_amount' => $tokenAmount !== '' ? $tokenAmount : null,
        'leg' => 'L',
    ]);

    if (!($json['success'] ?? false)) {
        fail("{$key} register API: " . ($json['error'] ?? 'unknown'));
    }
    pass("{$key} registered via API");
}

// Sync income indexer from genesis
/** @var BlockchainIncomeIndexer $indexer */
$indexer = app(BlockchainIncomeIndexer::class);
$result = $indexer->sync(0, null, 5000);
pass("Income indexer scanned={$result['scanned']} mirrored={$result['mirrored']} errors={$result['errors']}");

$expect = $handoff['expectUsd'] ?? [];
$wallets = [
    'root' => $rootWallet,
    'user1' => strtolower((string) $handoff['user1']),
    'user2' => strtolower((string) $handoff['user2']),
    'user3' => strtolower((string) $handoff['user3']),
];

foreach ($wallets as $label => $wallet) {
    $user = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$wallet])->first();
    if ($user === null) {
        fail("DB user missing for {$label}");
    }

    $contribSum = 0.0;
    if (Schema::hasTable('ewallet_logs')) {
        // earning_type 1 = working / contribution (indexer map)
        $contribSum = (float) DB::table('ewallet_logs')
            ->where('member_id', $user->id)
            ->where('txn_type', 1)
            ->where('earning_type', 1)
            ->where('description', 'like', '%Contribution%')
            ->sum('amount');
    }

    $events = 0;
    if (Schema::hasTable('blockchain_income_events')) {
        $events = (int) DB::table('blockchain_income_events')
            ->where('user_id', $user->id)
            ->where('income_type', '1')
            ->count();
    }

    $expected = (float) ($expect[$label] ?? -1);
    $ok = abs($contribSum - $expected) < 0.02; // allow 2 cent rounding
    if (!$ok) {
        fail("{$label} contribution USD sum={$contribSum} expected={$expected} (events={$events})");
    }
    pass("{$label} contribution income \${$contribSum} (events={$events}) ≈ \${$expected}");

    // Dashboard-style total for contribution stream
    $memberTotal = (float) ($user->fresh()->total_earning ?? 0);
    pass("{$label} users.total_earning={$memberTotal}");
}

// Count contribution events for user3 activation (should be 3 mirrored across beneficiaries)
$u3Activate = strtolower((string) ($handoff['users']['user3']['activate'] ?? ''));
if ($u3Activate !== '') {
    $count = (int) DB::table('blockchain_income_events')
        ->where('tx_hash', $u3Activate)
        ->count();
    if ($count !== 3) {
        fail("User3 activation should mirror 3 income events, got {$count}");
    }
    pass("User3 activation mirrored 3 ContributionRewardPaid logs");
}

echo "\nPHASE 2 LARAVEL: PASS\n";
exit(0);
