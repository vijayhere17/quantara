jQuery(document).ready(function() {
	// call function whene page load
    // document.getElementById('userwallet').readOnly = true;
});

// Event delegation — React mounts .btn-connect after this script loads
jQuery(document).off('click.quantaraConnect', '.btn-connect').on('click.quantaraConnect', '.btn-connect', async function(e) {
    e.preventDefault();

    if (window.ethereum) {
        try {
            accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            window.web3 = new Web3(window.ethereum);

            is_connected = true;

            $(".btn-connect").hide();
            $(".btn-submit").show();
            
            // Fill wallet input
            $("#userwallet").val(accounts[0]).trigger('change').trigger('input');
            
            const chainIdHex = web3.utils.toHex(chainId);
    
            const chianParams = {
                chainId: chainIdHex,
                chainName: "BNB Smart Chain",
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18,
                },
                blockExplorerUrls: ["https://bscscan.com/"],
            };

            // Try to switch to BSC
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    // Chain not found — try adding it
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [chianParams],
                        });

                        // Try switching again after adding
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: chainIdHex }],
                        });
                    } catch (addError) {
                        console.error("❌ Failed to add BSC network:", addError);
                        return;
                    }
                } else {
                    console.error("❌ Failed to switch network:", switchError);
                    return;
                }
            }
        } catch (err) {
            console.error("❌ Wallet connection failed:", err);
        }
    } else {
        is_connected = false;
        $(".btn-connect").show();
        $(".btn-submit").hide();
        $("#userwallet").val('');
        erroralert('Please install MetaMask or another Web3 wallet');
    }
});

jQuery(document).off('click.quantaraSubmit', '.btn-submit').on('click.quantaraSubmit', '.btn-submit', function(e) {
    e.preventDefault();
    if (validate()) {
        processlogin();
    }
});

function validate() {
    if (!is_connected) {
        erroralert('Please connect dapp wallet');
        return false;
    }
    
    if ($("#userwallet").val() == '') {
        erroralert('Please connect wallet!');
        return false;
    }

    return true;
}

function processlogin() {
    var wallet = $("#userwallet").val();
  
    var reqObj = {
        _token: token,
        wallet : wallet
    };

    blockui();

    $.ajax({
        type: 'POST',
        url: BASEPATH + "/submit-sign-in",
        data: reqObj,
        dataType: 'json',
        success: function(result) {
            if (result.success) {
                window.location.href = BASEPATH+'/dashboard';
                resetformdata();
            } else {
                erroralert(result.error);
            }
            unblockui();
        }
    });
}

function resetformdata() {
    $("#username").val('');
    $("#password").val('');
}
