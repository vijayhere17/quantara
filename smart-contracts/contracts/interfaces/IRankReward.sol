// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRankReward {
    function setSponsor(address user, address sponsor) external;

    function recordPackageVolume(address user, uint256 volume) external;

    function processRoiIncome(address user, uint256 roiAmount) external;

    /**
     * @notice Pays same-rank bonus based on a slice of the earner's eligible income.
     * @param user Earner whose income triggered the bonus.
     * @param eligibleIncomeAmount Amount of eligible income just accepted for `user`
     *        (see RankReward comments for the definition of total eligible income).
     */
    function processSameRankIncome(
        address user,
        uint256 eligibleIncomeAmount
    ) external;

    /**
     * @notice Rank-based income-cap multiplier (architecture only).
     * @dev Q3=5, Q5=6, Q7=7, else 3. NOT applied to IncomeManager caps until
     *      business clarifies what the multiplier scales (ROI cap, Working cap, or both).
     */
    function getIncomeCapMultiplier(address user) external view returns (uint256);
}
