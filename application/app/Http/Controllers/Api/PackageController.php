<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BlockchainService;
use App\Services\PackageActivationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
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
                'approve_tx_hash' => 'nullable|string|size:66',
            ]);

            $user = $request->user() ?: Auth::user();
            if ($user === null) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }

            $wallet = $this->blockchain->normalizeAddress($request->input('wallet'));
            $packageTx = $this->blockchain->normalizeTxHash($request->input('package_tx_hash'));
            $approveTx = $request->filled('approve_tx_hash')
                ? $this->blockchain->normalizeTxHash($request->input('approve_tx_hash'))
                : null;
            $packageAmount = (int) $request->input('package_amount');

            if ($this->isDummyTxHash($packageTx) || ($approveTx !== null && $this->isDummyTxHash($approveTx))) {
                return response()->json(['success' => false, 'error' => 'Invalid blockchain transaction hash.'], 200);
            }

            $storedWallet = $this->blockchain->normalizeAddress($user->wallet_addr ?: $user->username);
            if ($storedWallet !== $wallet) {
                return response()->json([
                    'success' => false,
                    'error' => 'Wallet does not match registered address.',
                    'code' => 'WALLET_MISMATCH',
                ], 200);
            }

            $pkgVerified = $this->blockchain->verifyPackageActivation($packageTx, $wallet, $packageAmount);
            if (!($pkgVerified['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => $pkgVerified['error'] ?? 'Package verification failed.',
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
