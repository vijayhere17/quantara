<?php

namespace App\Services;

use RuntimeException;

/**
 * Arbitrary-precision integer helpers for blockchain wei/hex amounts.
 *
 * Prefer PHP GMP (`ext-gmp`) when available. Falls back to BCMath (`ext-bcmath`)
 * or a pure-PHP hex implementation so namespaced `gmp_*` fatals never occur and
 * servers without GMP still verify approvals safely.
 *
 * IMPORTANT: Always call via this service — never bare `gmp_init()` inside a
 * namespace (PHP resolves it as App\Services\gmp_init).
 */
class BigInteger
{
    public static function hasGmp(): bool
    {
        return extension_loaded('gmp') && function_exists('\\gmp_init');
    }

    public static function hasBcmath(): bool
    {
        return extension_loaded('bcmath') && function_exists('\\bcadd');
    }

    /**
     * Driver in use: gmp | bcmath | php
     */
    public static function driver(): string
    {
        if (self::hasGmp()) {
            return 'gmp';
        }
        if (self::hasBcmath()) {
            return 'bcmath';
        }
        return 'php';
    }

    /**
     * Normalize hex / decimal string to lowercase hex without 0x prefix.
     */
    public static function normalizeHex(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '0';
        }

        if (preg_match('/^0x[0-9a-fA-F]+$/', $value) === 1) {
            $hex = strtolower(substr($value, 2));
        } elseif (preg_match('/^[0-9a-fA-F]+$/', $value) === 1 && preg_match('/[a-fA-F]/', $value) === 1) {
            $hex = strtolower($value);
        } elseif (preg_match('/^[0-9]+$/', $value) === 1) {
            // Decimal → hex
            if (self::hasGmp()) {
                $hex = \gmp_strval(\gmp_init($value, 10), 16);
            } elseif (self::hasBcmath()) {
                $hex = self::decToHexBc($value);
            } else {
                $hex = self::decToHexPhp($value);
            }
        } else {
            throw new RuntimeException('Invalid integer value for blockchain math.');
        }

