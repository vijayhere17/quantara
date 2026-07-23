// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IBTCPriceFeed} from "./interfaces/IBTCPriceFeed.sol";
import {IContributionBooster} from "./interfaces/IContributionBooster.sol";
import {IContributionReward} from "./interfaces/IContributionReward.sol";
import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {IInterdependentReward} from "./interfaces/IInterdependentReward.sol";
import {IRankReward} from "./interfaces/IRankReward.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title BTCPlanCore
 * @notice Registration, package activation/progression, and sponsor tree.
 * @dev Does NOT calculate rewards. Completes packages when IncomeManager notifies.
 *
 * Package sequence (no skip / no downgrade):
 * 50 C1 → 50 C2 → 100 C1 → 100 C2 → ... → 10000 C1 → 10000 C2 → unlimited 10000 topups
 */
contract BTCPlanCore is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;

    IERC20 public btcbToken;
    IBTCPriceFeed public btcPriceFeed;
    ITreasuryManager public treasury;
    IContributionReward public contributionReward;
    IIncomeManager public incomeManager;
    IContributionBooster public contributionBooster;
    IRankReward public rankReward;
    IInterdependentReward public interdependentReward;

    uint256[] public packages;

    struct User {
        address wallet;
        address sponsor;
        uint256 packageAmount;
        uint8 packageIndex;
        uint8 packageCycle; // 1 or 2
        uint256 joinedAt;
        bool isActive;
        bool packageCompleted;
    }

    mapping(address => User) public users;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TreasuryUpdated(address indexed treasury);
    event ContributionRewardUpdated(address indexed contributionReward);
    event ContributionBoosterUpdated(address indexed contributionBooster);
    event IncomeManagerUpdated(address indexed incomeManager);
    event InterdependentRewardUpdated(address indexed interdependentReward);
    event RankRewardUpdated(address indexed rankReward);
    event UserRegistered(address indexed user, address indexed sponsor);
    event PackageActivated(
        address indexed user,
        uint256 packageAmount,
        uint8 packageCycle,
        uint256 tokenAmount
    );
    event PackageCompleted(address indexed user, uint256 packageAmount, uint8 packageCycle);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _btcbToken, address _btcPriceFeed) {
        require(_btcbToken != address(0), "Invalid token");
        require(_btcPriceFeed != address(0), "Invalid price feed");

        owner = msg.sender;
        btcbToken = IERC20(_btcbToken);
        btcPriceFeed = IBTCPriceFeed(_btcPriceFeed);

        packages.push(50);
        packages.push(100);
        packages.push(300);
        packages.push(500);
        packages.push(1000);
        packages.push(3000);
        packages.push(5000);
        packages.push(10000);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = ITreasuryManager(_treasury);
        emit TreasuryUpdated(_treasury);
    }

    function setContributionReward(address _contributionReward) external onlyOwner {
        require(_contributionReward != address(0), "Invalid contribution reward");
        contributionReward = IContributionReward(_contributionReward);
        emit ContributionRewardUpdated(_contributionReward);
    }

    function setContributionBooster(address _contributionBooster) external onlyOwner {
        require(_contributionBooster != address(0), "Invalid contribution booster");
        contributionBooster = IContributionBooster(_contributionBooster);
        emit ContributionBoosterUpdated(_contributionBooster);
    }

    function setIncomeManager(address _incomeManager) external onlyOwner {
        require(_incomeManager != address(0), "Invalid income manager");
        incomeManager = IIncomeManager(_incomeManager);
        emit IncomeManagerUpdated(_incomeManager);
    }

    function setInterdependentReward(address _rewardContract) external onlyOwner {
        require(_rewardContract != address(0), "Invalid reward contract");
        interdependentReward = IInterdependentReward(_rewardContract);
        emit InterdependentRewardUpdated(_rewardContract);
    }

    function setRankReward(address _rankReward) external onlyOwner {
        require(_rankReward != address(0), "Invalid rank reward");
        rankReward = IRankReward(_rankReward);
        emit RankRewardUpdated(_rankReward);
    }

    function isValidPackage(uint256 amount) public view returns (bool) {
        for (uint256 i = 0; i < packages.length; i++) {
            if (packages[i] == amount) {
                return true;
            }
        }
        return false;
    }

    function getPackageIndex(uint256 amount) public view returns (uint256) {
        for (uint256 i = 0; i < packages.length; i++) {
            if (packages[i] == amount) {
                return i;
            }
        }
        revert("Invalid package");
    }

    function getPackageBTCBAmount(uint256 packageAmount) public view returns (uint256) {
        require(isValidPackage(packageAmount), "Invalid package");
        return getBTCBAmountFromUSD(packageAmount);
    }

    function getBTCBAmountFromUSD(uint256 usdAmount) public view returns (uint256) {
        int256 btcPrice = btcPriceFeed.getBTCPrice();
        require(btcPrice > 0, "Invalid BTC price");
        return (usdAmount * 1e18) / uint256(btcPrice);
    }

    /**
     * @notice Returns the next package amount and cycle the user may activate.
     */
    function getNextEligiblePackage(
        address userAddr
    ) public view returns (uint256, uint8) {
        User memory user = users[userAddr];

        // New user — must start at 50 cycle 1
        if (user.packageAmount == 0) {
            return (50, 1);
        }

        require(user.packageCompleted, "Complete current package first");

        if (user.packageCycle == 1) {
            return (user.packageAmount, 2);
        }

        require(user.packageCycle == 2, "Invalid cycle");

        // After 10000 C2: unlimited 10000 topups (always cycle 2)
        if (user.packageIndex == packages.length - 1) {
            return (10000, 2);
        }

        return (packages[user.packageIndex + 1], 1);
    }

    function register(address sponsor) external {
        require(!users[msg.sender].isActive, "User already registered");
        require(sponsor != msg.sender, "Cannot sponsor yourself");

        // Zero address allowed only as root/system sponsor.
        // Non-zero sponsors must already be registered.
        if (sponsor != address(0)) {
            require(users[sponsor].isActive, "Sponsor not registered");
        }

        users[msg.sender] = User({
            wallet: msg.sender,
            sponsor: sponsor,
            packageAmount: 0,
            packageIndex: 0,
            packageCycle: 0,
            joinedAt: block.timestamp,
            isActive: true,
            packageCompleted: false
        });

        if (address(rankReward) != address(0)) {
            rankReward.setSponsor(msg.sender, sponsor);
        }

        if (address(contributionReward) != address(0)) {
            contributionReward.setSponsor(msg.sender, sponsor);
        }

        if (address(contributionBooster) != address(0)) {
            contributionBooster.registerUser(msg.sender, sponsor);
        }

        emit UserRegistered(msg.sender, sponsor);
    }

    function activatePackage(uint256 amount) external nonReentrant {
        require(users[msg.sender].isActive, "User not registered");
        require(isValidPackage(amount), "Invalid package");
        require(address(treasury) != address(0), "Treasury not set");
        require(address(interdependentReward) != address(0), "Reward contract not set");
        require(address(incomeManager) != address(0), "Income manager not set");

        (uint256 expectedPackage, uint8 expectedCycle) = getNextEligiblePackage(msg.sender);
        require(amount == expectedPackage, "Invalid package sequence");

        // Prevent activating while current package is still open
        User storage user = users[msg.sender];
        if (user.packageAmount > 0) {
            require(user.packageCompleted, "Package not completed");
        }

        uint256 tokenAmount = getPackageBTCBAmount(amount);

        btcbToken.safeTransferFrom(msg.sender, address(treasury), tokenAmount);

        treasury.processContribution(tokenAmount);

        // Reset income window for this package and set principal
        incomeManager.startPackage(msg.sender, tokenAmount);

        if (address(contributionReward) != address(0)) {
            contributionReward.processContribution(msg.sender, tokenAmount);
        }

        if (address(contributionBooster) != address(0)) {
            contributionBooster.processPackage(msg.sender, amount);
            contributionBooster.processDirectContribution(msg.sender, tokenAmount);
        }

        interdependentReward.activateRoi(msg.sender, tokenAmount);

        user.packageAmount = amount;
        user.packageIndex = uint8(getPackageIndex(amount));
        user.packageCycle = expectedCycle;
        user.packageCompleted = false;

        if (address(rankReward) != address(0)) {
            rankReward.recordPackageVolume(msg.sender, amount);
        }

        emit PackageActivated(msg.sender, amount, expectedCycle, tokenAmount);
    }

    /**
     * @notice ROI 3X reached: stop ROI and unlock next-package progression.
     * @dev Working income may continue until Working 4X or next activation.
     */
    function onRoiCapReached(address user) external {
        require(msg.sender == address(incomeManager), "Only income manager");
        require(user != address(0), "Invalid user");

        if (address(interdependentReward) != address(0)) {
            interdependentReward.deactivateRoi(user);
        }

        _markPackageCompleted(user);
    }

    /**
     * @notice Working 4X reached: unlock next-package progression.
     * @dev ROI may continue until ROI 3X or next activation.
     */
    function onWorkingCapReached(address user) external {
        require(msg.sender == address(incomeManager), "Only income manager");
        require(user != address(0), "Invalid user");
        _markPackageCompleted(user);
    }

    /**
     * @notice Both independent caps exhausted — final package income closed.
     */
    function completePackage(address user) external {
        require(msg.sender == address(incomeManager), "Only income manager");
        require(user != address(0), "Invalid user");

        if (address(interdependentReward) != address(0)) {
            interdependentReward.deactivateRoi(user);
        }

        _markPackageCompleted(user);
    }

    function _markPackageCompleted(address user) internal {
        User storage account = users[user];
        require(account.isActive, "User not registered");
        require(account.packageAmount > 0, "No active package");

        if (account.packageCompleted) {
            return;
        }

        account.packageCompleted = true;
        emit PackageCompleted(user, account.packageAmount, account.packageCycle);
    }

    function getPackages() external view returns (uint256[] memory) {
        return packages;
    }
}
