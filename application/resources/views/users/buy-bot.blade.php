@php
    $boot = [
        'page' => 'invest-now',
        'btcRate' => 62000,
        'packages' => [
            ['amount' => 50, 'label' => '$50', 'multiplier' => '4X Max', 'buys' => 1, 'maxBuys' => 2, 'locked' => false],
            ['amount' => 100, 'label' => '$100', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => false],
            ['amount' => 300, 'label' => '$300', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => false],
            ['amount' => 500, 'label' => '$500', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => true],
            ['amount' => 1000, 'label' => '$1000', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => true],
            ['amount' => 3000, 'label' => '$3000', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => true],
            ['amount' => 5000, 'label' => '$5000', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => true],
            ['amount' => 10000, 'label' => '$10000', 'multiplier' => '4X Max', 'buys' => 0, 'maxBuys' => 2, 'locked' => true, 'unlimited' => true],
        ],
        'activePackage' => [
            'label' => '$50',
            'cycle' => '1 of 2',
            'status' => 'Active',
        ],
        'info' => [
            'expectedRoi' => 'Daily ROI per plan rules',
            'roiCap' => '3X Maximum',
            'workingCap' => '4X Maximum',
            'treasuryAllocation' => 'Protocol treasury share',
        ],
        'nextPackageProgress' => 50,
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'BTC Plan Activation'])
