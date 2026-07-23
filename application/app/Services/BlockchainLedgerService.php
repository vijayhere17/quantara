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
     * Mirror an on-chain income event into ewallet_logs (once per tx_hash + income_type).
     *
     * Dedup:
     *  - blockchain_income_events unique(tx_hash, log_index) and tx_hash + income_type
     *  - ewallet_logs.description containing the same tx hash
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

        // Prevent duplicates via unique tx_hash + income_type (and tx_hash + log_index)
        if (Schema::hasTable('blockchain_income_events')) {
            $dup = BlockchainIncomeEvent::where('tx_hash', $txHash)
                ->where(function ($q) use ($incomeType, $logIndex) {
                    $q->where('income_type', $incomeType)
                        ->orWhere('log_index', $logIndex);
                })
                ->first();

            if ($dup !== null) {
                return null;
            }
        }

        // Also skip if ewallet_logs already has this tx hash in description
        if (Schema::hasTable('ewallet_logs')) {
            $dupLog = EarningWallet::where('member_id', $userId)
                ->where('description', 'like', '%' . $txHash . '%')
                ->first();
            if ($dupLog !== null) {
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
                return null;
            }
        }

        $desc = $description;
        if (!str_contains(strtolower($desc), $txHash)) {
            $desc = trim($description . ' [' . $txHash . ']');
        }

        $walletCon = app(EarningWalletController::class);
        $earningTypeInt = is_numeric($earningType) ? (int) $earningType : 0;

        $log = $walletCon->addearningwalletlog(
            $userId,
            1,
            $earningTypeInt,
            $desc,
            $amount,
            0,
            0,
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
