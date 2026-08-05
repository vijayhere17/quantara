<?php

namespace App\Support;

/**
 * Ecology Tier rank labels (on-chain RankReward enum order).
 * Index 0 = None / not ranked.
 */
final class EcologyRanks
{
    public const NAMES = [
        0 => 'None',
        1 => 'Seed',
        2 => 'Sprout',
        3 => 'Sapling',
        4 => 'Canopy',
        5 => 'Forest',
        6 => 'Biome',
        7 => 'Ecosphere',
        8 => 'Genesis',
    ];

    /**
     * Map legacy salary_master row position (0-based among ordered tiers) → ecology name.
     */
    public static function fromTier(?object $currentRank, $allSalary): array
    {
        $names = ['Seed', 'Sprout', 'Sapling', 'Canopy', 'Forest', 'Biome', 'Ecosphere', 'Genesis'];

        $current = 'Not Ranked';
        $next = 'Seed';
        $index = -1;

        $tiers = [];
        if (is_iterable($allSalary)) {
            foreach ($allSalary as $tier) {
                $tiers[] = $tier;
            }
        }

        if ($currentRank !== null && count($tiers) > 0) {
            foreach ($tiers as $i => $tier) {
                if ((int) ($tier->id ?? 0) === (int) ($currentRank->id ?? -1)) {
                    $index = $i;
                    break;
                }
            }
            // Fallback: salary_id often aligns 1..N with Seed..Genesis
            if ($index < 0 && isset($currentRank->id)) {
                $sid = (int) $currentRank->id;
                if ($sid >= 1 && $sid <= count($names)) {
                    $index = $sid - 1;
                }
            }
            if ($index >= 0) {
                $current = $names[min($index, count($names) - 1)] ?? 'Not Ranked';
                $next = $names[$index + 1] ?? 'Genesis';
            }
        }

        // Prefer mapping old string labels if they already look like ecology names
        $raw = (string) (optional($currentRank)->rank ?? '');
        if ($raw !== '' && $raw !== 'Q0') {
            $hit = self::matchName($raw);
            if ($hit !== null) {
                $current = $hit;
                $pos = array_search($hit, $names, true);
                $next = ($pos === false) ? 'Seed' : ($names[$pos + 1] ?? 'Genesis');
                $index = is_int($pos) ? $pos : $index;
            }
        }

        if ($currentRank !== null && count($tiers) > 0 && $index >= 0 && isset($tiers[$index + 1])) {
            $nextRaw = (string) ($tiers[$index + 1]->rank ?? '');
            $nextHit = self::matchName($nextRaw);
            if ($nextHit !== null) {
                $next = $nextHit;
            }
        }

        return [
            'current' => $current === 'None' ? 'Not Ranked' : $current,
            'next' => $next,
            'index' => $index,
        ];
    }

    public static function matchName(string $raw): ?string
    {
        $n = strtolower(trim($raw));
        foreach (self::NAMES as $i => $name) {
            if ($i === 0) {
                continue;
            }
            if ($n === strtolower($name)) {
                return $name;
            }
        }
        // Legacy MLM names → ecology by rough order if present in DB text
        $legacy = [
            'sales manager' => 'Seed',
            'sales director' => 'Sprout',
            'regional' => 'Sapling',
            'national' => 'Canopy',
            'international' => 'Forest',
            'crown' => 'Biome',
            'diamond' => 'Ecosphere',
            'ambassador' => 'Genesis',
        ];
        foreach ($legacy as $needle => $mapped) {
            if (str_contains($n, $needle)) {
                return $mapped;
            }
        }
        return null;
    }
}
