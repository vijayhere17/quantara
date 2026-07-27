// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRankReward {
    function setSponsor(address user, address sponsor) external;

    function recordPackageVolume(address user, uint256 volume) external;

    function processRoiIncome(address user, uint256 roiAmount) external;

    /**
     * @notice Tier Booster: 10% of Self ROI when direct sponsor shares the same rank.
     * @param user Earner who just received Self ROI.
     * @param selfRoiAmount Accepted Self ROI amount for `user`.
     */
    function processSameRankIncome(
        address user,
        uint256 selfRoiAmount
    ) external;

    /// @notice Explicit Tier Booster entrypoint (Self ROI only).
    function processTierBooster(address user, uint256 selfRoiAmount) external;

    /**
     * @notice Rank-based income-cap multiplier (architecture only).
     * @dev Q3=5, Q5=6, Q7=7, else 3. NOT applied to IncomeManager caps until
     *      business clarifies what the multiplier scales (ROI cap, Working cap, or both).
     */
    function getIncomeCapMultiplier(address user) external view returns (uint256);
}
