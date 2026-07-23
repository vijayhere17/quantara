// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBTCPlanCore {
    /// @notice ROI 3X reached — deactivate ROI and unlock next package.
    function onRoiCapReached(address user) external;

    /// @notice Working 4X reached — unlock next package (ROI may still run).
    function onWorkingCapReached(address user) external;

    /// @notice Both independent caps exhausted — final package income shutdown.
    function completePackage(address user) external;

    function users(address user)
        external
        view
        returns (
            address wallet,
            address sponsor,
            uint256 packageAmount,
            uint8 packageIndex,
            uint8 packageCycle,
            uint256 joinedAt,
            bool isActive,
            bool packageCompleted
        );

    function getNextEligiblePackage(address userAddr)
        external
        view
        returns (uint256 packageAmount, uint8 packageCycle);
}
