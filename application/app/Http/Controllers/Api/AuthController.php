<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Users\SignupController;
use App\Models\User;
use App\Services\BlockchainService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Web3 auth API — extends existing session auth without replacing it.
 */
class AuthController extends Controller
{
    public function __construct(protected BlockchainService $blockchain)
    {
    }

    /**
     * POST /api/blockchain/verify-registration
     * Verifies register (+ optional package) txs before any user create.
     */
    public function verifyRegistration(Request $request)
    {
        $request->validate([
            'tx_hash' => 'required|string|min:66|max:80',
            'wallet' => 'required|string|min:42|max:42',
            'sponsor' => 'required|string|min:42|max:42',
            'package_amount' => 'nullable|integer',
            'package_tx_hash' => 'nullable|string|min:66|max:80',
        ]);

        $txHash = strtolower($request->input('tx_hash'));
        $wallet = strtolower($request->input('wallet'));
        $sponsor = strtolower($request->input('sponsor'));

        $result = $this->blockchain->verifyRegistrationTransaction($txHash, $wallet, $sponsor);
        if (!($result['ok'] ?? false)) {
            return response()->json(['success' => false, 'error' => $result['error'] ?? 'Verification failed'], 200);
        }

        $packageTx = $request->input('package_tx_hash');
        $packageAmount = (int) $request->input('package_amount', 0);
        if ($packageTx && $packageAmount > 0) {
            $pkg = $this->blockchain->verifyPackageActivation(strtolower($packageTx), $wallet, $packageAmount);
            if (!($pkg['ok'] ?? false)) {
                return response()->json(['success' => false, 'error' => $pkg['error'] ?? 'Package verification failed'], 200);
            }
            $result['package'] = $pkg;
        }

        return response()->json(['success' => true, 'error' => '', 'data' => $result], 200);
    }

