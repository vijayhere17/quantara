<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/
use App\Services\BlockchainService;
use App\Http\Controllers\BTCPlanController;

Route::get('/btc/packages', [BTCPlanController::class, 'index']);

Route::get('/btc-test', function () {

    $blockchain = new BlockchainService();

    return response()->json(
        $blockchain->getConfig()
    );

});

Route::controller(App\Http\Controllers\Users\SigninController::class)->group(function()
{
    Route::get('/', 'signin')->name('home'); // first page 

    Route::get('sign-in', 'signin')->name('sign-in');
    
    Route::get('forgot-password', 'forgotpass')->name('forgot-password');

    Route::post('submit-sign-in','submitSignin');
    
    Route::post('submit-forgot-password','submitForgotPassword');
});

Route::controller(App\Http\Controllers\Users\SignupController::class)->group(function()
{
    Route::get('sign-up', 'signup')->name('sign-up');

    Route::post('check-sponsor-id','checkSponorid');

    Route::post('submit-sign-up','submitSignup');
    
    //
    
    // Route::get('run-set-level-tree', 'temlLevelReferralSet')->name('set-level-tree');

    // Route::get('run-set-level-upline', 'setMemberUpline')->name('set-level-upline');
});

//

Route::controller(App\Http\Controllers\Users\StakeController::class)->group(function()
{
    Route::get('run-stake-process','runProcessStakeReq');
});

Route::controller(App\Http\Controllers\Users\RewardController::class)->group(function()
{
    Route::get('run-malaysia-achiever','runMalaysiaAchiever');
    
    Route::get('run-baku-achiever','runBakuAchiever');
});

//

