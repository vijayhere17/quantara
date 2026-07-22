@extends('users.master')
@section('extra')
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
<style>
    .gt-card{
        background:
            linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)),
            rgba(18,25,36,.9);
        border:1px solid rgba(255,255,255,.08);
        border-radius:20px;
        box-shadow:0 22px 55px rgba(0,0,0,.35), 0 0 0 1px rgba(0,194,255,.06);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        overflow:hidden;
    }
    .gt-card .card-header{
        background:linear-gradient(90deg, rgba(0,194,255,.12), rgba(115,229,255,.03));
        border-bottom:1px solid rgba(255,255,255,.07);
        padding:20px 24px;
    }
    .gt-card .card-header h5{
        color:#fff;
        font-weight:700;
        letter-spacing:.01em;
        margin:0;
    }
    .gt-card .card-body{
        padding:24px;
    }

    .filter-card{
        background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        transition:all .25s ease;
    }
    .filter-card:has(.form-check-input:checked){
        border-color:rgba(0,194,255,.4);
        background:rgba(0,194,255,.08);
        box-shadow:0 8px 22px rgba(0,194,255,.14);
    }
    .filter-card .form-check{
        display:flex;
        align-items:center;
        gap:12px;
        margin:0;
    }

    .form-check-input{
        appearance:none !important;
        -webkit-appearance:none !important;
        width:22px !important;
        height:22px !important;
        min-width:22px;
        border-radius:50% !important;
        background:#101722 !important;
        border:2px solid rgba(255,255,255,.30) !important;
        cursor:pointer;
        transition:.25s;
        outline:none;
        box-shadow:none !important;
        margin:0 !important;
    }
    .form-check-input:hover{ border-color:#00c2ff !important; }
    .form-check-input:checked{
        background:#00c2ff !important;
        border-color:#00c2ff !important;
        box-shadow:0 0 0 5px rgba(0,194,255,.18) !important;
    }
    .form-check-label{
        color:#fff !important;
        font-weight:600;
        cursor:pointer;
    }
    .form-check-label .h5{
        color:#fff;
        font-size:15px;
        font-weight:700;
        margin:0;
    }

    *:focus{ outline:none; }
    .form-check-input:focus,
    .form-control:focus,
    .form-select:focus{
        border-color:#00c2ff !important;
        box-shadow:0 0 0 4px rgba(0,194,255,.15) !important;
    }

    .table-responsive{
    border-radius:14px;
    overflow-x:auto;
    overflow-y:hidden;
    border:1px solid rgba(255,255,255,.07);
    -webkit-overflow-scrolling:touch;
}
table.dataTable{
    min-width:650px;
}
    table.dataTable{
        color:#dbe4ef;
        margin:0 !important;
    }
    table.dataTable thead th{
        background:rgba(0,194,255,.08);
        color:#aab6c8;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.08em;
        border-bottom:1px solid rgba(255,255,255,.08) !important;
        padding:14px 16px;
    }
    table.dataTable tbody td{
        border-bottom:1px solid rgba(255,255,255,.05) !important;
        padding:14px 16px;
        vertical-align:middle;
    }
    table.dataTable tbody tr{
        background:transparent;
        transition:background .2s ease;
    }
    table.dataTable tbody tr:hover{
        background:rgba(0,194,255,.05);
    }

    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_filter,
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_paginate{
        color:#aab6c8;
        margin:12px 0;
    }
    .dataTables_wrapper select,
    .dataTables_wrapper input{
        background:#101722 !important;
        color:#fff !important;
        border:1px solid rgba(255,255,255,.10) !important;
        border-radius:10px !important;
        padding:6px 12px !important;
    }
    .dataTables_wrapper .dataTables_paginate .paginate_button{
        color:#aab6c8 !important;
        border:1px solid rgba(255,255,255,.08) !important;
        border-radius:8px !important;
        margin-left:4px;
        background:transparent !important;
    }
    .dataTables_wrapper .dataTables_paginate .paginate_button.current,
    .dataTables_wrapper .dataTables_paginate .paginate_button:hover{
        background:linear-gradient(90deg,#00c2ff,#73e5ff) !important;
        color:#061019 !important;
        border-color:transparent !important;
    }
    .dataTables_wrapper .dataTables_paginate .paginate_button.disabled{
        opacity:.4;
    }

    .text-warning, .bg-warning, .btn-warning,
    .badge.bg-warning, .badge-warning, .alert-warning{
        background:#00c2ff !important;
        color:#061019 !important;
        border-color:#00c2ff !important;
    }

    .badge-status-active{
        background:rgba(34,197,94,.14);
        color:#22c55e;
        padding:4px 12px;
        border-radius:20px;
        font-size:12px;
        font-weight:600;
    }
    .badge-status-inactive{
        background:rgba(255,107,129,.14);
        color:#ff6b81;
        padding:4px 12px;
        border-radius:20px;
        font-size:12px;
        font-weight:600;
    }
</style>
@endsection
@section('content')
<div class="page-header mb-4">
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-2">
            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
            <li class="breadcrumb-item"><a href="javascript:void(0)">Referrals &amp; Downline</a></li>
            <li class="breadcrumb-item active" aria-current="page">{{ $page_titel }}</li>
        </ol>
    </nav>
    <h2 class="mb-0">{{ $page_titel }}</h2>
</div>

<div class="row">
    <div class="col-md-12">
        <div class="card gt-card">
            <div class="card-header">
                <h5>My Referrals List</h5>
            </div>
            <div class="card-body">
                <form onsubmit="return false;">
                    <div class="row mb-3 g-3">
                        <div class="col-lg-4">
                            <div class="filter-card p-3">
                                <div class="form-check">
                                    <input type="radio" name="paid_search" class="form-check-input" id="alluser" value="" checked onclick="oTable.draw();">
                                    <label class="form-check-label" for="alluser">
                                        <span class="h5">All User</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="filter-card p-3">
                                <div class="form-check">
                                    <input type="radio" name="paid_search" class="form-check-input" id="paiduser" value="1" onclick="oTable.draw();">
                                    <label class="form-check-label" for="paiduser">
                                        <span class="h5">Active User</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="filter-card p-3">
                                <div class="form-check">
                                    <input type="radio" name="paid_search" class="form-check-input" id="unpaiduser" value="0" onclick="oTable.draw();">
                                    <label class="form-check-label" for="unpaiduser">
                                        <span class="h5">Inactive User</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <div class="table-responsive">
                    <table class="table" id="tableList">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>User Name</th>
                                <th>Activation On</th>
                                <th>Total Topup</th>
                                <th>Status</th>
                                <th>Registered Date</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
@section('jscontent')
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
<script src="{{ URL::to('/') }}/assets/js/users/my-referral.0.4.js?v=2"></script>
@endsection