        $hex = ltrim($hex, '0');
        return $hex === '' ? '0' : $hex;
    }

    /**
     * Compare two non-negative integers (hex or decimal strings).
     * @return int -1 | 0 | 1
     */
    public static function cmp(string $left, string $right): int
    {
        $a = self::normalizeHex($left);
        $b = self::normalizeHex($right);

        if (self::hasGmp()) {
            return \gmp_cmp(\gmp_init($a, 16), \gmp_init($b, 16));
        }

        if (self::hasBcmath()) {
            $da = self::hexToDecBc($a);
            $db = self::hexToDecBc($b);
            return \bccomp($da, $db, 0);
        }

        $len = max(strlen($a), strlen($b));
        $a = str_pad($a, $len, '0', STR_PAD_LEFT);
        $b = str_pad($b, $len, '0', STR_PAD_LEFT);
        return $a <=> $b;
    }

    public static function gte(string $left, string $right): bool
    {
        return self::cmp($left, $right) >= 0;
    }

    /**
     * Convert wei (hex or decimal) to a float token amount using 18 decimals.
     * Compatible with prior gmp_div_q / gmp_div_r behaviour for indexer display.
     */
    public static function weiToTokenFloat(string $wei, int $decimals = 18): float
    {
        if ($decimals < 0 || $decimals > 36) {
            throw new RuntimeException('Invalid token decimals.');
        }

        $hex = self::normalizeHex($wei);

        if (self::hasGmp()) {
            $weiG = \gmp_init($hex, 16);
            $div = \gmp_pow(10, $decimals);
            $whole = \gmp_div_q($weiG, $div);
            $frac = \gmp_div_r($weiG, $div);
            return (float) \gmp_strval($whole) + ((float) \gmp_strval($frac) / (10 ** $decimals));
        }

        if (self::hasBcmath()) {
            $dec = self::hexToDecBc($hex);
            $scale = $decimals + 8;
            $divisor = bcpow('10', (string) $decimals, 0);
            $whole = bcdiv($dec, $divisor, 0);
            $frac = bcmod($dec, $divisor);
            $fracPad = str_pad($frac, $decimals, '0', STR_PAD_LEFT);
            return (float) $whole + ((float) ('0.' . $fracPad));
        }

        // Pure PHP: convert hex → decimal string then split
        $dec = self::hexToDecPhp($hex);
        if (strlen($dec) <= $decimals) {
            $frac = str_pad($dec, $decimals, '0', STR_PAD_LEFT);
            return (float) ('0.' . $frac);
        }
        $whole = substr($dec, 0, -$decimals);
        $frac = substr($dec, -$decimals);
        return (float) $whole + ((float) ('0.' . $frac));
    }

    protected static function hexToDecBc(string $hex): string
    {
        $hex = strtolower(ltrim($hex, '0') ?: '0');
        $dec = '0';
        for ($i = 0, $len = strlen($hex); $i < $len; $i++) {
            $dec = bcmul($dec, '16', 0);
            $digit = $hex[$i];
            $val = ctype_digit($digit) ? $digit : (string) (10 + ord($digit) - ord('a'));
            $dec = bcadd($dec, $val, 0);
        }
        return $dec;
    }

    protected static function decToHexBc(string $dec): string
    {
        if ($dec === '0') {
            return '0';
        }
        $hex = '';
        while (bccomp($dec, '0', 0) > 0) {
            $rem = (int) bcmod($dec, '16');
            $hex = dechex($rem) . $hex;
            $dec = bcdiv($dec, '16', 0);
        }
        return $hex === '' ? '0' : $hex;
    }

    protected static function hexToDecPhp(string $hex): string
    {
        $hex = strtolower(ltrim($hex, '0') ?: '0');
        $dec = '0';
        for ($i = 0, $len = strlen($hex); $i < $len; $i++) {
            $dec = self::mulDecPhp($dec, '16');
            $digit = $hex[$i];
            $val = ctype_digit($digit) ? $digit : (string) (10 + ord($digit) - ord('a'));
            $dec = self::addDecPhp($dec, $val);
        }
        return $dec;
    }

    protected static function decToHexPhp(string $dec): string
    {
        $dec = ltrim($dec, '0') ?: '0';
        if ($dec === '0') {
            return '0';
        }
        $hex = '';
        while ($dec !== '0') {
            [$dec, $rem] = self::divModPhp($dec, 16);
            $hex = dechex($rem) . $hex;
        }
        return $hex;
    }

    protected static function addDecPhp(string $a, string $b): string
    {
        $a = strrev($a);
        $b = strrev($b);
        $carry = 0;
        $out = '';
        $len = max(strlen($a), strlen($b));
        for ($i = 0; $i < $len; $i++) {
            $sum = $carry + (int) ($a[$i] ?? '0') + (int) ($b[$i] ?? '0');
            $out .= (string) ($sum % 10);
            $carry = intdiv($sum, 10);
        }
        if ($carry > 0) {
            $out .= (string) $carry;
        }
        return strrev($out);
    }

    protected static function mulDecPhp(string $a, string $b): string
    {
        $a = ltrim($a, '0') ?: '0';
        $b = ltrim($b, '0') ?: '0';
        if ($a === '0' || $b === '0') {
            return '0';
        }
        $result = array_fill(0, strlen($a) + strlen($b), 0);
        for ($i = strlen($a) - 1; $i >= 0; $i--) {
            for ($j = strlen($b) - 1; $j >= 0; $j--) {
                $pos = $i + $j + 1;
                $sum = $result[$pos] + ((int) $a[$i]) * ((int) $b[$j]);
                $result[$pos] = $sum % 10;
                $result[$pos - 1] += intdiv($sum, 10);
            }
        }
        $str = ltrim(implode('', $result), '0');
        return $str === '' ? '0' : $str;
    }

    /**
     * @return array{0:string,1:int} [quotient, remainder]
     */
    protected static function divModPhp(string $dec, int $divisor): array
    {
        $dec = ltrim($dec, '0') ?: '0';
        if ($dec === '0') {
            return ['0', 0];
        }
        $quotient = '';
        $remainder = 0;
        for ($i = 0, $len = strlen($dec); $i < $len; $i++) {
            $remainder = $remainder * 10 + (int) $dec[$i];
            $digit = intdiv($remainder, $divisor);
            $quotient .= (string) $digit;
            $remainder = $remainder % $divisor;
        }
        $quotient = ltrim($quotient, '0') ?: '0';
        return [$quotient, $remainder];
    }
}
