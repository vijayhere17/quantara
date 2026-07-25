#!/usr/bin/env php
<?php

/**
 * Phase 1 — Laravel side of registration QA.
 *
 * 1) Aligns root user wallet with Hardhat Account #0
 * 2) Clears prior non-root members / activations (optional)
 * 3) POSTs /api/auth/register with the three mined tx hashes
 * 4) Asserts users + blockchain_package_activations rows
 *
 * Usage (from application/):
 *   php scripts/phase1-laravel-register.php \
 *     --wallet=0x... --sponsor=0x... \
 *     --register=0x... --approve=0x... --activate=0x... \
 *     --token-amount=833333333333333 \
 *     --api=http://127.0.0.1:8000
 */

declare(strict_types=1);

use App\Models\BlockchainPackageActivation;
use App\Models\User;
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

function fail(string $msg): never
{
    fwrite(STDERR, "FAIL: {$msg}\n");
    exit(1);
}

function pass(string $msg): void
{
    echo "PASS: {$msg}\n";
}

$wallet = strtolower((string) arg('wallet'));
$sponsor = strtolower((string) arg('sponsor', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'));
$registerTx = strtolower((string) arg('register'));
$approveTx = strtolower((string) arg('approve'));
$activateTx = strtolower((string) arg('activate'));
$tokenAmount = (string) arg('token-amount', '');
$api = rtrim((string) arg('api', 'http://127.0.0.1:8000'), '/');
$clean = arg('clean', '1') === '1';

if (!preg_match('/^0x[a-f0-9]{40}$/', $wallet)) {
    fail('--wallet required');
}
if (!preg_match('/^0x[a-f0-9]{64}$/', $registerTx)) {
    fail('--register tx hash required');
}
if (!preg_match('/^0x[a-f0-9]{64}$/', $approveTx)) {
    fail('--approve tx hash required');
}
if (!preg_match('/^0x[a-f0-9]{64}$/', $activateTx)) {
    fail('--activate tx hash required');
}

echo "════════════════════════════════════════\n";
echo " Phase 1 — Laravel Registration QA\n";
echo "════════════════════════════════════════\n";

// Align root sponsor wallet with on-chain Hardhat Account #0
$root = User::query()->where('username', 'root')->first()
    ?? User::query()->orderBy('id')->first();

if ($root === null) {
    $root = User::create([
        'firstname' => 'Root',
        'lastname' => 'Sponsor',
        'email' => 'root@quantara.local',
        'password' => 'rootpass1',
        'username' => 'root',
    ]);
}

$root->wallet_addr = $sponsor;
$root->username = $root->username ?: 'root';
$root->status = 0;
$root->save();
pass("Root wallet synced to {$sponsor} (user id={$root->id})");

if ($clean) {
    $ids = User::query()->where('id', '!=', $root->id)->pluck('id');
    if ($ids->isNotEmpty()) {
        if (Schema::hasTable('blockchain_package_activations')) {
            BlockchainPackageActivation::query()->whereIn('user_id', $ids)->delete();
        }
        if (Schema::hasTable('staked_users')) {
            DB::table('staked_users')->whereIn('user_id', $ids)->delete();
        }
        if (Schema::hasTable('blockchain_income_events')) {
            DB::table('blockchain_income_events')->whereIn('user_id', $ids)->delete();
        }
        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $ids)->delete();
        }
        User::query()->whereIn('id', $ids)->delete();
    }
    // Also clear activations for this wallet if re-running
    if (Schema::hasTable('blockchain_package_activations')) {
        BlockchainPackageActivation::query()
            ->whereRaw('LOWER(wallet) = ?', [$wallet])
            ->delete();
    }
    pass('Cleaned non-root users / activations');
}

$email = 'phase1_' . time() . '@quantara.test';
$payload = [
    'firstname' => 'Phase',
    'lastname' => 'One',
    'email' => $email,
    'password' => 'secret12',
    'wallet' => $wallet,
    'sponsor_id' => $sponsor,
    'tx_hash' => $registerTx,
    'package_amount' => 50,
    'package_tx_hash' => $activateTx,
    'approve_tx_hash' => $approveTx,
    'token_amount' => $tokenAmount !== '' ? $tokenAmount : null,
    'leg' => 'L',
];

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
    CURLOPT_HEADER => true,
    CURLOPT_COOKIEJAR => '/tmp/phase1-laravel-cookies.txt',
    CURLOPT_COOKIEFILE => '/tmp/phase1-laravel-cookies.txt',
]);
$raw = curl_exec($ch);
if ($raw === false) {
    fail('curl error: ' . curl_error($ch));
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$body = substr((string) $raw, $headerSize);
curl_close($ch);

$json = json_decode($body, true);
if (!is_array($json)) {
    fail("Non-JSON response HTTP {$status}: " . substr($body, 0, 300));
}

if (!($json['success'] ?? false)) {
    fail('API register failed: ' . ($json['error'] ?? $body));
}
pass('API /api/auth/register success');

$member = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$wallet])->first();
if ($member === null) {
    fail('User row not found for wallet');
}

pass("DB user id={$member->id} email={$member->email}");

$assertions = [
    'wallet_addr' => strtolower((string) $member->wallet_addr) === $wallet,
    'sponsor referral_id' => (int) $member->referral_id === (int) $root->id,
    'package_amount=50' => (int) $member->package_amount === 50,
    'status active (0)' => (int) $member->status === 0,
    'transaction_hash set' => strtolower((string) $member->transaction_hash) === $registerTx,
    'package_tx_hash set' => strtolower((string) $member->package_tx_hash) === $activateTx,
    'approve_tx_hash set' => strtolower((string) $member->approve_tx_hash) === $approveTx,
    'registration_timestamp set' => !empty($member->registration_timestamp),
];

foreach ($assertions as $label => $ok) {
    if (!$ok) {
        fail("DB assertion failed: {$label}");
    }
    pass("DB / {$label}");
}

if (Schema::hasTable('blockchain_package_activations')) {
    $act = BlockchainPackageActivation::query()
        ->whereRaw('LOWER(tx_hash) = ?', [$activateTx])
        ->first();
    if ($act === null) {
        fail('blockchain_package_activations row missing');
    }
    if ((int) $act->package_amount !== 50) {
        fail('activation package_amount != 50');
    }
    if (strtolower((string) $act->approve_tx_hash) !== $approveTx) {
        fail('activation approve_tx_hash mismatch');
    }
    pass('DB / blockchain_package_activations row OK');
}

$dash = $json['dashboard'] ?? [];
$userPayload = $json['user'] ?? [];
echo "\nDashboard payload keys: " . implode(', ', array_keys(is_array($dash) ? $dash : [])) . "\n";
echo "User payload: " . json_encode($userPayload) . "\n";

echo "\nPHASE 1 LARAVEL: PASS\n";
exit(0);
