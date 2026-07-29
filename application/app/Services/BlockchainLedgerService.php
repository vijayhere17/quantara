<?php

namespace App\Services;

use App\Http\Controllers\Users\EarningWalletController;
use App\Models\BlockchainIncomeEvent;
use App\Models\BlockchainPackageActivation;
use App\Models\EarningWallet;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors on-chain package activations and income events into the DB ledger.
 * Does not pay contribution on-chain — that is already settled; we only mirror.
 */
class BlockchainLedgerService
{
    /**
     * Record a verified package activation in blockchain_package_activations.
     */
    public function recordPackageActivation(
        User $user,
        float|int|string $amount,
        string $txHash,
        ?int $cycle = null,
        ?int $blockNumber = null,
        ?string $approveTxHash = null,
        ?string $tokenAmount = null,
        string $status = 'verified'
    ): ?BlockchainPackageActivation {
        if (!Schema::hasTable('blockchain_package_activations')) {
            Log::warning('blockchain_package_activations table missing; skip ledger row');
            return null;
        }

        $txHash = strtolower(trim($txHash));

        $existing = BlockchainPackageActivation::where('tx_hash', $txHash)->first();
        if ($existing !== null) {
            return $existing;
        }

        $wallet = strtolower((string) ($user->wallet_addr ?: $user->username));

        return BlockchainPackageActivation::create([
            'user_id' => $user->id,
            'wallet' => $wallet,
            'package_amount' => $amount,
            'package_cycle' => $cycle,
            'tx_hash' => $txHash,
            'approve_tx_hash' => $approveTxHash ? strtolower($approveTxHash) : null,
            'block_number' => $blockNumber,
            'token_amount' => $tokenAmount,
            'status' => $status,
        ]);
    }

    /**
     * Mirror an on-chain income event into ewallet_logs.
     *
     * Dedup (per activation log):
     *  - blockchain_income_events unique(tx_hash, log_index)
     *  - ewallet_logs.description containing the same tx hash + log:{index}
     *
     * One package activation can emit multiple ContributionRewardPaid logs
     * (L1/L2/L3) that share a tx_hash — those must all be mirrored.
     *
     * @param  int|string  $earningType  Maps to ewallet_logs.earning_type (int) and income_type string
     */
    public function recordIncomeMirror(
        int $userId,
        int|string $earningType,
        float|int|string $amount,
        string $txHash,
        string $description,
        int $logIndex = 0,
        ?int $blockNumber = null,
        ?string $wallet = null
    ): ?EarningWallet {
        $txHash = strtolower(trim($txHash));
        $incomeType = (string) $earningType;
        $amount = (float) $amount;

        if ($amount <= 0 || $txHash === '') {
            return null;
        }

        $coinRate = function_exists('getcoinrate') ? (float) getcoinrate() : 60000.0;
        if ($coinRate < 1000.0) {
            $coinRate = 60000.0;
        }
        $coinAmount = $amount / $coinRate;

        // If this log was already mirrored with a dust/zero USD amount (bad BTC
        // rate → formatdecimal(..., 4) stored "0.0000"), repair it in place.
        // Dedup used to return early and left Contribution Reward stuck at 0.0000.
        if (Schema::hasTable('ewallet_logs')) {
            $dupLog = EarningWallet::where('member_id', $userId)
                ->where('description', 'like', '%' . $txHash . '%')
                ->where('description', 'like', '%log:' . $logIndex . '%')
                ->first();
            if ($dupLog !== null) {
                $repaired = $this->repairZeroAmountLog($dupLog, $amount, $coinRate, $coinAmount);
                $this->markIncomeEvent(
                    $userId,
                    $wallet,
                    $incomeType,
                    $amount,
                    $txHash,
                    $logIndex,
                    $blockNumber,
                    true
                );
                return $repaired;
            }
        }

        // blockchain_income_events is updated via updateOrCreate below.
        // Do not early-return on an existing event row — that previously skipped
        // repair of ewallet_logs rows stuck at amount=0.0000.

        $desc = $description;
        if (!str_contains(strtolower($desc), $txHash)) {
            $desc = trim($description . ' [' . $txHash . ' log:' . $logIndex . ']');
        } elseif (!str_contains($desc, 'log:' . $logIndex)) {
            $desc = trim($desc . ' log:' . $logIndex);
        }

        $walletCon = app(EarningWalletController::class);
        $earningTypeInt = is_numeric($earningType) ? (int) $earningType : 0;

        $log = $walletCon->addearningwalletlog(
            $userId,
            1,
            $earningTypeInt,
            $desc,
            $amount,
            $coinRate,
            $coinAmount,
            date('Y-m-d H:i:s')
        );

        $this->markIncomeEvent(
            $userId,
            $wallet,
            $incomeType,
            $amount,
            $txHash,
            $logIndex,
            $blockNumber,
            $log !== null
        );

        return $log instanceof EarningWallet ? $log : null;
    }

    /**
     * Repair ewallet_logs rows whose USD amount was rounded to 0.0000 by
     * formatdecimal after a bad BTC/USD conversion (rate ≈ 1).
     */
    protected function repairZeroAmountLog(
        EarningWallet $log,
        float $amount,
        float $coinRate,
        float $coinAmount
    ): ?EarningWallet {
        $current = (float) ($log->amount ?? 0);
        if ($current >= 0.00005 || $amount < 0.00005) {
            return null;
        }

        $prev = $current;
        $log->gross_amount = formatdecimal($amount, 4);
        $log->amount = formatdecimal($amount, 4);
        $log->coin_rate = formatdecimal($coinRate, 8);
        $log->coin_amount = formatdecimal($coinAmount, 8);
        $log->save();

        $delta = $amount - $prev;
        if ($delta > 0 && (int) ($log->txn_type ?? 0) === 1) {
            $member = User::find($log->member_id);
            if ($member !== null) {
                $member->total_earning = ((float) ($member->total_earning ?? 0)) + $delta;
                if ((int) ($log->earning_type ?? 0) <= 2) {
                    $member->total_return = ((float) ($member->total_return ?? 0)) + $delta;
                }
                $member->save();
            }
        }

        Log::info('Repaired zeroed ewallet_logs amount from on-chain mirror', [
            'id' => $log->id,
            'from' => $prev,
            'to' => $amount,
            'tx' => $log->description,
        ]);

        return $log;
    }

    protected function markIncomeEvent(
        int $userId,
        ?string $wallet,
        string $incomeType,
        float $amount,
        string $txHash,
        int $logIndex,
        ?int $blockNumber,
        bool $mirrored
    ): void {
        if (!Schema::hasTable('blockchain_income_events')) {
            return;
        }

        try {
            BlockchainIncomeEvent::updateOrCreate(
                [
                    'tx_hash' => $txHash,
                    'log_index' => $logIndex,
                ],
                [
                    'user_id' => $userId,
                    'wallet' => $wallet ? strtolower($wallet) : null,
                    'income_type' => $incomeType,
                    'amount' => $amount,
                    'block_number' => $blockNumber,
                    'mirrored_to_ledger' => $mirrored,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('blockchain_income_events write failed', ['error' => $e->getMessage()]);
        }
    }
}
