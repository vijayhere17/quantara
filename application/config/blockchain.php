<?php

return [

    'rpc_url' => env('BLOCKCHAIN_RPC', 'https://bsc-dataseed.binance.org/'),

    'chain_id' => (int) env('BLOCKCHAIN_CHAIN_ID', 56),

    'contracts' => [
        'token' => env('TOKEN_CONTRACT'),
        'core' => env('CORE_CONTRACT'),
        'treasury' => env('TREASURY_CONTRACT'),
        'reward' => env('REWARD_CONTRACT'),
    ],

    /*
    | Local Hardhat addresses from smart-contracts/deployed-addresses.json
    | Used only when CORE_CONTRACT / TOKEN_CONTRACT env vars are empty and
    | BLOCKCHAIN_CHAIN_ID=31337.
    */
    'local' => [
        'token' => '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        'core' => '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
        'treasury' => '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
        'reward' => '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    ],

    'abi_path' => storage_path('app/blockchain/abi'),

    'events' => [
        // keccak256("UserRegistered(address,address)")
        'user_registered' => '0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850',
        // keccak256("PackageActivated(address,uint256,uint8,uint256)")
        'package_activated' => '0xd9e77818478fb96613e336e49129f3b174b896a6a6fa084e7fdcc5e9bd6be9da',
    ],

];
