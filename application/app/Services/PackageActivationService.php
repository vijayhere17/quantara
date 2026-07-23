<?php

namespace App\Services;

use App\Models\RoiTierMaster;
use App\Models\StakeMaster;
use App\Models\StakeRequest;
use App\Models\User;
use App\Models\UserStaked;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Mirrors blockchain-verified package activation into legacy stake / investment tables.
 * Contribution commissions are paid on-chain — this service does NOT call processreferralcommission.
 * It does immediately trigger BlockchainIncomeIndexer so referral income appears in the panel without waiting for cron.
 */
class PackageActivationService
{
    public function __construct(
        protected BlockchainLedgerService $ledger,
        protected BlockchainIncomeIndexer $incomeIndexer,
    ) {
    }

    /**
     * Apply a verified PackageActivated event to the member record + stake ledger.
     *
     * @param  array{ok?:bool,blockNumber?:int,packageCycle?:int,packageAmount?:int|float,tokenAmountHex?:string,txHash?:string}  $pkgVerified
     */
    public function activateFromVerifiedPackage(
        User $member,
        float|int $packageAmount,
        string $packageTx,
        ?string $approveTx,
        array $pkgVerified
    ): User {
        $packageAmount = (float) $packageAmount;
        $packageTx = strtolower(trim($packageTx));
        $approveTx = $approveTx ? strtolower(trim($approveTx)) : null;
        $cycle = isset($pkgVerified['packageCycle']) ? (int) $pkgVerified['packageCycle'] : null;
        $blockNumber = isset($pkgVerified['blockNumber']) ? (int) $pkgVerified['blockNumber'] : null;
        $tokenAmount = $pkgVerified['tokenAmountHex'] ?? null;

        if ($packageTx === '' || $packageAmount <= 0) {
            throw new RuntimeException('Invalid package activation payload');
        }

        // Idempotent: already mirrored this tx
        if (Schema::hasTable('blockchain_package_activations')) {
            $existing = \App\Models\BlockchainPackageActivation::where('tx_hash', $packageTx)->first();
            if ($existing !== null) {
                return $member->fresh(['kit', 'referral']) ?? $member;
            }

            // Never reuse an Approval hash across activations
            if ($approveTx !== null && $approveTx !== '') {
                $approveUsed = \App\Models\BlockchainPackageActivation::where('approve_tx_hash', $approveTx)->exists();
                if ($approveUsed) {
                    throw new RuntimeException('Approval transaction already used.');
                }
            }
        }

        $result = DB::transaction(function () use (
            $member,
            $packageAmount,
            $packageTx,
            $approveTx,
            $cycle,
            $blockNumber,
            $tokenAmount
        ) {
            $member = User::where('id', $member->id)->lockForUpdate()->first() ?? $member;

            $kit = $this->resolveKitByAmount($packageAmount);
            if ($kit === null) {
                throw new RuntimeException('No StakeMaster kit found for package amount ' . $packageAmount);
            }

            // --- User package / investment fields ---
            $member->kit_id = $kit->id;

            if (Schema::hasColumn('users', 'package_id')) {
                $member->package_id = (int) $packageAmount;
            }
            if (Schema::hasColumn('users', 'package_amount')) {
                $member->package_amount = $packageAmount;
            }
            if (Schema::hasColumn('users', 'package_cycle') && $cycle !== null) {
                $member->package_cycle = $cycle;
            }
            if (Schema::hasColumn('users', 'activation_date') && empty($member->activation_date)) {
                $member->activation_date = now();
            }
            if (Schema::hasColumn('users', 'registration_status')) {
                $member->registration_status = 'completed';
            }
            if (Schema::hasColumn('users', 'package_tx_hash')) {
                $member->package_tx_hash = $packageTx;
            }
            if ($approveTx !== null && Schema::hasColumn('users', 'approve_tx_hash')) {
                $member->approve_tx_hash = $approveTx;
            }
            if ($blockNumber !== null && Schema::hasColumn('users', 'registration_block')) {
                // Keep latest activation block for dashboard display
                $member->registration_block = $blockNumber;
            }
            if (Schema::hasColumn('users', 'self_investment')) {
                $member->self_investment = (float) ($member->self_investment ?? 0) + $packageAmount;
            }

            $member->save();

            // --- Team investment for referral uplines ---
            if (
                Schema::hasColumn('users', 'team_investment') &&
                !empty($member->referral_uplines)
            ) {
                User::whereRaw('FIND_IN_SET(id, ?)', [$member->referral_uplines])
                    ->update(['team_investment' => DB::raw('team_investment+' . $packageAmount)]);
            }

            // --- Direct business for sponsor (no processreferralcommission) ---
            if (
                Schema::hasColumn('users', 'direct_business') &&
                (int) ($member->referral_id ?? 0) > 0
            ) {
                $refer = User::where('id', $member->referral_id)->lockForUpdate()->first();
                if ($refer !== null) {
                    $refer->direct_business = (float) ($refer->direct_business ?? 0) + $packageAmount;
                    $refer->save();
                }
            }

            // --- StakeRequest (link package_tx_hash) ---
            $sRId = 0;
            if (Schema::hasTable('staked_requests')) {
                $sRId = (int) $this->createStakeRequest($member, $kit, $packageAmount, $packageTx)->id;
            }

            // --- UserStaked (mirror addpurchasedkitlog), topup describing blockchain ---
            if (Schema::hasTable('staked_users')) {
                $this->createUserStaked($member->id, $kit, $packageAmount, $sRId, $packageTx);
            }

            // --- Ledger row ---
            $this->ledger->recordPackageActivation(
                $member,
                $packageAmount,
                $packageTx,
                $cycle,
                $blockNumber,
                $approveTx,
                is_string($tokenAmount) ? $tokenAmount : null,
                'verified'
            );

            $fresh = $member->fresh(['kit', 'referral']) ?? $member;

            return [
                'member' => $fresh,
                'blockNumber' => $blockNumber,
            ];
        });

        $fresh = $result['member'];
        $syncedBlock = $result['blockNumber'] ?? $blockNumber;

        // Mirror ContributionRewardPaid / working payments into earning_wallets immediately
        // (cron still runs every 5 minutes as backup).
        try {
            $from = max(0, ((int) ($syncedBlock ?? 0)) - 25);
            $this->incomeIndexer->sync($from, null, 500);
        } catch (\Throwable $e) {
            Log::warning('Post-activation income sync failed', [
                'error' => $e->getMessage(),
                'package_tx' => $packageTx,
            ]);
        }

        return $fresh;
    }

