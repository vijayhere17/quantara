@php
    use Illuminate\Support\Facades\Auth;

    /** @var array $boot */
    $base = rtrim(URL::to('/'), '/');
    $user = Auth::user();
    $displayName = trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? ''));
    if ($displayName === '') {
        $displayName = 'Explorer';
    }

    $shell = [
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
            'packageName' => optional($user->kit)->name,
            'packageAmount' => optional($user->kit)->amount,
            'packageRoi' => optional($user->kit)->percantage,
        ],
        'wallet' => [
            'chainBalance' => '0.00000000 BNB',
            'earningWallet' => '0.0000',
            'potentialWallet' => '0.0000',
        ],
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

    $boot = array_merge($shell, $boot ?? []);

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
    <title>{{ $page_titel ?? 'Quantara' }}</title>
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
    </script>

    <script src="{{ URL::to('/') }}/assets/common/js/jquery.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/web3.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/jquery.blockUI.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/common.js"></script>
</body>
</html>
