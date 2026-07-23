// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

contract MockBTCPriceFeed {

    int256 public price;

    constructor(int256 _price) {
        price = _price;
    }

    function getBTCPrice() external view returns (int256) {
        return price;
    }

    function setBTCPrice(int256 _price) external {
        price = _price;
    }
}