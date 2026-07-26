<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinRateMaster extends Model
{
    // Must match migration `coin_rate_masters` (seeded BTC/USD ≈ 60000).
    // Pointing at legacy `coin_rates` made getcoinrate() miss the seed and/or
    // read a ~1 stablecoin rate, so BTCB wei → USD became dust and the
    // Contribution Amount column stored 0.0000 after formatdecimal(..., 4).
    protected $table = 'coin_rate_masters';

    protected $primaryKey = 'id';
}
