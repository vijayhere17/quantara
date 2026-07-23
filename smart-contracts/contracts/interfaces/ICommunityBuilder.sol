// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICommunityBuilder {
    function updateUserPoints(address user, uint256 points) external;
}
