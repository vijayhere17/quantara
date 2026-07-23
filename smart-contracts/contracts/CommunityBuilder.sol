// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title CommunityBuilder
 * @notice Point-based community fund distribution for Q5–Q8 ranks.
 * @dev Records community income via IncomeManager; pays via TreasuryManager community fund.
 */
contract CommunityBuilder {
    address public owner;
    address public rankRewardContract;

    ITreasuryManager public treasury;
    IIncomeManager public incomeManager;
    IRankReward public rankReward;

    mapping(address => uint256) public userPoints;
    mapping(address => uint256) public communityIncome;

    uint256 public totalPoints;
    uint256 public currentRound;

    struct DistributionRound {
        uint256 fundAmount;
        uint256 totalPoints;
        uint256 rewardPerPoint;
        uint256 totalPaid;
        uint256 startedAt;
        bool isActive;
    }

    mapping(uint256 => DistributionRound) public distributionRounds;
    mapping(uint256 => mapping(address => bool)) public roundClaimed;
    mapping(uint256 => mapping(address => uint256)) public roundUserPoints;

    address[] public eligibleUsers;
    mapping(address => bool) public isEligibleUser;

    event RankRewardContractUpdated(address indexed rankRewardContract);
    event IncomeManagerUpdated(address indexed incomeManager);
    event UserPointsUpdated(address indexed user, uint256 oldPoints, uint256 newPoints);
    event DistributionRoundStarted(
        uint256 indexed roundId,
        uint256 fundAmount,
        uint256 totalPoints,
        uint256 rewardPerPoint
    );
    event CommunityRewardClaimed(
        address indexed user,
        uint256 indexed roundId,
        uint256 amount
    );
    event DistributionRoundClosed(uint256 indexed roundId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        owner = msg.sender;
        treasury = ITreasuryManager(_treasury);
    }

    function setRankRewardContract(address _rankRewardContract) external onlyOwner {
        require(_rankRewardContract != address(0), "Invalid rank contract");
        rankRewardContract = _rankRewardContract;
        rankReward = IRankReward(_rankRewardContract);
        emit RankRewardContractUpdated(_rankRewardContract);
    }

    function setIncomeManager(address _incomeManager) external onlyOwner {
        require(_incomeManager != address(0), "Invalid income manager");
        incomeManager = IIncomeManager(_incomeManager);
        emit IncomeManagerUpdated(_incomeManager);
    }

    function updateUserPoints(address user, uint256 points) external {
        require(msg.sender == rankRewardContract, "Only rank contract");
        require(user != address(0), "Invalid user");
        require(points <= 4, "Invalid points");

        uint256 oldPoints = userPoints[user];
        if (oldPoints == points) {
            return;
        }

        totalPoints = totalPoints - oldPoints + points;
        userPoints[user] = points;

        if (points > 0 && !isEligibleUser[user]) {
            isEligibleUser[user] = true;
            eligibleUsers.push(user);
        }

        emit UserPointsUpdated(user, oldPoints, points);
    }

    function startDistributionRound() external onlyOwner {
        if (currentRound > 0) {
            require(!distributionRounds[currentRound].isActive, "Current round active");
        }

        require(totalPoints > 0, "No community points");

        uint256 fundAmount = treasury.communityBuilderFundBalance();
        require(fundAmount > 0, "No community fund");

        currentRound += 1;

        uint256 rewardPerPoint = fundAmount / totalPoints;

        distributionRounds[currentRound] = DistributionRound({
            fundAmount: fundAmount,
            totalPoints: totalPoints,
            rewardPerPoint: rewardPerPoint,
            totalPaid: 0,
            startedAt: block.timestamp,
            isActive: true
        });

        for (uint256 i = 0; i < eligibleUsers.length; i++) {
            address user = eligibleUsers[i];
            roundUserPoints[currentRound][user] = userPoints[user];
        }

        emit DistributionRoundStarted(
            currentRound,
            fundAmount,
            totalPoints,
            rewardPerPoint
        );
    }

    function getPendingReward(address user) public view returns (uint256) {
        if (currentRound == 0) {
            return 0;
        }

        DistributionRound memory round = distributionRounds[currentRound];
        if (!round.isActive) {
            return 0;
        }
        if (roundClaimed[currentRound][user]) {
            return 0;
        }

        uint256 points = roundUserPoints[currentRound][user];
        if (points == 0) {
            return 0;
        }

        return points * round.rewardPerPoint;
    }

    function claimCommunityReward() external {
        require(currentRound > 0, "No distribution round");
        require(address(incomeManager) != address(0), "Income manager not set");

        uint256 reward = getPendingReward(msg.sender);
        require(reward > 0, "No community reward");

        uint256 acceptedAmount = incomeManager.recordIncome(
            msg.sender,
            reward,
            IIncomeManager.IncomeType.Community
        );
        require(acceptedAmount > 0, "Income cap reached");

        roundClaimed[currentRound][msg.sender] = true;
        communityIncome[msg.sender] += acceptedAmount;

        DistributionRound storage round = distributionRounds[currentRound];
        round.totalPaid += acceptedAmount;

        treasury.payCommunityBuilder(msg.sender, acceptedAmount);

        // Community is eligible income for Same Rank bonus
        if (address(rankReward) != address(0)) {
            rankReward.processSameRankIncome(msg.sender, acceptedAmount);
        }

        emit CommunityRewardClaimed(msg.sender, currentRound, acceptedAmount);
    }

    function closeDistributionRound() external onlyOwner {
        require(currentRound > 0, "No distribution round");

        DistributionRound storage round = distributionRounds[currentRound];
        require(round.isActive, "Round not active");

        round.isActive = false;
        emit DistributionRoundClosed(currentRound);
    }

    function getEligibleUsersCount() external view returns (uint256) {
        return eligibleUsers.length;
    }
}
