<?php

namespace App\Services;

use App\Models\BlockchainPackageActivation;
use App\Models\EarningWallet;
use App\Models\LevelReferral;
use App\Models\StakeMaster;
use App\Models\User;
use App\Models\UserStaked;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

/**
 * Builds React member-panel boot payloads from live DB data.
 * Fixes empty `referrals: []` / `records: []` blades that never called legacy DataTables APIs.
 */
class MemberPanelBootService
{
    /**
     * Direct referrals for the authenticated (or given) member — users.referral_id.
     *
     * @return list<array{username:string,activationOn:string,totalTopup:string,status:string,registeredDate:string}>
     */
    public function buildReferrals(?User $user = null): array
    {
        $user = $user ?? Auth::user();
        if ($user === null) {
            return [];
        }

        $rows = User::where('referral_id', $user->id)
            ->orderByDesc('created_at')
            ->get([
                'id',
                'username',
                'firstname',
                'lastname',
                'activation_date',
                'self_investment',
                'kit_id',
                'created_at',
            ]);

        $out = [];
        foreach ($rows as $row) {
            $label = $this->memberLabel($row);
            $out[] = [
                'username' => $label,
                'activationOn' => $this->formatDate($row->activation_date),
                'totalTopup' => $this->formatMoney($row->self_investment),
                'status' => ((int) ($row->kit_id ?? 0) > 0) ? 'active' : 'inactive',
                'registeredDate' => $this->formatDate($row->created_at),
            ];
        }

        return $out;
    }

    /**
     * Level-based downlines from level_referrals.downlines.
     *
     * @return list<array{level:int,userDetails:string,activationOn:string,totalTopup:string,status:string,registeredDate:string,referralDetails:string}>
     */
    public function buildDownlines(?User $user = null, ?int $level = null): array
    {
        $user = $user ?? Auth::user();
        if ($user === null || !Schema::hasTable('level_referrals')) {
            return [];
        }

        if ($level !== null && $level > 0) {
            $levelRow = LevelReferral::where('member_id', $user->id)->where('level', $level)->first();
            $idCsv = $levelRow?->downlines ?? '';
            $levelMap = [];
            if ($idCsv !== '') {
                foreach (array_filter(explode(',', (string) $idCsv)) as $id) {
                    $levelMap[(int) $id] = $level;
                }
            }
        } else {
            $levelMap = [];
            $levels = LevelReferral::where('member_id', $user->id)->get(['level', 'downlines']);
            foreach ($levels as $lr) {
                foreach (array_filter(explode(',', (string) ($lr->downlines ?? ''))) as $id) {
                    $levelMap[(int) $id] = (int) $lr->level;
                }
            }
        }

        if ($levelMap === []) {
            return [];
        }

        $ids = array_keys($levelMap);
        $members = User::whereIn('id', $ids)
            ->with(['referral:id,username,firstname,lastname'])
            ->orderByDesc('created_at')
            ->get();

        $out = [];
        foreach ($members as $row) {
            $referrer = $row->referral;
            $out[] = [
                'level' => $levelMap[(int) $row->id] ?? 0,
                'userDetails' => $this->memberLabel($row),
                'activationOn' => $this->formatDate($row->activation_date),
                'totalTopup' => $this->formatMoney($row->self_investment),
                'status' => ((int) ($row->kit_id ?? 0) > 0) ? 'active' : 'inactive',
                'registeredDate' => $this->formatDate($row->created_at),
                'referralDetails' => $referrer
                    ? (function_exists('obscureAddress')
                        ? obscureAddress((string) $referrer->username)
                        : (string) $referrer->username)
                    : '—',
            ];
        }

        return $out;
    }

    /**
     * Earning wallet ledger rows for incentive reports.
     *
     * @return list<array{description:string,amount:string,txnType:string,txnDate:string}>
     */
    public function buildEarningRecords(int $earningType, ?User $user = null, int $limit = 500): array
    {
        $user = $user ?? Auth::user();
        if ($user === null || !Schema::hasTable('ewallet_logs')) {
            return [];
        }

        $rows = EarningWallet::where('member_id', $user->id)
            ->where('earning_type', $earningType)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $txnType = match ((int) ($row->txn_type ?? 0)) {
                1 => 'Credit',
                2 => 'Debit',
                3 => 'Flush',
                default => (string) ($row->txn_type ?? ''),
            };
            $out[] = [
                'description' => (string) ($row->description ?? '—'),
                'amount' => $this->formatMoney($row->amount ?? $row->net_amount ?? 0),
                'txnType' => $txnType,
                'txnDate' => $this->formatDate($row->created_at),
            ];
        }

