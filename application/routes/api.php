<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Users\SignupController;
use App\Http\Controllers\Users\StakeReportController;
use App\Services\BlockchainService;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/dashboard', [AuthController::class, 'dashboard']);
});

// Web3 authentication (session-aware — reuse web middleware for Auth::login)
Route::middleware('web')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
    });
});

Route::prefix('blockchain')->group(function () {
    Route::post('verify-registration', [AuthController::class, 'verifyRegistration']);
    Route::get('config', function (BlockchainService $blockchain) {
        return response()->json(['success' => true, 'data' => $blockchain->getConfig()]);
    });
});

// Legacy API endpoints (kept for compatibility)
Route::controller(SignupController::class)->group(function () {
    Route::post('check-sponsor-id', 'checkSponorid');
    Route::post('submit-sign-up', 'submitSignup');
});

Route::controller(StakeReportController::class)->group(function () {
    Route::get('pool-details', 'getPoolData');
});

Route::get('/geneate-wallet-address', function () {
    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://www.f5sys.com/ecroxnode/script/generate-wallet.php',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
    ]);

    $response = curl_exec($curl);
    curl_close($curl);

    return json_decode($response, true);
});
