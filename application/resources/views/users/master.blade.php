@php use Illuminate\Support\Facades\Auth; @endphp
<!DOCTYPE html>
<html lang="en">
<head>
<title>{{ $page_titel }}</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0d12'/%3E%3Ctext x='16' y='23' font-family='Arial,sans-serif' font-size='19' font-weight='700' fill='%2300c2ff' text-anchor='middle'%3EQ%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<style>
:root{
--q-bg:#0b0d12;--q-bg-2:#0f1520;--q-sidebar:#101722;--q-sidebar-2:#141d2a;
--q-card:#121a25;--q-card-2:#17212f;--q-border:rgba(255,255,255,.08);
--q-border-soft:rgba(255,255,255,.05);--q-text:#ffffff;--q-text-soft:#aab6c8;
--q-text-muted:#7f8ca0;--q-blue:#00c2ff;--q-blue-2:#1b8fff;--q-cyan:#73e5ff;
--q-cyan-soft:rgba(115,229,255,.14);--q-hover:rgba(0,194,255,.10);
--q-active:linear-gradient(90deg,#00c2ff,#73e5ff);--q-dark:#061019;
--q-green:#22c55e;--q-danger:#ff6b81;--q-shadow:0 22px 60px rgba(0,0,0,.42);
--q-glow:0 0 0 1px rgba(0,194,255,.10), 0 14px 35px rgba(0,194,255,.10);
--q-radius-xl:24px;--q-radius-lg:18px;--q-radius-md:14px;
--q-sidebar-width:290px;--q-sidebar-collapsed:80px;--q-speed:.3s ease;
}
*{box-sizing:border-box;}
html,body{min-height:100%;margin:0;}
body{
background:
radial-gradient(circle at 12% 18%, rgba(0,194,255,.08), transparent 24%),
radial-gradient(circle at 86% 12%, rgba(27,143,255,.10), transparent 22%),
radial-gradient(circle at 50% 100%, rgba(115,229,255,.05), transparent 34%),
linear-gradient(135deg,#090c11 0%,#0b0d12 42%,#101722 100%);
color:var(--q-text);
font-family:'Inter',sans-serif;
overflow-x:hidden;
}
body::before{
content:"";position:fixed;inset:0;
background:
linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
background-size:44px 44px;
mask-image:radial-gradient(circle at center, rgba(0,0,0,.82), transparent 90%);
pointer-events:none;opacity:.42;z-index:0;
}
a{text-decoration:none;}
.pc-container{position:relative;z-index:1;min-height:100vh;padding-top:76px;transition:padding-left var(--q-speed);}
@media (min-width:992px){.pc-container{padding-left:var(--q-sidebar-width);}
body.sidebar-collapsed .pc-container{padding-left:var(--q-sidebar-collapsed);}}
.pc-content{padding:24px;}
.pc-sidebar{
position:fixed;top:0;left:0;bottom:0;
width:var(--q-sidebar-width);
background:
linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,0)),
linear-gradient(180deg, var(--q-sidebar), var(--q-sidebar-2));
border-right:1px solid var(--q-border-soft);
box-shadow:var(--q-shadow);
backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
transition:width var(--q-speed), transform var(--q-speed);
z-index:1030;
}
@media (max-width:991.98px){.pc-sidebar{transform:translateX(-100%);}
.pc-sidebar.mob-sidebar-active{transform:translateX(0);}}
@media (min-width:992px){body.sidebar-collapsed .pc-sidebar{width:var(--q-sidebar-collapsed);}}
.pc-sidebar{overflow:hidden;}
.pc-sidebar .m-header{
padding:28px 18px 18px;background:transparent;
border-bottom:1px solid rgba(255,255,255,.05);
display:flex;align-items:center;justify-content:center;
overflow:hidden;
max-height:110px;
}
.pc-sidebar .b-brand{display:flex;align-items:center;justify-content:center;width:100%;max-width:190px;max-height:70px;overflow:hidden;}
.pc-sidebar .b-brand img,
.pc-sidebar .b-brand svg{
display:block;
width:100% !important;
height:auto !important;
max-width:190px !important;
max-height:70px !important;
object-fit:contain;
filter:drop-shadow(0 10px 24px rgba(0,194,255,.10));
}
.pc-sidebar .navbar-content{
height:calc(100vh - 104px);padding:18px 14px 88px;
overflow-y:auto;overflow-x:hidden;
scrollbar-width:thin;scrollbar-color:rgba(0,194,255,.65) transparent;
}
.pc-sidebar .navbar-content::-webkit-scrollbar{width:4px;}
.pc-sidebar .navbar-content::-webkit-scrollbar-track{background:transparent;}
.pc-sidebar .navbar-content::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--q-blue),var(--q-cyan));border-radius:999px;}
.pc-navbar{list-style:none;margin:0;padding:0;padding-top:4px;}
.pc-item.pc-caption{padding:0 10px;margin:12px 0 10px;}
.pc-item.pc-caption label{color:var(--q-cyan);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.22em;}
.pc-sidebar .pc-item + .pc-item{margin-top:6px;}
.pc-sidebar .pc-link{
min-height:50px;border-radius:16px;padding:13px 16px;
display:flex;align-items:center;gap:14px;color:var(--q-text-soft);
position:relative;overflow:hidden;border:1px solid transparent;
transition:all var(--q-speed);cursor:pointer;
}
.pc-sidebar .pc-link::before{
content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;
border-radius:0 8px 8px 0;background:linear-gradient(180deg,var(--q-blue),var(--q-cyan));
opacity:0;transform:scaleY(.28);transition:all var(--q-speed);
}
.pc-sidebar .pc-link::after{
content:"";position:absolute;inset:0;
background:linear-gradient(90deg, rgba(0,194,255,.12), rgba(115,229,255,.03));
opacity:0;transition:opacity var(--q-speed);pointer-events:none;
}
.pc-sidebar .pc-link:hover{color:var(--q-text);background:var(--q-hover);border-color:rgba(0,194,255,.12);transform:translateX(3px);}
.pc-sidebar .pc-link:hover::before,.pc-sidebar .pc-link:hover::after{opacity:1;transform:scaleY(1);}
.pc-sidebar .pc-micon{min-width:20px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;position:relative;z-index:2;}
.pc-sidebar .pc-mtext{position:relative;z-index:2;font-size:14px;font-weight:500;white-space:nowrap;}
.pc-sidebar .pc-arrow{margin-left:auto;position:relative;z-index:2;color:var(--q-text-muted);transition:all var(--q-speed);font-size:13px;}
.pc-sidebar .pc-hasmenu.pc-trigger > .pc-link .pc-arrow{transform:rotate(90deg);}
.pc-sidebar .pc-item.active > .pc-link,.pc-sidebar .pc-item.pc-trigger > .pc-link{
background:var(--q-active);color:var(--q-dark);border-color:transparent;box-shadow:0 12px 26px rgba(0,194,255,.22);
}
.pc-sidebar .pc-item.active > .pc-link .pc-mtext,.pc-sidebar .pc-item.active > .pc-link .pc-arrow,
.pc-sidebar .pc-item.active > .pc-link .pc-micon,.pc-sidebar .pc-item.pc-trigger > .pc-link .pc-mtext,
.pc-sidebar .pc-item.pc-trigger > .pc-link .pc-arrow,.pc-sidebar .pc-item.pc-trigger > .pc-link .pc-micon{color:var(--q-dark);}
.pc-sidebar .pc-item.active > .pc-link::before,.pc-sidebar .pc-item.active > .pc-link::after,
.pc-sidebar .pc-item.pc-trigger > .pc-link::before,.pc-sidebar .pc-item.pc-trigger > .pc-link::after{opacity:1;transform:scaleY(1);}
.pc-sidebar .pc-submenu{list-style:none;margin:4px 0 2px 14px;padding:8px 0 4px 18px;border-left:1px solid rgba(0,194,255,.14);display:none;}
.pc-sidebar .pc-hasmenu.pc-trigger > .pc-submenu{display:block;}
.pc-sidebar .pc-submenu .pc-link{min-height:42px;padding:10px 14px;border-radius:12px;font-size:13px;color:var(--q-text-soft);background:transparent;}
.pc-sidebar .pc-submenu .pc-link:hover{background:rgba(255,255,255,.03);color:var(--q-text);transform:translateX(4px);}
.pc-sidebar .pc-submenu .pc-item.active > .pc-link{background:rgba(0,194,255,.10);color:var(--q-cyan);box-shadow:none;}
body.sidebar-collapsed .pc-sidebar .pc-mtext,body.sidebar-collapsed .pc-sidebar .pc-caption,
body.sidebar-collapsed .pc-sidebar .pc-arrow{opacity:0;visibility:hidden;pointer-events:none;}
body.sidebar-collapsed .pc-sidebar .pc-link{justify-content:center;padding:13px 12px;}
body.sidebar-collapsed .pc-sidebar .pc-submenu{display:none;}
.pc-menu-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1025;}
.pc-header{
position:fixed;top:0;right:0;left:0;z-index:1020;
background:rgba(10,13,19,.74);border-bottom:1px solid rgba(255,255,255,.06);
backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 10px 30px rgba(0,0,0,.16);
transition:left var(--q-speed);
}
@media (min-width:992px){.pc-header{left:var(--q-sidebar-width);}
body.sidebar-collapsed .pc-header{left:var(--q-sidebar-collapsed);}}
.pc-header .header-wrapper{min-height:76px;padding:0 22px;display:flex;align-items:center;position:relative;}
.pc-head-link{
width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;
color:var(--q-text-soft);background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);
transition:all var(--q-speed);font-size:18px;
}
.pc-head-link:hover{color:var(--q-cyan);background:rgba(0,194,255,.10);border-color:rgba(0,194,255,.16);box-shadow:0 10px 22px rgba(0,194,255,.12);}
.pc-head-link.dropdown-toggle::after,
.premium-profile-btn.dropdown-toggle::after{
display:none !important;
content:"" !important;
border:none !important;
width:0 !important;
height:0 !important;
margin:0 !important;
}
.header-brand{
display:flex;align-items:center;justify-content:center;
max-height:64px;overflow:hidden;
position:absolute;left:50%;top:50%;
transform:translate(-50%,-50%);
pointer-events:none;
}
.header-brand img,
.header-brand svg{
display:block;
width:auto !important;
height:56px !important;
max-height:56px !important;
object-fit:contain;
pointer-events:auto;
}
.pc-header .dropdown-menu{
background:linear-gradient(180deg, rgba(18,25,36,.98), rgba(13,18,27,.98));
border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 25px 50px rgba(0,0,0,.35);padding:12px;
}
.drp-search{min-width:280px;}
.drp-search .form-control{background:#0d131c;border:1px solid rgba(255,255,255,.08);color:var(--q-text);border-radius:14px;min-height:46px;}
.drp-search .form-control::placeholder{color:var(--q-text-muted);}
.wallet-header-box{
display:flex;align-items:center;gap:14px;min-height:52px;padding:10px 14px;border-radius:18px;
background:linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.02)),rgba(17,24,35,.84);
border:1px solid rgba(255,255,255,.07);box-shadow:var(--q-glow);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
}
.wallet-header-box small{display:block;font-size:11px;line-height:1;color:var(--q-text-muted);text-transform:uppercase;letter-spacing:.18em;margin-bottom:7px;}
.wallet-header-box h6{color:var(--q-text);font-size:16px;font-weight:700;letter-spacing:.01em;margin:0;}
.wallet-header-box .btn{
min-height:40px;padding:0 16px;border-radius:12px;background:linear-gradient(90deg,var(--q-blue),var(--q-cyan));
border:none;color:var(--q-dark);font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;
box-shadow:0 10px 20px rgba(0,194,255,.18);
}
.wallet-header-box .btn:hover{color:var(--q-dark);transform:translateY(-1px);box-shadow:0 14px 24px rgba(0,194,255,.24);}
.premium-profile-btn{
width:auto;height:auto;min-height:48px;padding:0;border-radius:999px;
background:transparent;border:none;box-shadow:none;
display:flex;align-items:center;justify-content:flex-start;gap:10px;
overflow:visible;
}
.premium-profile-btn:hover{background:transparent;transform:none;}
.premium-avatar{
width:46px;height:46px;border-radius:50%;object-fit:cover;
border:2px solid rgba(0,194,255,.55);
box-shadow:0 6px 16px rgba(0,194,255,.20);
flex-shrink:0;
}
.premium-chevron-badge{
width:26px;height:26px;border-radius:50%;
display:inline-flex;align-items:center;justify-content:center;
background:rgba(0,194,255,.14);
border:1px solid rgba(0,194,255,.25);
color:var(--q-cyan);
font-size:13px;
transition:all var(--q-speed);
}
.premium-profile-btn:hover .premium-chevron-badge{
background:rgba(0,194,255,.24);
border-color:rgba(0,194,255,.4);
}
.premium-profile-btn.show .premium-chevron-badge{transform:rotate(180deg);}
.premium-user-details{display:flex;flex-direction:column;line-height:1.2;}
.premium-name{color:var(--q-text);font-size:14px;font-weight:600;white-space:nowrap;}
.premium-id{color:var(--q-text-muted);font-size:11px;letter-spacing:.08em;}
.dropdown-user-profile{min-width:290px;}
.dropdown-user-profile .dropdown-header{padding:10px 10px 14px;}
.dropdown-user-profile .dropdown-header h6{margin:0 0 4px;color:var(--q-text);font-size:15px;font-weight:600;}
.dropdown-user-profile .dropdown-header small{color:var(--q-text-muted);}
.dropdown-user-profile hr{border-color:rgba(255,255,255,.06);margin:4px 0 10px;}
.dropdown-user-profile .dropdown-item{min-height:46px;border-radius:12px;display:flex;align-items:center;color:var(--q-text-soft);font-size:14px;font-weight:500;transition:all var(--q-speed);}
.dropdown-user-profile .dropdown-item:hover{background:rgba(0,194,255,.10);color:var(--q-text);}
.dropdown-user-profile .dropdown-item.text-danger{color:var(--q-danger);}
.dropdown-user-profile .dropdown-item.text-danger:hover{background:rgba(255,107,129,.10);color:#ff98a7;}
.pc-footer{background:transparent;border-top:1px solid rgba(255,255,255,.05);color:var(--q-text-muted);}
.pc-footer .footer-wrapper{padding:18px 24px;}
.pc-footer p{color:var(--q-text-muted);font-size:13px;margin:0;}
.breadcrumb{flex-wrap:wrap;row-gap:4px;}
.breadcrumb-item{color:var(--q-text-soft);}
.breadcrumb-item a{color:var(--q-cyan);text-decoration:none;}
.breadcrumb-item a:hover{color:var(--q-blue-2);text-decoration:underline;}
.breadcrumb-item.active{color:var(--q-text-muted);}
.breadcrumb-item+.breadcrumb-item::before{color:var(--q-text-muted);}
.page-header h2{color:var(--q-text);}
@media (max-width:1199.98px){.wallet-header-box{padding:10px 12px;}.wallet-header-box h6{font-size:14px;}.premium-user-details{display:none;}}
@media (max-width:767.98px){
.pc-header .header-wrapper{padding:0 12px;}
.pc-head-link{width:40px;height:40px;border-radius:12px;}
.dropdown-user-profile{min-width:240px;position:absolute;right:0;left:auto;margin-top:10px;max-width:calc(100vw - 24px);}
.pc-footer .footer-wrapper{padding:16px;}
.wallet-header-box{display:none;}
.premium-profile-btn{width:auto;min-width:0;height:auto;min-height:0;padding:0;gap:6px;justify-content:flex-start;overflow:visible;}
.premium-avatar{width:38px;height:38px;}
.premium-chevron-badge{width:22px;height:22px;font-size:11px;}
.premium-user-details{display:none;}
}
</style>
@section('extra')
@show
</head>
<body>
<input type="hidden" value="{{ URL::to('/') }}" id="basePath"/>
<input type="hidden" id="token" value="{{ csrf_token() }}"/>

<nav class="pc-sidebar" id="pcSidebar">
<div class="navbar-wrapper">
<div class="m-header">
<div class="b-brand text-primary">
<x-logo />
</div>
</div>
<div class="navbar-content">
<ul class="pc-navbar">
<li class="pc-item pc-caption"><label>Main Menu</label></li>

<li class="pc-item">
<a href="{{ URL::to('/') }}/dashboard" class="pc-link">
<span class="pc-micon"><i class="bi bi-speedometer2"></i></span>
<span class="pc-mtext">Dashboard</span>
</a>
</li>

<li class="pc-item pc-hasmenu">
<a href="javascript:void(0)" class="pc-link">
<span class="pc-micon"><i class="bi bi-gear"></i></span>
<span class="pc-mtext">Account</span>
<span class="pc-arrow"><i class="bi bi-chevron-right"></i></span>
</a>
<ul class="pc-submenu">
<li class="pc-item"><a class="pc-link" href="{{ URL::to('/') }}/update-profile">Profile</a></li>
</ul>
</li>

<li class="pc-item pc-hasmenu">
<a href="javascript:void(0)" class="pc-link">
<span class="pc-micon"><i class="bi bi-people"></i></span>
<span class="pc-mtext">Network</span>
<span class="pc-arrow"><i class="bi bi-chevron-right"></i></span>
</a>
<ul class="pc-submenu">
<li class="pc-item"><a class="pc-link" href="{{ URL::to('/') }}/my-referral">My Referrals</a></li>
<li class="pc-item"><a class="pc-link" href="{{ URL::to('/') }}/downline-report/A">Team Network</a></li>
</ul>
</li>

<li class="pc-item pc-hasmenu">
<a href="javascript:void(0)" class="pc-link">
<span class="pc-micon"><i class="bi bi-cpu"></i></span>
<span class="pc-mtext">Investments</span>
<span class="pc-arrow"><i class="bi bi-chevron-right"></i></span>
</a>
<ul class="pc-submenu">
<li class="pc-item"><a class="pc-link" href="{{ URL::to('/') }}/buy-robo">Invest Now</a></li>
<li class="pc-item"><a class="pc-link" href="{{ URL::to('/') }}/bot-request">My Investments</a></li>
</ul>
</li>

<li class="pc-item">
<a href="{{ URL::to('/') }}/earning-wallet" class="pc-link">
<span class="pc-micon"><i class="bi bi-currency-dollar"></i></span>
<span class="pc-mtext">Wallet</span>
</a>
</li>

<li class="pc-item pc-hasmenu">
    <a href="javascript:void(0)" class="pc-link">
        <span class="pc-micon">
            <i class="bi bi-graph-up-arrow"></i>
        </span>
        <span class="pc-mtext">Earnings</span>
        <span class="pc-arrow">
            <i class="bi bi-chevron-right"></i>
        </span>
    </a>

    <ul class="pc-submenu">
        <li class="pc-item">
            <a class="pc-link" href="{{ URL::to('/') }}/earning/1/ROI History">
                ROI History
            </a>
        </li>

        <li class="pc-item">
            <a class="pc-link" href="{{ URL::to('/') }}/earning/2/Contribution Reward">
                Contribution Reward
            </a>
        </li>

        <li class="pc-item">
            <a class="pc-link" href="{{ URL::to('/') }}/earning/3/Booster Reward">
                Booster Reward
            </a>
        </li>

        <li class="pc-item">
            <a class="pc-link" href="{{ URL::to('/') }}/earning/4/Rank Reward">
                Rank Reward
            </a>
        </li>
    </ul>
</li>


<li class="pc-item pc-caption"><label>Others</label></li>



<li class="pc-item mb-3">
    <a href="{{ URL::to('/') }}/create-ticket" class="pc-link">
        <span class="pc-micon">
            <i class="bi bi-headset"></i>
        </span>
        <span class="pc-mtext">Support</span>
    </a>
<a href="{{ URL::to('/') }}/sign-out" class="pc-link">
<span class="pc-micon"><i class="bi bi-box-arrow-right"></i></span>
<span class="pc-mtext">Sign Out</span>
</a>
</li>
</ul>
</div>
</div>
</nav>

<header class="pc-header">
<div class="header-wrapper">
<div class="me-auto d-flex align-items-center">
<a href="javascript:void(0)" class="pc-head-link me-2" id="sidebar-hide">
<i class="bi bi-list"></i>
</a>
<div class="header-brand">
<x-logo />
</div>
</div>

<div class="ms-auto d-flex align-items-center gap-3">
<div class="wallet-header-box">
<div>
<small>Wallet Balance</small>
<h6 class="main_balance">0.00000000 BNB</h6>
</div>
<a href="javascript:connectwallet()" class="btn btn-sm">
<i class="bi bi-wallet2 me-1"></i>Connect
</a>
</div>

<div class="dropdown">
<a class="pc-head-link dropdown-toggle premium-profile-btn" data-bs-toggle="dropdown" href="#" role="button" data-bs-auto-close="outside" aria-expanded="false">
<img src="{{ URL::to('/') }}/assets/images/user/avatar-1.jpg" class="premium-avatar" alt="Avatar">
<div class="premium-user-details d-none d-lg-flex">
<span class="premium-name">{{ Auth::user()->firstname }} {{ Auth::user()->lastname }}</span>
<small class="premium-id">{{ obscureAddress(Auth::user()->username) }}</small>
</div>
<span class="premium-chevron-badge"><i class="bi bi-chevron-down"></i></span>
</a>
<div class="dropdown-menu dropdown-menu-end dropdown-user-profile pc-h-dropdown">
<div class="dropdown-header">
<div class="d-flex align-items-center">
<img src="{{ URL::to('/') }}/assets/images/user/avatar-1.jpg" class="rounded-circle me-3" width="55" alt="Avatar">
<div>
<h6>{{ Auth::user()->firstname }} {{ Auth::user()->lastname }}</h6>
<small>{{ obscureAddress(Auth::user()->username) }}</small>
</div>
</div>
</div>
<hr>
<div class="dropdown-body">
<a href="{{ URL::to('/') }}/update-profile" class="dropdown-item"><i class="bi bi-person me-2"></i>My Profile</a>
<a href="{{ URL::to('/') }}/earning-wallet" class="dropdown-item"><i class="bi bi-wallet2 me-2"></i>Wallet</a>
<a href="{{ URL::to('/') }}/create-ticket" class="dropdown-item"><i class="bi bi-headset me-2"></i>Support</a>
<hr>
<a href="{{ URL::to('/') }}/sign-out" class="dropdown-item text-danger"><i class="bi bi-box-arrow-right me-2"></i>Logout</a>
</div>
</div>
</div>
</div>
</div>
</header>

<div class="offcanvas offcanvas-end" tabindex="-1" id="announcement" aria-labelledby="announcementLabel">
<div class="offcanvas-header">
<h5 class="offcanvas-title" id="announcementLabel">What's new announcement?</h5>
<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
</div>
<div class="offcanvas-body"></div>
</div>

<div class="pc-container">
<div class="pc-content">
@yield('content')
</div>
<footer class="pc-footer">
<div class="footer-wrapper container-fluid">
<div class="row">
<div class="col my-1">
<p>Copyright &#169; {{ date("Y") }} Quantara. All Rights Reserved</p>
</div>
</div>
</div>
</footer>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {
    var sidebar = document.getElementById("pcSidebar");
    var sidebarHide = document.getElementById("sidebar-hide");
    var body = document.body;

    function removeOverlay() {
        var overlay = document.querySelector(".pc-menu-overlay");
        if (overlay) overlay.remove();
    }

    function addOverlay() {
        removeOverlay();
        var overlay = document.createElement("div");
        overlay.className = "pc-menu-overlay";
        document.body.appendChild(overlay);
        overlay.addEventListener("click", function () {
            sidebar.classList.remove("mob-sidebar-active");
            removeOverlay();
        });
    }

    if (sidebarHide) {
        sidebarHide.addEventListener("click", function (e) {
            e.preventDefault();
            if (window.innerWidth > 991) {
                body.classList.toggle("sidebar-collapsed");
            } else {
                var active = sidebar.classList.toggle("mob-sidebar-active");
                if (active) addOverlay(); else removeOverlay();
            }
        });
    }

    document.querySelectorAll(".pc-hasmenu > .pc-link").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            var parent = link.parentElement;
            var wasOpen = parent.classList.contains("pc-trigger");
            document.querySelectorAll(".pc-hasmenu.pc-trigger").forEach(function (item) {
                if (item !== parent) item.classList.remove("pc-trigger");
            });
            parent.classList.toggle("pc-trigger", !wasOpen);
        });
    });

    var currentPath = window.location.pathname.replace(/\/+$/, "");
    document.querySelectorAll(".pc-sidebar a.pc-link").forEach(function (link) {
        try {
            var linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, "");
            if (linkPath && linkPath === currentPath) {
                var item = link.closest(".pc-item");
                item.classList.add("active");
                var submenuParent = item.closest(".pc-hasmenu");
                if (submenuParent) submenuParent.classList.add("pc-trigger");
            }
        } catch (err) {}
    });

    document.addEventListener("click", function (e) {
        if (window.innerWidth > 991) return;
        if (
            sidebar.classList.contains("mob-sidebar-active") &&
            !sidebar.contains(e.target) &&
            e.target.id !== "sidebar-hide" &&
            !sidebarHide.contains(e.target)
        ) {
            sidebar.classList.remove("mob-sidebar-active");
            removeOverlay();
        }
    });
});
</script>

@yield('jscontent')
</body>
</html>