    /**
     * POST /api/auth/register
     * Only creates the user AFTER on-chain verification succeeds.
     */
    public function register(Request $request)
    {
        try {
            $request->validate([
                'firstname' => 'nullable|string|max:100',
                'lastname' => 'nullable|string|max:100',
                'email' => 'required|email|max:190',
                'password' => 'required|string|min:6|max:100',
                'wallet' => 'required|string|min:42|max:42',
                'sponsor_id' => 'required|string',
                'tx_hash' => 'required|string|min:66|max:80',
                'package_amount' => 'required|integer|in:50,100,300,500,1000,3000,5000,10000',
                'package_tx_hash' => 'nullable|string|min:66|max:80',
                'leg' => 'nullable|in:L,R',
            ]);

            $wallet = strtolower($request->input('wallet'));
            $txHash = strtolower($request->input('tx_hash'));
            $sponsorId = $request->input('sponsor_id');
            $email = strtolower(trim($request->input('email')));
            $packageAmount = (int) $request->input('package_amount');
            $packageTx = $request->input('package_tx_hash')
                ? strtolower($request->input('package_tx_hash'))
                : null;

            if (User::where('email', $email)->exists()) {
                return response()->json(['success' => false, 'error' => 'Email already registered'], 200);
            }

            if (User::where('username', $wallet)->orWhere('wallet_addr', $wallet)->exists()) {
                return response()->json(['success' => false, 'error' => 'Wallet address already registered'], 200);
            }

            if (User::where('transaction_hash', $txHash)->exists()) {
                return response()->json(['success' => false, 'error' => 'Transaction already used'], 200);
            }

            $sponsor = User::where('username', $sponsorId)
                ->orWhere('wallet_addr', strtolower($sponsorId))
                ->first();

            if ($sponsor === null) {
                return response()->json(['success' => false, 'error' => 'Invalid sponsor id'], 200);
            }

            $sponsorWallet = strtolower($sponsor->wallet_addr ?: $sponsor->username);

            $verified = $this->blockchain->verifyRegistrationTransaction($txHash, $wallet, $sponsorWallet);
            if (!($verified['ok'] ?? false)) {
                return response()->json(['success' => false, 'error' => $verified['error'] ?? 'On-chain verification failed'], 200);
            }

            // Package activation is required for paid registration UX
            if (!$packageTx) {
                return response()->json(['success' => false, 'error' => 'Package transaction hash is required'], 200);
            }

            $pkgVerified = $this->blockchain->verifyPackageActivation($packageTx, $wallet, $packageAmount);
            if (!($pkgVerified['ok'] ?? false)) {
                return response()->json(['success' => false, 'error' => $pkgVerified['error'] ?? 'Package verification failed'], 200);
            }

            $signup = app(SignupController::class);
            $referralUplines = $signup->getReferralUplines($sponsor->id);

            $member = DB::transaction(function () use (
                $request,
                $wallet,
                $email,
                $sponsor,
                $referralUplines,
                $txHash,
                $packageTx,
                $packageAmount,
                $verified,
                $signup
            ) {
                $member = User::create([
                    'firstname' => $request->input('firstname', ''),
                    'lastname' => $request->input('lastname', ''),
                    'email' => $email,
                    'password' => $request->input('password'),
                    'username' => $wallet,
                    'leg' => $request->input('leg', 'L'),
                    'referral_id' => $sponsor->id,
                    'referral_uplines' => $referralUplines,
                ]);

                $signup->processReferralUplines($member->id, $referralUplines);

                $member->wallet_addr = $wallet;
                $member->transaction_hash = $txHash;
                $member->package_tx_hash = $packageTx;
                $member->chain_id = config('blockchain.chain_id', 56);
                $member->package_id = $packageAmount;
                $member->registration_block = $verified['blockNumber'] ?? null;
                $member->registration_timestamp = now();
                $member->wallet_status = 'verified';
                $member->registration_status = 'completed';
                $member->activation_date = now();
                $member->save();

                return $member;
            });

            Auth::guard('web')->login($member);
            $token = $member->createToken('auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'error' => '',
                'token' => $token,
                'user' => [
                    'id' => $member->id,
                    'email' => $member->email,
                    'wallet' => $wallet,
                    'username' => $member->username,
                    'package' => $packageAmount,
                    'transaction_hash' => $txHash,
                    'block_number' => $verified['blockNumber'] ?? null,
                ],
                'redirect' => url('/dashboard'),
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Web3 register failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Registration failed. Please try again.'], 200);
        }
    }

    /**
     * POST /api/auth/login
     * Email + password, then require connected wallet to match registered wallet.
     */
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
                'wallet' => 'required|string|min:42|max:42',
            ]);

            $key = 'api-login:' . $request->ip();
            if (RateLimiter::tooManyAttempts($key, 8)) {
                return response()->json(['success' => false, 'error' => 'Too many login attempts. Try again later.'], 200);
            }
            RateLimiter::hit($key, 300);

            $email = strtolower(trim($request->input('email')));
            $wallet = strtolower($request->input('wallet'));

            $user = User::where('email', $email)->where('status', 0)->first();
            if ($user === null || !Hash::check($request->input('password'), $user->password)) {
                return response()->json(['success' => false, 'error' => 'Invalid login credentials.'], 200);
            }

            $stored = strtolower($user->wallet_addr ?: $user->username);
            if ($stored !== $wallet) {
                return response()->json([
                    'success' => false,
                    'error' => 'Wrong Wallet Connected. Please connect your registered wallet.',
                    'code' => 'WALLET_MISMATCH',
                ], 200);
            }

            Auth::guard('web')->login($user);
            $token = $user->createToken('auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'error' => '',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'wallet' => $stored,
                    'username' => $user->username,
                ],
                'redirect' => url('/dashboard'),
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Web3 login failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Invalid request data send.'], 200);
        }
    }

    /**
     * GET /api/dashboard — lightweight shell for authenticated user.
     */
    public function dashboard(Request $request)
    {
        $user = $request->user() ?: Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'wallet' => $user->wallet_addr ?: $user->username,
                'username' => $user->username,
                'package' => $user->package_id,
                'registration_status' => $user->registration_status,
            ],
        ]);
    }
}
