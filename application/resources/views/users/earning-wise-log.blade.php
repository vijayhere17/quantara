@php
    $boot = [
        'page' => 'incentive-report',
        'reportTitle' => $page_titel ?? 'ROI History',
        'logType' => $logtype ?? 1,
        'records' => $records ?? [],
    ];
@endphp
@include('users.layouts.member-react', ['boot' => $boot, 'page_titel' => $page_titel ?? 'ROI History'])
