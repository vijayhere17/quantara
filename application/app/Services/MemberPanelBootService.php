<?php

namespace App\Services;

use App\Models\EarningWallet;
use App\Models\LevelReferral;
use App\Models\User;
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
