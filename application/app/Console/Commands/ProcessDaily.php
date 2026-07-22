<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Log;
use Carbon\Carbon;

class ProcessDaily extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'act:processdaily';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actions which will be executed daily';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
       	$stakeCon = app('App\Http\Controllers\Users\StakeController');

       	// Log::info('process referral start...');
       	// $stakeCon->runReferralEarning();
		// Log::info('process referral end...');

		// ROI accrues Monday-Friday only - date('N') is 6=Saturday, 7=Sunday.
		if(!in_array(date('N'), [6, 7]))
		{
			Log::info('process daily roi start...');
			$stakeCon->runDailyROI();
			Log::info('process daily roi end...');
		}

		Log::info('process booster evaluation start...');
		$stakeCon->runBoosterEvaluation();
		Log::info('process booster evaluation end...');

		// Legacy rank-based Salary income is replaced by Turnover Reward income (config/income.php).
		// Kept here behind a flag rather than deleted, per business decision - flip legacy_salary_enabled to re-enable.
		if(config('income.legacy_salary_enabled', false))
		{
			$salaryCon = app('App\Http\Controllers\Users\SalaryController');

			Log::info('process salary achiever start...');
			$salaryCon->runSalaryAchiever();
			Log::info('process salary achiever end...');

			if(date("D") == 'Mon')
			{
				Log::info('process salary earning start...');
				$salaryCon->runSalaryEarning();
				Log::info('process salary earning end...');
			}
		}

		$turnoverCon = app('App\Http\Controllers\Users\TurnoverRewardController');
		Log::info('process turnover reward achiever start...');
		$turnoverCon->runTurnoverAchiever();
		Log::info('process turnover reward achiever end...');

		//
		$rewardCon = app('App\Http\Controllers\Users\RewardController');
		Log::info('process malaysia achiever start...');
       	$rewardCon->runMalaysiaAchiever();
		Log::info('process malaysia achiever end...');

		Log::info('process baku achiever start...');
       	$rewardCon->runBakuAchiever();
		Log::info('process baku achiever end...');
    }
}
