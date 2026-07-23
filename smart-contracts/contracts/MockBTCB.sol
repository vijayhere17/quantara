// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBTCB
 * @notice Local/dev BTCB stand-in. Constructor mints 1_000_000 to deployer.
 * @dev `mint` exists for Hardhat demo faucets only — never deploy to production.
 */
contract MockBTCB is ERC20 {
    constructor() ERC20("Mock BTCB", "BTCB") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /// @notice Demo faucet mint (local Hardhat / testnets only).
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        _mint(to, amount);
    }
}
