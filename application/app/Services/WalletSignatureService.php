<?php

namespace App\Services;

use SWeb3\Accounts;

/**
 * Wallet ownership proof via MetaMask personal_sign.
 */
class WalletSignatureService
{
    /**
     * Verify that $signature is a personal_sign of $message by $expectedWallet.
     * Message must be a fresh Quantara login challenge.
     */
    public function verifyLoginMessage(string $expectedWallet, string $message, string $signature): array
    {
        $expectedWallet = strtolower(trim($expectedWallet));
        $message = trim($message);
        $signature = trim($signature);

        if (!preg_match('/^0x[a-f0-9]{40}$/', $expectedWallet)) {
            return ['ok' => false, 'error' => 'Invalid wallet address.'];
        }
        if (!preg_match('/^0x[a-fA-F0-9]{130}$/', $signature)) {
            return ['ok' => false, 'error' => 'Invalid wallet signature.'];
        }
        if ($message === '' || strlen($message) > 2000) {
            return ['ok' => false, 'error' => 'Invalid login message.'];
        }

        if (!$this->isValidChallenge($message, $expectedWallet)) {
            return ['ok' => false, 'error' => 'Login message expired or invalid. Please try again.'];
        }

        try {
            $recovered = strtolower(Accounts::signedMessageToAddress($message, $signature));
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Wallet signature verification failed.'];
        }

        if ($recovered !== $expectedWallet) {
            return ['ok' => false, 'error' => 'Wallet signature does not match connected address.'];
        }

        return ['ok' => true, 'wallet' => $expectedWallet];
    }

    /**
     * Challenge format (created on the client):
     * Quantara Login
     * Wallet: 0x...
     * Issued At: ISO-8601
     * Nonce: hex
     */
    protected function isValidChallenge(string $message, string $wallet): bool
    {
        if (!str_starts_with($message, "Quantara Login\n")) {
            return false;
        }

        if (!preg_match('/Wallet:\s*(0x[a-fA-F0-9]{40})/i', $message, $mWallet)) {
            return false;
        }
        if (strtolower($mWallet[1]) !== $wallet) {
            return false;
        }

        if (!preg_match('/Issued At:\s*([^\n]+)/i', $message, $mTime)) {
            return false;
        }

        $issued = strtotime(trim($mTime[1]));
        if ($issued === false) {
            return false;
        }

        // Accept ±10 minutes clock skew / latency
        $age = abs(time() - $issued);
        if ($age > 600) {
            return false;
        }

        if (!preg_match('/Nonce:\s*([a-fA-F0-9]{8,64})/', $message)) {
            return false;
        }

        return true;
    }

    public static function buildClientChallengeHint(): string
    {
        return 'Quantara Login';
    }
}
