@php
    use Illuminate\Support\Facades\Auth;
@endphp
@extends('users.master')
@section('extra')
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
        padding:18px 22px;
    }
    .gt-card .card-header h5{ color:#fff; font-weight:700; margin:0; }
    .gt-card .card-body{ padding:22px; }
    .gt-subtitle{ color:#aab6c8; font-size:14px; margin-top:4px; }

    .gt-package-grid{
        display:flex;
        flex-wrap:wrap;
        gap:12px;
        margin-bottom:6px;
    }
    .gt-package-label{ cursor:pointer; flex:1 1 120px; position:relative; }
    .gt-package-label input.form-check-input{
        position:absolute;
        opacity:0;
        pointer-events:none;
    }
    .gt-package-chip{
        background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.09);
        border-radius:14px;
        padding:16px 10px;
        text-align:center;
        transition:all .2s ease;
    }
    .gt-package-chip .gt-amt{ color:#fff; font-size:18px; font-weight:800; }
    .gt-package-chip .gt-max{ color:#7f8ca0; font-size:11px; margin-top:2px; }
    .gt-package-label:hover .gt-package-chip{
        border-color:rgba(0,194,255,.35);
        transform:translateY(-2px);
    }
    .gt-package-label:has(input:checked) .gt-package-chip{
        background:linear-gradient(90deg,#00c2ff,#73e5ff);
        border-color:transparent;
        box-shadow:0 12px 26px rgba(0,194,255,.25);
    }
    .gt-package-label:has(input:checked) .gt-package-chip .gt-amt,
    .gt-package-label:has(input:checked) .gt-package-chip .gt-max{
        color:#061019;
    }
    .gt-unlimited-tag{
        position:absolute;
        top:-8px; right:6px;
        background:#22c55e;
        color:#fff;
        font-size:9px;
        font-weight:800;
        padding:2px 7px;
        border-radius:20px;
        letter-spacing:.03em;
        z-index:2;
    }

    .gt-upgrade-note{
        color:#7f8ca0;
        font-size:12px;
        margin-top:10px;
    }

    .gt-card .form-control{
        background:#0d131c !important;
        border:1px solid rgba(255,255,255,.10) !important;
        color:#fff !important;
        border-radius:12px !important;
        min-height:50px;
    }
    .gt-card .form-control:focus{
        border-color:#00c2ff !important;
        box-shadow:0 0 0 4px rgba(0,194,255,.15) !important;
    }

    .gt-summary-row{
        display:flex;
        justify-content:space-between;
        padding:8px 0;
        border-bottom:1px solid rgba(255,255,255,.06);
        font-size:14px;
    }
    .gt-summary-row span:first-child{ color:#7f8ca0; }
    .gt-summary-row span:last-child{ color:#fff; font-weight:700; }

    .gt-activate-btn{
        background:linear-gradient(90deg,#00c2ff,#73e5ff);
        border:none;
        color:#061019;
        font-weight:800;
        min-height:52px;
        border-radius:14px;
        box-shadow:0 14px 30px rgba(0,194,255,.25);
        transition:all .25s ease;
    }
    .gt-activate-btn:hover{
        transform:translateY(-1px);
        box-shadow:0 18px 36px rgba(0,194,255,.32);
        color:#061019;
    }
</style>
@endsection
@section('content')
<div class="page-header mb-4">
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-2">
            <li class="breadcrumb-item"><a href="{{ URL::to('/') }}/dashboard">Dashboard</a></li>
            <li class="breadcrumb-item active" aria-current="page">{{ $page_titel }}</li>
        </ol>
    </nav>
    <h2 class="mb-0">BTC Plan Activation</h2>
    <p class="gt-subtitle">Activate your investment package securely through our smart contracts on BNB Smart Chain.</p>
</div>

<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="gt-card">
            <div class="card-header">
                <h5>Select Your Package</h5>
            </div>
            <div class="card-body">
                <div class="gt-package-grid">
                    @php
$packages = [
    ['id' => 1, 'amount' => 50],
    ['id' => 2, 'amount' => 100],
    ['id' => 3, 'amount' => 300],
    ['id' => 4, 'amount' => 500],
    ['id' => 5, 'amount' => 1000],
    ['id' => 6, 'amount' => 3000],
    ['id' => 7, 'amount' => 5000],
    ['id' => 8, 'amount' => 10000],
];
@endphp

<div class="gt-package-grid">
    @foreach($packages as $data)
    <label class="gt-package-label" for="package_{{ $data['id'] }}">
        @if($loop->last)
            <span class="gt-unlimited-tag">UNLIMITED</span>
        @endif

        <input
            type="radio"
            name="package"
            class="form-check-input input-primary"
            id="package_{{ $data['id'] }}"
            stakeid="{{ $data['id'] }}"
            stakeamount="{{ $data['amount'] }}"
            onclick="document.getElementById('topup_amount').value='{{ $data['amount'] }}'; getcalculation();"
        >

        <div class="gt-package-chip">
            <div class="gt-amt">${{ number_format($data['amount']) }}</div>
            <div class="gt-max">
                {{ $data['amount'] == 10000 ? 'Unlimited Upgrade' : '4X Max' }}
            </div>
        </div>
    </label>
    @endforeach
</div>
                </div>
                <p class="gt-upgrade-note">Each package can be upgraded 2 times. The final package (10000) allows unlimited upgrades.</p>

                <div class="mt-3">
                    <x-input type="text" name="topup_amount" id="topup_amount" placeholder="Investment Amount ($)" value="" />
                </div>

                <div id="txt_apy" style="display:none;">0.00</div>

                <input type="hidden" name="paymentmode" id="payment_alc" data="1" contract="0x8E9AE77Fa6bc9649A680BC0f0dc1bce5f57Dd142" decimal="18" value="1" checked>

                <div class="gt-summary-row"><span>Payable (BTCB)</span><span id="txt_payable">0.00000000</span></div>

                <button type="submit" class="btn gt-activate-btn btn-submit w-100 mt-3">Activate Package</button>
            </div>
        </div>
    </div>
</div>

@endsection

<script>

window.BLOCKCHAIN = {

    rpc : @json($rpc),

    coreAddress : @json($coreAddress),

    tokenAddress : @json($tokenAddress),

    treasuryAddress : @json($treasuryAddress),

    sponsor : @json($sponsorWallet),

    coreAbi : {!! $coreAbi !!},

    tokenAbi : {!! $tokenAbi !!}

};

console.log(window.BLOCKCHAIN);

</script>
@section('jscontent')

<script src="https://cdn.jsdelivr.net/npm/web3@1.10.4/dist/web3.min.js"></script>

<script src="{{ URL::to('/') }}/assets/js/users/web3-helper.js?v={{ time() }}"></script>

<script src="{{ URL::to('/') }}/assets/js/users/btc-wallet.js?v={{ time() }}"></script>

@endsection