Route::group(['middleware' => 'auth'], function () 
{
    Route::controller(App\Http\Controllers\Users\DashboardController::class)->group(function()
    {
        Route::get('dashboard', 'index')->name('dashboard');
    });

    Route::controller(App\Http\Controllers\Users\UserController::class)->group(function()
    {
        Route::get('update-profile', 'index')->name('update-profile');

        Route::get('change-password', 'restpass')->name('change-password');
        
        Route::get('secure-account', 'secureaccount')->name('secure-account');

        Route::post('submit-update-profile','submitUpdateProfile');
        
        Route::post('submit-update-password','submitUpdatePassword');
        
        Route::post('submit-2fa-code','submit2Fa');
    });

    Route::controller(App\Http\Controllers\Users\ReportController::class)->group(function()
    {
        Route::get('my-referral', 'myreferral')->name('my-referral');

        Route::get('downline-report/{leg}', 'downlinerep')->name('downline-report');

        Route::get('tree-view', 'treeview')->name('tree-view');
        
        Route::get('level-achievement', 'levelachievement')->name('level-achievement');

        //

        Route::get('get-referral-report', 'getReferralList');

        Route::get('get-downline-report', 'getDownlineList');

        Route::get('get-binary-tree-view', 'getTreeView');

        Route::post('get-view-tree-user', 'getViewUserID');

        Route::post('process-check-tree-user','checkTreeUser');
    });

    Route::controller(App\Http\Controllers\Users\StakeController::class)->group(function()
    {
        Route::get('buy-robo', 'buyRobo')->name('buy-robo');

        Route::post('process-submit-buy-bot','submitBotTxn');
        
        Route::post('process-submit-capital-withdrawal','capitalWithdrawal');
        
        //
        
        Route::get('get-run-temp-run-referral-earning', 'tempSetReferralLevelEarning');
        
        Route::get('get-run-temp-set-booster', 'setBooster');
        
        Route::get('get-minus-business', 'businessMinus');
        
        // Route::get('get-run-temp-roi', 'runTempDailyROI');
        
        //
        
        Route::get('buy-robo-wallet', 'buyRoboWallet')->name('buy-robo-wallet');
        
        Route::post('process-submit-buy-bot-wallet','submitBotTxnByWallet');
    });

    Route::controller(App\Http\Controllers\Users\StakeReportController::class)->group(function()
    {
        Route::get('bot-request', 'stakeReport')->name('bot-request');

        Route::get('get-stake-request', 'getStakeRequest');
        
        Route::get('topup-report', 'topupReport')->name('topup-report');
        Route::get('get-topup-report', 'getStakeReport');
        
        Route::get('topup-history', 'topupHistory')->name('topup-history');
        Route::get('get-topup-history', 'getTopupHistory');
    });
    
    Route::controller(App\Http\Controllers\Users\DepositWalletController::class)->group(function()
    {
        Route::get('topup-wallet', 'depositWallet')->name('topup-wallet');
        Route::get('get-deposit-wallet', 'getWalletReport');
    });

    Route::controller(App\Http\Controllers\Users\EarningWalletController::class)->group(function()
    {
        Route::get('earning-wallet', 'earningReport')->name('earning-wallet');

        Route::get('get-stake-earning', 'getEarningWalletReport');
        
        Route::get('earning/{logtype}/{page_titel}', 'earningWiseReport');
        
        Route::get('get-earning-wise-log', 'getEarningWiseReport');
        
        //
        
        Route::get('potential-wallet', 'potentialReport')->name('potential-wallet');
        
        Route::get('get-potential-earning', 'getPotentialWalletReport');
        
        //
        
        Route::get('get-update-earning', 'runUpdateEarning');
    });
    
    Route::controller(App\Http\Controllers\Users\WithdrawalController::class)->group(function()
    {
        Route::get('new-withdrawal', 'index')->name('new-withdrawal');
        Route::post('process-withdrawal-request','submitWithdrawalRequest');
        
        //
        Route::get('potential-withdrawal', 'indexPotential')->name('potential-withdrawal');
        Route::post('process-potential-withdrawal-request','submitPotentialWithdrawalRequest');
        
        Route::get('withdrawal-request', 'indexreport')->name('withdrawal-request');
        Route::get('get-withdrawal-request', 'withdrawalReport');
    });

    Route::controller(App\Http\Controllers\Users\BMYTWalletController::class)->group(function()
    {
        Route::get('bmyt-wallet', 'bmytWallet')->name('bmyt-wallet');
    });
    
    Route::controller(App\Http\Controllers\Users\DMCController::class)->group(function()
    {
        Route::get('dmc-status','index')->name('dmc-status');
        
        Route::get('check-dmc-status','processCheckRunAchiever');
    });
    
    Route::controller(App\Http\Controllers\Users\TicketController::class)->group(function()
    {
        Route::get('create-ticket','index')->name('create-ticket');
        
        Route::post('submit-create-ticket', 'createTicket');
        
        
        Route::get('ticket/{status}/{title}', 'ticketindex');
        
        Route::get('get-ticket-history', 'getTicketList');
        
        Route::post('process-view-ticket-message', 'ViewTicketMessage');

        Route::post('process-send-ticket-message', 'SendTicketMessage');
    });
    
    Route::controller(App\Http\Controllers\Users\SalaryController::class)->group(function()
    {
        Route::get('salary-achievement','indexachievers')->name('salary-achievement');

        Route::get('run-salary-achievement','runSalaryAchiever');

        // Route::get('run-salary-earning','runSalaryEarning');
    });

    Route::controller(App\Http\Controllers\Users\TurnoverRewardController::class)->group(function()
    {
        Route::get('turnover-reward-achievement','indexachievers')->name('turnover-reward-achievement');
    });

    Route::controller(App\Http\Controllers\Users\RewardController::class)->group(function()
    {
        Route::get('reward-achievement','indexachievers')->name('reward-achievement');
    });
    
    Route::controller(App\Http\Controllers\Users\LifeTimeRewardController::class)->group(function()
    {
        Route::get('life-time-status','indexachievers')->name('life-time-status');
    });
    
    Route::controller(App\Http\Controllers\Users\TourismController::class)->group(function()
    {
        Route::get('create-new-voucher','index')->name('create-new-voucher');
        
        /* Route::post('submit-create-ticket', 'createTicket');
        
        
        Route::get('ticket/{status}/{title}', 'ticketindex');
        
        Route::get('get-ticket-history', 'getTicketList'); */
    });

    // logout 
    
    Route::get('sign-out', function () {
        Auth::logout();
        return redirect('sign-in');
    });
});

// cron routes

Route::get('/daily-process-daily', function () {
    
    Artisan::call("act:processapi");
    
    if (date("H:i") == '00:05') {
       Artisan::call("act:processdaily");
    }
});
