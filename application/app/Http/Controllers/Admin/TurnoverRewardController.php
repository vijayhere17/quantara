<?php

namespace App\Http\Controllers\Admin;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TurnoverRewardMaster;
use App\Models\TurnoverRewardAchiever;
use Log;

class TurnoverRewardController extends Controller
{
    //
    public function index()
    {
        $page_titel = 'Turnover Reward Master';

        $rewards = TurnoverRewardMaster::orderBy('milestone_order', 'asc')->get();

        return view('admin.turnover-reward-master')->with(['page_titel'=>$page_titel, 'rewards'=>$rewards])->toJS();
    }

    public function addReward(Request $request)
    {
        try {
            $v = Validator::make($request->all(), [
                'milestone_order' => 'required|integer|unique:turnover_reward_masters,milestone_order',
                'turnover_amount' => 'required|numeric',
                'cash_reward' => 'required|numeric',
            ]);

            if($v->fails())
            {
                return response()->json(array('success'=>false,'error_code'=>'INVALID_REQUEST_DATA'), 200);
            }

            $object = new TurnoverRewardMaster;
            $object->milestone_order = $request->get('milestone_order');
            $object->turnover_amount = $request->get('turnover_amount');
            $object->cash_reward = $request->get('cash_reward');
            $object->save();

            return response()->json(array('success'=>true,'error_code'=>''), 200);
        } catch(Exception $exception) {
            Log::error($exception);
            return response()->json(array('success'=>false,'error_code'=>'UNEXPECTED_ERROR_OCCURED'), 200);
        }
    }

    public function updateReward(Request $request, $id)
    {
        try {
            $v = Validator::make($request->all(), [
                'turnover_amount' => 'required|numeric',
                'cash_reward' => 'required|numeric',
            ]);

            if($v->fails())
            {
                return response()->json(array('success'=>false,'error_code'=>'INVALID_REQUEST_DATA'), 200);
            }

            $object = TurnoverRewardMaster::find($id);

            if($object == null)
            {
                return response()->json(array('success'=>false,'error_code'=>'NOT_FOUND'), 200);
            }

            $object->turnover_amount = $request->get('turnover_amount');
            $object->cash_reward = $request->get('cash_reward');
            $object->save();

            return response()->json(array('success'=>true,'error_code'=>''), 200);
        } catch(Exception $exception) {
            Log::error($exception);
            return response()->json(array('success'=>false,'error_code'=>'UNEXPECTED_ERROR_OCCURED'), 200);
        }
    }

    public function indexAchievers()
    {
        $page_titel = 'Turnover Reward Achievers';

        $achievers = TurnoverRewardAchiever::with('member', 'reward')->orderBy('created_at', 'desc')->get();

        return view('admin.turnover-reward-achievers')->with(['page_titel'=>$page_titel, 'achievers'=>$achievers])->toJS();
    }
}
