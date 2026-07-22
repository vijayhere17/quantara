<?php

namespace App\Http\Controllers\Users;

use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\StakeMaster;
use App\Models\StakeRequest;
use App\Models\UserStaked;
use App\Models\ParentList;
use App\Models\BinaryPoints;
use App\Models\TopupByWalletLog;
use App\Models\RoiTierMaster;
use App\Models\BoosterAchiever;
use App\Models\WithdrawalLog;
use DB;
use Log;

class StakeController extends Controller
{
    //
    protected function depositaddress()
    {
        return '0x4E80F277be553E8A1c562461d6d342a7fcBC5cCc';
    }

    protected function contractabi(){
        return '[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"_decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address[]","name":"_user","type":"address[]"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"airdrop","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"basePercent","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"maxBurning","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address[]","name":"_user","type":"address[]"},{"internalType":"uint256[]","name":"value","type":"uint256[]"}],"name":"multisender","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalBurning","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]';
    }
    
    protected function contractaddr()
    {
        return '0x60De3AC5f725A784B2a815e8056ed22611e8F91b';
    }

    //

    public function buyRobo()
{
    $page_titel = 'BTC Plan Activation';

    // Existing package list (you can later replace with contract packages if desired)
    $packages = StakeMaster::where('is_admin',0)
                    ->where('is_travel',0)
                    ->where('ptype',2)
                    ->orderBy('percantage','asc')
                    ->get();

    /*
    |--------------------------------------------------------------------------
    | Load Contract ABI
    |--------------------------------------------------------------------------
    */

    $coreAbi = json_decode(
    file_get_contents(
        storage_path('app/blockchain/abi/BTCPlanCore.json')
    ),
    true
);

$tokenAbi = json_decode(
    file_get_contents(
        storage_path('app/blockchain/abi/MockBTCB.json')
    ),
    true
);

    /*
    |--------------------------------------------------------------------------
    | Blockchain Config
    |--------------------------------------------------------------------------
    */

    $rpc = config('blockchain.rpc_url');

    $coreAddress = config('blockchain.contracts.core');

    $tokenAddress = config('blockchain.contracts.token');

    $treasuryAddress = config('blockchain.contracts.treasury');

    /*
    |--------------------------------------------------------------------------
    | Sponsor
    |--------------------------------------------------------------------------
    | We'll improve this later.
    */

    $sponsorWallet = Auth::user()->sponsor_wallet ?? '0x0000000000000000000000000000000000000000';

    return view('users.buy-bot')->with([

        'page_titel' => $page_titel,

        'packages' => $packages,

        'rpc' => $rpc,

        'coreAddress' => $coreAddress,

        'tokenAddress' => $tokenAddress,

        'treasuryAddress' => $treasuryAddress,

        'coreAbi' => json_encode($coreAbi),

        'tokenAbi' => json_encode($tokenAbi),

        'sponsorWallet' => $sponsorWallet

    ])->toJS();
}
    
