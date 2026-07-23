// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IContributionBooster {
    function registerUser(address user, address sponsor) external;

    function processPackage(address user, uint256 packageAmount) external;

    function processDirectContribution(
        address user,
        uint256 contributionAmount
    ) external;
}
