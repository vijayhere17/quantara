<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserStaked;
use App\Models\LevelReferral;
use App\Models\StakeRequest;
use App\Models\WithdrawalLog;
use App\Models\BinaryPoints;
use App\Models\SalaryMaster;
use App\Models\SalaryAchiever;
use App\Models\EarningWallet;

use DB;

class DashboardController extends Controller
{
    //
    public function index()
    {
        $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');

        $user_id = Auth::user()->id;

        $page_titel = 'Dashboard';     
        
        $object = new Dashboarddata;

        $referral = User::where('referral_id','=',$user_id)->get();

      	$object->total_referral = $referral->count();
      	$object->total_a_referral = $referral->where('kit_id', '>' ,0)->count();
		$object->total_ia_referral = $referral->where('kit_id', '<=' ,0)->count();

        $object->total_team = LevelReferral::where('member_id','=',$user_id)->sum('team_count');
		$object->total_a_team = self::getDownlineTeam($user_id, 1);
		$object->total_ia_team = self::getDownlineTeam($user_id, 0);
		
		$object->total_r_investment = self::getTeamBusiness($user_id, 1, 0);
		$object->total_tr_investment = self::getTeamBusiness($user_id, 1, 1);
		$object->total_wr_investment = self::getTeamBusiness($user_id, 1, 2);
		$object->total_t_investment = Auth::user()->team_investment; // self::getTeamBusiness($user_id, 0);
		
		$object->total_self_investment = UserStaked::where('member_id', '=', $user_id)->sum('payable_coin');
	    
	    $object->total_flush = formatdecimal(($balanceCon->getearningflush($user_id, 1)),4);
		$object->total_earning = formatdecimal(($balanceCon->getcraditdebitsum($user_id, 1)),4);
        $object->total_debit = formatdecimal(($balanceCon->getcraditdebitsum($user_id, 2)),4);
        $object->total_balance = formatdecimal(($balanceCon->getearningbalance($user_id)),4);
        
        $object->total_pw_balance = formatdecimal(($balanceCon->getpwbalance($user_id)),4);
        $object->total_pwc_balance = formatdecimal(($balanceCon->getcraditdebitsumpw($user_id, 1)),4);
        $object->total_pwd_balance = formatdecimal(($balanceCon->getcraditdebitsumpw($user_id, 2)),4);
        
        $object->total_referral_bonus = formatdecimal($balanceCon->getearningsum($user_id, 1), 4);
        $object->total_daily_roi_bonus = formatdecimal($balanceCon->getearningsum($user_id, 2), 4);
        $object->total_daily_level_bonus = formatdecimal($balanceCon->getearningsum($user_id, 3), 4);
        $object->total_team_level_bonus = formatdecimal($balanceCon->getearningsum($user_id, 4), 4);
        $object->total_salary_bonus = formatdecimal($balanceCon->getearningsum($user_id, 5), 4);
        $object->total_turnover_bonus = formatdecimal($balanceCon->getearningsum($user_id, 6), 4);

        $object->total_income_today = formatdecimal(EarningWallet::where('member_id', $user_id)->where('txn_type', 1)->whereDate('created_at', today())->sum('amount'), 4);
        $object->recent_earning = EarningWallet::where('member_id', $user_id)->where('txn_type', 1)->orderBy('created_at', 'desc')->take(5)->get();

        $object->recent_staking = StakeRequest::orderBy('created_at','desc')->where('stake_coin', '>', 0)->take(5)->get();
        
        $object->total_withdrawal = formatdecimal(WithdrawalLog::where('member_id','=',$user_id)->where('status','=',2)->sum('payable'), 8);
        
        $object->total_3x_remain = $this->remin3xEarning($user_id);
        $object->total_2x_remain = $this->remin2xEarning($user_id);
        $object->total_80x_remain = $this->get80XLimitWarning($user_id);
        
        $object->total_max_earning = $this->maxEarning($user_id, 3);
        
        $object->current_rank = SalaryMaster::find(Auth::user()->salary_id);
        $object->achieve_rank = SalaryAchiever::where('member_id','=',$user_id)->where('salary_id','=',Auth::user()->salary_id)->first();
        
        //
        
        $allsalary = SalaryMaster::get();
        $object->allsalary = $allsalary;
        
        //
        
        $leg_data = []; // Initialize as an associative array
        
        $leg1 = User::where('referral_id', '=', $user_id)->orderByRaw('all_investment desc')->first(); // Power leg (60%)
        $leg2 = User::where('referral_id', '=', $user_id)->orderByRaw('all_investment desc')->skip(1)->first(); // Weaker leg (20%)
        
        $leg_data['leg_1_username'] = $leg1 ? obscureAddress($leg1->username) : '';
        $leg_data['leg_2_username'] = $leg2 ? obscureAddress($leg2->username) : '';
        $leg_data['leg_3_username'] = 'Other'; 
        
        $leg_1_business = ($leg1 == null ? 0 : $leg1->all_investment);
        $leg_2_business = ($leg2 == null ? 0 : $leg2->all_investment);
        $leg_3_business = (Auth::user()->all_investment - $leg_1_business - $leg_2_business);
        
        if($leg_3_business > $leg_1_business)
        {
            $leg_data['leg_1_username'] = 'Other'; 
            $leg_data['leg_3_username'] = $leg1 ? obscureAddress($leg1->username) : '';
            
            $leg_1_business = $leg_3_business;
            $leg_3_business = ($leg1 == null ? 0 : $leg1->all_investment);
        }
        
        $leg_data['leg_1_business'] = $leg_1_business; // $leg1 ? $leg1->all_investment : 0;
        $leg_data['leg_2_business'] = $leg_2_business; // $leg2 ? $leg2->all_investment : 0;
        $leg_data['leg_3_business'] = $leg_3_business;
        
        $object->leg_data = $leg_data;
        
        return view('users.dashboard', compact('page_titel', 'object'));
    }
    