    public function submitBotTxn(Request $request)
    {
        try {
            $v = Validator::make($request->all(), [
                'id' => 'required',
                'stake_id' => 'required',
                'payment' => 'required',
                'amount' => 'required',
                'status' => 'required',
            ]);

            $id = $request->get('id');

            if ($id == 0) 
            {
                $rules['hash'] = 'required|unique:staked_requests';
            } 
            else 
            {
                $rules['hash'] = 'required'; // No uniqueness check for existing records
            }

            if ($v->fails())
            {
                return response()->json(array('success'=>false, 'error'=>'Invalid request data send.'), 200);
            }

            if (Auth::user() == null)
            {
				return response()->json(array('success'=>false,'error'=> 'Session is expired.'), 200);
			}
			
			$date = date("Y-m-d H:i:s");
			
			$coin_rate = getcoinrate();

            $stake_id = $request->get('stake_id');
            $amount =  $request->get('amount');
            $payment = $request->get('payment');
            $status = $request->get('status');
            $hash = $request->get('hash');

            $kit = StakeMaster::find($stake_id);

            // ------------------------------------------------------------------------------------------------------------------
            
            if($id == 0)
            {
                $invoice_no = self::generateInvoice();
                $object = new StakeRequest;
                $object->payment = $payment;
                $object->invoice_no = $invoice_no;
            }
            else
            {
                $object = StakeRequest::find($id);
            }
            
            $object->member_id = Auth::user()->id;
            
            $object->stake_id = $stake_id;
            $object->amount = $amount;
            
            $object->coin_rate = $coin_rate;
            $object->stake_coin = number_format((float)$amount/$coin_rate, 8, '.', '');
            
            $object->hash = $hash;
            $object->status = $status;
            
            $object->return_date = date('Y-m-d H:i:s', strtotime($date. ' + '.$kit->months.' days'));
            $object->apy = $kit->percantage;
            $object->d_apy = ($kit->percantage / $kit->months);
            
            $object->save();

            if($status == 2)
            {
                // check transaction hash
                // $response = Http::withOptions(['verify' => false])->get("https://f5sys.com/dont-delete-bnbnode/tnx-details.php?hash={$hash}");
                
                $rpc_url = 'https://bsc-dataseed1.binance.org/';
                
                $response = shell_exec("node /home/eudstake/node/txn-details.js ".$hash." ".$rpc_url);

                $result = json_decode($response, true);    

                if($result["status"])
                {
                    $status = $this->setStakeActivation($object->member_id, $object->stake_id, $object->amount, $object->id);

                    return response()->json(array('success'=>true, 'message'=>'Your Stake Successfully!', 'error'=>''), 200);
                }
                else
                {
                    $object->status = 0;
                    $object->save();

                    return response()->json(array('success'=>true, 'message'=>'Your Stake Request Submited Successfully!<br>Request Process Few Minutes.', 'error'=>''), 200);
                }
            }

            return response()->json(array('success'=>true, 'id'=>$object->id, 'error'=>''), 200);
        } catch(Exception $exception) {
            Log::error($exception);
            return response()->json(array('success'=>false,'error'=> 'An error occurred processing'), 200);
        }
    }
    
    public function runProcessStakeReq()
    {
        $rpc_url = 'https://bsc-dataseed1.binance.org/';
        
        $object = StakeRequest::find(0);
        
        if($object != null)
        {
            // check transaction hash
            $response = shell_exec("node /home/eudstake/node/txn-details.js ".$object->hash." ".$rpc_url);
            Log::info($response);
            $result = json_decode($response, true);    
            if($result["status"])
            {
                $status = $this->setStakeActivation($object->member_id, $object->stake_id, $object->amount, $object->id);

                return response()->json(array('success'=>true, 'message'=>'Your Stake Successfully!', 'error'=>''), 200);
            }
            else
            {
                return response()->json(array('success'=>true, 'message'=>'Your Stake Request Submited Successfully!<br>Request Process Few Minutes.', 'error'=>''), 200);
            }
        }
    }
    
    // by wallet
    public function buyRoboWallet()
    {
        if(Auth::user()->is_topup <= 0)
        {
            $page_titel = '404';
            return view('users.404')->with(['page_titel'=>$page_titel])->toJS();
        }
        
        $page_titel = 'New Topup By Earing Wallet'; 
        
        $userid = Auth::user()->id;

        $coin_rate = getcoinrate();
        
        $packages = StakeMaster::where('is_admin','=',0)->where('is_travel','=',0)->where('ptype','=',2)->get();

        $walletCon = app('App\Http\Controllers\Users\DepositWalletController');
        $balance = $walletCon->gewalletbalance($userid);

        return view('users.buy-bot-wallet')->with(['page_titel'=>$page_titel, 'coin_rate'=>$coin_rate, 'packages'=>$packages, 'balance'=>$balance])->toJS();
    }
    
