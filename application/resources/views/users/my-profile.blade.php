@extends('users.master')
@section('extra')
<style>
    .gt-profile-card{
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
    .gt-profile-card .card-header{
        background:linear-gradient(90deg, rgba(0,194,255,.12), rgba(115,229,255,.03));
        border-bottom:1px solid rgba(255,255,255,.07);
        padding:20px 24px;
    }
    .gt-profile-card .card-header h5{
        color:#fff;
        font-weight:700;
        letter-spacing:.01em;
    }
    .gt-profile-card .card-body{
        padding:26px 24px 10px;
    }
    .gt-profile-card .card-footer{
        background:transparent;
        border-top:1px solid rgba(255,255,255,.06);
        padding:20px 24px 24px;
    }
    .gt-profile-card .form-label,
.gt-profile-card .form-floating > label{
    color:#aab6c8;
    font-size:12px;
    font-weight:600;
    text-transform:uppercase;
    letter-spacing:.12em;
}
    .gt-profile-card .form-control,
    .gt-profile-card input{
        background:#0d131c !important;
        border:1px solid rgba(255,255,255,.09) !important;
        color:#fff !important;
        border-radius:12px !important;
        min-height:50px;
        padding:10px 16px;
        transition:all .25s ease;
    }
    .gt-profile-card .form-control::placeholder,
    .gt-profile-card input::placeholder{
        color:#7f8ca0;
    }
    .gt-profile-card .form-control:focus,
    .gt-profile-card input:focus{
        border-color:rgba(0,194,255,.45) !important;
        box-shadow:0 0 0 3px rgba(0,194,255,.14) !important;
        outline:none;
    }
    .gt-profile-card .btn-submit{
        background:linear-gradient(90deg,#00c2ff,#73e5ff);
        border:none;
        color:#061019;
        font-weight:700;
        min-height:50px;
        border-radius:12px;
        box-shadow:0 12px 26px rgba(0,194,255,.22);
        transition:all .25s ease;
    }
    .gt-profile-card .btn-submit:hover{
        transform:translateY(-1px);
        box-shadow:0 16px 32px rgba(0,194,255,.3);
        color:#061019;
    }

    #profileSuccessAlert,
#profileErrorAlert{
    border:none;
    border-radius:14px;
    padding:16px 18px;
    font-size:15px;
    animation:fadeIn .35s ease;
}

#profileSuccessAlert{
    background:rgba(25,135,84,.15);
    color:#7dffbf;
    border-left:4px solid #20c997;
}

#profileErrorAlert{
    background:rgba(220,53,69,.15);
    color:#ffb3bd;
    border-left:4px solid #dc3545;
}

@keyframes fadeIn{
    from{
        opacity:0;
        transform:translateY(-8px);
    }
    to{
        opacity:1;
        transform:translateY(0);
    }
}
</style>
@endsection
@section('content')
<div class="page-header mb-4">
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-2">
            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
            <li class="breadcrumb-item"><a href="javascript:void(0)">My Account</a></li>
            <li class="breadcrumb-item active" aria-current="page">{{ $page_titel }}</li>
        </ol>
    </nav>
    <h2 class="mb-0">{{ $page_titel }}</h2>
</div>

<div class="row">
    <div class="col-lg-2"></div>
    <div class="col-lg-8">
        <div class="card gt-profile-card">
            <div class="card-header">
                <h5 class="mb-0">Update Your Profile Details.</h5>
            </div>
            <div class="card-body">

    <div id="profileSuccessAlert" class="alert alert-success d-none align-items-center mb-4" role="alert">
        <i class="ti ti-circle-check me-2 fs-5"></i>
        <div>
            <strong>Profile Updated!</strong><br>
            Your profile information has been updated successfully.
        </div>
    </div>

    <div id="profileErrorAlert" class="alert alert-danger d-none align-items-center mb-4" role="alert">
        <i class="ti ti-alert-circle me-2 fs-5"></i>
        <div id="profileErrorText"></div>
    </div>

    <form>
                    <div class="row g-4">
                        <div class="col-md-12">
                            <x-input type="text" name="username" id="username" placeholder="Username" value="data" />
                        </div>
                        <div class="col-md-12">
                            <x-input type="text" name="firstname" id="firstname" placeholder="Firstname" value="" />
                        </div>
                        <div class="col-md-12">
                            <x-input type="text" name="lastname" id="lastname" placeholder="Lastname" value=""/>
                        </div>
                        <div class="col-md-12">
                            <x-input type="email" name="email" id="email" placeholder="Email" value="" />
                        </div>
                        @if($user->kit_id > 0)
                            @if($user->is_authenticator == 1)
                                <div class="col-md-12">
                                    <x-input type="text" name="otp" id="otp" placeholder="Google 2FA Code" value=""/>
                                </div>
                            @endif
                        @endif
                    </div>
                </form>
            </div>
            <div class="card-footer text-center">
                <button type="submit" class="btn btn-submit w-100">Submit</button>
            </div>
        </div>
    </div>
    <div class="col-lg-2"></div>
</div>
@endsection
@section('jscontent')
<script src="{{ URL::to('/') }}/assets/js/users/my-profile.1.3.js?v=5"></script>
@endsection