@php
    $refer = isset($_REQUEST['ref']) ? $_REQUEST['ref'] : '';

    // Registration opens with the single $50 starter package only.
    $packages = [
        [
            'amount' => 50,
            'label' => 'Starter Package · $50',
            'multiplier' => '4X Max',
            'buys' => 0,
            'maxBuys' => 2,
            'locked' => false,
        ],
    ];

    $authBridge = <<<'HTML'
<script>
(function () {
  if (window.jQuery) {
    jQuery(document).on('click', '.btn-submit', function () {
      var walletEl = document.getElementById('userwallet');
      var sponsorEl = document.getElementById('sponsor_id');
      window.__QUANTARA_LAST_WALLET__ = (walletEl && walletEl.value) || window.__QUANTARA_LAST_WALLET__ || '';
      window.__QUANTARA_LAST_SPONSOR__ = (sponsorEl && sponsorEl.value) || window.__QUANTARA_LAST_SPONSOR__ || '';
    });
  }

  window.successMessage = function () {
    var authMain = document.getElementById('auth-main');
    if (authMain) {
      authMain.style.display = '';
    }
    var wallet = (document.getElementById('userwallet') && document.getElementById('userwallet').value) || window.__QUANTARA_LAST_WALLET__ || '';
    var sponsor = (document.getElementById('sponsor_id') && document.getElementById('sponsor_id').value) || window.__QUANTARA_LAST_SPONSOR__ || '';
    window.dispatchEvent(new CustomEvent('quantara:registration-success', {
      detail: {
        memberId: wallet || '—',
        walletAddress: wallet || '—',
        sponsorId: sponsor || '—',
        packageLabel: '$50',
        transactionHash: '',
        registrationDate: new Date().toLocaleString(),
        network: 'BNB Smart Chain'
      }
    }));
  };
})();
</script>
HTML;
@endphp

@include('users.layouts.auth-react', [
    'page_titel' => $page_titel ?? 'Sign Up · Quantara',
    'boot' => [
        'page' => 'signup',
        'referralCode' => $refer,
        'packages' => $packages,
    ],
    'authScript' => 'assets/js/users/sign-up.0.7.js',
    'authBridge' => $authBridge,
])