    public function submitBotTxnByWallet(Request $request)
    {
        try {
            $v = Validator::make($request->all(), [
                'stake_id' => 'required',
                'payment' => 'required',
                'amount' => 'required',
                'username' => 'required',
            ]);

            if ($v->fails())
            {
                return response()->json(array('success'=>false, 'error'=>'Invalid request data send.'), 200);
            }

            if (Auth::user() == null)
            {
				return response()->json(array('success'=>false,'error'=> 'Session is expired.'), 200);
			}
			
			$coin_rate = getcoinrate();
			
			$userid = Auth::user()->id;
			
			$username = $request->get('username');

            $stake_id = $request->get('stake_id');
            $payment = $request->get('payment');
            $amount = $request->get('amount');
            
            $stake_kit = StakeMaster::find($stake_id);
            
            if(Auth::user()->is_topup <= 0)
            {
                return response()->json(array('success'=>false,'error'=> 'Unauthorized top-up request.'), 200);
            }
            
            $walletCon = app('App\Http\Controllers\Users\DepositWalletController');

            // ------------------------------------------------------------------------------------------------------------------
            $member = User::where('username', '=', $username)->first();
            if($member == null)
            {
                return response()->json(array('success'=>false,'error'=> 'User wallet address is not found.'), 200);
            }
            
            $balance = $walletCon->gewalletbalance($userid);
            if($amount > $balance)
            {
                return response()->json(array('success'=>false,'error'=> 'Insufficient account balance.'), 200);
            }
            
            // debit e wallet
            $description = obscureAddress($username).' ID Activated successfully';
            $log = $walletCon->addwalletlog($userid, 2, 0, $description, $amount, date("Y-m-d H:i:s")); 
            
            // submit Topup
            $status = $this->setStakeActivation($member->id, $stake_kit->id, $amount, 0);
            
            // add logs
            $nlobj = new TopupByWalletLog;
            $nlobj->ref_id = $log->id;
            $nlobj->member_id = $member->id;
            $nlobj->kit_id = $stake_kit->id;
            $nlobj->amount = $amount;
            $nlobj->topup_by = $userid;
            $nlobj->save();

            return response()->json(array('success'=>true, 'message'=>'Your ID Topup Successfully!', 'error'=>''), 200);
        } catch(Exception $exception) {
            Log::error($exception);
            return response()->json(array('success'=>false,'error'=> 'An error occurred processing'), 200);
        }
    }
    
    public function generateInvoice()
    {
        $invoice_no = rand(pow(10, 6 - 1), pow(10, 6) -1);

        $check = StakeRequest::where('invoice_no','=',$invoice_no)->first();

        if($check != null)
        {
            return $this->generateInvoice();
        }

        return $invoice_no;
    }
   
    // -------------------------------------------------------------------------------------------------------------------------------

    // Resolves the correct ROI tier for an amount and returns the matching synthetic stake_masters (ptype=2) row.
    // Rate is always derived server-side from the amount actually paid - never trust a client-supplied kit_id for rate.
    public function resolveRoiTierKit($amount)
    {
        $tier = RoiTierMaster::where('is_active', 1)
                    ->where('min_amount', '<=', $amount)
                    ->where(function($q) use ($amount) {
                        $q->whereNull('max_amount')->orWhere('max_amount', '>=', $amount);
                    })
                    ->orderBy('min_amount', 'desc')
                    ->first();

        if($tier == null)
        {
            return null;
        }

        // stake_masters.percantage is a float column - comparing it to a decimal exactly can miss due to
        // float storage rounding (e.g. 0.3 stored as 0.30000001192...), so round both sides before matching.
        return StakeMaster::where('ptype', 2)
                    ->whereRaw('ROUND(percantage, 3) = ?', [$tier->daily_percent])
                    ->first();
    }

    public function setStakeActivation($member_id, $kit_id, $amount, $s_r_id)
    {
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');

        $kit = $this->resolveRoiTierKit($amount);

        if($kit == null)
        {
            // No ROI tier matched (amount below the minimum) - fall back to whatever kit_id was submitted
            // so activation doesn't hard-fail; this should not happen once the buy page enforces the $50 minimum.
            $kit = StakeMaster::where('id','=',$kit_id)->first();
        }

        $member = User::where('id','=',$member_id)->first();
        
        if($member != null)
        {
            $member->kit_id = $kit->id;
            if($member->activation_date == null)
            {
                $member->activation_date = date("Y-m-d H:i:s");
            }
            $member->self_investment = ($member->self_investment+$amount);
            $member->save();
        }

        // Add Purchased Kit Log
        $log = $this->addpurchasedkitlog($member->id, $kit->id, $amount, 0, null, $s_r_id);
        
        // Update Level Business
        User::whereRaw('FIND_IN_SET(id,"'.$member->referral_uplines.'")')
            ->update(['team_investment'=> DB::raw('team_investment+'.$amount)]);

        // Update Direct Business
        if($member->referral_id > 0)
        {
            $refer = User::where('id','=',$member->referral_id)->first();
            if($refer != null)
            {
                $refer->direct_business = ($refer->direct_business+$amount);
                $refer->save();
            }  

            if($refer->kit_id > 0)
            {
                self::processreferralcommission($refer->id, 1, $amount, $member->id, $kit->id, date("Y-m-d H:i:s"));
            }
        }
    }

