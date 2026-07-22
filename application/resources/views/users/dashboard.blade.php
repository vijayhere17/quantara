@php use Illuminate\Support\Facades\Auth; @endphp
@extends('users.master')

@section('extra')
<style>
    :root{
        --dash-bg:#07111f;
        --dash-bg-2:#0c1729;
        --dash-surface:rgba(14,25,43,0.88);
        --dash-surface-2:rgba(18,33,57,0.82);
        --dash-surface-3:rgba(11,20,35,0.92);
        --dash-border:rgba(106,170,255,0.16);
        --dash-border-strong:rgba(106,170,255,0.28);
        --dash-text:#edf4ff;
        --dash-muted:#8ea6c7;
        --dash-faint:#6f84a4;
        --dash-accent:#35a3ff;
        --dash-accent-2:#4f7cff;
        --dash-success:#2ed8a3;
        --dash-danger:#ff7183;
        --dash-warning:#ffcf70;
        --dash-radius-xl:20px;
        --dash-radius-lg:18px;
        --dash-radius-md:14px;
        --dash-shadow:0 20px 50px rgba(3,10,24,0.45);
        --dash-shadow-soft:0 12px 32px rgba(4,12,28,0.28);
    }

    .pc-content{
        background:
            radial-gradient(circle at top right, rgba(53,163,255,0.10), transparent 22%),
            radial-gradient(circle at left top, rgba(79,124,255,0.10), transparent 20%),
            linear-gradient(180deg, rgba(7,17,31,0.98) 0%, rgba(7,17,31,1) 100%);
        border-radius:28px;
        padding:24px;
    }

    h3,.h3{font-size:1rem;}
    .text-muted{color:var(--dash-muted)!important;}
    .text-primary{color:#8fc6ff!important;}
    .text-success{color:#7bf0c8!important;}
    .link-primary{color:#8fc6ff!important;text-decoration:none;}
    .link-primary:hover{color:#fff!important;}

    .card{
        position:relative;
        overflow:hidden;
        border:1px solid var(--dash-border);
        border-radius:var(--dash-radius-xl);
        background:linear-gradient(180deg, rgba(18,33,57,0.88), rgba(10,20,36,0.94));
        box-shadow:var(--dash-shadow);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
    }

    .referral-card{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:14px;

    padding:12px 14px;

    min-height:78px;

    border-radius:18px;

    background:rgba(255,255,255,.05);

    border:1px solid rgba(90,165,255,.18);

    backdrop-filter:blur(12px);
}

.referral-left{
    display:flex;
    align-items:center;
    gap:14px;
    flex:1;
    min-width:0;
}

.referral-icon{
    width:42px;
    height:42px;
    border-radius:12px;

    display:flex;
    align-items:center;
    justify-content:center;

    background:rgba(53,163,255,.15);

    color:#59d5ff;

    font-size:18px;

    flex-shrink:0;
}

.referral-content{
    flex:1;
    min-width:0;
}

.referral-label{
    display:block;

    color:var(--dash-muted);

    font-size:11px;

    text-transform:uppercase;

    letter-spacing:.08em;

    margin-bottom:4px;
}

.referral-link{
    color:#fff;

    font-size:14px;

    font-weight:500;

    white-space:nowrap;

    overflow:hidden;

    text-overflow:ellipsis;
}

.copy-btn{
    width:62px;
    height:54px;

    border:none;

    border-radius:16px;

    background:linear-gradient(135deg,#16c7ff,#2f83ff);

    color:#fff;

    display:flex;
    align-items:center;
    justify-content:center;

    font-size:20px;

    transition:.3s;
}

.copy-btn:hover{
    transform:translateY(-2px);

    box-shadow:0 12px 28px rgba(53,163,255,.28);
}

@media(max-width:991px){

    .referral-card{
        margin-top:10px;
    }

}

    .card::before{
        content:"";
        position:absolute;
        inset:0;
        padding:1px;
        border-radius:inherit;
        background:linear-gradient(135deg, rgba(79,124,255,0.55), rgba(53,163,255,0.12), rgba(255,255,255,0.05));
        -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor;
        mask-composite:exclude;
        pointer-events:none;
    }

    .card-body,.card-header,.card-footer{position:relative;z-index:2;}
    .card-header,.card-footer{background:transparent;border:none;}
    .list-group-item{
        background:transparent;
        border-color:rgba(255,255,255,0.06);
        color:var(--dash-text);
    }

    .dash-hero-card{
        border-radius:24px;
        padding:26px;
    }

    .dash-tag{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:7px 12px;
        border-radius:999px;
        margin-bottom:14px;
        background:rgba(53,163,255,0.12);
        border:1px solid rgba(96,176,255,0.18);
        color:#8fc6ff;
         margin:0 auto 18px;
        font-size:12px;
        font-weight:700;
        letter-spacing:.08em;
        text-transform:uppercase;
    }

    .dash-page-title{
        color:var(--dash-text);
        font-size:clamp(1.75rem, 1.35rem + .9vw, 2.3rem);
        font-weight:700;
        letter-spacing:-0.02em;
        margin-bottom:10px;
    }

    .dash-page-subtitle{
        color:var(--dash-muted);
        max-width:760px;
        line-height:1.75;
        margin-bottom:0;
    }

    .custom-alert{
        background:linear-gradient(135deg, rgba(53,163,255,0.16), rgba(79,124,255,0.16));
        border:1px solid rgba(110,171,255,0.18);
        border-radius:18px;
        padding:18px 22px;
        color:var(--dash-text);
        font-weight:500;
        box-shadow:var(--dash-shadow-soft);
        font-size:14px;
        width:100%;
        position:relative;
    }
    .custom-alert a{color:#bfe1ff!important;text-decoration:none;font-weight:700;}
    .custom-alert strong{font-weight:700;color:#fff;}

    .dash-mini-label{
        color:var(--dash-muted);
        font-size:.78rem;
        font-weight:600;
        letter-spacing:.06em;
        text-transform:uppercase;
        margin-bottom:6px;
        display:block;
    }

    .dash-stat-card{
        height:100%;
        transition:all .3s ease;
    }

    .dash-stat-card:hover{
        transform:translateY(-5px);
        border-color:var(--dash-border-strong);
    }

    .dash-stat-icon{
        width:48px;
        height:48px;
        border-radius:14px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
        color:#fff;
        flex-shrink:0;
        box-shadow:0 10px 25px rgba(53,163,255,0.18);
    }

    .icon-wallet{background:linear-gradient(135deg, #1c8dff, #4361ff);}
    .icon-income{background:linear-gradient(135deg, #19b98b, #2ed8a3);}
    .icon-team{background:linear-gradient(135deg, #4f7cff, #7b61ff);}
    .icon-rank{background:linear-gradient(135deg, #2498ff, #22c1ff);}

    .dash-stat-box{
        margin-top:18px;
        padding:16px;
        border-radius:16px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.05);
    }

    .dash-value{
        color:var(--dash-text);
        font-size:1.55rem;
        font-weight:700;
        margin-bottom:4px;
        line-height:1.1;
    }

    .dash-subvalue{
        color:var(--dash-muted);
        font-size:.82rem;
    }

    .rank-tier-pill{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 12px;
        border-radius:999px;
        background:rgba(53,163,255,0.12);
        color:#8fc6ff;
        border:1px solid rgba(110,171,255,0.18);
        font-size:.75rem;
        font-weight:700;
    }

    .user-avtar{
        width:56px;
        height:56px;
        object-fit:cover;
        border:2px solid rgba(255,255,255,0.12);
        box-shadow:0 8px 20px rgba(0,0,0,.2);
    }

    .avtar{
        width:44px;
        height:44px;
        border-radius:12px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
        font-size:18px;
    }
    .avtar-s{width:36px;height:36px;font-size:16px;}
    .bg-light-primary{background:rgba(53,163,255,.14);color:#8fc6ff;}
    .bg-light-success{background:rgba(46,216,163,.14);color:#7bf0c8;}

    .btn{
        border-radius:999px;
        font-weight:600;
        min-height:44px;
        transition:all .28s ease;
    }

    .btn-primary{
        border:none;
        background:linear-gradient(135deg, var(--dash-accent), var(--dash-accent-2));
        box-shadow:0 12px 28px rgba(53,163,255,.22);
    }
    .btn-primary:hover{
        transform:translateY(-2px);
        box-shadow:0 16px 34px rgba(53,163,255,.3);
    }

    .btn-light-primary{
        background:rgba(53,163,255,.08);
        color:#8fc6ff;
        border:1px solid rgba(53,163,255,.16);
    }
    .btn-light-primary:hover{
        background:rgba(53,163,255,.16);
        color:#fff;
        border-color:rgba(53,163,255,.24);
    }

    .dash-surface-box{
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.05);
        border-radius:16px;
        padding:16px;
    }

    .progress-thin{
        height:8px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        overflow:hidden;
    }
    .progress-bar{
        background:linear-gradient(90deg, var(--dash-accent), var(--dash-accent-2))!important;
    }

    .dash-rule-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:14px;
    }

    .dash-rule-card{
        padding:16px;
        border-radius:18px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.06);
        height:100%;
    }

    .dash-rule-card h6,
    .dash-section-title{
        color:var(--dash-text);
        font-weight:700;
        margin-bottom:10px;
    }

    .dash-rule-card ul,
    .dash-plan-list,
    .dash-rank-list{
        list-style:none;
        margin:0;
        padding:0;
    }

    .dash-rule-card li,
    .dash-plan-list li,
    .dash-rank-list li{
        color:var(--dash-muted);
        padding:8px 0;
        border-bottom:1px solid rgba(255,255,255,0.05);
        font-size:.92rem;
    }

    .dash-rule-card li:last-child,
    .dash-plan-list li:last-child,
    .dash-rank-list li:last-child{
        border-bottom:none;
        padding-bottom:0;
    }

    .dash-pill{
        display:inline-flex;
        align-items:center;
        padding:6px 12px;
        border-radius:999px;
        font-size:.74rem;
        font-weight:700;
        color:#bfe1ff;
        background:rgba(53,163,255,.12);
        border:1px solid rgba(53,163,255,.18);
    }

    .dash-package-wrap{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
    }

    .dash-package-pill{
        padding:10px 14px;
        border-radius:14px;
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.07);
        color:var(--dash-text);
        font-size:.88rem;
        font-weight:600;
        min-width:84px;
        text-align:center;
    }

    .dash-coin-hero{
        width:100%;
        max-width:260px;
        aspect-ratio:1;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:
            radial-gradient(circle at 35% 30%, rgba(191,225,255,.9), rgba(53,163,255,.72) 55%, rgba(18,63,145,.9) 100%);
        box-shadow:0 0 60px rgba(53,163,255,.25), inset 0 0 30px rgba(0,0,0,.25);
        border:1px solid rgba(255,255,255,.12);
    }
    .dash-coin-hero i{
        font-size:3rem;
        color:#fff;
    }

    .card-gold{
        background:linear-gradient(135deg, rgba(18,33,57,0.92), rgba(10,20,36,0.96));
        border-radius:20px;
    }

    .dash-highlight{
        background:linear-gradient(135deg, rgba(53,163,255,.18), rgba(79,124,255,.14));
        border:1px solid rgba(110,171,255,0.18);
    }

    .dash-rank-table{
        display:grid;
        gap:12px;
    }

    .dash-rank-item{
        padding:16px;
        border-radius:16px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.06);
    }

    .dash-rank-top{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
    }

    .dash-rank-top strong{
        color:var(--dash-text);
        font-size:1rem;
    }

    .dash-rank-top span{
        color:#8fc6ff;
        font-weight:700;
    }

    .dash-rank-item p{
        color:var(--dash-muted);
        margin:0;
        font-size:.88rem;
        line-height:1.7;
    }

    #gt-toast-stack{
        position:fixed;
        top:90px;
        right:20px;
        z-index:2000;
        display:flex;
        flex-direction:column;
        gap:10px;
    }
    .gt-toast{
        background:#16a34a;
        color:#fff;
        padding:12px 18px;
        border-radius:12px;
        font-size:14px;
        font-weight:500;
        box-shadow:0 10px 25px rgba(0,0,0,.25);
        opacity:0;
        transform:translateY(-8px);
        transition:all .25s ease;
    }
    .gt-toast.show{opacity:1;transform:translateY(0);}

.hero-title{
    font-size:42px;
    font-weight:800;
    line-height:1.1;
    color:#fff;
    letter-spacing:-1px;
    text-align:center;
    margin:0;
}

.hero-title span{
    display:block;
    color:#35c8ff;
    margin-top:6px;
}

@media (max-width:991px){

    .hero-title{
        font-size:34px;
    }

}



@media(max-width:768px){
    .hero-title{
        font-size:32px;
    }
}

    @media (max-width: 991.98px){
        .pc-content{padding:18px;border-radius:22px;}
        .dash-rule-grid{grid-template-columns:1fr;}
    }

    @media (max-width: 767.98px){
        .dash-hero-card{padding:18px;}
        .dash-page-title{font-size:1.1rem;}
        .dash-package-pill{min-width:calc(50% - 5px);}
        .card{border-radius:18px;}
    }
</style>
@endsection

@section('content')
<div id="gt-toast-stack"></div>

@php
    $gt_effective_cap = $object->total_earning + $object->total_3x_remain;
    $gt_used_pct = $gt_effective_cap > 0 ? min(100, round(($object->total_earning / $gt_effective_cap) * 100, 1)) : 0;

    $gt_next_rank = null;
    if($object->current_rank && $object->allsalary) {
        $gt_found_current = false;
        foreach($object->allsalary as $gt_tier) {
            if($gt_found_current) { $gt_next_rank = $gt_tier; break; }
            if($gt_tier->id == $object->current_rank->id) { $gt_found_current = true; }
        }
    } elseif(!$object->current_rank && $object->allsalary && count($object->allsalary) > 0) {
        $gt_next_rank = $object->allsalary[0];
    }

    $gt_team_business = Auth::user()->team_investment ?? 0;
    $gt_rank_pct = ($gt_next_rank && $gt_next_rank->business > 0) ? min(100, round(($gt_team_business / $gt_next_rank->business) * 100, 1)) : 0;
@endphp

<div class="row mb-4">
    <div class="col-12">
        <div class="card dash-hero-card">
            <div class="row align-items-center g-4">

                <!-- Left Side -->
<div class="col-lg-7 d-flex justify-content-center align-items-center">

   

    <div class="w-100 text-center">

    <h1 class="hero-title mb-0">
        Welcome Back,
        <span class="d-block">
            {{ Auth::user()->firstname }} {{ Auth::user()->lastname }}
        </span>
    </h1>

</div>

</div>

                <!-- Right Side -->
                <div class="col-lg-5">

                    <div class="referral-card">

                        <div class="referral-left">

                            <div class="referral-icon">
                                <i class="bi bi-link-45deg"></i>
                            </div>

                            <div class="referral-content">

                                <small class="referral-label">
                                    Referral Link
                                </small>

                                <div class="referral-link">
                                    {{ URL::to('/') }}/invite/{{ obscureAddress(Auth::user()->username) }}
                                </div>

                            </div>

                        </div>

                        <button
                            type="button"
                            class="copy-btn"
                            onclick="toClip('{{ URL::to('/') }}/sign-up?ref={{ Auth::user()->username }}')">

                            <i class="bi bi-copy"></i>

                        </button>

                    </div>

                </div>

            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-6 col-xxl-4 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                    <div class="flex-shrink-0">
                        <img src="{{ URL::to('/') }}/assets/images/user/avatar-1.jpg" alt="user" class="user-avtar rounded-circle" />
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h5 class="mb-1 text-white">{{ Auth::user()->firstname }} {{ Auth::user()->lastname }}</h5>
                        <p class="text-muted mb-0">{{ obscureAddress(Auth::user()->username) }}</p>
                    </div>
                </div>

                <ul class="list-group list-group-flush">
                    <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                        <span class="text-muted">Email</span>
                        <span>{{ Auth::user()->email ?? '-' }}</span>
                    </li>
                    <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                        <span class="text-muted">Current Rank</span>
                        @if($object->current_rank)
                            <span class="rank-tier-pill"><i class="bi bi-award"></i> {{ $object->current_rank->rank }}</span>
                        @else
                            <span class="rank-tier-pill">Not Ranked Yet</span>
                        @endif
                    </li>
                    <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                        <span class="text-muted">Current Package</span>
                        <span>{{ Auth::user()->kit->name ?? 'Not Active' }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <div class="col-md-6 col-xxl-4 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Package Details</h5>
                    <span class="dash-pill">Plan Status</span>
                </div>
                @if(Auth::user()->kit)
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <span class="text-muted">Package</span>
                            <span>{{ Auth::user()->kit->name }}</span>
                        </li>
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <span class="text-muted">Invested Amount</span>
                            <span>{{ Auth::user()->kit->amount }}</span>
                        </li>
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <span class="text-muted">Daily ROI</span>
                            <span>{{ Auth::user()->kit->percantage }}%</span>
                        </li>
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <span class="text-muted">ROI Cap Rule</span>
                            <span>3X Maximum</span>
                        </li>
                    </ul>
                @else
                    <p class="text-muted mb-0">No active package yet.</p>
                    <div class="d-grid mt-3">
                        <a href="{{ URL::to('/') }}/buy-robo" class="btn btn-primary btn-sm">Stake Now</a>
                    </div>
                @endif
            </div>
        </div>
    </div>

   
</div>

<div class="row">
    <div class="col-md-6 col-xxl-3 mb-4">
        <div class="card dash-stat-card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="dash-stat-icon icon-wallet">
                        <i class="bi bi-wallet2"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-0 text-white">Wallet Balance</h6>
                    </div>
                </div>
                <div class="dash-stat-box">
                    <div class="row align-items-center">
                        <div class="col-6">
                            <div class="dash-value">{{ $object->total_balance }}</div>
                            <div class="dash-subvalue">Earning Wallet</div>
                        </div>
                        <div class="col-6 text-end">
                            <div class="dash-value">{{ $object->total_pw_balance }}</div>
                            <div class="dash-subvalue">Potential Wallet</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-md-6 col-xxl-3 mb-4">
        <div class="card dash-stat-card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="dash-stat-icon icon-income">
                        <i class="bi bi-currency-dollar"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-0 text-white">Income</h6>
                    </div>
                </div>
                <div class="dash-stat-box">
                    <div class="row align-items-center">
                        <div class="col-6">
                            <div class="dash-value">{{ $object->total_earning }}</div>
                            <div class="dash-subvalue">Total Income</div>
                        </div>
                        <div class="col-6 text-end">
                            <div class="dash-value">{{ $object->total_income_today }}</div>
                            <div class="dash-subvalue">Today's Income</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-md-6 col-xxl-3 mb-4">
        <div class="card dash-stat-card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="dash-stat-icon icon-team">
                        <i class="bi bi-people"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-0 text-white">Direct Team</h6>
                    </div>
                </div>
                <div class="dash-stat-box">
                    <div class="row align-items-center text-center">
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_referral }}</div>
                            <div class="dash-subvalue">Total</div>
                        </div>
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_a_referral }}</div>
                            <div class="dash-subvalue">Active</div>
                        </div>
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_ia_referral }}</div>
                            <div class="dash-subvalue">Inactive</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-md-6 col-xxl-3 mb-4">
        <div class="card dash-stat-card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="dash-stat-icon icon-rank">
                        <i class="bi bi-diagram-3"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h6 class="mb-0 text-white">Total Team</h6>
                    </div>
                </div>
                <div class="dash-stat-box">
                    <div class="row align-items-center text-center">
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_team }}</div>
                            <div class="dash-subvalue">Total</div>
                        </div>
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_a_team }}</div>
                            <div class="dash-subvalue">Active</div>
                        </div>
                        <div class="col-4">
                            <div class="dash-value">{{ $object->total_ia_team }}</div>
                            <div class="dash-subvalue">Inactive</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">

    <!-- Reward Summary -->
    <div class="col-md-6 col-xxl-4 mb-4">
        <div class="card h-100">
            <div class="card-body">

                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Reward Summary</h5>
                    <span class="dash-pill">6 Rewards</span>
                </div>

                <ul class="list-group list-group-flush">

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">ROI Reward</span>
                        <span>{{ $object->total_roi_reward ?? 0 }}</span>
                    </li>

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">Contribution Reward</span>
                        <span>{{ $object->total_contribution_reward ?? 0 }}</span>
                    </li>

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">Booster Reward</span>
                        <span>{{ $object->total_booster_reward ?? 0 }}</span>
                    </li>

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">Rank Reward</span>
                        <span>{{ $object->total_rank_reward ?? 0 }}</span>
                    </li>

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">Same Rank Reward</span>
                        <span>{{ $object->total_same_rank_reward ?? 0 }}</span>
                    </li>

                    <li class="list-group-item px-0 d-flex justify-content-between">
                        <span class="text-muted">Community Builder</span>
                        <span>{{ $object->total_community_reward ?? 0 }}</span>
                    </li>

                </ul>

            </div>
        </div>
    </div>

    <!-- ROI Progress -->
    <div class="col-md-6 col-xxl-4 mb-4">
        <div class="card h-100">
            <div class="card-body">

                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">ROI Progress</h5>
                    <span class="dash-pill">3X Limit</span>
                </div>

                <p class="text-muted mb-1">
                    Total ROI Progress
                </p>

                <div class="progress progress-thin mb-2">
                    <div class="progress-bar"
                        style="width: {{ $gt_used_pct }}%">
                    </div>
                </div>

                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">
                        {{ $object->total_earning }}
                    </span>

                    <span class="text-muted">
                        {{ $gt_used_pct }}%
                    </span>
                </div>

                <hr style="border-color:rgba(255,255,255,.08);">

                <div class="d-flex justify-content-between">
                    <span class="text-muted">
                        Remaining 3X
                    </span>

                    <strong>
                        {{ $object->total_3x_remain }}
                    </strong>
                </div>

            </div>
        </div>
    </div>

    <!-- Rank Progress -->
    <div class="col-md-12 col-xxl-4 mb-4">
        <div class="card h-100">
            <div class="card-body">

                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Rank Progress</h5>
                    <span class="dash-pill">
                        {{ $object->current_rank->rank ?? 'Q0' }}
                    </span>
                </div>

                @if($gt_next_rank)

                    <p class="text-muted mb-2">
                        Next Rank :
                        <strong>{{ $gt_next_rank->rank }}</strong>
                    </p>

                    <div class="progress progress-thin mb-3">
                        <div class="progress-bar"
                            style="width: {{ $gt_rank_pct }}%">
                        </div>
                    </div>

                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">
                            Team Volume
                        </span>

                        <strong>
                            {{ $gt_team_business }}
                        </strong>
                    </div>

                    <div class="d-flex justify-content-between">
                        <span class="text-muted">
                            Required
                        </span>

                        <strong>
                            {{ $gt_next_rank->business }}
                        </strong>
                    </div>

                @else

                    <div class="text-center py-4">

                        <h5 class="text-success">
                            Highest Rank Achieved
                        </h5>

                    </div>

                @endif

            </div>
        </div>
    </div>

</div>

<div class="row">
    <div class="col-xl-8 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Project Plan Overview</h5>
                    <span class="dash-pill">Core Mechanics</span>
                </div>

                <div class="dash-rule-grid">
                    <div class="dash-rule-card">
                        <h6>Packages</h6>
                        <div class="dash-package-wrap">
                            <span class="dash-package-pill">50</span>
                            <span class="dash-package-pill">100</span>
                            <span class="dash-package-pill">300</span>
                            <span class="dash-package-pill">500</span>
                            <span class="dash-package-pill">1000</span>
                            <span class="dash-package-pill">3000</span>
                            <span class="dash-package-pill">5000</span>
                            <span class="dash-package-pill">10000</span>
                        </div>
                        <ul class="dash-plan-list mt-3">
                            <li>All packages upgrade 2 times.</li>
                            <li>Last package is unlimited time.</li>
                        </ul>
                    </div>

                   
                

                    <div class="dash-rule-card">
                        <h6>Contribution Booster</h6>
                        <ul class="dash-plan-list">
                            <li>Self 1000 or 3000 within 30 days of joining.</li>
                            <li>Get 10% direct for next 30 days.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    
</div>

<div class="row">
    <div class="col-xl-7 mb-4">
        <div class="card h-100">
            <!-- <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Rank System</h5>
                    <span class="dash-pill">Q1 - Q8</span>
                </div>

                <div class="dash-rank-table">
                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q1</strong><span>10%</span></div>
                        <p>2 direct, 250 in one leg, 500 group volume all leg.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q2</strong><span>15%</span></div>
                        <p>3 direct, 5000 group volume, 2000, 2000 in 3 different leg, 1000.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q3</strong><span>20% - 5X</span></div>
                        <p>4 direct, 20,000 group volume, 10,000, 5000, 3000 in 4 different leg, 2000.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q4</strong><span>25%</span></div>
                        <p>3 direct Q3 or 6 Q3 in 3 different leg.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q5</strong><span>30% - 6X</span></div>
                        <p>3 direct Q4 or 6 Q4 in 3 different leg.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q6</strong><span>35%</span></div>
                        <p>3 direct Q5 or 6 Q5 in 3 different leg.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q7</strong><span>40% - 7X</span></div>
                        <p>4 direct Q6 or 8 Q6 in 4 different leg.</p>
                    </div>

                    <div class="dash-rank-item">
                        <div class="dash-rank-top"><strong>Q8</strong><span>45%</span></div>
                        <p>4 direct Q7 or 8 Q7 in 4 different leg.</p>
                    </div>
                </div>
            </div> -->
        </div>
    </div>

    <div class="col-xl-5 mb-4">
        <div class="row h-100">
            <div class="col-12 mb-4">
                <div class="card h-100">
                    
                </div>
            </div>

            <div class="col-12">
                <div class="card card-gold h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between">
                            <div>
                                <p class="mb-1 text-muted">Coin Price</p>
                                <h4 class="mb-0 text-white">${{ getcoinrate() }}</h4>
                            </div>
                            <div class="avtar bg-light-primary">
                                <i class="bi bi-graph-up-arrow"></i>
                            </div>
                        </div>

                        <div class="dash-surface-box mt-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <p class="mb-1 text-muted">Total Referral's Earning</p>
                                    <h4 class="mb-0 text-white">{{ $object->total_withdrawal }}</h4>
                                </div>
                                <div class="avtar bg-light-success">
                                    <i class="bi bi-arrow-left-right"></i>
                                </div>
                            </div>
                        </div>

                        <div class="dash-surface-box mt-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-muted">Total Stake's</span>
                                <span class="text-white">{{ $object->total_self_investment }}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <span class="text-muted">Total Withdraw</span>
                                <span class="text-white">{{ $object->total_withdrawal }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-6 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Recent Income</h5>
                    <a href="{{ URL::to('/') }}/earning-wallet" class="link-primary small">View All</a>
                </div>
                @if($object->recent_earning && count($object->recent_earning) > 0)
                    <ul class="list-group list-group-flush">
                        @foreach($object->recent_earning as $log)
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <div>
                                <span class="d-block">{{ $log->description }}</span>
                                <span class="text-muted small">{{ date('d M Y, H:i', strtotime($log->created_at)) }}</span>
                            </div>
                            <span class="text-success">+{{ $log->amount }}</span>
                        </li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-muted mb-0">No income yet.</p>
                @endif
            </div>
        </div>
    </div>

    <div class="col-md-6 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="mb-0 text-white">Recent Platform Activations</h5>
                </div>
                @if($object->recent_staking && count($object->recent_staking) > 0)
                    <ul class="list-group list-group-flush">
                        @foreach($object->recent_staking as $stake)
                        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                            <div>
                                <span class="d-block">{{ $stake->member ? obscureAddress($stake->member->username) : 'Member' }}</span>
                                <span class="text-muted small">{{ date('d M Y, H:i', strtotime($stake->created_at)) }}</span>
                            </div>
                            <span class="text-primary">{{ $stake->amount }}</span>
                        </li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-muted mb-0">No recent activations.</p>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection

@section('jscontent')
<script>
    function gtToast(message) {
        var stack = document.getElementById('gt-toast-stack');
        if (!stack) return;
        var toast = document.createElement('div');
        toast.className = 'gt-toast';
        toast.textContent = message;
        stack.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('show');
        });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                toast.remove();
            }, 250);
        }, 2500);
    }

    function toClip(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                gtToast('Refer link copied successfully!');
            }).catch(function () {
                gtFallbackCopy(text);
            });
        } else {
            gtFallbackCopy(text);
        }
    }

    function gtFallbackCopy(text) {
        var copy = document.createElement('textarea');
        copy.value = text;
        copy.style.position = 'fixed';
        copy.style.opacity = '0';
        document.body.appendChild(copy);
        copy.select();
        document.execCommand('copy');
        document.body.removeChild(copy);
        gtToast('Refer link copied successfully!');
    }
</script>
@endsection