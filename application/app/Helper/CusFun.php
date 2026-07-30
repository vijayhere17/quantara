<?php
    use App\Models\CoinRateMaster;

    if(!function_exists('formatdate')){
        function formatdate($date, $format){
           return date($format, strtotime($date));
        }
    }
    
    if(!function_exists('formatdecimal')){
        function formatdecimal($amount, $decimal){
           return number_format((float)$amount, $decimal, '.', '');
        }
    }

    if(!function_exists('getcoinrate')){
        function getcoinrate(){
            try {
                $object = CoinRateMaster::orderBy('id', 'desc')->first();
                if ($object !== null && isset($object->rate) && (float) $object->rate > 0) {
                    return number_format((float) $object->rate, 8, '.', '');
                }
            } catch (\Throwable $e) {
                // table missing / empty
            }
            // Local Hardhat MockBTCPriceFeed default
            return number_format(60000.0, 8, '.', '');
        }
    }
    
    if(!function_exists('getwithdrawrate')){
        function getwithdrawrate(){
            return getcoinrate();
        }
    }

    if(!function_exists('obscureAddress')){
        function obscureAddress($address) {
            return substr($address, 0, 6) . '...' . substr($address, -4);
        }
    }

    if (!function_exists('ecologyRankCatalog')) {
        /**
         * Quantara Ecology Tier ranks (matches on-chain RankReward enum order).
         *
         * @return array<int, array{label:string,rewardPct:int}>
         */
        function ecologyRankCatalog(): array
        {
            return [
                0 => ['label' => 'Not Ranked', 'rewardPct' => 0],
                1 => ['label' => 'Seed', 'rewardPct' => 10],
                2 => ['label' => 'Sprout', 'rewardPct' => 15],
                3 => ['label' => 'Sapling', 'rewardPct' => 20],
                4 => ['label' => 'Canopy', 'rewardPct' => 25],
                5 => ['label' => 'Forest', 'rewardPct' => 30],
                6 => ['label' => 'Biome', 'rewardPct' => 35],
                7 => ['label' => 'Ecosphere', 'rewardPct' => 40],
                8 => ['label' => 'Genesis', 'rewardPct' => 45],
            ];
        }
    }

    if (!function_exists('resolveEcologyRankId')) {
        function resolveEcologyRankId($rank): int
        {
            if ($rank === null || $rank === '') {
                return 0;
            }
            if (is_int($rank) && $rank >= 0 && $rank <= 8) {
                return $rank;
            }
            $raw = trim((string) $rank);
            if ($raw !== '' && ctype_digit($raw)) {
                $n = (int) $raw;
                return ($n >= 0 && $n <= 8) ? $n : 0;
            }

            $aliases = [
                'none' => 0,
                'q0' => 0,
                'not ranked' => 0,
                'not ranked yet' => 0,
                'seed' => 1,
                'q1' => 1,
                'sales manager' => 1,
                'sprout' => 2,
                'q2' => 2,
                'sapling' => 3,
                'q3' => 3,
                'canopy' => 4,
                'q4' => 4,
                'forest' => 5,
                'q5' => 5,
                'biome' => 6,
                'q6' => 6,
                'ecosphere' => 7,
                'q7' => 7,
                'genesis' => 8,
                'q8' => 8,
            ];

            $key = strtolower($raw);
            if (isset($aliases[$key])) {
                return $aliases[$key];
            }

            $catalog = ecologyRankCatalog();
            foreach ($catalog as $id => $meta) {
                if (strtolower($meta['label']) === $key) {
                    return $id;
                }
            }

            return 0;
        }
    }

    if (!function_exists('formatEcologyRank')) {
        function formatEcologyRank($rank): string
        {
            $id = resolveEcologyRankId($rank);
            return ecologyRankCatalog()[$id]['label'] ?? 'Not Ranked';
        }
    }

    if (!function_exists('nextEcologyRank')) {
        function nextEcologyRank($rank): ?string
        {
            $id = resolveEcologyRankId($rank);
            if ($id >= 8) {
                return null;
            }
            return ecologyRankCatalog()[$id + 1]['label'] ?? null;
        }
    }

 
    