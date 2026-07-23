// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title InterdependentReward
 * @notice Calculates and claims ROI only. Never stores income caps.
 * @dev All income recording and cap validation goes through IncomeManager.
 *
 * Rules:
 * - ROI funded only from ROI (interdependent) fund
 * - Max daily distribution budget: 5% of ROI pool
 * - Max user daily ROI rate: 1%
 * - Max ROI income: 3X package (enforced by IncomeManager)
 * - Once total income hits 3X, ROI stops (IncomeManager)
 */
contract InterdependentReward is ReentrancyGuard {
    address public owner;
    address public coreContract;

    IRankReward public rankReward;
    ITreasuryManager public treasury;
    IIncomeManager public incomeManager;

    uint256 public constant MAX_DAILY_ROI_BPS = 100; // 1%

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

    /**
     * @notice Activates or restarts ROI for a user's current package principal.
     */
    function activateRoi(address user, uint256 principal) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(principal > 0, "Invalid principal");

        RoiAccount storage account = roiAccounts[user];

        if (account.isActive && account.principal > 0) {
            totalActivePrincipal -= account.principal;
        }

        account.principal = principal;
        account.lastClaimAt = block.timestamp;
        account.isActive = true;

        totalActivePrincipal += principal;

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
        account.isActive = false;

        if (accountPrincipal > 0 && totalActivePrincipal >= accountPrincipal) {
            totalActivePrincipal -= accountPrincipal;
        } else {
            totalActivePrincipal = 0;
        }

        emit RoiDeactivated(user, accountPrincipal);
    }

    function calculateDailyRoiBps() public view returns (uint256) {
        if (totalActivePrincipal == 0 || address(treasury) == address(0)) {
            return 0;
        }

        uint256 availableDailyBudget = treasury.getAvailableDailyRoiBudget();
        if (availableDailyBudget == 0) {
            return 0;
        }

        uint256 roiBps = (availableDailyBudget * 10000) / totalActivePrincipal;

        if (roiBps > MAX_DAILY_ROI_BPS) {
            roiBps = MAX_DAILY_ROI_BPS;
        }

        return roiBps;
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

        uint256 currentDailyRoi = calculateDailyRoiBps();
        return (account.principal * currentDailyRoi * daysPassed) / 10000;
    }

    function claimRoi() external nonReentrant {
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");

        RoiAccount storage account = roiAccounts[msg.sender];
        require(account.isActive, "ROI not active");

        // Soft-stop if ROI cap already reached (working may still be open)
        if (incomeManager.isRoiCapReached(msg.sender)) {
            _deactivateLocal(account);
            revert("ROI cap reached");
        }

        _refreshDailyBudget();

        uint256 pendingRoi = getPendingRoi(msg.sender);
        require(pendingRoi > 0, "No ROI available");

        uint256 remainingDailyBudget = dailyBudget - dailyBudgetUsed;
        require(remainingDailyBudget > 0, "Daily ROI budget exhausted");

        uint256 payableRoi = pendingRoi;
        if (payableRoi > remainingDailyBudget) {
            payableRoi = remainingDailyBudget;
        }

        // Cap validation — IncomeManager is source of truth
        payableRoi = incomeManager.recordIncome(
            msg.sender,
            payableRoi,
            IIncomeManager.IncomeType.ROI
        );

        require(payableRoi > 0, "ROI cap reached");

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

        treasury.paySelfRoi(msg.sender, payableRoi);

        if (address(rankReward) != address(0)) {
            rankReward.processRoiIncome(msg.sender, payableRoi);
            // ROI is eligible income for Same Rank (10% of this accepted ROI slice)
            rankReward.processSameRankIncome(msg.sender, payableRoi);
        }

        if (account.isActive && incomeManager.isRoiCapReached(msg.sender)) {
            _deactivateLocal(account);
        }

        emit RoiClaimed(msg.sender, payableRoi);
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

    function _refreshDailyBudget() internal {
        uint256 currentDay = block.timestamp / 1 days;

        if (currentDay > budgetDay) {
            dailyBudget = treasury.getAvailableDailyRoiBudget();
            dailyBudgetUsed = 0;
            budgetDay = currentDay;
        }
    }

    function _deactivateLocal(RoiAccount storage account) internal {
        if (!account.isActive) {
            return;
        }

        account.isActive = false;

        if (account.principal > 0 && totalActivePrincipal >= account.principal) {
            totalActivePrincipal -= account.principal;
        } else {
            totalActivePrincipal = 0;
        }
    }
}