    /**
     * Resolve StakeMaster kit by package USD amount (exact match), then ROI-tier fallback.
     */
    public function resolveKitByAmount(float|int $amount): ?StakeMaster
    {
        $amount = (float) $amount;

        $kit = StakeMaster::where('amount', $amount)->first();
        if ($kit !== null) {
            return $kit;
        }

        // Fallback: ROI tier → synthetic ptype=2 stake master (same as StakeController)
        if (!Schema::hasTable('roi_tier_masters')) {
            return StakeMaster::where('amount', '<=', $amount)->orderByDesc('amount')->first();
        }

        $tier = RoiTierMaster::where('is_active', 1)
            ->where('min_amount', '<=', $amount)
            ->where(function ($q) use ($amount) {
                $q->whereNull('max_amount')->orWhere('max_amount', '>=', $amount);
            })
            ->orderByDesc('min_amount')
            ->first();

        if ($tier === null) {
            return null;
        }

        return StakeMaster::where('ptype', 2)
            ->whereRaw('ROUND(percantage, 3) = ?', [$tier->daily_percent])
            ->first();
    }

    protected function createStakeRequest(
        User $member,
        StakeMaster $kit,
        float $amount,
        string $packageTx
    ): StakeRequest {
        $coinRate = function_exists('getcoinrate') ? (float) getcoinrate() : 1.0;
        if ($coinRate <= 0) {
            $coinRate = 1.0;
        }

        $date = date('Y-m-d H:i:s');
        $object = new StakeRequest;
        $object->payment = 1;
        $object->invoice_no = $this->generateInvoiceNo();
        $object->member_id = $member->id;
        $object->stake_id = $kit->id;
        $object->amount = $amount;
        $object->coin_rate = $coinRate;
        $object->stake_coin = number_format((float) ($amount / $coinRate), 8, '.', '');
        // Link on-chain package tx
        $object->hash = $packageTx;
        $object->status = 2;

        if (Schema::hasColumn('staked_requests', 'return_date')) {
            $months = (int) ($kit->months ?? 0);
            $object->return_date = $months > 0
                ? date('Y-m-d H:i:s', strtotime($date . ' + ' . $months . ' days'))
                : date('Y-m-d H:i:s', strtotime($date . ' + 36500 days'));
        }
        if (Schema::hasColumn('staked_requests', 'apy')) {
            $object->apy = $kit->percantage ?? 0;
        }
        if (Schema::hasColumn('staked_requests', 'd_apy')) {
            $months = (int) ($kit->months ?? 0);
            $object->d_apy = $months > 0
                ? (($kit->percantage ?? 0) / $months)
                : ($kit->percantage ?? 0);
        }

        $object->save();

        return $object;
    }

