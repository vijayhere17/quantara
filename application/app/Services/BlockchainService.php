<?php

namespace App\Services;

class BlockchainService
{
    protected string $rpc;
    protected string $core;
    protected string $token;
    protected string $treasury;

    public function __construct()
    {
        $this->rpc = config('blockchain.rpc_url');

        $this->core = config('blockchain.contracts.core');

        $this->token = config('blockchain.contracts.token');

        $this->treasury = config('blockchain.contracts.treasury');
    }

    public function getConfig()
    {
        return [
            'rpc' => $this->rpc,
            'core' => $this->core,
            'token' => $this->token,
            'treasury' => $this->treasury,
        ];
    }
}