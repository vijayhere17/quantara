@extends('users.master')

@section('extra')
<style>
    .pc-content{
        position:relative;
        padding:24px;
        border-radius:24px;
        background:
            radial-gradient(circle at top right, rgba(0,194,255,.10), transparent 22%),
            radial-gradient(circle at left top, rgba(115,229,255,.08), transparent 18%),
            linear-gradient(180deg, rgba(9,14,22,.96), rgba(12,18,29,.98));
    }

    .page-header{
        margin-bottom:24px;
    }

    .page-header .breadcrumb{
        margin-bottom:10px;
    }

    .page-header .breadcrumb .breadcrumb-item,
    .page-header .breadcrumb .breadcrumb-item a{
        color:#8fa3ba;
        font-size:13px;
        font-weight:500;
    }

    .page-header .breadcrumb .breadcrumb-item.active,
    .page-header .breadcrumb .breadcrumb-item[aria-current="page"]{
        color:#eaf6ff;
    }

    .page-header-title h2{
        color:#fff;
        font-weight:800;
        letter-spacing:-.02em;
        margin-bottom:0;
    }

    .gt-report-card{
        position:relative;
        background:
            linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)),
            rgba(18,25,36,.90);
        border:1px solid rgba(255,255,255,.08);
        border-radius:22px;
        box-shadow:0 22px 55px rgba(0,0,0,.35), 0 0 0 1px rgba(0,194,255,.06);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        overflow:hidden;
    }

    .gt-report-card:before{
        content:"";
        position:absolute;
        inset:0;
        border-radius:22px;
        padding:1px;
        background:linear-gradient(135deg, rgba(0,194,255,.32), rgba(115,229,255,.04), rgba(255,255,255,.04));
        -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor;
        mask-composite:exclude;
        pointer-events:none;
    }

    .gt-report-head{
        position:relative;
        z-index:1;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:18px;
        flex-wrap:wrap;
        padding:22px 24px 18px;
        border-bottom:1px solid rgba(255,255,255,.07);
        background:linear-gradient(90deg, rgba(0,194,255,.10), rgba(115,229,255,.03));
    }

    .gt-report-kicker{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:7px 12px;
        border-radius:999px;
        margin-bottom:12px;
        background:rgba(0,194,255,.10);
        border:1px solid rgba(115,229,255,.12);
        color:#8fe9ff;
        font-size:11px;
        font-weight:700;
        letter-spacing:.08em;
        text-transform:uppercase;
    }

    .gt-report-title{
        color:#fff;
        font-size:22px;
        font-weight:800;
        letter-spacing:-.02em;
        margin:0 0 6px;
    }

    .gt-report-subtitle{
        color:#9fb1c8;
        font-size:14px;
        line-height:1.7;
        margin:0;
        max-width:760px;
    }

    .gt-report-badge{
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:42px;
        padding:0 14px;
        border-radius:999px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.08);
        color:#dff7ff;
        font-size:13px;
        font-weight:600;
        white-space:nowrap;
    }

    .gt-report-body{
        position:relative;
        z-index:1;
        padding:24px;
    }

    .table-border-style{
        background:transparent !important;
    }

    .table-responsive{
        border:1px solid rgba(255,255,255,.06);
        border-radius:18px;
        overflow:hidden;
        background:rgba(10,14,22,.45);
    }

    #tableList{
        margin-bottom:0 !important;
        color:#e8f3ff;
        border-collapse:separate;
        border-spacing:0;
    }

    #tableList thead th{
        background:rgba(255,255,255,.03);
        color:#9fb1c8;
        border-top:none !important;
        border-bottom:1px solid rgba(255,255,255,.08) !important;
        font-size:12px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.05em;
        padding:16px 14px;
        white-space:nowrap;
    }

    #tableList tbody tr{
        transition:transform .22s ease, box-shadow .22s ease, background .22s ease;
    }

    #tableList tbody td{
        position:relative;
        background:transparent !important;
        color:#e7f1ff;
        border-color:rgba(255,255,255,.06) !important;
        padding:16px 14px;
        vertical-align:middle;
        font-size:14px;
        transition:color .22s ease, background .22s ease;
    }

    #tableList tbody tr:hover td{
        background:rgba(0,194,255,.05) !important;
        color:#ffffff;
        box-shadow:inset 0 1px 0 rgba(115,229,255,.06), inset 0 -1px 0 rgba(115,229,255,.06);
    }

    #tableList tbody tr:hover{
        transform:translateY(-1px);
    }

    #tableList tbody tr:hover td:first-child{
        box-shadow:
            inset 3px 0 0 #00c2ff,
            inset 0 1px 0 rgba(115,229,255,.06),
            inset 0 -1px 0 rgba(115,229,255,.06);
    }

    #tableList tbody tr:hover td:last-child{
        box-shadow:
            inset 0 1px 0 rgba(115,229,255,.06),
            inset 0 -1px 0 rgba(115,229,255,.06),
            0 0 24px rgba(0,194,255,.08);
    }

    #tableList tbody tr:nth-child(even) td{
        background:rgba(255,255,255,.012);
    }

    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_filter{
        margin-bottom:16px;
    }

    .dataTables_wrapper .dataTables_length label,
    .dataTables_wrapper .dataTables_filter label,
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_paginate{
        color:#93a7bf !important;
        font-size:13px;
    }

    .dataTables_wrapper .dataTables_filter input,
    .dataTables_wrapper .dataTables_length select{
        background:#0d131c !important;
        border:1px solid rgba(255,255,255,.10) !important;
        color:#fff !important;
        border-radius:12px !important;
        min-height:40px;
        padding:8px 12px !important;
        outline:none !important;
        box-shadow:none !important;
    }

    .dataTables_wrapper .dataTables_filter input:focus,
    .dataTables_wrapper .dataTables_length select:focus{
        border-color:#00c2ff !important;
        box-shadow:0 0 0 4px rgba(0,194,255,.15) !important;
    }

    .dataTables_wrapper .dataTables_paginate .paginate_button{
        color:#dff7ff !important;
        border:1px solid rgba(255,255,255,.08) !important;
        background:rgba(255,255,255,.03) !important;
        border-radius:10px !important;
        margin:0 3px;
    }

    .dataTables_wrapper .dataTables_paginate .paginate_button.current,
    .dataTables_wrapper .dataTables_paginate .paginate_button:hover{
        color:#061019 !important;
        border-color:transparent !important;
        background:linear-gradient(90deg,#00c2ff,#73e5ff) !important;
    }

    .dataTables_wrapper .dataTables_processing{
        background:rgba(18,25,36,.95) !important;
        color:#fff !important;
        border:1px solid rgba(255,255,255,.08) !important;
        border-radius:14px !important;
        box-shadow:0 18px 40px rgba(0,0,0,.30) !important;
    }

    @media (max-width: 767.98px){
        .pc-content{
            padding:18px;
            border-radius:20px;
        }

        .gt-report-head{
            padding:18px 18px 16px;
        }

        .gt-report-body{
            padding:18px;
        }

        .gt-report-title{
            font-size:20px;
        }

        .gt-report-subtitle{
            font-size:13px;
        }

        #tableList thead th,
        #tableList tbody td{
            padding:14px 12px;
        }
    }
</style>
@endsection

@section('content')

        <div class="page-header">
            <div class="page-block">
                <div class="row align-items-center">
                    <div class="col-md-12">
                        <ul class="breadcrumb">
                            <li class="breadcrumb-item">
                                <a href="{{ URL::to('/') }}/dashboard">Dashboard</a>
                            </li>
                            <li class="breadcrumb-item">
                                <a href="javascript:">Incentive Report</a>
                            </li>
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

        <div class="row">
            <div class="col-md-12">
                <div class="gt-report-card">
                    <div class="gt-report-head">
                       
                        <div class="gt-report-badge">
                            <i class="ti ti-report-money"></i>
                            Incentive Report
                        </div>
                    </div>

                    <div class="gt-report-body table-border-style">
                        <div class="table-responsive">
                            <table class="table" id="tableList">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <!--<th>Admin Charge</th>-->
                                        <!--<th>Service Charge</th>-->
                                        <!--<th>Net Amount</th>-->
                                        <th>Txn. Type</th>
                                        <th>Txn. Date</th>
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
<script src="{{ URL::to('/') }}/assets/js/users/earning-wise-log.0.3.js"></script>
@endsection