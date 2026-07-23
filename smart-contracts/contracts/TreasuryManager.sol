// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasuryManager
 * @notice Handles all treasury fund accounting and payouts.
 *
 * Activation distribution:
 * - 25% ROI Fund (interdependent)
 * - 3%  Reserve
 * - 2%  Community Builder
 * - 70% Working Pool → split into 65% working + 5% charity (of total)
 */
contract TreasuryManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public btcbToken;

    address public owner;
    address public coreContract;
    address public rewardContract;
    address public communityBuilderContract;
    address public charityWallet;

    mapping(address => bool) public workingPayers;

    uint256 public interdependentFundBalance;
    uint256 public reserveFundBalance;
    uint256 public communityBuilderFundBalance;
    uint256 public charityFundBalance;
    uint256 public workingFundBalance;

    uint256 public totalSelfRoiPaid;
    uint256 public totalWorkingIncomePaid;
    uint256 public totalCommunityPaid;
    uint256 public totalCharityPaid;

    uint256 public constant INTERDEPENDENT_BPS = 2500; // 25% ROI Fund
    uint256 public constant RESERVE_BPS = 300; // 3%
    uint256 public constant COMMUNITY_BPS = 200; // 2%
    uint256 public constant WORKING_BPS = 6500; // 65%
    uint256 public constant CHARITY_BPS = 500; // 5%
    // 2500 + 300 + 200 + 6500 + 500 = 10000

    event CoreContractUpdated(address indexed coreContract);
    event RewardContractUpdated(address indexed rewardContract);
    event CommunityBuilderUpdated(address indexed communityBuilder);
    event CharityWalletUpdated(address indexed charityWallet);
    event WorkingPayerUpdated(address indexed payer, bool status);
    event ContributionProcessed(
        uint256 amount,
        uint256 interdependentAmount,
        uint256 reserveAmount,
        uint256 communityAmount,
        uint256 charityAmount,
        uint256 workingAmount
    );
    event SelfRoiPaid(address indexed user, uint256 amount);
    event WorkingIncomePaid(address indexed user, uint256 amount);
    event CommunityBuilderPaid(address indexed user, uint256 amount);
    event CharityFundsTransferred(address indexed wallet, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _btcbToken) {
        require(_btcbToken != address(0), "Invalid BTCB token");
        owner = msg.sender;
        btcbToken = IERC20(_btcbToken);
    }

    function setCoreContract(address _coreContract) external onlyOwner {
        require(_coreContract != address(0), "Invalid core contract");
        coreContract = _coreContract;
        emit CoreContractUpdated(_coreContract);
    }

    function setRewardContract(address _rewardContract) external onlyOwner {
        require(_rewardContract != address(0), "Invalid reward contract");
        rewardContract = _rewardContract;
        emit RewardContractUpdated(_rewardContract);
    }

    function setCommunityBuilderContract(
        address _communityBuilderContract
    ) external onlyOwner {
        require(_communityBuilderContract != address(0), "Invalid community builder");
        communityBuilderContract = _communityBuilderContract;
        emit CommunityBuilderUpdated(_communityBuilderContract);
    }

    function setCharityWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        charityWallet = _wallet;
        emit CharityWalletUpdated(_wallet);
    }

    function setWorkingPayer(address payer, bool status) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        workingPayers[payer] = status;
        emit WorkingPayerUpdated(payer, status);
    }

    function processContribution(uint256 amount) external {
        require(msg.sender == coreContract, "Only core contract");
        require(amount > 0, "Invalid amount");

        // Exact basis-point splits (not derived from a residual "70% pool").
        uint256 interdependentAmount = (amount * INTERDEPENDENT_BPS) / 10000;
        uint256 reserveAmount = (amount * RESERVE_BPS) / 10000;
        uint256 communityAmount = (amount * COMMUNITY_BPS) / 10000;
        uint256 workingAmount = (amount * WORKING_BPS) / 10000;
        uint256 charityAmount = (amount * CHARITY_BPS) / 10000;

        // Any wei lost to flooring is assigned to Working so buckets sum to `amount`.
        uint256 distributed = interdependentAmount
            + reserveAmount
            + communityAmount
            + workingAmount
            + charityAmount;
        if (distributed < amount) {
            workingAmount += amount - distributed;
        }

        interdependentFundBalance += interdependentAmount;
        reserveFundBalance += reserveAmount;
        communityBuilderFundBalance += communityAmount;
        charityFundBalance += charityAmount;
        workingFundBalance += workingAmount;

        emit ContributionProcessed(
            amount,
            interdependentAmount,
            reserveAmount,
            communityAmount,
            charityAmount,
            workingAmount
        );
    }

    function getAvailableDailyRoiBudget() external view returns (uint256) {
        return (interdependentFundBalance * 5) / 100;
    }

    function paySelfRoi(
        address user,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == rewardContract, "Only reward contract");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(
            interdependentFundBalance >= amount,
            "Insufficient interdependent fund"
        );

        interdependentFundBalance -= amount;
        totalSelfRoiPaid += amount;

        btcbToken.safeTransfer(user, amount);

        emit SelfRoiPaid(user, amount);
    }

    /**
     * @notice Pays working-pool income (contribution / booster / rank).
     */
    function payWorkingIncome(
        address user,
        uint256 amount
    ) external nonReentrant {
        require(workingPayers[msg.sender], "Not authorized working payer");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(workingFundBalance >= amount, "Insufficient working fund");

        workingFundBalance -= amount;
        totalWorkingIncomePaid += amount;

        btcbToken.safeTransfer(user, amount);

        emit WorkingIncomePaid(user, amount);
    }

    function payCommunityBuilder(
        address user,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == communityBuilderContract, "Only community builder");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(
            communityBuilderFundBalance >= amount,
            "Insufficient community fund"
        );

        communityBuilderFundBalance -= amount;
        totalCommunityPaid += amount;

        btcbToken.safeTransfer(user, amount);

        emit CommunityBuilderPaid(user, amount);
    }

    function transferCharityFunds(uint256 amount) external onlyOwner nonReentrant {
        require(charityWallet != address(0), "Charity wallet not set");
        require(charityFundBalance >= amount, "Insufficient charity fund");

        charityFundBalance -= amount;
        totalCharityPaid += amount;

        btcbToken.safeTransfer(charityWallet, amount);

        emit CharityFundsTransferred(charityWallet, amount);
    }
}
