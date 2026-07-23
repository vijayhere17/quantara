@php
    use Illuminate\Support\Facades\Auth;
    use App\Http\Controllers\Users\EarningWalletController;

    $user = Auth::user();
    $walletCon = app(EarningWalletController::class);
    $balance = $walletCon->getearningbalance($user->id);

    $boot = [
        'page' => 'withdraw',
        'balance' => (float) $balance,
        'walletAddress' => strtolower((string) ($user->wallet_addr ?: $user->username)),
        'coinRate' => function_exists('getcoinrate') ? (float) getcoinrate() : 1,
        'minAmount' => 10,
        'adminChargePercent' => 0,
        'wallet' => [
            'chainBalance' => '0.00000000 BNB',
            'earningWallet' => number_format((float) $balance, 4, '.', ''),
            'potentialWallet' => '0.0000',
        ],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'Withdrawal'])
