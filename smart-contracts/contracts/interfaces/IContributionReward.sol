// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IContributionReward {
    function setSponsor(address user, address sponsor) external;

    function processContribution(address user, uint256 amount) external;
}
