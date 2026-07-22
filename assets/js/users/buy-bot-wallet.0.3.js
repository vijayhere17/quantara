let coin_rate = PHP2JS.data.coin_rate;
let payable_coin = 0;

jQuery(document).ready(function() {
	$(".ew_balance").text(PHP2JS.data.balance);
});

function getcalculation()
{
    var amount = $("#topup_amount").val(); // $("input[type=radio]:checked").attr('stakeamount');
    var payable = parseFloat(amount/coin_rate).toFixed(8);
        payable_coin = payable;
    
    $("#txt_amount").text(parseFloat(amount).toFixed(4));
    $("#txt_payable").text(payable);
}

jQuery('.btn-submit').bind('click', function(e) {
    e.preventDefault();
    processstake();
});

async function processstake() 
{
    const amount = $("#topup_amount").val();
    const username = $("#username").val();

    if(amount == '')
    {
        erroralert('Please enter a topup amount');
        return false;
    }

    if(amount <= 0)
    {
        erroralert('Please enter a valid topup amount');
        return false;
    }

    if(amount % 50 != 0)
    {
        erroralert('Please enter topup amount $50 multiple');
        return false;
    }
    
    if(username == '')
    {
        erroralert('Please enter a topup user wallet');
        return false;
    }

    blockui();

    // ---------------------------------------------------------------------------
 
    try {
        const stake_id = 1; // $("input[type=radio]:checked").attr('stakeid');
        
        var reqObj = {
            _token: token,
            stake_id : stake_id,
            payment : 0,
            amount : amount,
            username : username,
        };
    
        $.ajax({
            type: 'POST',
            url: BASEPATH + "/process-submit-buy-bot-wallet",
            data: reqObj,
            dataType: 'json',
            success: function(result) {
                if (result.success) {
                    unblockui();
                    successalert(result.message)
                    window.location.href = BASEPATH+'/topup-history';
                } else {
                    erroralert(result.error);
                    unblockui();
                }
            }
        });
    } catch(err) {
        console.log(err)
        erroralert(err.message || "An unexpected error occurred.");
        unblockui();
    }    
}
