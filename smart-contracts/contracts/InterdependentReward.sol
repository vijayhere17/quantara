// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title InterdependentReward
 * @notice Calculates and pays Self ROI from the ROI (interdependent) pool only.
 * @dev All income recording and cap validation goes through IncomeManager.
 *
 * Rules:
 * - ROI funded only from ROI (interdependent) wallet — never minted
 * - Daily distribution pool = **5% of current ROI wallet balance** (max outflow)
 *   Example: ROI pool $1000 → at most $50 may be paid that day
 * - That budget is shared **pro-rata by package principal**, but each user
 *   earns **at most 1% of their package per day**
 * - Any unused portion of the 5% stays in the ROI pool (never withdrawn)
 * - Total paid to all users in a day never exceeds that 5% cap
 *   (enforced via dailyBudget / dailyBudgetUsed)
 * - Max ROI income: 3X package (enforced by IncomeManager)
 * - Once total income hits 3X, ROI stops (IncomeManager)
 *
 * Distribution:
 * - Users may still call claimRoi() (pull)
 * - Owner/keeper may call distributeDailyRoi(start, limit) (push, paginated)
 * - Both paths share _processRoiPayment() — identical business rules
 */
contract InterdependentReward is ReentrancyGuard {
    address public owner;
    address public coreContract;

    IRankReward public rankReward;
    ITreasuryManager public treasury;
    IIncomeManager public incomeManager;

    /// @dev Max 1% of package per day per user. Daily pool is 5% of ROI wallet;
    ///      pro-rata share is capped at this rate — unused budget stays in pool.
    uint256 public constant MIN_DAILY_ROI_BPS = 0;
    uint256 public constant MAX_DAILY_ROI_BPS = 100; // 1.00%

    uint256 public dailyBudget;
    uint256 public dailyBudgetUsed;
    uint256 public totalActivePrincipal;
    uint256 public budgetDay;

    struct RoiAccount {
        uint256 principal;
        uint256 lastClaimAt;
        bool isActive;
    }

    mapping(address => RoiAccount) public roiAccounts;

    /// @notice Enumerable active ROI users for keeper pagination.
    address[] public activeRoiUsers;
    /// @dev 1-based index into activeRoiUsers; 0 means not in the list.
    mapping(address => uint256) public activeIndex;

    event CoreContractUpdated(address indexed coreContract);
    event RankRewardUpdated(address indexed rankReward);
    event TreasuryUpdated(address indexed treasury);
    event IncomeManagerUpdated(address indexed incomeManager);
    event RoiActivated(address indexed user, uint256 principal);
    event RoiDeactivated(address indexed user, uint256 principal);
    event RoiClaimed(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCoreContract(address _coreContract) external onlyOwner {
        require(_coreContract != address(0), "Invalid core contract");
        coreContract = _coreContract;
        emit CoreContractUpdated(_coreContract);
    }

    function setRankReward(address _rankReward) external onlyOwner {
        require(_rankReward != address(0), "Invalid rank reward");
        rankReward = IRankReward(_rankReward);
        emit RankRewardUpdated(_rankReward);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasuryManager(_treasury);
        emit TreasuryUpdated(_treasury);
    }

    function setIncomeManager(address _incomeManager) external onlyOwner {
        require(_incomeManager != address(0), "Invalid income manager");
        incomeManager = IIncomeManager(_incomeManager);
        emit IncomeManagerUpdated(_incomeManager);
    }

    function getActiveRoiUserCount() external view returns (uint256) {
        return activeRoiUsers.length;
    }

    /**
     * @notice Activates or restarts ROI for a user's current package principal.
     */
    function activateRoi(address user, uint256 principal) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(principal > 0, "Invalid principal");

        RoiAccount storage account = roiAccounts[user];
        bool wasActive = account.isActive;

        if (wasActive && account.principal > 0) {
            totalActivePrincipal -= account.principal;
        }

        account.principal = principal;
        account.lastClaimAt = block.timestamp;
        account.isActive = true;

        totalActivePrincipal += principal;

        if (!wasActive) {
            _addActiveRoiUser(user);
        }

        emit RoiActivated(user, principal);
    }

    /**
     * @notice Deactivates ROI when package completes (called by BTCPlanCore).
     */
    function deactivateRoi(address user) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");

        RoiAccount storage account = roiAccounts[user];
        if (!account.isActive) {
            return;
        }

        uint256 accountPrincipal = account.principal;
        _deactivateLocal(user);

        emit RoiDeactivated(user, accountPrincipal);
    }

    /**
     * @notice Effective daily ROI rate in basis points (pro-rata from 5% pool, max 1%).
     * @dev rawBps = (5% of ROI wallet) * 10000 / totalActivePrincipal
     *      capped at MAX_DAILY_ROI_BPS (100 = 1%). Unused pool share stays in wallet.
     */
    function calculateDailyRoiBps() public view returns (uint256) {
        if (totalActivePrincipal == 0 || address(treasury) == address(0)) {
            return 0;
        }

        uint256 availableDailyBudget = treasury.getAvailableDailyRoiBudget();
        if (availableDailyBudget == 0) {
            return 0;
        }

        uint256 rawBps = (availableDailyBudget * 10000) / totalActivePrincipal;
        if (rawBps > MAX_DAILY_ROI_BPS) {
            return MAX_DAILY_ROI_BPS;
        }
        return rawBps;
    }

    /**
     * @notice One day's Self ROI for a user: pro-rata 5% pool share, capped at 1% of package.
     */
    function getUserDailyRoiShare(address user) public view returns (uint256) {
        RoiAccount memory account = roiAccounts[user];
        if (!account.isActive || account.principal == 0 || totalActivePrincipal == 0) {
            return 0;
        }
        if (address(treasury) == address(0)) {
            return 0;
        }
        uint256 availableDailyBudget = treasury.getAvailableDailyRoiBudget();
        uint256 proRata = (availableDailyBudget * account.principal) /
            totalActivePrincipal;
        uint256 maxPerDay = (account.principal * MAX_DAILY_ROI_BPS) / 10000;
        return proRata < maxPerDay ? proRata : maxPerDay;
    }

    function getPendingRoi(address user) public view returns (uint256) {
        RoiAccount memory account = roiAccounts[user];
        if (!account.isActive) {
            return 0;
        }

        uint256 daysPassed = (block.timestamp - account.lastClaimAt) / 1 days;
        if (daysPassed == 0) {
            return 0;
        }

        // Same formula as getUserDailyRoiShare × days (avoids BPS rounding drift)
        return getUserDailyRoiShare(user) * daysPassed;
    }

    /**
     * @notice User pull-claim. Same ROI rules as distributeDailyRoi via _processRoiPayment.
     */
    function claimRoi() external nonReentrant {
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");

        RoiAccount storage account = roiAccounts[msg.sender];
        require(account.isActive, "ROI not active");

        // Soft-stop if ROI cap already reached (working may still be open)
        if (incomeManager.isRoiCapReached(msg.sender)) {
            _deactivateLocal(msg.sender);
            revert("ROI cap reached");
        }

        _refreshDailyBudget();

        uint256 pendingRoi = getPendingRoi(msg.sender);
        require(pendingRoi > 0, "No ROI available");

        uint256 remainingDailyBudget = dailyBudget - dailyBudgetUsed;
        require(remainingDailyBudget > 0, "Daily ROI budget exhausted");

        uint256 payableRoi = _processRoiPayment(msg.sender);
        require(payableRoi > 0, "ROI cap reached");
    }

    /**
     * @notice Owner/keeper push-distribution over a page of active ROI users.
     * @dev Call repeatedly with start += limit until start >= getActiveRoiUserCount().
     *      Refreshes the daily budget once per call. Stops early if daily budget is exhausted.
     * @return processed Number of list slots visited
     * @return paidCount Number of users who received a payout
     * @return totalPaid Sum of ROI paid in this batch
     */
    function distributeDailyRoi(
        uint256 start,
        uint256 limit
    )
        external
        onlyOwner
        nonReentrant
        returns (uint256 processed, uint256 paidCount, uint256 totalPaid)
    {
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");
        require(limit > 0, "Invalid limit");

        _refreshDailyBudget();

        uint256 len = activeRoiUsers.length;
        if (start >= len) {
            return (0, 0, 0);
        }

        uint256 end = start + limit;
        if (end > len) {
            end = len;
        }

        uint256 i = start;
        while (i < end && i < activeRoiUsers.length) {
            if (dailyBudgetUsed >= dailyBudget) {
                break;
            }

            address user = activeRoiUsers[i];
            uint256 lenBefore = activeRoiUsers.length;
            processed++;

            uint256 paid = _processRoiPayment(user);
            if (paid > 0) {
                paidCount++;
                totalPaid += paid;
            }

            // If this user was deactivated, swap-and-pop placed a new address at `i`.
            // Process that slot again; shrink `end` if the array shortened.
            if (activeRoiUsers.length < lenBefore) {
                if (end > activeRoiUsers.length) {
                    end = activeRoiUsers.length;
                }
            } else {
                unchecked {
                    i++;
                }
            }
        }
    }

    function getRemainingDailyBudget() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;

        if (currentDay > budgetDay) {
            if (address(treasury) == address(0)) {
                return 0;
            }
            return treasury.getAvailableDailyRoiBudget();
        }

        return dailyBudget - dailyBudgetUsed;
    }

    /**
     * @dev Shared ROI payout path used by claimRoi and distributeDailyRoi.
     *      Caller must refresh the daily budget first.
     *      Returns 0 when the user should be skipped (inactive / no pending / budget / cap).
     *      Preserves the exact calculation, budget, treasury, rank, and event rules from claimRoi.
     */
    function _processRoiPayment(address user) internal returns (uint256 payableRoi) {
        RoiAccount storage account = roiAccounts[user];
        if (!account.isActive) {
            return 0;
        }

        if (incomeManager.isRoiCapReached(user)) {
            _deactivateLocal(user);
            return 0;
        }

        uint256 pendingRoi = getPendingRoi(user);
        if (pendingRoi == 0) {
            return 0;
        }

        uint256 remainingDailyBudget = dailyBudget - dailyBudgetUsed;
        if (remainingDailyBudget == 0) {
            return 0;
        }

        payableRoi = pendingRoi;
        if (payableRoi > remainingDailyBudget) {
            payableRoi = remainingDailyBudget;
        }

        // Cap validation — IncomeManager is source of truth
        payableRoi = incomeManager.recordIncome(
            user,
            payableRoi,
            IIncomeManager.IncomeType.ROI
        );

        if (payableRoi == 0) {
            return 0;
        }

        dailyBudgetUsed += payableRoi;

        // Preserve unpaid accrued days when only a partial daily-budget payout is made.
        if (payableRoi >= pendingRoi) {
            account.lastClaimAt = block.timestamp;
        } else {
            uint256 daysPassed = (block.timestamp - account.lastClaimAt) / 1 days;
            uint256 secondsPaid = (payableRoi * daysPassed * 1 days) / pendingRoi;
            if (secondsPaid == 0) {
                secondsPaid = 1;
            }
            account.lastClaimAt += secondsPaid;
            if (account.lastClaimAt > block.timestamp) {
                account.lastClaimAt = block.timestamp;
            }
        }

        treasury.paySelfRoi(user, payableRoi);

        if (address(rankReward) != address(0)) {
            rankReward.processRoiIncome(user, payableRoi);
        }

        if (account.isActive && incomeManager.isRoiCapReached(user)) {
            _deactivateLocal(user);
        }

        emit RoiClaimed(user, payableRoi);
    }

    function _refreshDailyBudget() internal {
        uint256 currentDay = block.timestamp / 1 days;

        if (currentDay > budgetDay) {
            dailyBudget = treasury.getAvailableDailyRoiBudget();
            dailyBudgetUsed = 0;
            budgetDay = currentDay;
        }
    }

    function _deactivateLocal(address user) internal {
        RoiAccount storage account = roiAccounts[user];
        if (!account.isActive) {
            return;
        }

        account.isActive = false;

        if (account.principal > 0 && totalActivePrincipal >= account.principal) {
            totalActivePrincipal -= account.principal;
        } else {
            totalActivePrincipal = 0;
        }

        _removeActiveRoiUser(user);
    }

    function _addActiveRoiUser(address user) internal {
        if (activeIndex[user] != 0) {
            return;
        }
        activeRoiUsers.push(user);
        activeIndex[user] = activeRoiUsers.length; // 1-based
    }

    function _removeActiveRoiUser(address user) internal {
        uint256 index = activeIndex[user];
        if (index == 0) {
            return;
        }

        uint256 lastIndex = activeRoiUsers.length;
        if (index != lastIndex) {
            address lastUser = activeRoiUsers[lastIndex - 1];
            activeRoiUsers[index - 1] = lastUser;
            activeIndex[lastUser] = index;
        }

        activeRoiUsers.pop();
        activeIndex[user] = 0;
    }
}