    /**
     * Mirror StakeController::addpurchasedkitlog with blockchain description.
     */
    protected function createUserStaked(
        int $memberId,
        StakeMaster $kit,
        float $amount,
        int $sRId,
        string $packageTx
    ): UserStaked {
        $date = date('Y-m-d H:i:s');

        if ($sRId > 0) {
            $req = StakeRequest::find($sRId);
            $coinRate = $req?->coin_rate ?? (function_exists('getcoinrate') ? getcoinrate() : 1);
            $paidCoin = $req
                ? number_format((float) $req->stake_coin, 8, '.', '')
                : number_format((float) ($amount / max((float) $coinRate, 0.00000001)), 8, '.', '');
        } else {
            $coinRate = function_exists('getcoinrate') ? getcoinrate() : 1;
            $paidCoin = number_format((float) ($amount / max((float) $coinRate, 0.00000001)), 8, '.', '');
        }

        $object = new UserStaked;
        $object->s_r_id = $sRId;
        $object->member_id = $memberId;
        $object->kit_id = $kit->id;
        $object->paid_amount = $amount;
        $object->total_amount = $amount;
        $object->coin_rate = $coinRate;
        $object->payable_coin = $paidCoin;

        if ((int) ($kit->ptype ?? 0) === 2) {
            $roiTier = null;
            if (Schema::hasTable('roi_tier_masters')) {
                $roiTier = RoiTierMaster::whereRaw('daily_percent = ROUND(?, 3)', [$kit->percantage])->first();
            }
            if (Schema::hasColumn('staked_users', 'roi_tier_id')) {
                $object->roi_tier_id = $roiTier?->id;
            }
            $object->return_days = 36500;
            $object->apy = $kit->percantage;
            $object->d_apy = $kit->percantage;
            $object->return_date = date('Y-m-d H:i:s', strtotime($date . ' + 36500 days'));
        } else {
            $object->return_days = $kit->months;
            $object->apy = $kit->percantage;
            $object->d_apy = ($kit->months > 0) ? ($kit->percantage / $kit->months) : $kit->percantage;
            $object->return_date = date('Y-m-d H:i:s', strtotime($date . ' + ' . (int) $kit->months . ' days'));
        }

        // topup_type: 0 = paid package; description marks blockchain origin
        $object->topup_type = 0;
        $object->description = 'blockchain:' . $packageTx;

        $object->save();

        return $object;
    }

    protected function generateInvoiceNo(): int
    {
        for ($i = 0; $i < 20; $i++) {
            $invoiceNo = random_int(100000, 999999);
            if (!StakeRequest::where('invoice_no', $invoiceNo)->exists()) {
                return $invoiceNo;
            }
        }

        return (int) (time() % 1000000);
    }
}
