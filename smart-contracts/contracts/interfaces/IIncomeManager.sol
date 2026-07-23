// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIncomeManager {
    enum IncomeType {
        ROI,
        Contribution,
        Booster,
        Rank,
        SameRank,
        Community
    }

    function startPackage(address user, uint256 principal) external;

    function recordIncome(
        address user,
        uint256 amount,
        IncomeType incomeType
    ) external returns (uint256 acceptedAmount);

    function getRoiCap(address user) external view returns (uint256);

    function getWorkingCap(address user) external view returns (uint256);

    function getRemainingRoiCap(address user) external view returns (uint256);

    function getRemainingWorkingCap(address user) external view returns (uint256);

    function isRoiCapReached(address user) external view returns (bool);

    function isWorkingCapReached(address user) external view returns (bool);

    function isPackageIncomeComplete(address user) external view returns (bool);

    function totalEarned(address user) external view returns (uint256);

    function workingEarned(address user) external view returns (uint256);
}
