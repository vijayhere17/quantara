// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRankReward {
    function setSponsor(address user, address sponsor) external;

    function recordPackageVolume(address user, uint256 volume) external;

    function processRoiIncome(address user, uint256 roiAmount) external;

    /**
     * @notice Tier Booster: 10% of any accepted income when direct sponsor shares the same rank.
     * @param user Earner who just received income (ROI, Contribution, Rank, Community, etc.).
     * @param incomeAmount Accepted gross income amount for `user`.
     */
    function notifyIncomeForTierBooster(
        address user,
        uint256 incomeAmount
    ) external;

    /**
     * @notice Legacy entry — reward contract only. Prefer IncomeManager hook.
     */
    function processSameRankIncome(
        address user,
        uint256 selfRoiAmount
    ) external;

    /// @notice Legacy entry — reward contract only. Prefer IncomeManager hook.
    function processTierBooster(address user, uint256 selfRoiAmount) external;

    /**
     * @notice Rank-based income-cap multiplier (architecture only).
     * @dev Q3=5, Q5=6, Q7=7, else 3. NOT applied to IncomeManager caps until
     *      business clarifies what the multiplier scales (ROI cap, Working cap, or both).
     */
    function getIncomeCapMultiplier(address user) external view returns (uint256);
}
