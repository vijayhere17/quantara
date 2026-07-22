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

    .gt-card .form-control,
    .gt-card select.form-control{
        background:#0d131c !important;
        border:1px solid rgba(255,255,255,.10) !important;
        color:#fff !important;
        border-radius:12px !important;
        min-height:48px;
        padding:10px 16px;
        appearance:auto;
    }
    .gt-card .form-control:focus,
    .gt-card select.form-control:focus{
        border-color:#00c2ff !important;
        box-shadow:0 0 0 4px rgba(0,194,255,.15) !important;
        outline:none;
    }
    .gt-card select.form-control option{
        background:#101722;
        color:#fff;
    }

    .table-responsive{
    border-radius:14px;
    overflow-x:auto;
    overflow-y:hidden;
    border:1px solid rgba(255,255,255,.07);
    -webkit-overflow-scrolling:touch;
}
table.dataTable{
    min-width:750px;
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
        white-space:nowrap;
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
            <li class="breadcrumb-item"><a href="javascript:void(0)">Referral &amp; Downline</a></li>
            <li class="breadcrumb-item active" aria-current="page">{{ $page_titel }}</li>
        </ol>
    </nav>
    <h2 class="mb-0">{{ $page_titel }}</h2>
</div>

<div class="row">
    <div class="col-md-12">
        <div class="card gt-card">
            <div class="card-header">
                <h5>Downline Report</h5>
            </div>
            <div class="card-body">
                <form onsubmit="return false;">
                    <div class="row mb-3 g-3">
                        <div class="col-lg-4">
                            <select class="form-control" name="level" id="level" onchange="oTable.draw()">
                                <option value="0">All Levels</option>
                                @for($i = 1; $i <= 25; $i++)
                                    <option value="{{ $i }}">Level {{ $i }}</option>
                                @endfor
                            </select>
                        </div>
                        <div class="col-lg-4">
                            <select class="form-control" name="paidsearch" id="paidsearch" onchange="oTable.draw()">
                                <option value="">All</option>
                                <option value="1">Active User</option>
                                <option value="0">Inactive User</option>
                            </select>
                        </div>
                    </div>
                </form>

                <div class="table-responsive">
                    <table class="table" id="tableList">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>User Details</th>
                                <th>Activation On</th>
                                <th>Total Topup</th>
                                <th>Status</th>
                                <th>Registered Date</th>
                                <th>Referral Details</th>
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
<script src="{{ URL::to('/') }}/assets/js/users/downline-report.1.1.js?v=2"></script>
@endsection