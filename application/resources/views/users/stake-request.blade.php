@php
    $boot = [
        'page' => 'my-investments',
        'summary' => $summary ?? [
            'totalInvested' => '0.0000',
            'activeInvestment' => '0.0000',
            'completedPackages' => 0,
            'roiEarned' => '0.0000',
        ],
        'investments' => $investments ?? [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'My Investments'])
