@php
    $boot = [
        'page' => 'my-referrals',
        'referrals' => [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'My Referral'])
