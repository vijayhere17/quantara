// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title ContributionReward
 * @notice Calculates 3-level contribution rewards. Does not enforce caps.
 * @dev Records income via IncomeManager and pays from working fund via TreasuryManager.
 *
 * Levels: L1 5%, L2 3%, L3 2%
 */
contract ContributionReward {
    address public owner;
    address public coreContract;

    IIncomeManager public incomeManager;
    ITreasuryManager public treasury;
    IRankReward public rankReward;

    uint256 public constant LEVEL_1_BPS = 500; // 5%
    uint256 public constant LEVEL_2_BPS = 300; // 3%
    uint256 public constant LEVEL_3_BPS = 200; // 2%

    mapping(address => address) public sponsors;
    mapping(address => uint256) public contributionIncome;
    mapping(address => mapping(uint256 => uint256)) public levelIncome;

    event CoreContractUpdated(address indexed coreContract);
    event IncomeManagerUpdated(address indexed incomeManager);
    event TreasuryUpdated(address indexed treasury);
    event RankRewardUpdated(address indexed rankReward);
    event SponsorSet(address indexed user, address indexed sponsor);
    event ContributionRewardPaid(
        address indexed beneficiary,
        address indexed fromUser,
        uint256 level,
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

    function setSponsor(address user, address sponsor) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(sponsors[user] == address(0), "Sponsor already set");

        sponsors[user] = sponsor;
        emit SponsorSet(user, sponsor);
    }

    function processContribution(address user, uint256 amount) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");

        address currentSponsor = sponsors[user];

        uint256[3] memory rewardBps = [LEVEL_1_BPS, LEVEL_2_BPS, LEVEL_3_BPS];

        for (uint256 level = 1; level <= 3; level++) {
            if (currentSponsor == address(0)) {
                break;
            }

            uint256 rewardAmount = (amount * rewardBps[level - 1]) / 10000;
            if (rewardAmount == 0) {
                currentSponsor = sponsors[currentSponsor];
                continue;
            }

            // Cap to available working fund so we never overdraw
            uint256 available = treasury.workingFundBalance();
            if (available == 0) {
                break;
            }
            if (rewardAmount > available) {
                rewardAmount = available;
            }

            uint256 acceptedAmount = incomeManager.recordIncome(
                currentSponsor,
                rewardAmount,
                IIncomeManager.IncomeType.Contribution
            );

            if (acceptedAmount > 0) {
                treasury.payWorkingIncome(currentSponsor, acceptedAmount);

                contributionIncome[currentSponsor] += acceptedAmount;
                levelIncome[currentSponsor][level] += acceptedAmount;

                emit ContributionRewardPaid(
                    currentSponsor,
                    user,
                    level,
                    acceptedAmount
                );

                // Contribution is eligible income for Same Rank bonus
                if (address(rankReward) != address(0)) {
                    rankReward.processSameRankIncome(
                        currentSponsor,
                        acceptedAmount
                    );
                }
            }

            currentSponsor = sponsors[currentSponsor];
        }
    }
}
