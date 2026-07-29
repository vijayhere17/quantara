#!/usr/bin/env php
<?php

/**
 * TRACE ONLY — sync one ContributionRewardPaid tx and print every amount.
 * Does not fix anything.
 *
 *   php scripts/trace-contribution-amount.php \
 *     --handoff=../smart-contracts/scripts/qa/reports/trace-contribution-amount.json
 */

declare(strict_types=1);

use App\Models\EarningWallet;
use App\Models\User;
use App\Services\BigInteger;
use App\Services\BlockchainIncomeIndexer;
use App\Services\BlockchainService;
use App\Services\MemberPanelBootService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use ReflectionMethod;

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

$handoffPath = (string) arg(
    'handoff',
    dirname(__DIR__, 2) . '/smart-contracts/scripts/qa/reports/trace-contribution-amount.json'
);
if (!is_file($handoffPath)) {
    fwrite(STDERR, "Missing handoff: {$handoffPath}\n");
    exit(1);
}
$handoff = json_decode((string) file_get_contents($handoffPath), true);
if (!is_array($handoff)) {
    fwrite(STDERR, "Invalid handoff JSON\n");
    exit(1);
}

$txHash = strtolower((string) ($handoff['txHash'] ?? ''));
$sponsor = strtolower((string) ($handoff['sponsor'] ?? ''));
$userAddr = strtolower((string) ($handoff['user'] ?? ''));
$block = (int) ($handoff['blockNumber'] ?? 0);

echo "========== HANDOFF ==========\n";
echo "txHash={$txHash}\n";
echo "sponsor={$sponsor}\n";
echo "user={$userAddr}\n";
echo "block={$block}\n";

echo "\n========== STEP 3 (from chain handoff): Event amounts ==========\n";
foreach (($handoff['contributionRewardPaid'] ?? []) as $i => $ev) {
    echo "event[{$i}].beneficiary={$ev['beneficiary']}\n";
    echo "event[{$i}].fromUser={$ev['fromUser']}\n";
    echo "event[{$i}].level={$ev['level']}\n";
    echo "event[{$i}].amount_wei={$ev['amount_wei']}\n";
    echo "event[{$i}].amount_BTCB={$ev['amount_BTCB']}\n";
    echo "event[{$i}].amount_USD_at_60k={$ev['amount_USD_at_60k']}\n";
    echo "event[{$i}].raw_data={$ev['raw_data']}\n";
    echo "event[{$i}].logIndex={$ev['logIndex']}\n";
}

// Ensure sponsor user exists in Laravel
$sponsorUser = User::query()
    ->whereRaw('LOWER(wallet_addr) = ?', [$sponsor])
    ->orWhereRaw('LOWER(username) = ?', [$sponsor])
    ->orWhere('username', 'root')
    ->orderBy('id')
    ->first();
if ($sponsorUser === null) {
    fwrite(STDERR, "Sponsor user missing in Laravel\n");
    exit(1);
}
$sponsorUser->wallet_addr = $sponsor;
$sponsorUser->username = $sponsorUser->username ?: $sponsor;
$sponsorUser->save();
echo "\nsponsor_laravel_id={$sponsorUser->id} wallet={$sponsorUser->wallet_addr}\n";

// Ensure activating user row exists (indexer only mirrors for known wallets as beneficiaries)
$actUser = User::query()->whereRaw('LOWER(wallet_addr) = ?', [$userAddr])->first();
if ($actUser === null) {
    $actUser = new User();
    $actUser->username = $userAddr;
    $actUser->wallet_addr = $userAddr;
    $actUser->referral_id = $sponsorUser->id;
    $actUser->status = 0;
    $actUser->save();
}

echo "\n========== STEP 4: Laravel indexer decode + convert ==========\n";
echo "getcoinrate()=" . getcoinrate() . "\n";
echo "CoinRateMaster table=" . (new \App\Models\CoinRateMaster())->getTable() . "\n";
echo "coin_rate_masters.rate=" . (DB::table('coin_rate_masters')->orderByDesc('id')->value('rate') ?? 'NULL') . "\n";

$blockchain = app(BlockchainService::class);
$indexer = app(BlockchainIncomeIndexer::class);

// Fetch raw logs for this tx via receipt
$receipt = $blockchain->rpc('eth_getTransactionReceipt', [$txHash]);
if (!is_array($receipt)) {
    fwrite(STDERR, "eth_getTransactionReceipt failed\n");
    exit(1);
}

$topic = BlockchainIncomeIndexer::CONTRIBUTION_REWARD_PAID;
$decode = new ReflectionMethod(BlockchainIncomeIndexer::class, 'decodeIncomeLog');
$decode->setAccessible(true);
$toUsd = new ReflectionMethod(BlockchainIncomeIndexer::class, 'tokenWeiToUsd');
$toUsd->setAccessible(true);
$mirror = new ReflectionMethod(BlockchainIncomeIndexer::class, 'mirrorLog');
$mirror->setAccessible(true);

