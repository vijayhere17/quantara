@extends('users.master')
@section('extra')
@endsection
@section('content')
<div class="pc-container">
    <div class="pc-content">
        <!-- [ breadcrumb ] start -->
        <div class="page-header">
            <div class="page-block">
                <div class="row align-items-center">
                    <div class="col-md-12">
                        <ul class="breadcrumb">
                            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item" aria-current="page">{{ $page_titel }}</li>
                        </ul>
                    </div>
                    <div class="col-md-12">
                        <div class="page-header-title">
                            <h2 class="mb-0">{{ $page_titel }}</h2>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- [ breadcrumb ] end -->

        <div class="row">
            <!-- [ form-element ] start -->
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Turnover Reward Achievement</h5>
                    </div>
                    <div class="card-body table-border-style">
                        <div class="row g-3 mt-0">
                            <div class="col-sm-4">
                                <div class="bg-body p-3 rounded">
                                    <div class="d-flex align-items-center mb-2">
                                        <div class="flex-shrink-0">
                                            <span class="p-1 d-block bg-primary rounded-circle">
                                                <span class="visually-hidden">Leg 1 (40%)</span>
                                            </span>
                                        </div>
                                        <div class="flex-grow-1 ms-2">
                                            <p class="mb-0">Leg 1 (40%)</p>
                                        </div>
                                    </div>
                                    <h6 class="mb-0">$ {{ $leg_data['leg1_business'] }}</h6>
                                </div>
                            </div>
                            <div class="col-sm-4">
                                <div class="bg-body p-3 rounded">
                                    <div class="d-flex align-items-center mb-2">
                                        <div class="flex-shrink-0">
                                            <span class="p-1 d-block bg-warning rounded-circle">
                                                <span class="visually-hidden">Leg 2 (40%)</span>
                                            </span>
                                        </div>
                                        <div class="flex-grow-1 ms-2">
                                            <p class="mb-0">Leg 2 (40%)</p>
                                        </div>
                                    </div>
                                    <h6 class="mb-0">$ {{ $leg_data['leg2_business'] }}</h6>
                                </div>
                            </div>
                            <div class="col-sm-4">
                                <div class="bg-body p-3 rounded">
                                    <div class="d-flex align-items-center mb-2">
                                        <div class="flex-shrink-0">
                                            <span class="p-1 d-block bg-success rounded-circle">
                                                <span class="visually-hidden">Other Legs (20%)</span>
                                            </span>
                                        </div>
                                        <div class="flex-grow-1 ms-2">
                                            <p class="mb-0">Other Legs (20%)</p>
                                        </div>
                                    </div>
                                    <h6 class="mb-0">$ {{ $leg_data['leg3_business'] }}</h6>
                                </div>
                            </div>
                        </div>

                        <div class="table-responsive mt-4">
                            <table class="table" id="tableList">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Turnover</th>
                                        <th>Cash Reward</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($allrewards as $reward)
                                    <tr>
                                        <td>{{ $reward->milestone_order }}</td>
                                        <td>${{ number_format($reward->turnover_amount) }}</td>
                                        <td>${{ number_format($reward->cash_reward) }}</td>
                                        <td>
                                            @if(in_array($reward->id, $achieved_ids))
                                                <span class="badge bg-success">Achieved</span>
                                            @else
                                                <span class="badge bg-warning">Pending</span>
                                            @endif
                                        </td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
@section('jscontent')
@endsection
