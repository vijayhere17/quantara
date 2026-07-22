<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TurnoverRewardMaster extends Model
{
    //
	protected $table = 'turnover_reward_masters';

	protected $primaryKey = 'id';

	protected $fillable = ['milestone_order', 'turnover_amount', 'cash_reward'];
}

?>