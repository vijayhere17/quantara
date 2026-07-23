@php
    $boot = [
        'page' => 'earning-wallet',
        'summary' => [
            'totalCredit' => isset($cradit) ? $cradit : '0.0000',
            'totalDebit' => isset($debit) ? $debit : '0.0000',
            'availableBalance' => isset($balance) ? $balance : '0.0000',
        ],
        'transactions' => $transactions ?? [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'Earning Wallet'])
