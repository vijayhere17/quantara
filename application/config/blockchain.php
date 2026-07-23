<?php

return [

    /*
    |--------------------------------------------------------------------------
    | BNB Smart Chain / Hardhat RPC
    |--------------------------------------------------------------------------
    |
    | BLOCKCHAIN_RPC is the authoritative JSON-RPC endpoint used for all
    | on-chain verification. Never invent transaction hashes or addresses.
    |
    | Defaults:
    |   Mainnet 56 → https://bsc-dataseed.binance.org/
    |   Testnet 97 → set BLOCKCHAIN_RPC to a BSC testnet RPC
    |   Local 31337 → http://127.0.0.1:8545
    |
    */
    'rpc_url' => env('BLOCKCHAIN_RPC', env('BSC_RPC_URL', 'https://bsc-dataseed.binance.org/')),

    'chain_id' => (int) env('BLOCKCHAIN_CHAIN_ID', env('CHAIN_ID', 56)),

    /*
    | Contract addresses — always from environment in production.
    | TOKEN_CONTRACT and TOKEN_ADDRESS are aliases (BEP-20 payment token).
    */
    'contracts' => [
        'token' => env('TOKEN_CONTRACT', env('TOKEN_ADDRESS')),
        'core' => env('CORE_CONTRACT'),
        'treasury' => env('TREASURY_CONTRACT'),
        'reward' => env('REWARD_CONTRACT'),
        // Optional — used by income indexer eth_getLogs address filters
        'income' => env('INCOME_CONTRACT'),
        'contribution' => env('CONTRIBUTION_CONTRACT'),
        'booster' => env('BOOSTER_CONTRACT'),
        'rank' => env('RANK_CONTRACT'),
        'community' => env('COMMUNITY_CONTRACT'),
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

    /*
    | Block explorers (no trailing slash)
    */
    'explorers' => [
        56 => 'https://bscscan.com',
        97 => 'https://testnet.bscscan.com',
        31337 => '',
    ],

    'network_names' => [
        56 => 'BNB Smart Chain',
        97 => 'BNB Smart Chain Testnet',
        31337 => 'Hardhat Local',
    ],

    'events' => [
        // keccak256("UserRegistered(address,address)")
        'user_registered' => '0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850',
        // keccak256("PackageActivated(address,uint256,uint8,uint256)")
        'package_activated' => '0xd9e77818478fb96613e336e49129f3b174b896a6a6fa084e7fdcc5e9bd6be9da',
    ],

];
