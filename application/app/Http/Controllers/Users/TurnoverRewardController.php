<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use App\Models\User;
use App\Models\TurnoverRewardMaster;
use App\Models\TurnoverRewardAchiever;

use Log;
use DB;

class TurnoverRewardController extends Controller
{
    public function indexachievers()
    {
        $page_titel = 'Rewards Income';

        $allrewards = TurnoverRewardMaster::orderBy('milestone_order', 'asc')->get();

        $user_id = Auth::user()->id;

        $leg_data = $this->getLegBusiness($user_id);

        $achieved_ids = TurnoverRewardAchiever::where('member_id', '=', $user_id)->pluck('reward_id')->toArray();

        return view('users.turnover-reward')->with([
            'page_titel' => $page_titel,
            'allrewards' => $allrewards,
            'user_id' => $user_id,
            'leg_data' => $leg_data,
            'achieved_ids' => $achieved_ids,
        ])->toJS();
    }

    // Same leg1/leg2/leg3 selection mechanism as the legacy Salary system (top-2 direct legs + remainder),
    // but reading team_investment - all_investment is never actually maintained by the activation flow.
    private function getLegBusiness($member_id)
    {
        $member = User::find($member_id);

        $leg1 = User::where('referral_id', '=', $member_id)->orderByRaw('team_investment desc')->first();
        $leg2 = User::where('referral_id', '=', $member_id)->orderByRaw('team_investment desc')->skip(1)->first();

        $leg1_business = ($leg1 == null ? 0 : $leg1->team_investment);
        $leg2_business = ($leg2 == null ? 0 : $leg2->team_investment);
        $leg3_business = ($member->team_investment - $leg1_business - $leg2_business);

        if($leg3_business > $leg1_business)
        {
            $temp = $leg1_business;
            $leg1_business = $leg3_business;
            $leg3_business = $temp;
        }

        return [
            'leg1_business' => $leg1_business,
            'leg2_business' => $leg2_business,
            'leg3_business' => $leg3_business,
        ];
    }

    // ==========================================================================================================================================================================================

    public function runTurnoverAchiever()
    {
        $dashboardCon = app('App\Http\Controllers\Users\DashboardController');
        $walletCon = app('App\Http\Controllers\Users\EarningWalletController');

        $ladder = TurnoverRewardMaster::orderBy('milestone_order', 'asc')->get();

        $leg1_percent = config('income.reward_leg1_percent');
        $leg2_percent = config('income.reward_leg2_percent');
        $leg3_percent = config('income.reward_leg3_percent');

        $members = User::where('kit_id', '>', 0)->get();

        foreach($members as $member)
        {
            $legs = $this->getLegBusiness($member->id);

            foreach($ladder as $reward)
            {
                $already = TurnoverRewardAchiever::where('member_id', '=', $member->id)->where('reward_id', '=', $reward->id)->exists();

                if($already)
                {
                    continue;
                }

                $need_leg1 = $reward->turnover_amount * $leg1_percent / 100;
                $need_leg2 = $reward->turnover_amount * $leg2_percent / 100;
                $need_leg3 = $reward->turnover_amount * $leg3_percent / 100;

                if($legs['leg1_business'] >= $need_leg1 && $legs['leg2_business'] >= $need_leg2 && $legs['leg3_business'] >= $need_leg3)
                {
                    // Insert the achiever row first (unique member_id+reward_id is the real race guard) -
                    // only credit the wallet once the row is safely committed, so an overlapping cron run
                    // can never double-pay the same milestone.
                    try {
                        DB::beginTransaction();

                        $achiever = new TurnoverRewardAchiever;
                        $achiever->member_id = $member->id;
                        $achiever->reward_id = $reward->id;
                        $achiever->leg1_business = $legs['leg1_business'];
                        $achiever->leg2_business = $legs['leg2_business'];
                        $achiever->leg3_business = $legs['leg3_business'];
                        $achiever->cash_reward = $reward->cash_reward;
                        $achiever->save();

                        $commission = $reward->cash_reward;

                        $remain_commission = $dashboardCon->check3xEarningLimit($member->id, $commission);

                        $description = 'Turnover Reward - Milestone #'.$reward->milestone_order;

                        if($remain_commission > 0)
                        {
                            $walletCon->addearningwalletlog($member->id, 1, 7, $description, $remain_commission, 0, 0, date("Y-m-d H:i:s"));
                        }
                        else
                        {
                            $walletCon->addearningwalletlog($member->id, 3, 7, $description, $commission, 0, 0, date("Y-m-d H:i:s"));
                        }

                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error($e);
                        continue;
                    }
                }
            }
        }
    }
}
