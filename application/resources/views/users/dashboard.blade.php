@php
    use Illuminate\Support\Facades\Auth;

    $base = rtrim(URL::to('/'), '/');
    $user = Auth::user();

    $gt_effective_cap = $object->total_earning + $object->total_3x_remain;
    $gt_used_pct = $gt_effective_cap > 0 ? min(100, round(($object->total_earning / $gt_effective_cap) * 100, 1)) : 0;

    $gt_next_rank = null;
    if ($object->current_rank && $object->allsalary) {
        $gt_found_current = false;
        foreach ($object->allsalary as $gt_tier) {
            if ($gt_found_current) {
                $gt_next_rank = $gt_tier;
                break;
            }
            if ($gt_tier->id == $object->current_rank->id) {
                $gt_found_current = true;
            }
        }
    } elseif (!$object->current_rank && $object->allsalary && count($object->allsalary) > 0) {
        $gt_next_rank = $object->allsalary[0];
    }

    $gt_team_business = $user->team_investment ?? 0;
    $gt_rank_pct = ($gt_next_rank && $gt_next_rank->business > 0)
        ? min(100, round(($gt_team_business / $gt_next_rank->business) * 100, 1))
        : 0;

    $displayName = trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? ''));
    if ($displayName === '') {
        $displayName = 'Explorer';
    }

    $boot = [
        'page' => 'dashboard',
        'baseUrl' => $base . '/',
        'assetsUrl' => $base . '/assets',
        'csrfToken' => csrf_token(),
        'currentPath' => '/' . ltrim(request()->path(), '/'),
        'user' => [
            'firstName' => $user->firstname ?? '',
            'lastName' => $user->lastname ?? '',
            'displayName' => $displayName,
            'username' => $user->username ?? '',
            'obscuredAddress' => obscureAddress($user->username ?? ''),
            'email' => $user->email ?: null,
            'avatar' => $base . '/assets/images/user/avatar-1.jpg',
            'packageName' => optional($user->kit)->name ?: ($user->package_id ? ('$' . $user->package_id) : null),
            'packageAmount' => optional($user->kit)->amount ?: $user->package_id,
            'packageRoi' => optional($user->kit)->percantage,
        ],
        'registration' => [
            'status' => $user->registration_status ?: ($user->activation_date ? 'completed' : 'pending'),
            'walletStatus' => $user->wallet_status ?: 'unverified',
            'transactionHash' => $user->transaction_hash,
            'packageTxHash' => $user->package_tx_hash,
            'approveTxHash' => $user->approve_tx_hash ?? null,
            'blockNumber' => $user->registration_block,
            'packageId' => $user->package_amount ?: $user->package_id,
            'chainId' => $user->chain_id,
            'registeredAt' => optional($user->registration_timestamp)->toIso8601String(),
        ],
        'referral' => [
            'displayUrl' => $base . '/invite/' . obscureAddress($user->username ?? ''),
            'copyUrl' => $base . '/sign-up?ref=' . ($user->username ?? ''),
        ],
        'wallet' => [
            'chainBalance' => '0.00000000 BNB',
            'earningWallet' => $object->total_balance,
            'potentialWallet' => $object->total_pw_balance,
        ],
        'income' => [
            'total' => $object->total_earning,
            'today' => $object->total_income_today,
        ],
        'directTeam' => [
            'total' => (int) $object->total_referral,
            'active' => (int) $object->total_a_referral,
            'inactive' => (int) $object->total_ia_referral,
        ],
        'totalTeam' => [
            'total' => (int) $object->total_team,
            'active' => (int) $object->total_a_team,
            'inactive' => (int) $object->total_ia_team,
        ],
        'rewards' => [
            ['label' => 'ROI Reward', 'value' => $object->total_daily_roi_bonus ?? 0],
            ['label' => 'Contribution Reward', 'value' => $object->total_referral_bonus ?? 0],
            ['label' => 'Booster Reward', 'value' => $object->total_daily_level_bonus ?? 0],
            ['label' => 'Rank Reward', 'value' => $object->total_salary_bonus ?? 0],
            ['label' => 'Same Rank Reward', 'value' => $object->total_team_level_bonus ?? 0],
            ['label' => 'Community Builder', 'value' => $object->total_turnover_bonus ?? 0],
        ],
        'roi' => [
            'progress' => $gt_used_pct,
            'earned' => $object->total_earning,
            'remaining' => $object->total_3x_remain,
        ],
        'rank' => [
            'current' => optional($object->current_rank)->rank ?? 'Q0',
            'next' => optional($gt_next_rank)->rank,
            'progress' => $gt_rank_pct,
            'teamVolume' => $gt_team_business,
            'required' => optional($gt_next_rank)->business,
        ],
        'packages' => [
            ['amount' => 50, 'label' => '$50'],
            ['amount' => 100, 'label' => '$100'],
            ['amount' => 300, 'label' => '$300'],
            ['amount' => 500, 'label' => '$500'],
        ],
        'selectedPackage' => $user->package_id ? (int) $user->package_id : null,
        'blockNumber' => $user->registration_block ? number_format((int) $user->registration_block) : number_format(42318904),
        'links' => [
            'dashboard' => $base . '/dashboard',
            'profile' => $base . '/update-profile',
            'referrals' => $base . '/my-referral',
            'teamNetwork' => $base . '/downline-report/A',
            'investNow' => $base . '/buy-robo',
            'myInvestments' => $base . '/bot-request',
            'wallet' => $base . '/earning-wallet',
            'roiHistory' => $base . '/earning/1/ROI History',
            'contributionReward' => $base . '/earning/2/Contribution Reward',
            'boosterReward' => $base . '/earning/3/Booster Reward',
            'rankReward' => $base . '/earning/4/Rank Reward',
            'support' => $base . '/create-ticket',
            'signOut' => $base . '/sign-out',
            'secureAccount' => $base . '/secure-account',
            'resetPassword' => $base . '/change-password',
        ],
    ];

    $manifestPath = base_path('../assets/build/manifest.json');
    $manifest = file_exists($manifestPath)
        ? json_decode(file_get_contents($manifestPath), true)
        : [];
    $mainEntry = $manifest['resources/js/member-panel/main.tsx'] ?? null;
    $cssEntry = $manifest['resources/css/member-panel.css'] ?? null;
    $viteHot = base_path('../assets/build/hot');
    $viteDev = file_exists($viteHot) ? trim(file_get_contents($viteHot)) : null;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $page_titel }}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0d12'/%3E%3Ctext x='16' y='23' font-family='Arial,sans-serif' font-size='19' font-weight='700' fill='%2300c2ff' text-anchor='middle'%3EQ%3C/text%3E%3C/svg%3E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @if($viteDev)
        <script type="module" src="{{ $viteDev }}/@vite/client"></script>
        <script type="module" src="{{ $viteDev }}/resources/js/member-panel/main.tsx"></script>
    @else
        @if($cssEntry)
            <link rel="stylesheet" href="{{ $base }}/assets/build/{{ $cssEntry['file'] }}">
        @endif
        @foreach(($mainEntry['css'] ?? []) as $cssFile)
            <link rel="stylesheet" href="{{ $base }}/assets/build/{{ $cssFile }}">
        @endforeach
        @if($mainEntry)
            <script type="module" src="{{ $base }}/assets/build/{{ $mainEntry['file'] }}"></script>
        @endif
    @endif
    <style>
        html, body { margin: 0; min-height: 100%; background: #0a0b14; }
        #member-panel-root { min-height: 100vh; }
    </style>
</head>
<body>
    <input type="hidden" value="{{ URL::to('/') }}" id="basePath"/>
    <input type="hidden" id="token" value="{{ csrf_token() }}"/>

    <div id="member-panel-root"></div>

    <script>
        window.__QUANTARA_BOOT__ = @json($boot);
        window.__QUANTARA_DASHBOARD__ = window.__QUANTARA_BOOT__;
    </script>

    <script src="{{ URL::to('/') }}/assets/common/js/jquery.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/web3.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/jquery.blockUI.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/common.js"></script>
</body>
</html>
