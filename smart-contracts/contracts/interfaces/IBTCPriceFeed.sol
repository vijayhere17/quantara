// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBTCPriceFeed {
    function getBTCPrice() external view returns (int256);
}