$idsBefore = EarningWallet::query()->where('member_id', $sponsorUser->id)->pluck('id')->all();

foreach (($receipt['logs'] ?? []) as $idx => $log) {
    $t0 = strtolower((string) (($log['topics'][0] ?? '')));
    if ($t0 !== $topic) {
        continue;
    }

    echo "\n--- RAW LOG index={$idx} logIndex=" . ($log['logIndex'] ?? '') . " ---\n";
    echo "topics=" . json_encode($log['topics']) . "\n";
    echo "data=" . ($log['data'] ?? '') . "\n";

    $meta = $decode->invoke($indexer, $t0, $log);
    echo "decodeIncomeLog=" . json_encode($meta, JSON_PRETTY_PRINT) . "\n";

    if ($meta === null) {
        echo "DECODE RETURNED NULL\n";
        continue;
    }

    $token = BigInteger::weiToTokenFloat($meta['amountWei'], 18);
    $usd = $toUsd->invoke($indexer, $meta['amountWei']);
    echo "weiToTokenFloat=" . var_export($token, true) . "\n";
    echo "tokenWeiToUsd(converted amount)=" . var_export($usd, true) . "\n";
    echo "formatdecimal(converted,4)=" . formatdecimal($usd, 4) . "\n";

    $ok = $mirror->invoke($indexer, $log, is_int($idx) ? $idx : 0);
    echo "mirrorLog_returned=" . var_export($ok, true) . "\n";
}

echo "\n========== STEP 5: Database rows inserted for this tx ==========\n";
$rows = EarningWallet::query()
    ->where('description', 'like', '%' . $txHash . '%')
    ->orderBy('id')
    ->get();
if ($rows->isEmpty()) {
    echo "NO ROWS for tx\n";
    // show latest contribution rows anyway
    $rows = EarningWallet::query()->where('earning_type', 1)->orderByDesc('id')->limit(5)->get();
    echo "(showing latest earning_type=1 instead)\n";
}
foreach ($rows as $row) {
    echo "id={$row->id}\n";
    echo "  member_id={$row->member_id}\n";
    echo "  earning_type={$row->earning_type}\n";
    echo "  description={$row->description}\n";
    echo "  gross_amount={$row->gross_amount}\n";
    echo "  amount={$row->amount}\n";
    echo "  coin_rate={$row->coin_rate}\n";
    echo "  coin_amount={$row->coin_amount}\n";
    echo "  created_at={$row->created_at}\n";
}

$bie = DB::table('blockchain_income_events')->where('tx_hash', $txHash)->get();
echo "\nblockchain_income_events for tx:\n";
foreach ($bie as $e) {
    echo "  id={$e->id} amount={$e->amount} log_index={$e->log_index} mirrored={$e->mirrored_to_ledger}\n";
}

echo "\n========== STEP 6: Controller / MemberPanelBootService ==========\n";
Auth::login($sponsorUser);
$records = app(MemberPanelBootService::class)->buildEarningRecords(1, $sponsorUser, 50);
foreach ($records as $i => $r) {
    if (!str_contains(strtolower($r['description']), $txHash) && $i > 5) {
        continue;
    }
    if (str_contains(strtolower($r['description']), $txHash) || $i < 5) {
        echo "record[{$i}].amount={$r['amount']}\n";
        echo "record[{$i}].description={$r['description']}\n";
        echo "record[{$i}].txnType={$r['txnType']}\n";
        echo "record[{$i}].txnDate={$r['txnDate']}\n";
    }
}

echo "\n========== STEP 7: Blade / React variable ==========\n";
echo "Blade boot key: records[] (from \$records)\n";
echo "MemberPanelBootService field: \$row->amount  (NOT reward/credit/coin_amount/net_amount)\n";
echo "React IncentiveReportPage: row.amount\n";

// Dump first matching row raw model fields vs formatted
$match = EarningWallet::query()
    ->where('member_id', $sponsorUser->id)
    ->where('description', 'like', '%' . $txHash . '%')
    ->orderBy('id')
    ->first();
if ($match) {
    echo "\nFIRST MATCHED DB ROW raw:\n";
    echo "  \$row->amount          = " . var_export($match->amount, true) . "\n";
    echo "  \$row->gross_amount    = " . var_export($match->gross_amount, true) . "\n";
    echo "  \$row->coin_amount     = " . var_export($match->coin_amount, true) . "\n";
    echo "  formatMoney(amount)   = " . number_format((float) $match->amount, 4, '.', '') . "\n";
}

echo "\n========== DONE ==========\n";