    public function getDownlineTeam($user_id, $is_active)
    {
		DB::statement('SET SESSION group_concat_max_len = 10000000');

		$downlines = LevelReferral::where('member_id', '=', $user_id)
                                  ->select(DB::raw('group_concat(downlines) as downlines'))
                                  ->first();

        $downlines = $downlines->downlines;
        
        if ($is_active > 0) 
        {
            $total = User::whereRaw('FIND_IN_SET(id,"'.$downlines.'")')->where('kit_id', '>', 0)->count();
        } 
        else 
        {
            $total = User::whereRaw('FIND_IN_SET(id,"'.$downlines.'")')->where('kit_id', '<=', 0)->count();
        }
		
		return $total == null ? 0 : $total;
	}

    public function getTeamBusiness($user_id, $level, $is_date)
    {
        DB::statement('SET SESSION group_concat_max_len = 10000000');

        if ($level == 0) 
        {
            $downlines = LevelReferral::where('member_id', '=', $user_id)->select(DB::raw('group_concat(downlines) as downlines'))->first();
            $downlines = $downlines->downlines;
        } 
        else 
        {
            $downlines = LevelReferral::where('member_id', '=', $user_id)->where('level', '=', $level)->first();
            $downlines = ($downlines == null ? '' : $downlines->downlines);
        }
        
        $query = UserStaked::whereRaw('FIND_IN_SET(member_id,"'.$downlines.'")');

        // Add date filter based on is_date
        if ($is_date == 1) { // Today
            $query->whereDate('created_at', today());
        } elseif ($is_date == 2) { // Weekly (last 7 days)
            $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
        } // is_date == 0 means no date filter (all records)
    
        $total = $query->sum('paid_amount');
        
        return $total == null ? 0 : $total;
	}

    public function getTeamStaking($user_id, $leg){
        /* DB::statement('SET SESSION group_concat_max_len = 10000000');
        $downlines = LevelReferral::where('member_id', '=', $user_id)->select(DB::raw('group_concat(downlines) as downlines'))->first();
        $downlines = $downlines->downlines;

        $total = UserStaked::whereRaw('FIND_IN_SET(member_id,"'.$downlines.'")')->sum('paid_amount'); */
        
        $binary_point = BinaryPoints::where('member_id',$user_id)->first();
        
        if ($leg  == 'A') {
            $total = ($binary_point->left_points+$binary_point->right_points);
        } else if ($leg  == 'L') {
            $total = ($binary_point->left_points);
        } else if ($leg  == 'R') {
            $total = ($binary_point->right_points);
        }
        
        return $total == null ? 0 : $total;
	}
	
	// ============================================================================================================================================================================
	
	// Working ID (has >=1 active direct referral) caps at 3x lifetime staked; Non-Working ID caps at 2x.
	public function isWorkingId($member_id)
	{
	    return User::where('referral_id','=',$member_id)->where('kit_id','>',0)->exists();
	}

	public function check3xEarningLimit($member_id, $amount)
	{
	    $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');

	    $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);

