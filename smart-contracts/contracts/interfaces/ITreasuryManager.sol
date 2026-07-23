// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasuryManager {
    function processContribution(uint256 amount) external;

    function getAvailableDailyRoiBudget() external view returns (uint256);

    function paySelfRoi(address user, uint256 amount) external;

    function payWorkingIncome(address user, uint256 amount) external;

    function payCommunityBuilder(address user, uint256 amount) external;

    function communityBuilderFundBalance() external view returns (uint256);

    function workingFundBalance() external view returns (uint256);

    function interdependentFundBalance() external view returns (uint256);

    function regenerationFundBalance() external view returns (uint256);

    function reserveFundBalance() external view returns (uint256);
}
