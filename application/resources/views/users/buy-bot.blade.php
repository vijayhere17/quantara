@php
    use Illuminate\Support\Facades\Auth;

    $user = Auth::user();
    $amounts = [50, 100, 300, 500, 1000, 3000, 5000, 10000];
    $currentAmount = (int) ($user->package_amount ?? $user->package_id ?? 0);
    $currentCycle = (int) ($user->package_cycle ?? 0);

    // Mirror BTCPlanCore.getNextEligiblePackage for UI locks
    $nextAmount = 50;
    $nextCycle = 1;
    if ($currentAmount <= 0) {
        $nextAmount = 50;
        $nextCycle = 1;
    } else {
        $idx = array_search($currentAmount, $amounts, true);
        if ($idx === false) {
            $nextAmount = 50;
            $nextCycle = 1;
        } elseif ($currentCycle < 2) {
            $nextAmount = $currentAmount;
            $nextCycle = $currentCycle + 1;
        } elseif ($currentAmount === 10000) {
            $nextAmount = 10000;
            $nextCycle = 2; // unlimited topups
        } else {
            $nextAmount = $amounts[$idx + 1] ?? 10000;
            $nextCycle = 1;
        }
    }

    $packages = [];
    foreach ($amounts as $amount) {
        $unlocked = $amount === $nextAmount;
        $buys = 0;
        if ($currentAmount === $amount) {
            $buys = max(0, $currentCycle);
        } elseif ($currentAmount > $amount || ($currentAmount === 10000 && $amount < 10000)) {
            $buys = 2;
        }
        $packages[] = [
            'amount' => $amount,
            'label' => '$' . $amount,
            'multiplier' => '4X Max',
            'buys' => $buys,
            'maxBuys' => 2,
            'locked' => !$unlocked,
            'unlimited' => $amount === 10000,
        ];
    }

    $boot = [
        'page' => 'invest-now',
        'btcRate' => function_exists('getcoinrate') ? (float) getcoinrate() : 62000,
        'packages' => $packages,
        'activePackage' => [
            'label' => $currentAmount > 0 ? ('$' . $currentAmount) : 'None',
            'cycle' => $currentAmount === 10000 && $currentCycle >= 2
                ? 'Unlimited'
                : (($currentCycle ?: 0) . ' of 2'),
            'status' => $currentAmount > 0 ? 'Active' : 'Inactive',
        ],
        'info' => [
            'expectedRoi' => 'Up to 1% daily (pool-funded)',
            'roiCap' => '3X Maximum (ROI stops at total 3X)',
            'workingCap' => '4X Working incomes',
            'treasuryAllocation' => '30% regen / 25% ROI / 3% reserve / 2% community / 40% working',
        ],
        'nextPackageProgress' => $currentAmount > 0 ? min(100, (int) (($currentCycle / 2) * 100)) : 0,
        'nextEligible' => [
            'amount' => $nextAmount,
            'cycle' => $nextCycle,
        ],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'BTC Plan Activation'])
