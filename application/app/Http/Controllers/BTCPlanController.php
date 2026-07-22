<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BlockchainService;

class BTCPlanController extends Controller
{
    protected BlockchainService $blockchain;

    public function __construct(BlockchainService $blockchain)
    {
        $this->blockchain = $blockchain;
    }

    public function index()
{
    $coreAbi = json_decode(
    file_get_contents(
        storage_path('app/blockchain/abi/BTCPlanCore.json')
    ),
    true
);

$tokenAbi = json_decode(
    file_get_contents(
        storage_path('app/blockchain/abi/MockBTCB.json')
    ),
    true
);

    $data = [];

    $data['page_titel'] = 'BTC Plan';

    $data['rpc'] = config('blockchain.rpc_url');

    $data['coreAddress'] = config('blockchain.contracts.core');

    $data['tokenAddress'] = config('blockchain.contracts.token');

    $data['treasuryAddress'] = config('blockchain.contracts.treasury');

    $data['coreAbi'] = json_encode($coreAbi);

    $data['tokenAbi'] = json_encode($tokenAbi);

    return view('users.buy-bot', $data);
}
}