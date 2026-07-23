// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IInterdependentReward {
    function activateRoi(address user, uint256 principal) external;

    function deactivateRoi(address user) external;
}
