@php
    $boot = [
        'page' => 'create-ticket',
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'Create Ticket'])
