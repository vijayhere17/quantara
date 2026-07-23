// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IBTCPlanCore} from "./interfaces/IBTCPlanCore.sol";
import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";

/**
 * @title IncomeManager
 * @notice Single source of truth for user income tracking and independent caps.
 *
 * Independent caps (per active package principal):
 * - ROI cap:     3X principal  (ROI only)
 * - Working cap: 4X principal  (Contribution + Booster + Rank + SameRank + Community)
 *
 * ROI does NOT reduce Working capacity and Working does NOT reduce ROI capacity.
 *
 * Progression unlock (packageCompleted):
 * - Triggered when ROI cap is hit OR Working cap is hit (whichever first).
 * - The other stream may continue until its own cap is hit or the user activates
 *   the next package (startPackage resets both windows).
 *
 * Final income shutdown (packageActive = false):
 * - When BOTH caps are exhausted.
 *
 * Rank multipliers (Q3=5X / Q5=6X / Q7=7X):
 * Exposed by RankReward.getIncomeCapMultiplier(). NOT applied to caps while
 * applyRankCapMultipliers == false. BUSINESS CLARIFICATION REQUIRED before enable:
 * do multipliers scale ROI cap, Working cap, or both?
 */
contract IncomeManager is IIncomeManager {
    address public owner;
    IBTCPlanCore public coreContract;
    IRankReward public rankReward;

    mapping(address => bool) public authorizedContracts;

    struct UserIncome {
        uint256 principal;
        uint256 roiEarned;
        uint256 contributionEarned;
        uint256 boosterEarned;
        uint256 rankEarned;
        uint256 sameRankEarned;
        uint256 communityEarned;
        uint256 totalEarned;
        bool packageActive;
    }

    mapping(address => UserIncome) public incomes;

    uint256 public constant ROI_CAP_MULTIPLIER = 3;
    uint256 public constant WORKING_CAP_MULTIPLIER = 4;

    /// @dev Keep false until business clarifies multiplier target (ROI / Working / both).
    bool public applyRankCapMultipliers = false;

    event AuthorizedContractUpdated(address indexed contractAddress, bool status);
    event CoreContractUpdated(address indexed coreContract);
    event RankRewardUpdated(address indexed rankReward);
    event ApplyRankCapMultipliersUpdated(bool enabled);
    event PackageStarted(address indexed user, uint256 principal);
    event IncomeRecorded(
        address indexed user,
        IncomeType indexed incomeType,
        uint256 requested,
        uint256 accepted,
        uint256 totalEarned
    );
    event RoiCapReached(address indexed user, uint256 roiEarned);
    event WorkingCapReached(address indexed user, uint256 workingEarned);
    event PackageIncomeCompleted(address indexed user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCoreContract(address _coreContract) external onlyOwner {
        require(_coreContract != address(0), "Invalid core");
        coreContract = IBTCPlanCore(_coreContract);
        emit CoreContractUpdated(_coreContract);
    }

    function setRankReward(address _rankReward) external onlyOwner {
        require(_rankReward != address(0), "Invalid rank reward");
        rankReward = IRankReward(_rankReward);
        emit RankRewardUpdated(_rankReward);
    }

    function setApplyRankCapMultipliers(bool enabled) external onlyOwner {
        applyRankCapMultipliers = enabled;
        emit ApplyRankCapMultipliersUpdated(enabled);
    }

    function setAuthorizedContract(
        address contractAddress,
        bool status
    ) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract");
        authorizedContracts[contractAddress] = status;
        emit AuthorizedContractUpdated(contractAddress, status);
    }

    function startPackage(
        address user,
        uint256 packagePrincipal
    ) external onlyAuthorized {
        require(user != address(0), "Invalid user");
        require(packagePrincipal > 0, "Invalid principal");

        incomes[user] = UserIncome({
            principal: packagePrincipal,
            roiEarned: 0,
            contributionEarned: 0,
            boosterEarned: 0,
            rankEarned: 0,
            sameRankEarned: 0,
            communityEarned: 0,
            totalEarned: 0,
            packageActive: true
        });

        emit PackageStarted(user, packagePrincipal);
    }

    function recordIncome(
        address user,
        uint256 amount,
        IncomeType incomeType
    ) external onlyAuthorized returns (uint256 acceptedAmount) {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");

        UserIncome storage income = incomes[user];

        if (!income.packageActive || income.principal == 0) {
            emit IncomeRecorded(user, incomeType, amount, 0, income.totalEarned);
            return 0;
        }

        bool isRoi = incomeType == IncomeType.ROI;
        bool isWorking = incomeType == IncomeType.Contribution
            || incomeType == IncomeType.Booster
            || incomeType == IncomeType.Rank
            || incomeType == IncomeType.SameRank
            || incomeType == IncomeType.Community;

        require(isRoi || isWorking, "Invalid income type");

        acceptedAmount = amount;

        if (isRoi) {
            uint256 remainingRoi = _remainingRoiCap(user, income);
            if (remainingRoi == 0) {
                emit IncomeRecorded(user, incomeType, amount, 0, income.totalEarned);
                return 0;
            }
            if (acceptedAmount > remainingRoi) {
                acceptedAmount = remainingRoi;
            }
        } else {
            uint256 remainingWorking = _remainingWorkingCap(income);
            if (remainingWorking == 0) {
                emit IncomeRecorded(user, incomeType, amount, 0, income.totalEarned);
                return 0;
            }
            if (acceptedAmount > remainingWorking) {
                acceptedAmount = remainingWorking;
            }
        }

        if (acceptedAmount == 0) {
            emit IncomeRecorded(user, incomeType, amount, 0, income.totalEarned);
            return 0;
        }

        if (incomeType == IncomeType.ROI) {
            income.roiEarned += acceptedAmount;
        } else if (incomeType == IncomeType.Contribution) {
            income.contributionEarned += acceptedAmount;
        } else if (incomeType == IncomeType.Booster) {
            income.boosterEarned += acceptedAmount;
        } else if (incomeType == IncomeType.Rank) {
            income.rankEarned += acceptedAmount;
        } else if (incomeType == IncomeType.SameRank) {
            income.sameRankEarned += acceptedAmount;
        } else {
            income.communityEarned += acceptedAmount;
        }

        income.totalEarned += acceptedAmount;

        emit IncomeRecorded(
            user,
            incomeType,
            amount,
            acceptedAmount,
            income.totalEarned
        );

        _notifyCapsIfNeeded(user, income, isRoi, isWorking);

        return acceptedAmount;
    }

    function getRoiCap(address user) public view returns (uint256) {
        return incomes[user].principal * _roiMultiplier(user);
    }

    function getWorkingCap(address user) public view returns (uint256) {
        return incomes[user].principal * WORKING_CAP_MULTIPLIER;
    }

    function getRemainingRoiCap(address user) public view returns (uint256) {
        return _remainingRoiCap(user, incomes[user]);
    }

    function getRemainingWorkingCap(address user) public view returns (uint256) {
        return _remainingWorkingCap(incomes[user]);
    }

    function isRoiCapReached(address user) external view returns (bool) {
        return incomes[user].principal > 0
            && _remainingRoiCap(user, incomes[user]) == 0;
    }

    function isWorkingCapReached(address user) external view returns (bool) {
        return incomes[user].principal > 0
            && _remainingWorkingCap(incomes[user]) == 0;
    }

    function isPackageIncomeComplete(address user) public view returns (bool) {
        UserIncome memory income = incomes[user];
        if (income.principal == 0 || !income.packageActive) {
            return false;
        }
        return _remainingRoiCap(user, income) == 0
            && _remainingWorkingCap(income) == 0;
    }

    function principal(address user) external view returns (uint256) {
        return incomes[user].principal;
    }

    function roiEarned(address user) external view returns (uint256) {
        return incomes[user].roiEarned;
    }

    function contributionEarned(address user) external view returns (uint256) {
        return incomes[user].contributionEarned;
    }

    function boosterEarned(address user) external view returns (uint256) {
        return incomes[user].boosterEarned;
    }

    function rankEarned(address user) external view returns (uint256) {
        return incomes[user].rankEarned;
    }

    function sameRankEarned(address user) external view returns (uint256) {
        return incomes[user].sameRankEarned;
    }

    function communityEarned(address user) external view returns (uint256) {
        return incomes[user].communityEarned;
    }

    function totalEarned(address user) external view returns (uint256) {
        return incomes[user].totalEarned;
    }

    function workingEarned(address user) public view returns (uint256) {
        return _workingEarnedAmount(incomes[user]);
    }

    function _workingEarnedAmount(
        UserIncome memory income
    ) internal pure returns (uint256) {
        return income.contributionEarned
            + income.boosterEarned
            + income.rankEarned
            + income.sameRankEarned
            + income.communityEarned;
    }

    function _roiMultiplier(address user) internal view returns (uint256) {
        if (applyRankCapMultipliers && address(rankReward) != address(0)) {
            return rankReward.getIncomeCapMultiplier(user);
        }
        return ROI_CAP_MULTIPLIER;
    }

    function _remainingRoiCap(
        address user,
        UserIncome memory income
    ) internal view returns (uint256) {
        uint256 cap = income.principal * _roiMultiplier(user);
        if (income.roiEarned >= cap) {
            return 0;
        }
        return cap - income.roiEarned;
    }

    function _remainingWorkingCap(
        UserIncome memory income
    ) internal pure returns (uint256) {
        uint256 cap = income.principal * WORKING_CAP_MULTIPLIER;
        uint256 earned = income.contributionEarned
            + income.boosterEarned
            + income.rankEarned
            + income.sameRankEarned
            + income.communityEarned;
        if (earned >= cap) {
            return 0;
        }
        return cap - earned;
    }

    function _notifyCapsIfNeeded(
        address user,
        UserIncome storage income,
        bool recordedRoi,
        bool recordedWorking
    ) internal {
        bool roiDone = _remainingRoiCap(user, income) == 0;
        bool workingDone = _remainingWorkingCap(income) == 0;

        bool needsCore = (recordedRoi && roiDone)
            || (recordedWorking && workingDone)
            || (roiDone && workingDone);

        if (needsCore) {
            require(address(coreContract) != address(0), "Core not set");
        }

        // Notify only on the transition caused by this record.
        if (recordedRoi && roiDone) {
            emit RoiCapReached(user, income.roiEarned);
            coreContract.onRoiCapReached(user);
        }

        if (recordedWorking && workingDone) {
            emit WorkingCapReached(user, _workingEarnedAmount(income));
            coreContract.onWorkingCapReached(user);
        }

        if (roiDone && workingDone) {
            income.packageActive = false;
            emit PackageIncomeCompleted(user);
            coreContract.completePackage(user);
        }
    }
}