        return $out;
    }

    /**
     * All earning-wallet transactions for the wallet page.
     *
     * @return list<array{description:string,amount:string,txnType:string,txnDate:string}>
     */
    public function buildEarningTransactions(?User $user = null, int $limit = 500): array
    {
        $user = $user ?? Auth::user();
        if ($user === null || !Schema::hasTable('ewallet_logs')) {
            return [];
        }

        $rows = EarningWallet::where('member_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $txnType = match ((int) ($row->txn_type ?? 0)) {
                1 => 'Credit',
                2 => 'Debit',
                3 => 'Flush',
                default => (string) ($row->txn_type ?? ''),
            };
            $out[] = [
                'description' => (string) ($row->description ?? '—'),
                'amount' => $this->formatMoney($row->amount ?? $row->net_amount ?? 0),
                'txnType' => $txnType,
                'txnDate' => $this->formatDate($row->created_at),
            ];
        }

        return $out;
    }

    /**
     * My Investments: prefer blockchain_package_activations (Web3 source of truth),
     * fall back to staked_users when ledger table is empty/legacy-only.
     *
     * @return array{
     *   summary: array{totalInvested:string,activeInvestment:string,completedPackages:int,roiEarned:string},
     *   investments: list<array<string,mixed>>
     * }
     */
    public function buildInvestmentHistory(?User $user = null): array
    {
        $user = $user ?? Auth::user();
        if ($user === null) {
            return [
                'summary' => [
                    'totalInvested' => '0.0000',
                    'activeInvestment' => '0.0000',
                    'completedPackages' => 0,
                    'roiEarned' => '0.0000',
                ],
                'investments' => [],
            ];
        }

        $roiEarned = $this->sumEarningType((int) $user->id, 2);
        $workingEarned = $this->sumEarningType((int) $user->id, 1);
        $chainId = (int) ($user->chain_id ?: config('blockchain.chain_id', 56));
        $explorerBase = (string) (config('blockchain.explorers.' . $chainId) ?? '');

        $investments = [];

        if (Schema::hasTable('blockchain_package_activations')) {
            $rows = BlockchainPackageActivation::where('user_id', $user->id)
                ->orderByDesc('id')
                ->get();

            foreach ($rows as $row) {
                $amount = (float) ($row->package_amount ?? 0);
                $cycle = (int) ($row->package_cycle ?? 1);
                $kit = $this->resolveKitName($amount);
                $tx = strtolower((string) ($row->tx_hash ?? ''));
                $status = $this->investmentStatus((string) ($row->status ?? 'verified'), $amount, $user);
                $roiCap = $amount * 3;
                $workingCap = $amount * 4;

                // Match optional staked_users row for receive_return
                $stakedRoi = $this->stakedReceiveReturn($user->id, $tx, $amount);

                $investments[] = [
                    'request' => 'PKG-' . ($row->id ?? '0') . '-C' . $cycle,
                    'amount' => $this->formatMoney($amount),
                    'packageAmount' => $this->formatMoney($amount),
                    'packageName' => $kit,
                    'btcPlan' => $kit . ' · Cycle ' . $cycle,
                    'activationOn' => $this->formatDate($row->created_at),
                    'txnHash' => $tx,
                    'txnHashUrl' => ($explorerBase !== '' && $tx !== '')
                        ? (rtrim($explorerBase, '/') . '/tx/' . $tx)
                        : null,
                    'maturity' => 'Cap-based (ROI 3X / Working 4X)',
                    'status' => $status,
                    'roiEarned' => $this->formatMoney($stakedRoi),
                    'roiRemaining' => $this->formatMoney(max(0, $roiCap - $stakedRoi)),
                    'roiCap' => $this->formatMoney($roiCap),
                    'workingIncome' => $this->formatMoney($workingEarned),
                    'totalEarned' => $this->formatMoney($roiEarned + $workingEarned),
                    'blockchainStatus' => strtolower((string) ($row->status ?? 'verified')) === 'verified'
                        ? 'On-chain verified'
                        : (string) ($row->status ?? 'pending'),
                    'packageCycle' => $cycle,
                    'blockNumber' => $row->block_number,
                ];
            }
        }

        // Legacy / fallback rows not yet in blockchain ledger
        if ($investments === [] && Schema::hasTable('staked_users')) {
            $stakes = UserStaked::where('member_id', $user->id)
                ->orderByDesc('id')
                ->get();

            foreach ($stakes as $stake) {
                $amount = (float) ($stake->paid_amount ?? $stake->total_amount ?? 0);
                $kit = null;
                if (!empty($stake->kit_id) && Schema::hasTable('stake_masters')) {
                    $kitModel = StakeMaster::find($stake->kit_id);
                    $kit = $kitModel?->name ?: ('$' . $this->formatMoney($amount));
                }
                $kit = $kit ?: $this->resolveKitName($amount);
                $tx = '';
                $desc = (string) ($stake->description ?? '');
                if (preg_match('/blockchain:(0x[a-fA-F0-9]{64})/', $desc, $m)) {
                    $tx = strtolower($m[1]);
                } elseif (preg_match('/0x[a-fA-F0-9]{64}/', $desc, $m)) {
                    $tx = strtolower($m[0]);
                }

                $roiCap = $amount * 3;
                $stakedRoi = (float) ($stake->receive_return ?? 0);
                $up = (int) ($stake->up_status ?? 0);
                $status = $up === 2 ? 'completed' : ($up === 1 ? 'pending' : 'active');

                $investments[] = [
                    'request' => 'STK-' . $stake->id,
                    'amount' => $this->formatMoney($amount),
                    'packageAmount' => $this->formatMoney($amount),
                    'packageName' => $kit,
                    'btcPlan' => $kit,
                    'activationOn' => $this->formatDate($stake->created_at),
                    'txnHash' => $tx,
                    'txnHashUrl' => ($explorerBase !== '' && $tx !== '')
                        ? (rtrim($explorerBase, '/') . '/tx/' . $tx)
                        : null,
                    'maturity' => $this->formatDate($stake->return_date ?? null) ?: '—',
                    'status' => $status,
                    'roiEarned' => $this->formatMoney($stakedRoi),
                    'roiRemaining' => $this->formatMoney(max(0, $roiCap - $stakedRoi)),
                    'roiCap' => $this->formatMoney($roiCap),
                    'workingIncome' => $this->formatMoney($workingEarned),
                    'totalEarned' => $this->formatMoney($roiEarned + $workingEarned),
                    'blockchainStatus' => $tx !== '' ? 'Mirrored from stake ledger' : 'Off-chain / legacy',
                    'packageCycle' => null,
                    'blockNumber' => null,
                ];
            }
        }

        $totalInvested = 0.0;
        $activeInvestment = 0.0;
        $completed = 0;
        foreach ($investments as $inv) {
            $amt = (float) ($inv['packageAmount'] ?? $inv['amount'] ?? 0);
            $totalInvested += $amt;
            if (($inv['status'] ?? '') === 'active') {
                $activeInvestment += $amt;
            }
            if (($inv['status'] ?? '') === 'completed') {
                $completed++;
            }
        }

        // Prefer user.self_investment when present
        if (Schema::hasColumn('users', 'self_investment') && (float) ($user->self_investment ?? 0) > 0) {
            $totalInvested = (float) $user->self_investment;
        }

        return [
            'summary' => [
                'totalInvested' => $this->formatMoney($totalInvested),
                'activeInvestment' => $this->formatMoney($activeInvestment > 0 ? $activeInvestment : $totalInvested),
                'completedPackages' => $completed,
                'roiEarned' => $this->formatMoney($roiEarned),
            ],
            'investments' => $investments,
        ];
    }

    protected function sumEarningType(int $memberId, int $earningType): float
    {
        if (!Schema::hasTable('ewallet_logs')) {
            return 0.0;
        }

        return (float) EarningWallet::where('member_id', $memberId)
            ->where('txn_type', 1)
            ->where('earning_type', $earningType)
            ->sum('amount');
    }

    protected function resolveKitName(float $amount): string
    {
        if ($amount <= 0) {
            return 'Package';
        }
        if (Schema::hasTable('stake_masters')) {
            $kit = StakeMaster::where('amount', $amount)->first();
            if ($kit !== null && !empty($kit->name)) {
                return (string) $kit->name;
            }
        }
        return '$' . rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . ' Package';
    }

    protected function investmentStatus(string $ledgerStatus, float $amount, User $user): string
    {
        $ledgerStatus = strtolower(trim($ledgerStatus));
        if ($ledgerStatus === 'completed' || $ledgerStatus === 'expired') {
            return $ledgerStatus;
        }
        if ($amount > 0 && (float) ($user->package_amount ?? $user->package_id ?? 0) > 0) {
            return 'active';
        }
        return $ledgerStatus === 'verified' ? 'active' : 'pending';
    }

    protected function stakedReceiveReturn(int $memberId, string $txHash, float $amount): float
    {
        if (!Schema::hasTable('staked_users')) {
            return 0.0;
        }

        $query = UserStaked::where('member_id', $memberId);
        if ($txHash !== '') {
            $match = (clone $query)->where('description', 'like', '%' . $txHash . '%')->first();
            if ($match !== null) {
                return (float) ($match->receive_return ?? 0);
            }
        }

        $match = $query->where('paid_amount', $amount)->orderByDesc('id')->first();
        return (float) ($match->receive_return ?? 0);
    }

    protected function memberLabel(User $row): string
    {
        $name = trim(($row->firstname ?? '') . ' ' . ($row->lastname ?? ''));
        $wallet = (string) ($row->username ?? '');
        $short = function_exists('obscureAddress') ? obscureAddress($wallet) : $wallet;
        if ($name === '' || strcasecmp($name, 'null null') === 0) {
            return $short;
        }
        return trim($name . ' · ' . $short);
    }

    protected function formatDate(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        try {
            return date('d/m/Y H:i', strtotime((string) $value));
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    protected function formatMoney(mixed $value): string
    {
        return number_format((float) $value, 4, '.', '');
    }
}
