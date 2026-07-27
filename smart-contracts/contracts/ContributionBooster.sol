// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ContributionBooster (Growth Accelerator)
 * @notice Qualifies sponsors for elevated Direct Income via 50:50 Group Volume.
 *
 * Qualification (within 30 days of registration):
 * - Achieve 3000 Business Volume using 50:50 Group Volume:
 *   eligible = 2 * min(strongestLeg, remainingLegs)
 *
 * Reward window:
 * - Once qualified, Growth Accelerator stays active for 30 days.
 * - While active, ContributionReward pays L1 Direct Income at 10% (replaces 5%).
 * - This contract does NOT pay an additive bonus.
 */
contract ContributionBooster {
    address public owner;
    address public coreContract;

    uint256 public constant QUALIFICATION_PERIOD = 30 days;
    uint256 public constant BOOSTER_PERIOD = 30 days;
    uint256 public constant QUALIFY_VOLUME = 3000;
    /// @dev Legacy constant kept for ABI compatibility; Direct Income replace is in ContributionReward.
    uint256 public constant BOOSTER_REWARD_BPS = 1000;

    struct BoosterAccount {
        uint256 joinedAt;
        uint256 boosterActivatedAt;
        uint256 boosterExpiresAt;
        uint256 boosterIncome; // unused (no additive payout); kept for ABI compatibility
        bool qualified;
    }

    mapping(address => BoosterAccount) public boosterAccounts;
    mapping(address => address) public sponsors;

    /// @notice Lifetime USD package volume under each user (for GA qualification).
    mapping(address => uint256) public groupVolume;
    mapping(address => mapping(address => uint256)) public legVolume;
    mapping(address => uint256) public maxLegVolume;

    event CoreContractUpdated(address indexed coreContract);
    event UserRegistered(address indexed user, address indexed sponsor);
    event BoosterQualified(address indexed user, uint256 expiresAt);
    event VolumeRecorded(
        address indexed sponsor,
        address indexed fromLeg,
        uint256 volume,
        uint256 fiftyFiftyVolume
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

    /// @dev Kept so existing deploy scripts that call these setters still work.
    function setIncomeManager(address) external onlyOwner {}

    function setTreasury(address) external onlyOwner {}

    function setRankReward(address) external onlyOwner {}

    function registerUser(address user, address sponsor) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(boosterAccounts[user].joinedAt == 0, "User already registered");

        boosterAccounts[user].joinedAt = block.timestamp;
        sponsors[user] = sponsor;

        emit UserRegistered(user, sponsor);
    }

    /**
     * @notice Record package USD volume up the sponsor tree and try GA qualification.
     * @dev `packageAmount` is the USD package size (50, 100, …), not token wei.
     */
    function processPackage(address user, uint256 packageAmount) external {
        require(msg.sender == coreContract, "Only core contract");
        require(boosterAccounts[user].joinedAt > 0, "User not registered");
        require(packageAmount > 0, "Invalid package");

        address currentUser = user;
        address currentSponsor = sponsors[user];

        while (currentSponsor != address(0)) {
            groupVolume[currentSponsor] += packageAmount;
            legVolume[currentSponsor][currentUser] += packageAmount;

            if (legVolume[currentSponsor][currentUser] > maxLegVolume[currentSponsor]) {
                maxLegVolume[currentSponsor] = legVolume[currentSponsor][currentUser];
            }

            uint256 ff = getFiftyFiftyVolume(currentSponsor);
            emit VolumeRecorded(currentSponsor, currentUser, packageAmount, ff);

            _tryQualify(currentSponsor);

            currentUser = currentSponsor;
            currentSponsor = sponsors[currentSponsor];
        }
    }

    /**
     * @notice No-op: Growth Accelerator replaces L1 rate in ContributionReward (not additive).
     * @dev Kept for IContributionBooster / BTCPlanCore compatibility.
     */
    function processDirectContribution(address, uint256) external {
        require(msg.sender == coreContract, "Only core contract");
    }

    /**
     * @notice 50:50 eligible group volume = 2 * min(strongest leg, all other legs).
     */
    function getFiftyFiftyVolume(address user) public view returns (uint256) {
        uint256 total = groupVolume[user];
        uint256 strongest = maxLegVolume[user];
        if (total == 0 || strongest == 0) {
            return 0;
        }
        uint256 remaining = total - strongest;
        uint256 capped = strongest < remaining ? strongest : remaining;
        return capped * 2;
    }

    function isBoosterActive(address user) public view returns (bool) {
        BoosterAccount memory account = boosterAccounts[user];
        return account.qualified && block.timestamp <= account.boosterExpiresAt;
    }

    /// @notice Alias for Growth Accelerator active state.
    function isGrowthAcceleratorActive(address user) external view returns (bool) {
        return isBoosterActive(user);
    }

    function _tryQualify(address user) internal {
        BoosterAccount storage account = boosterAccounts[user];
        if (account.qualified) {
            return;
        }
        if (account.joinedAt == 0) {
            return;
        }
        if (block.timestamp > account.joinedAt + QUALIFICATION_PERIOD) {
            return;
        }
        if (getFiftyFiftyVolume(user) < QUALIFY_VOLUME) {
            return;
        }

        account.qualified = true;
        account.boosterActivatedAt = block.timestamp;
        account.boosterExpiresAt = block.timestamp + BOOSTER_PERIOD;

        emit BoosterQualified(user, account.boosterExpiresAt);
    }
}
