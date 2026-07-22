@php
    /** @var array $boot */
    $base = rtrim(URL::to('/'), '/');
    $boot = array_merge([
        'baseUrl' => $base . '/',
        'assetsUrl' => $base . '/assets',
        'csrfToken' => csrf_token(),
        'currentPath' => '/' . ltrim(request()->path(), '/'),
        'links' => [
            'home' => $base . '/',
            'signIn' => $base . '/sign-in',
            'signUp' => $base . '/sign-up',
            'forgotPassword' => $base . '/forgot-password',
            'dashboard' => $base . '/dashboard',
        ],
    ], $boot ?? []);

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
    <link rel="stylesheet" href="{{ URL::to('/') }}/assets/common/alert/cute-style.css">
    @if($viteDev)
        <script type="module" src="{{ $viteDev }}/@vite/client"></script>
        <script type="module" src="{{ $viteDev }}/resources/js/member-panel/main.tsx"></script>
    @else
        @if($cssEntry)
            <link rel="stylesheet" href="{{ URL::to('/') }}/assets/build/{{ $cssEntry['file'] }}">
        @endif
        @if($mainEntry)
            <script type="module" src="{{ URL::to('/') }}/assets/build/{{ $mainEntry['file'] }}"></script>
        @endif
    @endif
    <style>
        html, body { margin: 0; background: #0b1020; }
        #member-panel-root { min-height: 100vh; }
        .sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        }
    </style>
</head>
<body>
    <input type="hidden" value="{{ URL::to('/') }}" id="basePath"/>
    <input type="hidden" id="token" value="{{ csrf_token() }}"/>

    <div id="auth-main">
        <div id="member-panel-root"></div>
    </div>

    <script>
        window.__QUANTARA_BOOT__ = @json($boot);
    </script>

    <script src="{{ URL::to('/') }}/assets/common/js/jquery.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/alert/cute-alert.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/web3.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/ethers-v4.min.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/jquery.blockUI.js"></script>
    <script src="{{ URL::to('/') }}/assets/common/js/common.0.8.js"></script>
    <script>
        // Bridge React modules ↔ legacy classic-script wallet state
        window.setQuantaraWalletConnected = function (connected) {
            try { is_connected = !!connected; } catch (e) {}
            window.is_connected = !!connected;
        };
        window.is_connected = false;
    </script>

    @isset($authScript)
        <script src="{{ URL::to('/') }}/{{ $authScript }}"></script>
    @endisset

    <script>
        // Expose login/register processors for React onClick fallbacks
        if (typeof processlogin === 'function') {
            window.processlogin = processlogin;
        }
        if (typeof processregister === 'function') {
            window.processregister = processregister;
        }
        if (typeof erroralert === 'function') {
            window.erroralert = erroralert;
        }
    </script>
    @isset($authBridge)
        {!! $authBridge !!}
    @endisset
</body>
</html>
