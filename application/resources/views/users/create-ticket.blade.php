@extends('users.master')
@section('extra')
<style>
    :root{
        --theme-bg:#07111f;
        --theme-bg-2:#0c1729;
        --theme-surface:rgba(14,25,43,0.88);
        --theme-surface-2:rgba(18,33,57,0.82);
        --theme-border:rgba(106,170,255,0.16);
        --theme-border-strong:rgba(106,170,255,0.28);
        --theme-text:#ecf3ff;
        --theme-muted:#93a9c8;
        --theme-faint:#6f83a3;
        --theme-accent:#35a3ff;
        --theme-accent-2:#4f7cff;
        --theme-shadow:0 20px 50px rgba(3,10,24,0.45);
        --theme-shadow-soft:0 12px 32px rgba(4,12,28,0.28);
        --theme-radius-xl:20px;
        --theme-radius-lg:18px;
        --theme-radius-md:14px;
    }

    .pc-content{
        background:
            radial-gradient(circle at top right, rgba(53,163,255,0.10), transparent 22%),
            radial-gradient(circle at left top, rgba(79,124,255,0.10), transparent 20%),
            linear-gradient(180deg, rgba(7,17,31,0.98) 0%, rgba(7,17,31,1) 100%);
        border-radius:28px;
        padding:24px;
    }

    .ticket-breadcrumb{
        background:transparent;
        margin-bottom:0;
        gap:10px;
    }

    .ticket-breadcrumb .breadcrumb-item,
    .ticket-breadcrumb .breadcrumb-item a{
        color:var(--theme-muted);
        font-size:13px;
        font-weight:500;
    }

    .ticket-breadcrumb .breadcrumb-item + .breadcrumb-item::before{
        content:"›";
        color:rgba(147,169,200,0.65);
        padding-right:10px;
    }

    .ticket-breadcrumb .breadcrumb-item[aria-current="page"]{
        color:var(--theme-text);
    }

    .ticket-page-hero,
    .ticket-glass-card{
        position:relative;
        overflow:hidden;
        border:1px solid var(--theme-border);
        background:linear-gradient(180deg, rgba(18,33,57,0.88), rgba(10,20,36,0.94));
        box-shadow:var(--theme-shadow);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
    }

    .ticket-page-hero{
        border-radius:24px;
        padding:28px 30px;
    }

    .ticket-glass-card{
        border-radius:24px;
    }

    .ticket-page-hero::before,
    .ticket-glass-card::before{
        content:"";
        position:absolute;
        inset:0;
        padding:1px;
        border-radius:inherit;
        background:linear-gradient(135deg, rgba(79,124,255,0.55), rgba(53,163,255,0.12), rgba(255,255,255,0.06));
        -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor;
        mask-composite:exclude;
        pointer-events:none;
    }

    .ticket-eyebrow{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:7px 12px;
        border-radius:999px;
        margin-bottom:14px;
        background:rgba(53,163,255,0.12);
        border:1px solid rgba(96,176,255,0.18);
        color:#8fc6ff;
        font-size:12px;
        font-weight:700;
        letter-spacing:.08em;
        text-transform:uppercase;
    }

    .ticket-page-title{
        color:var(--theme-text);
        font-size:clamp(1.7rem, 1.35rem + .9vw, 2.15rem);
        font-weight:700;
        letter-spacing:-0.02em;
        margin-bottom:8px;
    }

    .ticket-page-subtitle{
        color:var(--theme-muted);
        font-size:.98rem;
        line-height:1.75;
        margin-bottom:0;
    }

    .ticket-form-card .card-header,
    .ticket-form-card .card-body,
    .ticket-form-card .card-footer{
        position:relative;
        z-index:2;
        background:transparent;
        border:none;
    }

    .ticket-form-card .card-header{
        padding:24px 26px 12px;
    }

    .ticket-form-card .card-header h5{
        color:var(--theme-text);
        font-size:1.2rem;
        font-weight:700;
        margin:0;
    }

    .ticket-form-card .card-body{
    padding:24px 30px 30px;
}

    .ticket-form-card .card-footer{
        padding:0 26px 26px;
    }

    .ticket-form-card form{
        margin:0;
    }

    .ticket-form-card label{
        color:var(--theme-text);
        font-weight:600;
        margin-bottom:10px;
        font-size:.92rem;
    }

    .ticket-form-card .form-control,
    .ticket-form-card .form-select,
    .ticket-form-card select,
    .ticket-form-card input,
    .ticket-form-card textarea{
        background:rgba(255,255,255,0.04) !important;
        border:1px solid rgba(109,145,199,0.14) !important;
        color:var(--theme-text) !important;
        border-radius:16px !important;
        min-height:54px;
        padding:14px 16px;
        box-shadow:none !important;
        transition:all .28s ease;
    }

    .ticket-form-card .form-control::placeholder,
    .ticket-form-card input::placeholder,
    .ticket-form-card textarea::placeholder{
        color:var(--theme-faint) !important;
    }

    .ticket-form-card .form-control:focus,
    .ticket-form-card .form-select:focus,
    .ticket-form-card select:focus,
    .ticket-form-card input:focus,
    .ticket-form-card textarea:focus{
        border-color:rgba(83,166,255,0.45) !important;
        background:rgba(255,255,255,0.06) !important;
        box-shadow:0 0 0 4px rgba(53,163,255,0.10) !important;
        color:var(--theme-text) !important;
    }

    .ticket-form-card .btn-submit{
    width:100%;
    height:56px;
    border:none;
    border-radius:18px;
    font-size:16px;
    font-weight:700;
    color:#fff;
    background:linear-gradient(90deg,#35a3ff,#4f7cff);
    box-shadow:0 14px 30px rgba(53,163,255,.25);
    transition:.3s ease;
}

.ticket-form-card .btn-submit:hover{
    transform:translateY(-2px);
    box-shadow:0 18px 36px rgba(53,163,255,.35);
}

    .ticket-form-card .btn-submit:focus{
        box-shadow:0 0 0 4px rgba(53,163,255,0.12), 0 18px 36px rgba(53,163,255,0.28);
    }

    .ticket-form-shell{
        position:relative;
    }

    .ticket-form-shell::after{
        content:"";
        position:absolute;
        inset:auto -40px -40px auto;
        width:140px;
        height:140px;
        background:radial-gradient(circle, rgba(53,163,255,0.18), transparent 70%);
        pointer-events:none;
        filter:blur(8px);
    }

    @media (max-width: 991.98px){
        .pc-content{
            padding:18px;
            border-radius:22px;
        }

        .ticket-page-hero{
            padding:22px 20px;
        }

        .ticket-form-card .card-header,
        .ticket-form-card .card-body,
        .ticket-form-card .card-footer{
            padding-left:20px;
            padding-right:20px;
        }

        .col-md-2{
            display:none;
        }

        .col-md-8{
            width:100%;
        }
    }

    @media (max-width: 767.98px){
        .ticket-page-hero{
            border-radius:20px;
            padding:18px;
        }

        .ticket-form-card{
            border-radius:20px;
        }

        .ticket-form-card .card-header{
            padding:20px 18px 10px;
        }

        .ticket-form-card .card-body{
            padding:10px 18px 16px;
        }

        .ticket-form-card .card-footer{
            padding:0 18px 20px;
        }

        .ticket-form-card .btn-submit{
            width:100%;
        }
    }
</style>
@endsection

@section('content')

        <div class="page-header">
            <div class="page-block">
                <div class="row align-items-center g-3">
                    <div class="col-md-12">
                        <ul class="breadcrumb ticket-breadcrumb">
                            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item"><a href="javascript:">24/7 Support</a></li>
                            <li class="breadcrumb-item" aria-current="page">{{ $page_titel }}</li>
                        </ul>
                    </div>
                    
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-md-2"></div>

            <div class="col-md-8">
                <div class="card ticket-glass-card ticket-form-card ticket-form-shell mt-4">
                    <div class="card-header">
                        <h5>Create Ticket</h5>
                    </div>

                    <div class="card-body">
                        <div class="row">
                            <form>
                                <div class="row g-4">
                                    <div class="col-sm-12">
                                        <x-select name="type" id="type" label="Ticket Type" :options="['' => 'Select Ticket Type', 'General Help' => 'General Help', 'Profile Update' => 'Profile Update', 'Topup ID' => 'Topup ID', 'Reward Achievement' => 'Reward Achievement', 'Withdrawal' => 'Withdrawal', 'Others' => 'Others']"/>
                                    </div>
                                    <div class="col-md-12">
                                        <x-input type="text" name="title" id="title" placeholder="Title" value="" />
                                    </div>
                                    <div class="col-md-12">
                                        <x-input type="text" name="desc" id="desc" placeholder="Message" value=""/>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="card-footer">
                       <button type="submit" class="btn-submit">
    Submit Ticket
</button>
                    </div>
                </div>
            </div>

            <div class="col-md-2"></div>
        
</div>
@endsection

@section('jscontent')
<script src="{{ URL::to('/') }}/assets/js/users/create-ticket.js"></script>
@endsection