    private function addpurchasedkitlog($member_id, $kit_id, $amount, $topup_type, $description, $s_r_id)
    {
        $kit = StakeMaster::where('id','=',$kit_id)->first();

        $date = date("Y-m-d H:i:s");

        if($s_r_id > 0)
        {
            $req = StakeRequest::find($s_r_id);

            $coin_rate = $req->coin_rate;
            $paid_coin = number_format((float)$req->stake_coin, 8, '.', '');
        }
        else
        {
            $coin_rate = getcoinrate();
            $paid_coin = number_format((float)$amount/$coin_rate, 8, '.', '');
        }

        $object = new UserStaked;
        $object->s_r_id = $s_r_id;
        $object->member_id = $member_id;
        $object->kit_id = $kit->id;

        $object->paid_amount = $amount;
        $object->total_amount = $amount;
        $object->coin_rate = $coin_rate;
        $object->payable_coin = $paid_coin;

        if($kit->ptype == 2)
        {
            // New amount-tiered ROI model: rate is a flat daily percent, no month-based amortization,
            // and the stake stays open indefinitely - the 3x/2x earning cap is what stops payout, not a day-count.
            $roi_tier = RoiTierMaster::whereRaw('daily_percent = ROUND(?, 3)', [$kit->percantage])->first();

            $object->roi_tier_id = $roi_tier ? $roi_tier->id : null;
            $object->return_days = 36500;
            $object->apy = $kit->percantage;
            $object->d_apy = $kit->percantage;
            $object->return_date = date('Y-m-d H:i:s', strtotime($date. ' + 36500 days'));
        }
        else
        {
            $object->return_days = $kit->months;
            $object->apy = $kit->percantage;
            $object->d_apy = ($kit->percantage / $kit->months);
            $object->return_date = date('Y-m-d H:i:s', strtotime($date. ' + '.$kit->months.' days'));
        }

        $object->topup_type = $topup_type;
        $object->description = $description;

        $object->save();

        return $object;
    }

    public function processreferralcommission($member_id, $level, $amount, $from_id, $kit_id, $created_at)
    {
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');

        $member = User::where('id','=',$member_id)->first();

        $from_member = User::where('id','=',$from_id)->first();

        $from_address = obscureAddress($from_member->username);

        if($member != null)
        {
            $levels = config('income.direct_sponsor_levels');
            $per = $levels[$level] ?? 0;

            $description = 'Direct Sponsor Income (Level '.$level.') From '.$from_address;
            $commission = ($amount * $per) / 100;

            $earning_type = 1;

            if($member->kit_id > 0)
            {
                if($commission > 0)
                {
                    $walletCon->addearningwalletlog($member->id, 1, $earning_type, $description, $commission, 0, 0, $created_at);
                }
            }

            $level++;

            if($member->referral_id > 0 && $level <= 3)
            {
                $this->processreferralcommission($member->referral_id, $level, $amount, $from_id, $kit_id, $created_at);
            }
        }
    }
    
    public function getTopUplines($uplines, $count)
    {
		$list_parents = explode(",", $uplines);

		if(count($list_parents) > $count)
        {
			return array_slice($list_parents,-$count, $count);
		}
		else
        {
			return $list_parents;
		}
	}

    // 

