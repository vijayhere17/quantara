// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title ContributionBooster
 * @notice Extra direct-contribution booster for qualified sponsors.
 * @dev Qualifies by activating $1000 or $3000 within 30 days of joining.
 *      Booster pays 10% direct reward on direct contributions for 30 days.
 *      Caps enforced only via IncomeManager (Working 4X).
 */
contract ContributionBooster {
    address public owner;
    address public coreContract;

    IIncomeManager public incomeManager;
    ITreasuryManager public treasury;
    IRankReward public rankReward;

    uint256 public constant BOOSTER_REWARD_BPS = 1000; // 10% Direct Reward
    uint256 public constant QUALIFICATION_PERIOD = 30 days;
    uint256 public constant BOOSTER_PERIOD = 30 days;

    struct BoosterAccount {
        uint256 joinedAt;
        uint256 boosterActivatedAt;
        uint256 boosterExpiresAt;
        uint256 boosterIncome;
        bool qualified;
    }

    mapping(address => BoosterAccount) public boosterAccounts;
    mapping(address => address) public sponsors;

    event CoreContractUpdated(address indexed coreContract);
    event IncomeManagerUpdated(address indexed incomeManager);
    event TreasuryUpdated(address indexed treasury);
    event RankRewardUpdated(address indexed rankReward);
    event UserRegistered(address indexed user, address indexed sponsor);
    event BoosterQualified(address indexed user, uint256 expiresAt);
    event BoosterRewardPaid(
        address indexed sponsor,
        address indexed fromUser,
        uint256 amount
    );

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

    function setIncomeManager(address _incomeManager) external onlyOwner {
        require(_incomeManager != address(0), "Invalid income manager");
        incomeManager = IIncomeManager(_incomeManager);
        emit IncomeManagerUpdated(_incomeManager);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasuryManager(_treasury);
        emit TreasuryUpdated(_treasury);
    }

    function setRankReward(address _rankReward) external onlyOwner {
        require(_rankReward != address(0), "Invalid rank reward");
        rankReward = IRankReward(_rankReward);
        emit RankRewardUpdated(_rankReward);
    }

    function registerUser(address user, address sponsor) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(boosterAccounts[user].joinedAt == 0, "User already registered");

        boosterAccounts[user].joinedAt = block.timestamp;
        sponsors[user] = sponsor;

        emit UserRegistered(user, sponsor);
    }

    function processPackage(address user, uint256 packageAmount) external {
        require(msg.sender == coreContract, "Only core contract");

        BoosterAccount storage account = boosterAccounts[user];
        require(account.joinedAt > 0, "User not registered");

        if (account.qualified) {
            return;
        }

        if (block.timestamp > account.joinedAt + QUALIFICATION_PERIOD) {
            return;
        }

        if (packageAmount == 1000 || packageAmount == 3000) {
            account.qualified = true;
            account.boosterActivatedAt = block.timestamp;
            account.boosterExpiresAt = block.timestamp + BOOSTER_PERIOD;

            emit BoosterQualified(user, account.boosterExpiresAt);
        }
    }

    function processDirectContribution(
        address user,
        uint256 contributionAmount
    ) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(contributionAmount > 0, "Invalid contribution");
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");

        address sponsor = sponsors[user];
        if (sponsor == address(0)) {
            return;
        }

        BoosterAccount storage sponsorAccount = boosterAccounts[sponsor];

        if (!sponsorAccount.qualified) {
            return;
        }

        if (block.timestamp > sponsorAccount.boosterExpiresAt) {
            return;
        }

        uint256 rewardAmount =
            (contributionAmount * BOOSTER_REWARD_BPS) / 10000;
        if (rewardAmount == 0) {
            return;
        }

        uint256 available = treasury.workingFundBalance();
        if (available == 0) {
            return;
        }
        if (rewardAmount > available) {
            rewardAmount = available;
        }

        uint256 acceptedAmount = incomeManager.recordIncome(
            sponsor,
            rewardAmount,
            IIncomeManager.IncomeType.Booster
        );

        if (acceptedAmount == 0) {
            return;
        }

        treasury.payWorkingIncome(sponsor, acceptedAmount);
        sponsorAccount.boosterIncome += acceptedAmount;

        emit BoosterRewardPaid(sponsor, user, acceptedAmount);

        // Booster is eligible income for Same Rank bonus
        if (address(rankReward) != address(0)) {
            rankReward.processSameRankIncome(sponsor, acceptedAmount);
        }
    }

    function isBoosterActive(address user) external view returns (bool) {
        BoosterAccount memory account = boosterAccounts[user];
        return account.qualified && block.timestamp <= account.boosterExpiresAt;
    }
}
