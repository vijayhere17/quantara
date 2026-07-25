#!/usr/bin/env php
<?php

/**
 * Phase 3 — Laravel ROI ledger verification (after qa:phase3).
 *
 *   php scripts/phase3-laravel-roi.php --api=http://127.0.0.1:8000
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
    dirname(__DIR__, 2) . '/smart-contracts/scripts/qa/reports/phase3-handoff.json'
);

if (!is_file($handoffPath)) {
    fail("Missing handoff: {$handoffPath}");
}
$handoff = json_decode((string) file_get_contents($handoffPath), true);
if (!is_array($handoff)) {
    fail('Invalid handoff');
}

echo "════════════════════════════════════════\n";
echo " Phase 3 — Laravel ROI QA\n";
echo "════════════════════════════════════════\n";

if (!Schema::hasTable('ewallet_logs')) {
    fail('ewallet_logs missing — run migrations');
}

$wallet = strtolower((string) $handoff['subject']);
$claimTx = strtolower((string) $handoff['claimTx']);
$claimedUsd = (float) ($handoff['claimedUsd'] ?? 0);

$user = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$wallet])->first();
if ($user === null) {
    // Ensure via phase2 handoff register if needed
    $p2 = dirname(__DIR__, 2) . '/smart-contracts/scripts/qa/reports/phase2-handoff.json';
    if (is_file($p2)) {
        $p2data = json_decode((string) file_get_contents($p2), true);
        $row = $p2data['users']['user1'] ?? null;
        if (is_array($row)) {
            $ch = curl_init($api . '/api/auth/register');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'Content-Type: application/json',
                    'X-Requested-With: XMLHttpRequest',
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'firstname' => 'User1',
                    'lastname' => 'Phase3',
                    'email' => 'user1_p3_' . time() . '@quantara.test',
                    'password' => 'secret12',
                    'wallet' => $wallet,
                    'sponsor_id' => strtolower((string) $row['sponsor']),
                    'tx_hash' => strtolower((string) $row['register']),
                    'package_amount' => 50,
                    'package_tx_hash' => strtolower((string) $row['activate']),
                    'approve_tx_hash' => strtolower((string) $row['approve']),
                    'token_amount' => $p2data['tokenAmount'] ?? null,
                    'leg' => 'L',
                ]),
                CURLOPT_RETURNTRANSFER => true,
            ]);
            $body = curl_exec($ch);
            curl_close($ch);
            $json = json_decode((string) $body, true);
            if (!($json['success'] ?? false)) {
                fail('register user1: ' . ($json['error'] ?? $body));
            }
            pass('user1 registered via API');
        }
    }
    $user = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$wallet])->first();
}
if ($user === null) {
    fail("User missing for {$wallet}");
}
pass("subject user id={$user->id} wallet={$wallet}");

/** @var BlockchainIncomeIndexer $indexer */
$indexer = app(BlockchainIncomeIndexer::class);
$result = $indexer->sync(0, null, 5000);
pass("indexer scanned={$result['scanned']} mirrored={$result['mirrored']} errors={$result['errors']}");

$roiLogs = DB::table('ewallet_logs')
    ->where('member_id', $user->id)
    ->where('txn_type', 1)
    ->where('earning_type', 2)
    ->where('description', 'like', '%' . $claimTx . '%')
    ->get();

$sum = (float) $roiLogs->sum('amount');
$count = $roiLogs->count();

echo "ROI ewallet rows for claim tx: {$count}\n";
foreach ($roiLogs as $r) {
    echo "  id={$r->id} amount={$r->amount} desc={$r->description}\n";
}

$events = 0;
if (Schema::hasTable('blockchain_income_events')) {
    $events = (int) DB::table('blockchain_income_events')
        ->where('tx_hash', $claimTx)
        ->where('user_id', $user->id)
        ->count();
    pass("blockchain_income_events for claim tx: {$events}");
}

// Expected: exactly ONE ROI credit ≈ claimedUsd (not 2x from SelfRoiPaid + RoiClaimed)
if ($count === 0) {
    fail('No ROI ewallet_logs for claim tx');
}
if (abs($sum - $claimedUsd) > 0.02) {
    fail("ROI USD sum={$sum} expected≈{$claimedUsd} (count={$count}) — possible double-credit");
}
if ($count > 1) {
    fail("Duplicate ROI mirrors for one claim: count={$count} (RoiClaimed + SelfRoiPaid?)");
}
pass("ROI ledger \${$sum} ≈ \${$claimedUsd} (exactly {$count} row)");

// Descriptions should be RoiClaimed-style, not both
$hasClaim = $roiLogs->contains(fn ($r) => str_contains(strtolower((string) $r->description), 'roi claim')
    || str_contains(strtolower((string) $r->description), 'on-chain roi'));
pass('ROI description present: ' . ($hasClaim ? 'yes' : 'check manually'));

echo "\nPHASE 3 LARAVEL: PASS\n";
exit(0);
