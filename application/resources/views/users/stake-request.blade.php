@extends('users.master')
@section('extra')
<style>
    .page-header .breadcrumb{
        margin-bottom:10px;
    }

    .page-header .breadcrumb .breadcrumb-item,
    .page-header .breadcrumb .breadcrumb-item a{
        color:#8fa3ba;
        font-size:13px;
        font-weight:500;
    }

    .page-header .breadcrumb .breadcrumb-item.active{
        color:#eaf6ff;
    }

    .page-header-title h2{
        color:#ffffff;
        font-weight:800;
        letter-spacing:-0.02em;
        margin-bottom:0;
    }

    .pc-content{
        position:relative;
        padding:24px;
        border-radius:24px;
        background:
            radial-gradient(circle at top right, rgba(0,194,255,.10), transparent 22%),
            radial-gradient(circle at left top, rgba(115,229,255,.08), transparent 18%),
            linear-gradient(180deg, rgba(9,14,22,.96), rgba(12,18,29,.98));
    }

    .card{
        position:relative;
        background:
            linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)),
            rgba(18,25,36,.92);
        border:1px solid rgba(255,255,255,.08);
        border-radius:20px;
        box-shadow:0 22px 55px rgba(0,0,0,.35), 0 0 0 1px rgba(0,194,255,.06);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        overflow:hidden;
    }

    .card:before{
        content:"";
        position:absolute;
        inset:0;
        border-radius:20px;
        padding:1px;
        background:linear-gradient(135deg, rgba(0,194,255,.30), rgba(115,229,255,.04), rgba(255,255,255,.04));
        -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor;
        mask-composite:exclude;
        pointer-events:none;
    }

    .card-header{
        position:relative;
        z-index:1;
        background:linear-gradient(90deg, rgba(0,194,255,.12), rgba(115,229,255,.03));
        border-bottom:1px solid rgba(255,255,255,.07);
        padding:18px 22px;
    }

    .card-header h5{
        color:#fff;
        font-weight:700;
        margin:0;
    }

    .card-body{
        position:relative;
        z-index:1;
        padding:22px;
    }

    .table-border-style{
        background:transparent !important;
    }

    .table-responsive{
        border:1px solid rgba(255,255,255,.06);
        border-radius:16px;
        overflow:hidden;
        background:rgba(10,14,22,.45);
    }

    #tableList{
        margin-bottom:0 !important;
        color:#e8f3ff;
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

    #tableList tbody td{
        background:transparent !important;
        color:#e7f1ff;
        border-color:rgba(255,255,255,.06) !important;
        padding:16px 14px;
        vertical-align:middle;
        font-size:14px;
    }

    #tableList tbody tr{
        transition:all .25s ease;
    }

    #tableList tbody tr:hover{
        background:rgba(0,194,255,.04);
    }

    #tableList tbody tr:hover td{
        color:#ffffff;
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

        .card-header{
            padding:16px 16px;
        }

        .card-body{
            padding:16px;
        }

        #tableList thead th,
        #tableList tbody td{
            padding:14px 12px;
        }
    }
</style>
@endsection

@section('content')

        <!-- [ breadcrumb ] start -->
        <div class="page-header">
            <div class="page-block">
                <div class="row align-items-center">
                    <div class="col-md-12">
                        <ul class="breadcrumb">
                            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item"><a href="javascript:">Stake EUD</a></li>
                            <li class="breadcrumb-item" aria-current="page">My Investments</li>
                        </ul>
                    </div>
                    <div class="col-md-12">
                        <div class="page-header-title">
                            <h2 class="mb-0">My Investments</h2>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- [ breadcrumb ] end -->

        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Topup Report</h5>
                    </div>
                    <div class="card-body table-border-style">
                        <div class="table-responsive">
                            <table class="table" id="tableList">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Request</th>
                                        <th>Amount ($)</th>
                                        <th>BTC Plan</th>
                                        <th>Txn. Hash</th>
                                        <th>Maturity</th>
                                        <th>Status</th>
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
<script src="{{ URL::to('/') }}/assets/js/users/stake-request.0.6.js"></script>
<script>
    function initializeCountdowns(id, date) 
    {
        const listItem = document.getElementById('locker_timer_'+id);
        
        const countDownDate = new Date(date).getTime();
        
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = countDownDate - now;
        
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
            if (distance >= 0) {
                listItem.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            } else {
                clearInterval(interval);
                listItem.innerHTML = "Mature";
            }
        }, 1000);
    }
    
    function calculateMonthsBetween(startDate, endDate)
    {
        const start = new Date(startDate);
        const end = new Date(endDate);
    
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
        return totalMonths;
    }
</script>
@endsection