	    $member = User::find($member_id);
	    $total_earning = $member->total_earning;

	    $cap_multiplier = $this->isWorkingId($member_id) ? config('income.working_cap_multiplier', 3) : config('income.non_working_cap_multiplier', 2);

	    if($total_staked > 0)
	    {
	        $max_earning = $total_staked * $cap_multiplier;

	        // $total_earning = formatdecimal(($balanceCon->getTotalEarningSum($member_id)), 4);

	        $total = formatdecimal($total_earning+$amount,4);

    	    if($total > $max_earning)
    	    {
    	        return $max_earning-$total_earning;
    	    }
    	    else
    	    {
    	        return $amount;
    	    }
	    }
	    else
	    {
	        return 0;
	    }
	}
	
	public function check2xEarningLimit($member_id, $amount)
	{
	    $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');

	    $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);
	    
	    $member = User::find($member_id);
	    $total_earning = $member->total_return;
	    
	    if($total_staked > 0)
	    {
	        $max_earning = $total_staked * 2;
	        
	        // $total_roi = formatdecimal(($balanceCon->getearningsum($member_id, 1)), 4);
	        // $total_booster = formatdecimal(($balanceCon->getearningsum($member_id, 2)), 4);
	        
	        // $total_earning = $total_roi+$total_booster;
	        
	        $total = formatdecimal($total_earning+$amount,4);
	        
    	    if($total > $max_earning)
    	    {
    	        return $max_earning-$total_earning; 
    	    }
    	    else
    	    {
    	        return $amount;  
    	    }
	    }
	    else
	    {
	        return 0;  
	    }
	}

    public function remin3xEarning($member_id)
	{
        $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);

        $cap_multiplier = $this->isWorkingId($member_id) ? config('income.working_cap_multiplier', 3) : config('income.non_working_cap_multiplier', 2);

        $max_earning = $total_staked * $cap_multiplier;

        // $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');
	    // $total_earning = formatdecimal(($balanceCon->getTotalEarningSum($member_id)), 4);
	    
	    $member = User::find($member_id);
	    $total_earning = $member->total_earning;

        if($max_earning > 0)
        {
            $remain = ($max_earning - $total_earning);

            if($remain > 0)
            {
               return $remain;
            }
            else
            {
                return 0;
            }
        }
        else
        {
            return 0;
        }
	}
	
	public function remin2xEarning($member_id)
	{
        $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);

        $max_earning = $total_staked * 2;

        // $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');
	    
	    // $total_roi = formatdecimal(($balanceCon->getearningsum($member_id, 1)), 4);
        // $total_booster = formatdecimal(($balanceCon->getearningsum($member_id, 2)), 4);
        
        // $total_earning = $total_roi+$total_booster;
        
        $member = User::find($member_id);
	    $total_earning = $member->total_return;

        if($max_earning > 0)
        {
            $remain = ($max_earning - $total_earning);

            if($remain > 0)
            {
               return $remain;
            }
            else
            {
                return 0;
            }
        }
        else
        {
            return 0;
        }
	}
	
	public function get80XLimitWarning($member_id)
	{
        $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);

        $cap_multiplier = $this->isWorkingId($member_id) ? config('income.working_cap_multiplier', 3) : config('income.non_working_cap_multiplier', 2);

        $max_earning = $total_staked * $cap_multiplier;
        $max_earning = $max_earning * 0.80;

        // $balanceCon = app('App\Http\Controllers\Users\EarningWalletController');
	    // $total_earning = formatdecimal(($balanceCon->getTotalEarningSum($member_id)), 4);
	    
	    $member = User::find($member_id);
	    $total_earning = $member->total_earning;

        if($max_earning > 0)
        {
            $remain = ($max_earning - $total_earning);

            if($remain > 0)
            {
               return $remain;
            }
            else
            {
                return 0;
            }
        }
        else
        {
            return -1;
        }
	}

    public function maxEarning($member_id, $max_x)
	{
        $stake_obj = UserStaked::where('member_id', $member_id)->sum('paid_amount');
	    $total_staked = ($stake_obj == null ? 0 : $stake_obj);

	    return $total_staked * $max_x;
	}
}

class Dashboarddata{
	public $total_referral;
	public $total_a_referral;
	public $total_team;
	public $total_a_team;
    public $total_stake;
	public $total_stake_bmyt;
    public $total_r_investment;
    public $total_t_investment;
	public $total_earning;
    public $total_debit;
    public $total_balance;
    public $recent_staking;
    public $total_withdrawal;
}
