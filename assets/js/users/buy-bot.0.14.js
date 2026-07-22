let rid = 0;

let coin_rate = PHP2JS.data.coin_rate;
let contract_addr = PHP2JS.data.usdt_con_addr;
let contract_abi = JSON.parse(PHP2JS.data.usdt_con_abi);

let payable_coin = 0;

const deposit_addr = PHP2JS.data.to_address;

function getcalculation()
{
    var apy = $("input[name=package]:checked").attr('apy');

    var amount = $("#topup_amount").val(); 
    var payable = parseFloat(amount/coin_rate).toFixed(8);
        payable_coin = payable;
    
    $("#txt_apy").text(parseInt(apy)+'%');    
    
    $("#txt_amount").text(parseFloat(amount).toFixed(4));
    $("#txt_payable").text(payable);
}

jQuery('.btn-submit').bind('click', function(e) {
    e.preventDefault();
    processstake();
});

async function processstake() 
{
    if(!$("input[name='package']").is(':checked'))
    {
        erroralert('Please select stake package');
        return false;
    }

    if(!$("input[name='paymentmode']").is(':checked'))
    {
        erroralert('Please select payment option');
        return false;
    }
    
    // const contractaddr = $("input[name='paymentmode']:checked").attr('contract');
    
    const decimal = $("input[name='paymentmode']:checked").attr('decimal');
    const payment = $("input[name='paymentmode']:checked").attr('value');

    const amount = $("#topup_amount").val();

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

    blockui();

    await connectwallet();
  
    // ---------------------------------------------------------------------------
   
    if(decimal == 18)
    {
        var amountwei = web3.utils.toWei(payable_coin.toString(), 'ether');
    }
    else if(decimal == 6)
    {
        var amountwei = web3.utils.toWei(amount.toString(), 'mwei');
    }
    
    try {
        const payContract = new web3.eth.Contract(contract_abi, contract_addr);
        
        let balance = await payContract.methods.balanceOf(accounts[0]).call();
      
        if(BigInt(balance) < BigInt(amountwei)) 
        {
            erroralert("Insufficient balance to perform the topup.");
            unblockui();
            return;
        }
    
        const tx = payContract.methods.transfer(deposit_addr, amountwei);
    
        let gasprice = await web3.eth.getGasPrice();
            gasprice = Math.round(gasprice * 1.2); 
    
        let gas_estimate = await tx.estimateGas({ from: accounts[0] });
            gas_estimate = Math.round(gas_estimate * 1.2); 
    
        await tx.send({ 
            from: accounts[0], 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice: web3.utils.toHex(gasprice),
        }).on('transactionHash', (hash) => {
            submitHashRequest(rid, payment, 1, hash);
        }).on('receipt', (receipt) => {
            if (receipt.status) {  submitHashRequest(rid, payment, 2, receipt.transactionHash); }
        }).on('error', (error) => {
            erroralert(error.message || "Transaction failed.");
            unblockui();
        });
    } catch(err) {
        console.log(err)
        erroralert(err.message || "An unexpected error occurred.");
        unblockui();
    }    
}

async function submitHashRequest(id, payment, status, hash)
{
    const stake_id = $("input[type=radio]:checked").attr('stakeid');
    const amount = $("#topup_amount").val();

    var reqObj = {
        _token: token,
        id : id,
        stake_id : stake_id,
        payment : payment,
        amount : amount,
        status : status,
        hash : hash
    };

    $.ajax({
        type: 'POST',
        url: BASEPATH + "/process-submit-buy-bot",
        data: reqObj,
        dataType: 'json',
        success: function(result) {
            if (result.success) {
                rid = result.id;
                if(status == 2)
                {
                    unblockui();
                    successalert(result.message)
                    window.location.href = BASEPATH+'/bot-request';
                }
            } else {
                erroralert(result.error);
                unblockui();
            }
        }
    });
}