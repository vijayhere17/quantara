@php
    $boot = [
        'page' => 'downline-report',
        'downlines' => [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'Downline Report'])