    public function adminStakeActivation($member_id, $kit_id, $amount, $topup_type, $description)
    {
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');

        $kit = ($topup_type == 0) ? $this->resolveRoiTierKit($amount) : null;

        if($kit == null)
        {
            $kit = StakeMaster::where('id','=',$kit_id)->first();
        }

        $kit_id = $kit->id;

        //
        $coin_rate = getcoinrate();
        
        $date = date("Y-m-d H:i:s");
        
        $invoice_no = self::generateInvoice();
    
        $object = new StakeRequest;
    
        $object->payment = 1;
        $object->invoice_no = $invoice_no;
        $object->member_id = $member_id;
        
        $object->stake_id = $kit_id;
        $object->amount = $amount;
        
        $object->coin_rate = $coin_rate;
        $object->stake_coin = number_format((float)$amount/$coin_rate, 8, '.', '');
        
        $object->hash = $description;
        $object->status = 2;
        
        $object->return_date = date('Y-m-d H:i:s', strtotime($date. ' + '.$kit->months.' days'));
        $object->apy = $kit->percantage;
        $object->d_apy = ($kit->percantage / $kit->months);
        
        $object->save();
        //

        $member = User::where('id','=',$member_id)->first();
        
        if($member != null)
        {
            $member->kit_id = $kit->id;
            
            if($member->activation_date == null)
            {
                $member->activation_date = date("Y-m-d H:i:s");
            }
            
            $member->self_investment = ($member->self_investment+$amount);
            
            $member->save();
        }

        // Add Purchased Kit Log
        $log = $this->addpurchasedkitlog($member->id, $kit->id, $amount, $topup_type, $description, $object->id);
        
        if($topup_type == 0)
        {
            // Update Level Business
            User::whereRaw('FIND_IN_SET(id,"'.$member->referral_uplines.'")')
                ->update(['team_investment'=> DB::raw('team_investment+'.$amount)]);
        }
        
        if($topup_type == 0) 
        {
            // Update Direct Business
            if($member->referral_id > 0)
            {
                $refer = User::where('id','=',$member->referral_id)->first();
                if($refer != null)
                {
                    $refer->direct_business = ($refer->direct_business+$amount);
                    $refer->save();
                }  
                            
                if($refer->kit_id > 0)
                {
                    self::processreferralcommission($refer->id, 1, $amount, $member->id, $kit_id, date("Y-m-d H:i:s"));
                }
            }    
        }
    }    
    
    public function setBooster()
    {
        $referral_id = 397;
        
        $refer = User::where('id','=',$referral_id)->first();
        
        $last_date = date('Y-m-d H:i:s', strtotime($refer->activation_date. ' + 48 hours'));
    
        $booster_direct = User::where('referral_id','=',$refer->id)
                              ->where('activation_date','>=',$refer->activation_date)
                              ->where('activation_date','<=',$last_date)
                              ->where('kit_id','>',0)
                              ->count();
                              
        if($booster_direct >= 2 && $refer->is_booster == 0)
        {
            $refer->is_booster = 1;
            $refer->booster_on = date("Y-m-d H:i:s");
            $refer->save();
        }  
    }
    
