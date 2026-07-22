<?php

return [

    'rpc_url' => env('BLOCKCHAIN_RPC'),

    'contracts' => [

        'token' => env('TOKEN_CONTRACT'),

        'core' => env('CORE_CONTRACT'),

        'treasury' => env('TREASURY_CONTRACT'),

        'reward' => env('REWARD_CONTRACT'),

    ],

];