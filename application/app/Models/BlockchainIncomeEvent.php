<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlockchainIncomeEvent extends Model
{
    protected $table = 'blockchain_income_events';

    protected $fillable = [
        'user_id',
        'wallet',
        'income_type',
        'amount',
        'tx_hash',
        'log_index',
        'block_number',
        'mirrored_to_ledger',
    ];

    protected $casts = [
        'amount' => 'float',
        'log_index' => 'integer',
        'block_number' => 'integer',
        'mirrored_to_ledger' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
