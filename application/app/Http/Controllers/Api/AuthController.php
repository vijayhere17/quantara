<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Users\SignupController;
use App\Models\StakeMaster;
use App\Models\User;
use App\Services\BlockchainService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

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
     */
    public function verifyRegistration(Request $request)
    {
        try {
            $request->validate([
                'tx_hash' => 'required|string|size:66',
                'wallet' => 'required|string|size:42',
                'sponsor' => 'required|string|size:42',
                'package_amount' => 'required|integer|in:50,100,300,500,1000,3000,5000,10000',
                'package_tx_hash' => 'required|string|size:66',
            ]);

            $txHash = $this->blockchain->normalizeTxHash($request->input('tx_hash'));
            $wallet = $this->blockchain->normalizeAddress($request->input('wallet'));
            $sponsor = $this->blockchain->normalizeAddress($request->input('sponsor'));
            $packageTx = $this->blockchain->normalizeTxHash($request->input('package_tx_hash'));
            $packageAmount = (int) $request->input('package_amount');

            $result = $this->blockchain->verifyRegistrationTransaction($txHash, $wallet, $sponsor);
            if (!($result['ok'] ?? false)) {
                return response()->json(['success' => false, 'error' => $result['error'] ?? 'Verification failed'], 200);
            }

            $pkg = $this->blockchain->verifyPackageActivation($packageTx, $wallet, $packageAmount);
            if (!($pkg['ok'] ?? false)) {
                return response()->json(['success' => false, 'error' => $pkg['error'] ?? 'Package verification failed'], 200);
            }

            $result['package'] = $pkg;

            return response()->json(['success' => true, 'error' => '', 'data' => $result], 200);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 200);
        }
    }

    /**
     * POST /api/auth/register
     * Creates the user ONLY after both register + activatePackage txs verify on-chain.
     * Route middleware: api + api.session (session login, no CSRF).
     */
    public function register(Request $request)
    {
        try {
            $key = 'api-register:' . $request->ip();
            if (RateLimiter::tooManyAttempts($key, 5)) {
                return response()->json(['success' => false, 'error' => 'Too many registration attempts. Try again later.'], 200);
            }
            RateLimiter::hit($key, 300);

            $request->validate([
                'firstname' => 'nullable|string|max:100',
                'lastname' => 'nullable|string|max:100',
                'username' => 'required|string|min:3|max:32|regex:/^[A-Za-z0-9_]+$/',
                'email' => 'required|email|max:190',
                'password' => 'required|string|min:6|max:100',
                'wallet' => 'required|string|size:42',
                'sponsor_id' => 'required|string|max:80',
                'tx_hash' => 'required|string|size:66',
                'package_amount' => 'required|integer|in:50',
                'package_tx_hash' => 'required|string|size:66',
                'approve_tx_hash' => 'nullable|string|size:66',
                'token_amount' => 'nullable|string|max:80',
                'leg' => 'nullable|in:L,R',
            ]);

            $wallet = $this->blockchain->normalizeAddress($request->input('wallet'));
            $txHash = $this->blockchain->normalizeTxHash($request->input('tx_hash'));
            $packageTx = $this->blockchain->normalizeTxHash($request->input('package_tx_hash'));
            $approveTx = $request->filled('approve_tx_hash')
                ? $this->blockchain->normalizeTxHash($request->input('approve_tx_hash'))
                : null;
            $sponsorId = trim($request->input('sponsor_id'));
            $email = strtolower(trim($request->input('email')));
            $username = trim($request->input('username'));
            $packageAmount = (int) $request->input('package_amount');

            if ($txHash === $packageTx) {
                return response()->json(['success' => false, 'error' => 'Registration failed. Please try again.'], 200);
            }

            if (User::where('email', $email)->exists()) {
                return response()->json(['success' => false, 'error' => 'Email already registered.'], 200);
            }

            if (User::whereRaw('LOWER(username) = ?', [strtolower($username)])->exists()) {
                return response()->json(['success' => false, 'error' => 'Username already taken.'], 200);
            }

            if (
                User::whereRaw('LOWER(username) = ?', [$wallet])->exists() ||
                User::whereRaw('LOWER(wallet_addr) = ?', [$wallet])->exists()
            ) {
                return response()->json(['success' => false, 'error' => 'Wallet address already registered.'], 200);
            }

            if (User::where('transaction_hash', $txHash)->exists()) {
                return response()->json(['success' => false, 'error' => 'Registration transaction already used.'], 200);
            }

            if (User::where('package_tx_hash', $packageTx)->exists()) {
                return response()->json(['success' => false, 'error' => 'Activation transaction already used.'], 200);
            }

            $sponsorKey = strtolower($sponsorId);
            $sponsor = User::where(function ($query) use ($sponsorId, $sponsorKey) {
                $query->where('username', $sponsorId)
                    ->orWhereRaw('LOWER(username) = ?', [$sponsorKey])
                    ->orWhereRaw('LOWER(wallet_addr) = ?', [$sponsorKey]);
            })->first();

            if ($sponsor === null) {
                return response()->json(['success' => false, 'error' => 'Sponsor not found.'], 200);
            }

            $sponsorWallet = $this->blockchain->normalizeAddress($sponsor->wallet_addr ?: $sponsor->username);
            if ($sponsorWallet === $wallet) {
                return response()->json(['success' => false, 'error' => 'Cannot sponsor yourself.'], 200);
            }

            $verified = $this->blockchain->verifyRegistrationTransaction($txHash, $wallet, $sponsorWallet);
            if (!($verified['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Registration verification failed.',
                ], 200);
            }

            $pkgVerified = $this->blockchain->verifyPackageActivation($packageTx, $wallet, $packageAmount);
            if (!($pkgVerified['ok'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Activation verification failed.',
                ], 200);
            }

            $signup = app(SignupController::class);
            $referralUplines = $signup->getReferralUplines($sponsor->id);
            $kit = StakeMaster::where('amount', $packageAmount)->first();

            $member = DB::transaction(function () use (
                $request,
                $wallet,
                $email,
                $username,
                $sponsor,
                $referralUplines,
                $txHash,
                $packageTx,
                $approveTx,
                $packageAmount,
                $verified,
                $pkgVerified,
                $signup,
                $kit
            ) {
                if (
                    User::where('email', $email)->lockForUpdate()->exists() ||
                    User::whereRaw('LOWER(username) = ?', [strtolower($username)])->lockForUpdate()->exists() ||
                    User::whereRaw('LOWER(wallet_addr) = ?', [$wallet])->lockForUpdate()->exists() ||
                    User::where('transaction_hash', $txHash)->lockForUpdate()->exists() ||
                    User::where('package_tx_hash', $packageTx)->lockForUpdate()->exists()
                ) {
                    throw ValidationException::withMessages([
                        'wallet' => ['Duplicate registration detected.'],
                    ]);
                }

                $member = User::create([
                    'firstname' => $request->input('firstname', ''),
                    'lastname' => $request->input('lastname', ''),
                    'email' => $email,
                    'password' => $request->input('password'),
                    'username' => $username,
                    'leg' => $request->input('leg', 'L'),
                    'referral_id' => $sponsor->id,
                    'referral_uplines' => $referralUplines,
                ]);

                $signup->processReferralUplines($member->id, $referralUplines);

                $member->wallet_addr = $wallet;
                $member->transaction_hash = $txHash;
                $member->package_tx_hash = $packageTx;
                $member->approve_tx_hash = $approveTx;
                $member->chain_id = (int) config('blockchain.chain_id', 56);
                $member->package_id = $packageAmount;
                $member->package_amount = $packageAmount;
                $member->kit_id = $kit?->id;
                $member->registration_block = $pkgVerified['blockNumber'] ?? ($verified['blockNumber'] ?? null);
                $member->registration_timestamp = now();
                $member->wallet_status = 'verified';
                $member->registration_status = 'completed';
                $member->activation_date = now();
                $member->status = 0; // active member
                $member->save();

                return $member->fresh(['kit', 'referral']);
            });

            Auth::guard('web')->login($member);
            $request->session()->regenerate();
            $token = $member->createToken('auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'error' => '',
                'token' => $token,
                'user' => $this->userPayload($member, $verified, $pkgVerified),
                'dashboard' => $this->dashboardPayload($member, $verified, $pkgVerified),
                'redirect' => url('/dashboard'),
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => collect($e->errors())->flatten()->first() ?: 'Validation failed',
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Web3 register failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Registration failed. Please try again.'], 200);
        }
    }

    /**
     * POST /api/auth/login
     * Route middleware: api + api.session (session login, no CSRF).
     */
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
                'wallet' => 'required|string|size:42',
            ]);

            $key = 'api-login:' . $request->ip();
            if (RateLimiter::tooManyAttempts($key, 8)) {
                return response()->json(['success' => false, 'error' => 'Too many login attempts. Try again later.'], 200);
            }
            RateLimiter::hit($key, 300);

            $email = strtolower(trim($request->input('email')));
            $wallet = $this->blockchain->normalizeAddress($request->input('wallet'));

            $user = User::where('email', $email)->where('status', 0)->first();
            if ($user === null || empty($user->password) || !Hash::check($request->input('password'), $user->password)) {
                return response()->json(['success' => false, 'error' => 'Invalid login credentials.'], 200);
            }

            $stored = $this->blockchain->normalizeAddress($user->wallet_addr ?: $user->username);
            if ($stored !== $wallet) {
                return response()->json([
                    'success' => false,
                    'error' => 'Wrong Wallet Connected. Please connect your registered wallet.',
                    'code' => 'WALLET_MISMATCH',
                ], 200);
            }

            if (($user->registration_status ?? null) === 'pending') {
                return response()->json(['success' => false, 'error' => 'Registration is incomplete.'], 200);
            }

            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            // Keep wallet verification in sync on every successful email+wallet login
            if (($user->wallet_status ?? null) !== 'verified') {
                $user->wallet_status = 'verified';
                if (empty($user->wallet_addr)) {
                    $user->wallet_addr = $wallet;
                }
                $user->save();
            }

            $token = $user->createToken('auth')->plainTextToken;
            $user->loadMissing(['kit', 'referral']);

            return response()->json([
                'success' => true,
                'error' => '',
                'token' => $token,
                'user' => $this->userPayload($user),
                'dashboard' => $this->dashboardPayload($user),
                'redirect' => url('/dashboard'),
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Web3 login failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Invalid request data send.'], 200);
        }
    }

    /**
     * GET /api/dashboard
     */
    public function dashboard(Request $request)
    {
        $user = $request->user() ?: Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
        }

        $user->loadMissing(['kit', 'referral']);

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
            'dashboard' => $this->dashboardPayload($user),
        ]);
    }

    protected function userPayload(User $user, ?array $verified = null, ?array $pkgVerified = null): array
    {
        $wallet = strtolower($user->wallet_addr ?: $user->username);

        return [
            'id' => $user->id,
            'email' => $user->email,
            'wallet' => $wallet,
            'username' => $user->username,
            'display_name' => trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? '')) ?: 'Explorer',
            'package' => $user->package_id,
            'package_name' => optional($user->kit)->name ?: ('$' . $user->package_id),
            'activation_status' => $user->registration_status ?: ($user->activation_date ? 'completed' : 'pending'),
            'wallet_status' => $user->wallet_status ?: 'unverified',
            'transaction_hash' => $user->transaction_hash,
            'package_tx_hash' => $user->package_tx_hash,
            'approve_tx_hash' => $user->approve_tx_hash ?? null,
            'block_number' => $user->registration_block ?? ($pkgVerified['blockNumber'] ?? ($verified['blockNumber'] ?? null)),
            'chain_id' => $user->chain_id,
            'registration_timestamp' => optional($user->registration_timestamp)->toIso8601String(),
            'sponsor' => $user->referral ? [
                'id' => $user->referral->id,
                'wallet' => strtolower($user->referral->wallet_addr ?: $user->referral->username),
                'username' => $user->referral->username,
            ] : null,
        ];
    }

    protected function dashboardPayload(User $user, ?array $verified = null, ?array $pkgVerified = null): array
    {
        return [
            'wallet' => strtolower($user->wallet_addr ?: $user->username),
            'package' => [
                'amount' => $user->package_amount ?: $user->package_id,
                'name' => optional($user->kit)->name ?: ('$' . ($user->package_amount ?: $user->package_id)),
                'cycle' => $pkgVerified['packageCycle'] ?? 1,
                'status' => $user->activation_date ? 'active' : 'inactive',
            ],
            'activation_status' => $user->registration_status ?: 'pending',
            'transactions' => [
                'registration' => $user->transaction_hash,
                'approval' => $user->approve_tx_hash ?? null,
                'package' => $user->package_tx_hash,
                'block_number' => $user->registration_block,
            ],
            'synced_at' => now()->toIso8601String(),
        ];
    }
}