    public function capitalWithdrawal(Request $request)
    {
        try {
            $v = Validator::make($request->all(), [
                'withdrawal_id' => 'required',
            ]);

            if ($v->fails())
            {
                return response()->json(array('success'=>false, 'error'=>'Invalid request data send.'), 200);
            }

            if (Auth::user() == null)
            {
				return response()->json(array('success'=>false,'error'=> 'Session is expired.'), 200);
			}

            $withdrawal_id = $request->get('withdrawal_id');

            // A capital withdrawal must belong to the requesting member - this ownership check was previously missing.
            $object = UserStaked::where('id','=',$withdrawal_id)->where('member_id','=',Auth::user()->id)->first();

            if($object == null)
            {
                return response()->json(array('success'=>false,'error'=> 'Invalid capital withdrawal'), 200);
            }

            if($object->topup_type != 0)
            {
                return response()->json(array('success'=>false,'error'=> 'Invalid capital withdrawal'), 200);
            }

            if($object->is_deleted > 0)
            {
                return response()->json(array('success'=>false,'error'=> 'Already capital withdrawal'), 200);
            }

            $window_months = config('income.capital_withdrawal_window_months');
            $cutoff = date('Y-m-d H:i:s', strtotime($object->created_at.' + '.$window_months.' months'));

            if(date('Y-m-d H:i:s') > $cutoff)
            {
                return response()->json(array('success'=>false,'error'=> 'Capital withdrawal window has closed for this stake; only income withdrawals remain available.'), 200);
            }

            $charge_percent = config('income.capital_withdrawal_charge_percent');
            $charge = $object->paid_amount * $charge_percent / 100;
            $net = $object->paid_amount - $charge;

            DB::beginTransaction();

            try {
                $wlog = new WithdrawalLog;
                $wlog->mode = 2; // 2 = Capital withdrawal
                $wlog->w_type = 1;
                $wlog->ref_id = 0;
                $wlog->member_id = Auth::user()->id;
                $wlog->staked_user_id = $object->id;
                $wlog->amount = $object->paid_amount;
                $wlog->admin = $charge;
                $wlog->charge_percent = $charge_percent;
                $wlog->net = $net;
                $wlog->rate = 0;
                $wlog->payable = $net;
                $wlog->address = Auth::user()->wallet_addr;
                $wlog->status = 0; // pending admin approval, same flow as income withdrawals
                $wlog->is_wallet = 0;
                $wlog->auto_withdraw = 0;
                $wlog->created_at = date('Y-m-d H:i:s');
                $wlog->updated_at = date('Y-m-d H:i:s');
                $wlog->save();

                $object->is_deleted = 1;
                $object->up_status = 1;
                $object->capital_withdrawn_at = date('Y-m-d H:i:s');
                $object->save();

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json(array('success'=>true, 'message'=>'Capital withdrawal request submitted for admin approval.', 'error'=>''), 200);
        } catch(Exception $exception) {
            Log::error($exception);
            return response()->json(array('success'=>false,'error'=> 'An error occurred processing'), 200);
        }
    }

    // Evaluates the Booster Income 48-hour window exactly once per member.
    // Called daily from ProcessDaily; is a no-op for members already evaluated (booster_evaluated_at is set) or whose window hasn't closed yet.
    public function runBoosterEvaluation()
    {
        $window_hours = config('income.booster_window_hours');
        $tiers = config('income.booster_tiers'); // ordered highest-directs-first, e.g. [10=>0.25, 7=>0.20, 5=>0.15, 3=>0.10]

        $members = User::whereNotNull('activation_date')
                        ->whereNull('booster_evaluated_at')
                        ->whereRaw('DATE_ADD(activation_date, INTERVAL '.$window_hours.' HOUR) <= NOW()')
                        ->get();

        foreach($members as $member)
        {
            $window_end = date('Y-m-d H:i:s', strtotime($member->activation_date.' + '.$window_hours.' hours'));

            $own_stake = UserStaked::where('member_id','=',$member->id)->where('topup_type','=',0)->orderBy('created_at','asc')->first();
            $own_amount = $own_stake ? $own_stake->paid_amount : 0;

            $qualified_directs = User::where('referral_id','=',$member->id)
                                      ->where('activation_date','>=',$member->activation_date)
                                      ->where('activation_date','<=',$window_end)
                                      ->where('kit_id','>',0)
                                      ->get();

            $count = 0;

            foreach($qualified_directs as $direct)
            {
                $direct_stake = UserStaked::where('member_id','=',$direct->id)->where('topup_type','=',0)->orderBy('created_at','asc')->first();
                $direct_amount = $direct_stake ? $direct_stake->paid_amount : 0;

                if($direct_amount >= $own_amount)
                {
                    $count++;
                }
            }

            foreach($tiers as $required_directs => $bonus_percent)
            {
                if($count >= $required_directs)
                {
                    BoosterAchiever::updateOrCreate(
                        ['member_id' => $member->id],
                        ['tier_directs' => $required_directs, 'bonus_percent' => $bonus_percent, 'achieved_at' => date('Y-m-d H:i:s')]
                    );

                    break;
                }
            }

            $member->booster_evaluated_at = date('Y-m-d H:i:s');
            $member->save();
        }
    }

    // ==================================================================================================================================================================
    
    public function runReferralEarning()
    {
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');

        $objects = UserStaked::where('earn_status', '=', 0)->get();

        foreach($objects as $log)
        {
            $log->earn_status = 1;
            $log->save();
            
            $member = User::where('id','=',$log->member_id)->first();

            if($member->referral_id > 0)
            {
                // self::processreferralcommission($member->referral_id, 1, $log->paid_amount, $member->id, $log->kit_id, date("Y-m-d H:i:s"));
            }
        }
    }

    public function runDailyROI()
    {
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');
        $dashboardCon = app('App\Http\Controllers\Users\DashboardController');

        $objects = UserStaked::where('return_days', '>', 0)->where('topup_type', '!=', 1)->where('is_deleted', '=', 0)->get();

        foreach($objects as $log)
        {
            $member = User::where('id','=',$log->member_id)->first();

            if($member == null)
            {
                continue;
            }

            // Rate is read from the snapshot on the stake row itself (set at activation/migration from the
            // resolved ROI tier), not re-derived from stake_masters, so it stays locked in at investment time.
            $per = $log->apy;
            $base_commission = $log->paid_amount * $per / 100;

            $booster = BoosterAchiever::where('member_id','=',$member->id)->first();
            $booster_per = $booster ? $booster->bonus_percent : 0;
            $booster_commission = $booster_per > 0 ? ($log->paid_amount * $booster_per / 100) : 0;

            $commission = $base_commission + $booster_commission;

            $base_description = 'Daily ROI Dividend From $'.$log->paid_amount;
            $booster_description = 'Booster Dividend From $'.$log->paid_amount;

            $remain_commission = $dashboardCon->check3xEarningLimit($log->member_id, $commission);

            if($remain_commission > 0)
            {
                // Split the (possibly cap-trimmed) payable amount proportionally across base ROI and Booster
                // so each shows as its own income type in wallet logs and reports.
                $ratio = ($commission > 0) ? ($remain_commission / $commission) : 0;
                $paid_base = $base_commission * $ratio;
                $paid_booster = $booster_commission * $ratio;

                if($paid_base > 0)
                {
                    $walletCon->addearningwalletlog($log->member_id, 1, 2, $base_description, $paid_base, 0, 0, date("Y-m-d H:i:s"));
                }

                if($paid_booster > 0)
                {
                    $walletCon->addearningwalletlog($log->member_id, 1, 8, $booster_description, $paid_booster, 0, 0, date("Y-m-d H:i:s"));
                }

                $log->return_days -= 1;
                $log->receive_return += $remain_commission;
                $log->save();

                $refer = User::where('id','=',$member->referral_id)->first();
                if($refer != null && $log->topup_type == 0)
                {
                    $this->processlevelcommission($refer->id, 1, $remain_commission, $member->id, $log->kit_id, date("Y-m-d H:i:s"));
                }
            }
            else
            {
                if($base_commission > 0)
                {
                    $walletCon->addearningwalletlog($log->member_id, 3, 2, $base_description, $base_commission, 0, 0, date("Y-m-d H:i:s"));
                }

                if($booster_commission > 0)
                {
                    $walletCon->addearningwalletlog($log->member_id, 3, 8, $booster_description, $booster_commission, 0, 0, date("Y-m-d H:i:s"));
                }
            }
        }
    }
    
    public function processlevelcommission($member_id, $level, $amount, $from_id, $kit_id, $created_at)
    {
        DB::statement('SET SESSION group_concat_max_len = 10000000');

        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');
        
        $member = User::where('id','=',$member_id)->first();
        
        $from_member = User::where('id','=',$from_id)->first();
        
        $from_address = obscureAddress($from_member->username);
        
        if($member != null)
        {
            $ladder = config('income.level_income_ladder');
            $per = $ladder[$level] ?? 0;

            $direct = User::where('referral_id','=',$member_id)->where('kit_id','>',0)->count();
           
            $commission = $amount * $per / 100;
            
            $dashboardCon = app('App\Http\Controllers\Users\DashboardController');
            $remain_commission = $dashboardCon->check3xEarningLimit($member->id, $commission);
            
            if($member->kit_id > 0)
            {
                if($direct >= $level || $member->level >= $level)
                {
                    $description = 'Level '.$level.' Incentive From '.$from_address;
                    
                    if($remain_commission > 0)
                    {
                        $walletCon->addearningwalletlog($member->id, 1, 4, $description, $remain_commission, 0, 0, $created_at);   
                    }
                    else
                    {
                        $walletCon->addearningwalletlog($member->id, 3, 4, $description, $commission, 0, 0, $created_at);   
                    }
                }
            }
            
            $level++;

            if($member->referral_id > 0 && $level <= 20)
            {
                $this->processlevelcommission($member->referral_id, $level, $amount, $from_id, $kit_id, $created_at);
            }
        }
    }

    //

    public function tempSetReferralLevelEarning()
    {
        $member_id  = $_REQUEST["member_id"];
        
        $member = User::where('id','=',$member_id)->first();
        
        $refer = User::where('id','=',$member->referral_id)->first();
        
        $stakeduser = UserStaked::where('member_id', '=', $member_id)->first();
        
        self::processreferralcommission($refer->id, 1, $stakeduser->paid_amount, $member->id, $stakeduser->kit_id, $stakeduser->created_at);
    }
    
    //
    
    public function businessMinus()
    {
        $member_id = 0;
        
        $amount = 0;
        
        $member = User::where('id','=',$member_id)->first();
        
        if($member != null)
        {
            $member->self_investment -= $amount;
            $member->all_investment -= $amount;
            $member->save();
        }

        // Update Level Business
        User::whereRaw('FIND_IN_SET(id,"'.$member->referral_uplines.'")')
            ->update(['team_investment'=> DB::raw('team_investment-'.$amount)]);

        // Update All Business
        User::whereRaw('FIND_IN_SET(id,"'.$member->referral_uplines.'")')
            ->update(['all_investment'=> DB::raw('all_investment-'.$amount)]);

        // Update Direct Business
        if($member->referral_id > 0)
        {
            $refer = User::where('id','=',$member->referral_id)->first();
            if($refer != null)
            {
                $refer->direct_business = ($refer->direct_business-$amount);
                $refer->save();
            }
        }    
    }
    
    // temp run set
    public function runTempDailyROI()
    {
        $date = '2025-03-04 00:05:00';
        
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');
        
        // $objects = UserStaked::whereRaw('FIND_IN_SET(member_id,"1632,1347,1348,1349,1350,1351,1352,1354,1355,1356")')->where('return_days', '>', 0)->where('topup_type', '!=', 1)->where('is_deleted', '=', 0)->get();

        $objects = UserStaked::where('return_days', '>', 0)->where('topup_type', '!=', 1)->where('is_deleted', '=', 0)->where('updated_at', '<=', '2025-03-03 23:59:59')->get();
 
        foreach($objects as $log)
        {
            // Log::info('member '.$log->member_id);
            $member = User::where('id','=',$log->member_id)->first();

            $kit = StakeMaster::where('id','=',$log->kit_id)->first();

            if($member->is_booster > 0)
            {
                $per = $kit->percantage + 0.1;

                $description = 'Booster Dividend From $'.$log->paid_amount;
            
                $commission = $log->paid_amount * $per / 100;

                $earning_type = 2;
            }
            else
            {
                $per = $kit->percantage;

                $description = 'Daily Dividend From $'.$log->paid_amount;
            
                $commission = $log->paid_amount * $per / 100;

                $earning_type = 1;
            }
            
            // Log::info('commission '.$commission);
            
            $dashboardCon = app('App\Http\Controllers\Users\DashboardController');
            $remain_commission = $dashboardCon->check2xEarningLimit($log->member_id, $commission);

            if($remain_commission > 0)
            {
                $walletCon->addearningwalletlog($log->member_id, 1, $earning_type, $description, $remain_commission, 0, 0, $date); 

                $log->return_days -= 1;
                $log->receive_return += $remain_commission;
                $log->save();

                $refer = User::where('id','=',$member->referral_id)->first();
                if($refer != null && $log->topup_type == 0)
                {
                    $this->processlevelcommission($refer->id, 1, $remain_commission, $member->id, $log->kit_id, $date);
                }   
            }
            else
            {
                $walletCon->addearningwalletlog($log->member_id, 3, $earning_type, $description, $commission, 0, 0, $date); 
            }
        }
    }
}
