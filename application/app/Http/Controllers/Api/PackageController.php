<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\BlockchainService;
use App\Services\PackageActivationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Authenticated package activation after on-chain activatePackage().
 */
class PackageController extends Controller
{
    public function __construct(
        protected BlockchainService $blockchain,
        protected PackageActivationService $activation
    ) {
    }

    /**
     * POST /api/packages/activate
     * Middleware: auth:sanctum + api.session
     */
    public function activate(Request $request)
    {
        try {
            $request->validate([
                'wallet' => 'required|string|size:42',
                'package_amount' => 'required|integer|in:50,100,300,500,1000,3000,5000,10000',
                'package_tx_hash' => 'required|string|size:66',
                'approve_tx_hash' => 'required|string|size:66',
                'token_amount' => 'nullable|string|max:80',
            ]);

            $user = $request->user() ?: Auth::user();
            if ($user === null) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }

            $wallet = $this->blockchain->normalizeAddress($request->input('wallet'));
            $packageTx = $this->blockchain->normalizeTxHash($request->input('package_tx_hash'));
            $approveTx = $this->blockchain->normalizeTxHash($request->input('approve_tx_hash'));
            $packageAmount = (int) $request->input('package_amount');
            $tokenAmount = $request->input('token_amount');

            if ($this->isDummyTxHash($packageTx) || $this->isDummyTxHash($approveTx)) {
                return response()->json(['success' => false, 'error' => 'Invalid blockchain transaction hash.'], 200);
            }

            if ($packageTx === $approveTx) {
                return response()->json(['success' => false, 'error' => 'Package activation failed. Please try again.'], 200);
            }

            $storedWallet = $this->blockchain->normalizeAddress($user->wallet_addr ?: $user->username);
            if ($storedWallet !== $wallet) {
                return response()->json([
                    'success' => false,
                    'error' => 'Wallet does not match registered address.',
                    'code' => 'WALLET_MISMATCH',
                ], 200);
            }

            $next = $this->blockchain->getNextEligiblePackageHint($user);
            if ((int) ($next['amount'] ?? 0) !== $packageAmount) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid package selection. Next eligible package is $' . (int) ($next['amount'] ?? 0) . '.',
                ], 200);
            }

            $pkgVerified = $this->blockchain->verifyPackageActivation($packageTx, $wallet, $packageAmount);
            if (!($pkgVerified['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => $pkgVerified['error'] ?? 'Package verification failed.',
                ], 200);
            }

            $requiredApproveWei = $pkgVerified['tokenAmountHex'] ?? null;
            if (!is_string($requiredApproveWei) || $requiredApproveWei === '') {
                return response()->json([
                    'success' => false,
                    'error' => 'Could not determine package payment amount from chain.',
                ], 200);
            }

            $approveVerified = $this->blockchain->verifyApprovalTransaction(
                $approveTx,
                $wallet,
                $requiredApproveWei
            );
            if (!($approveVerified['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => $approveVerified['error'] ?? 'Approval verification failed.',
                ], 200);
            }

            if (
                (
                    Schema::hasTable('blockchain_package_activations') &&
                    DB::table('blockchain_package_activations')->where('approve_tx_hash', $approveTx)->exists()
                ) ||
                (
                    Schema::hasColumn('users', 'approve_tx_hash') &&
                    User::where('approve_tx_hash', $approveTx)->where('id', '!=', $user->id)->exists()
                )
            ) {
                return response()->json([
                    'success' => false,
                    'error' => 'Approval transaction already used.',
                ], 200);
            }

            $member = $this->activation->activateFromVerifiedPackage(
                $user,
                $packageAmount,
                $packageTx,
                $approveTx,
                $pkgVerified
            );

            $member->loadMissing(['kit', 'referral']);

            /** @var AuthController $auth */
            $auth = app(AuthController::class);

            return response()->json([
                'success' => true,
                'error' => '',
                'user' => $auth->buildUserPayload($member, null, $pkgVerified),
                'dashboard' => $auth->buildDashboardPayload($member, null, $pkgVerified),
                'next_package' => $this->blockchain->getNextEligiblePackageHint($member),
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => collect($e->errors())->flatten()->first() ?: 'Validation failed',
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Package activate failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Package activation failed. Please try again.'], 200);
        }
    }

    protected function isDummyTxHash(string $hash): bool
    {
        $h = strtolower($hash);
        return $h === '' ||
            preg_match('/^0x0+$/', $h) === 1 ||
            str_contains($h, 'pending') ||
            str_contains($h, 'dummy') ||
            str_contains($h, 'fake');
    }
}
