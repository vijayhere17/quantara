<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlockchainPackageActivation extends Model
{
    protected $table = 'blockchain_package_activations';

    protected $fillable = [
        'user_id',
        'wallet',
        'package_amount',
        'package_cycle',
        'tx_hash',
        'approve_tx_hash',
        'block_number',
        'token_amount',
        'status',
    ];

    protected $casts = [
        'package_amount' => 'float',
        'package_cycle' => 'integer',
        'block_number' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
