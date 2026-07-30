@php
    $boot = [
        'page' => 'downline-ranks',
        'downlineRanks' => $downlineRanks ?? [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'Downline Ranks'])
