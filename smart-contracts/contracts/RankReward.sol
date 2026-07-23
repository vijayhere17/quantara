// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICommunityBuilder} from "./interfaces/ICommunityBuilder.sol";
import {IIncomeManager} from "./interfaces/IIncomeManager.sol";
import {ITreasuryManager} from "./interfaces/ITreasuryManager.sol";

/**
 * @title RankReward
 * @notice Rank qualification, differential rank income, and same-rank income.
 *
 * Same Rank — two mechanisms:
 * -----------------------------------------
 * 1) Ongoing matching (eligible income slices):
 *    For each accepted income event credited to a user (the earner), if the earner's
 *    direct sponsor holds the exact same non-None rank, the sponsor receives 10% of
 *    that accepted amount. Eligible: ROI, Contribution, Booster, Rank, Community.
 *    SameRank income itself does NOT re-trigger Same Rank.
 *
 * 2) Rank achievement bonus (business plan):
 *    When a user first reaches a rank that their direct sponsor already holds,
 *    the sponsor receives a one-time 10% of the user's TOTAL earned income
 *    (IncomeManager.totalEarned). Deduped per (user, sponsor, rank).
 *
 * Rank income-cap multipliers (architecture present, application gated):
 * - Default / Q1-Q2 / Q4 / Q6 / Q8 → 3
 * - Q3 Sapling → 5
 * - Q5 Forest → 6
 * - Q7 Ecosphere → 7
 *
 * BUSINESS CLARIFICATION REQUIRED before IncomeManager.applyRankCapMultipliers
 * is enabled: do these multipliers scale the ROI 3X cap, the Working 4X cap, or both?
 */
contract RankReward {
    address public owner;
    address public coreContract;
    address public rewardContract;

    ICommunityBuilder public communityBuilder;
    IIncomeManager public incomeManager;
    ITreasuryManager public treasury;

    enum Rank {
        None,
        Seed,
        Sprout,
        Sapling,
        Canopy,
        Forest,
        Biome,
        Ecosphere,
        Genesis
    }

    mapping(address => Rank) public userRanks;
    mapping(Rank => uint256) public rankRewardBps;
    mapping(address => address) public sponsors;
    mapping(address => uint256) public rankIncome;
    mapping(address => uint256) public sameRankIncome;
    mapping(address => uint256) public directCount;
    mapping(address => uint256) public groupVolume;
    mapping(address => uint256) public personalVolume;
    mapping(address => mapping(address => uint256)) public legVolume;
    mapping(address => address[]) public directUsers;
    mapping(address => uint256) public maxLegVolume;
    mapping(address => mapping(address => mapping(Rank => uint256))) public legRankCount;

    /// @notice Contracts allowed to report eligible income for Same Rank bonus.
    mapping(address => bool) public sameRankReporters;

    uint256 public constant SAME_RANK_REWARD_BPS = 1000; // 10%

    /// @dev one-time achievement: user reached sponsor's rank → paid already
    mapping(address => mapping(address => mapping(Rank => bool))) public sameRankAchievementPaid;
    mapping(address => uint256) public sameRankAchievementIncome;

    event CoreContractUpdated(address indexed coreContract);
    event RewardContractUpdated(address indexed rewardContract);
    event CommunityBuilderUpdated(address indexed communityBuilder);
    event IncomeManagerUpdated(address indexed incomeManager);
    event TreasuryUpdated(address indexed treasury);
    event SameRankReporterUpdated(address indexed reporter, bool status);
    event SponsorSet(address indexed user, address indexed sponsor);
    event RankUpdated(address indexed user, Rank oldRank, Rank newRank);
    event RankIncomePaid(address indexed beneficiary, address indexed fromUser, uint256 amount);
    event SameRankIncomePaid(address indexed beneficiary, address indexed fromUser, uint256 amount);
    event SameRankAchievementPaid(
        address indexed beneficiary,
        address indexed fromUser,
        Rank rank,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;

        rankRewardBps[Rank.Seed] = 1000;
        rankRewardBps[Rank.Sprout] = 1500;
        rankRewardBps[Rank.Sapling] = 2000;
        rankRewardBps[Rank.Canopy] = 2500;
        rankRewardBps[Rank.Forest] = 3000;
        rankRewardBps[Rank.Biome] = 3500;
        rankRewardBps[Rank.Ecosphere] = 4000;
        rankRewardBps[Rank.Genesis] = 4500;
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

    function setCommunityBuilder(address _communityBuilder) external onlyOwner {
        require(_communityBuilder != address(0), "Invalid community builder");
        communityBuilder = ICommunityBuilder(_communityBuilder);
        emit CommunityBuilderUpdated(_communityBuilder);
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

    function setSameRankReporter(address reporter, bool status) external onlyOwner {
        require(reporter != address(0), "Invalid reporter");
        sameRankReporters[reporter] = status;
        emit SameRankReporterUpdated(reporter, status);
    }

    function setSponsor(address user, address sponsor) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(sponsors[user] == address(0), "Sponsor already set");

        sponsors[user] = sponsor;

        if (sponsor != address(0)) {
            directCount[sponsor] += 1;
            directUsers[sponsor].push(user);
        }

        emit SponsorSet(user, sponsor);
    }

    function setRank(address user, Rank rank) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(rank != Rank.None, "Invalid rank");
        require(rank > userRanks[user], "Rank must increase");
        promoteRank(user, rank);
    }

    /**
     * @notice Rank-based cap multiplier values.
     * @dev NOT applied by IncomeManager until applyRankCapMultipliers is enabled
     *      after business clarifies the multiplier target.
     */
    function getIncomeCapMultiplier(address user) external view returns (uint256) {
        Rank rank = userRanks[user];

        if (rank >= Rank.Ecosphere) {
            return 7; // Q7+
        }
        if (rank >= Rank.Forest) {
            return 6; // Q5+
        }
        if (rank >= Rank.Sapling) {
            return 5; // Q3+
        }
        return 3;
    }

    function processRoiIncome(address user, uint256 roiAmount) external {
        require(msg.sender == rewardContract, "Only reward contract");
        require(user != address(0), "Invalid user");
        require(roiAmount > 0, "Invalid ROI amount");
        require(address(incomeManager) != address(0), "Income manager not set");
        require(address(treasury) != address(0), "Treasury not set");

        address currentSponsor = sponsors[user];
        uint256 highestPaidBps = 0;

        while (currentSponsor != address(0)) {
            Rank currentRank = userRanks[currentSponsor];

            if (currentRank != Rank.None) {
                uint256 currentBps = rankRewardBps[currentRank];

                if (currentBps > highestPaidBps) {
                    uint256 differenceBps = currentBps - highestPaidBps;
                    uint256 rewardAmount = (roiAmount * differenceBps) / 10000;

                    _payRankIncome(currentSponsor, user, rewardAmount);

                    highestPaidBps = currentBps;
                }
            }

            currentSponsor = sponsors[currentSponsor];
        }
    }

    /**
     * @notice Pays 10% Same Rank bonus on a slice of the earner's eligible income.
     * @param user Earner who just received eligible income.
     * @param eligibleIncomeAmount Accepted eligible income amount (see contract docs).
     */
    function processSameRankIncome(
        address user,
        uint256 eligibleIncomeAmount
    ) external {
        require(sameRankReporters[msg.sender], "Not authorized reporter");
        _processSameRankIncome(user, eligibleIncomeAmount);
    }

    function recordPackageVolume(address user, uint256 volume) external {
        require(msg.sender == coreContract, "Only core contract");
        require(user != address(0), "Invalid user");
        require(volume > 0, "Invalid volume");

        personalVolume[user] += volume;

        address currentUser = user;
        address currentSponsor = sponsors[user];

        while (currentSponsor != address(0)) {
            groupVolume[currentSponsor] += volume;
            legVolume[currentSponsor][currentUser] += volume;

            if (legVolume[currentSponsor][currentUser] > maxLegVolume[currentSponsor]) {
                maxLegVolume[currentSponsor] = legVolume[currentSponsor][currentUser];
            }

            currentUser = currentSponsor;
            currentSponsor = sponsors[currentSponsor];
        }

        address currentUserToCheck = user;
        while (currentUserToCheck != address(0)) {
            updateRank(currentUserToCheck);
            currentUserToCheck = sponsors[currentUserToCheck];
        }
    }

    function checkSeedQualification(address user) public view returns (bool) {
        if (directCount[user] < 2) return false;
        if (maxLegVolume[user] < 250) return false;
        if (groupVolume[user] < 500) return false;
        return true;
    }

    function checkSproutQualification(address user) public view returns (bool) {
        if (directCount[user] < 3) return false;
        if (groupVolume[user] < 5000) return false;

        uint256 leg2000Count = 0;
        uint256 leg1000Count = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 volume = legVolume[user][directs[i]];
            if (volume >= 2000) {
                leg2000Count++;
            } else if (volume >= 1000) {
                leg1000Count++;
            }
        }

        return leg2000Count >= 2 && leg2000Count + leg1000Count >= 3;
    }

    function checkSaplingQualification(address user) public view returns (bool) {
        if (directCount[user] < 4) return false;
        if (groupVolume[user] < 20000) return false;

        uint256 leg10000Count = 0;
        uint256 leg5000Count = 0;
        uint256 leg3000Count = 0;
        uint256 leg2000Count = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 volume = legVolume[user][directs[i]];
            if (volume >= 10000) {
                leg10000Count++;
            } else if (volume >= 5000) {
                leg5000Count++;
            } else if (volume >= 3000) {
                leg3000Count++;
            } else if (volume >= 2000) {
                leg2000Count++;
            }
        }

        return (
            leg10000Count >= 1
                && leg10000Count + leg5000Count >= 2
                && leg10000Count + leg5000Count + leg3000Count >= 3
                && leg10000Count + leg5000Count + leg3000Count + leg2000Count >= 4
        );
    }

    function countDirectRank(address user, Rank requiredRank) public view returns (uint256) {
        uint256 count = 0;
        address[] memory directs = directUsers[user];
        for (uint256 i = 0; i < directs.length; i++) {
            if (userRanks[directs[i]] >= requiredRank) {
                count++;
            }
        }
        return count;
    }

    function checkCanopyQualification(address user) public view returns (bool) {
        if (countDirectRank(user, Rank.Sapling) >= 3) {
            return true;
        }

        uint256 totalSaplings = 0;
        uint256 qualifiedLegs = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 saplingCount = legRankCount[user][directs[i]][Rank.Sapling];
            if (saplingCount > 0) {
                qualifiedLegs++;
                totalSaplings += saplingCount;
            }
        }

        return totalSaplings >= 6 && qualifiedLegs >= 3;
    }

    function checkForestQualification(address user) public view returns (bool) {
        if (countDirectRank(user, Rank.Canopy) >= 3) {
            return true;
        }

        uint256 totalCanopies = 0;
        uint256 qualifiedLegs = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 canopyCount = legRankCount[user][directs[i]][Rank.Canopy];
            if (canopyCount > 0) {
                qualifiedLegs++;
                totalCanopies += canopyCount;
            }
        }

        return totalCanopies >= 6 && qualifiedLegs >= 3;
    }

    function checkBiomeQualification(address user) public view returns (bool) {
        if (countDirectRank(user, Rank.Forest) >= 3) {
            return true;
        }

        uint256 totalForests = 0;
        uint256 qualifiedLegs = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 forestCount = legRankCount[user][directs[i]][Rank.Forest];
            if (forestCount > 0) {
                qualifiedLegs++;
                totalForests += forestCount;
            }
        }

        return totalForests >= 6 && qualifiedLegs >= 3;
    }

    function checkEcosphereQualification(address user) public view returns (bool) {
        if (countDirectRank(user, Rank.Biome) >= 4) {
            return true;
        }

        uint256 totalBiomes = 0;
        uint256 qualifiedLegs = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 biomeCount = legRankCount[user][directs[i]][Rank.Biome];
            if (biomeCount > 0) {
                qualifiedLegs++;
                totalBiomes += biomeCount;
            }
        }

        return totalBiomes >= 8 && qualifiedLegs >= 4;
    }

    function checkGenesisQualification(address user) public view returns (bool) {
        if (countDirectRank(user, Rank.Ecosphere) >= 4) {
            return true;
        }

        uint256 totalEcospheres = 0;
        uint256 qualifiedLegs = 0;
        address[] memory directs = directUsers[user];

        for (uint256 i = 0; i < directs.length; i++) {
            uint256 ecosphereCount = legRankCount[user][directs[i]][Rank.Ecosphere];
            if (ecosphereCount > 0) {
                qualifiedLegs++;
                totalEcospheres += ecosphereCount;
            }
        }

        return totalEcospheres >= 8 && qualifiedLegs >= 4;
    }

    function updateRank(address user) public {
        if (userRanks[user] < Rank.Genesis && checkGenesisQualification(user)) {
            promoteRank(user, Rank.Genesis);
            return;
        }
        if (userRanks[user] < Rank.Ecosphere && checkEcosphereQualification(user)) {
            promoteRank(user, Rank.Ecosphere);
            return;
        }
        if (userRanks[user] < Rank.Biome && checkBiomeQualification(user)) {
            promoteRank(user, Rank.Biome);
            return;
        }
        if (userRanks[user] < Rank.Forest && checkForestQualification(user)) {
            promoteRank(user, Rank.Forest);
            return;
        }
        if (userRanks[user] < Rank.Canopy && checkCanopyQualification(user)) {
            promoteRank(user, Rank.Canopy);
            return;
        }
        if (userRanks[user] < Rank.Sapling && checkSaplingQualification(user)) {
            promoteRank(user, Rank.Sapling);
            return;
        }
        if (userRanks[user] < Rank.Sprout && checkSproutQualification(user)) {
            promoteRank(user, Rank.Sprout);
            return;
        }
        if (userRanks[user] < Rank.Seed && checkSeedQualification(user)) {
            promoteRank(user, Rank.Seed);
        }
    }

    function promoteRank(address user, Rank newRank) internal {
        Rank oldRank = userRanks[user];
        if (newRank <= oldRank) {
            return;
        }

        userRanks[user] = newRank;
        syncCommunityPoints(user);

        for (
            uint256 rankValue = uint256(oldRank) + 1;
            rankValue <= uint256(newRank);
            rankValue++
        ) {
            updateUplineLegRankCount(user, Rank(rankValue));
        }

        emit RankUpdated(user, oldRank, newRank);

        // Achievement bonus for each newly attained rank that matches the sponsor.
        for (
            uint256 rankValue = uint256(oldRank) + 1;
            rankValue <= uint256(newRank);
            rankValue++
        ) {
            _paySameRankAchievementBonus(user, Rank(rankValue));
        }
    }

    /**
     * @notice One-time 10% of user's TOTAL income when they reach the sponsor's rank.
     */
    function _paySameRankAchievementBonus(address user, Rank achievedRank) internal {
        if (achievedRank == Rank.None) {
            return;
        }
        if (address(incomeManager) == address(0) || address(treasury) == address(0)) {
            return;
        }

        address sponsor = sponsors[user];
        if (sponsor == address(0)) {
            return;
        }
        if (userRanks[sponsor] != achievedRank) {
            return;
        }
        if (sameRankAchievementPaid[user][sponsor][achievedRank]) {
            return;
        }

        uint256 total = incomeManager.totalEarned(user);
        if (total == 0) {
            // Mark as paid with 0 so a later re-check does not double-fire after income accrues
            // without a rank change. Achievement is tied to the rank-up moment.
            sameRankAchievementPaid[user][sponsor][achievedRank] = true;
            return;
        }

        uint256 rewardAmount = (total * SAME_RANK_REWARD_BPS) / 10000;
        uint256 paid = _payWorkingIncome(
            sponsor,
            rewardAmount,
            IIncomeManager.IncomeType.SameRank
        );

        sameRankAchievementPaid[user][sponsor][achievedRank] = true;

        if (paid > 0) {
            sameRankAchievementIncome[sponsor] += paid;
            sameRankIncome[sponsor] += paid;
            emit SameRankAchievementPaid(sponsor, user, achievedRank, paid);
        }
    }

    function syncCommunityPoints(address user) internal {
        if (address(communityBuilder) == address(0)) {
            return;
        }

        Rank rank = userRanks[user];
        uint256 points = 0;

        if (rank == Rank.Forest) {
            points = 1;
        } else if (rank == Rank.Biome) {
            points = 2;
        } else if (rank == Rank.Ecosphere) {
            points = 3;
        } else if (rank == Rank.Genesis) {
            points = 4;
        }

        communityBuilder.updateUserPoints(user, points);
    }

    function updateUplineLegRankCount(address user, Rank rank) internal {
        address currentUser = user;
        address currentSponsor = sponsors[user];

        while (currentSponsor != address(0)) {
            legRankCount[currentSponsor][currentUser][rank] += 1;
            currentUser = currentSponsor;
            currentSponsor = sponsors[currentSponsor];
        }
    }

    function _payRankIncome(
        address beneficiary,
        address fromUser,
        uint256 rewardAmount
    ) internal returns (uint256 paid) {
        paid = _payWorkingIncome(
            beneficiary,
            rewardAmount,
            IIncomeManager.IncomeType.Rank
        );
        if (paid > 0) {
            rankIncome[beneficiary] += paid;
            emit RankIncomePaid(beneficiary, fromUser, paid);
            // Rank income is eligible income → may generate Same Rank for beneficiary's sponsor
            _processSameRankIncome(beneficiary, paid);
        }
    }

    function _processSameRankIncome(
        address user,
        uint256 eligibleIncomeAmount
    ) internal {
        if (eligibleIncomeAmount == 0) {
            return;
        }
        if (address(incomeManager) == address(0) || address(treasury) == address(0)) {
            return;
        }

        address sponsor = sponsors[user];
        if (sponsor == address(0)) {
            return;
        }

        Rank userRank = userRanks[user];
        Rank sponsorRank = userRanks[sponsor];

        if (userRank == Rank.None || userRank != sponsorRank) {
            return;
        }

        uint256 rewardAmount = (eligibleIncomeAmount * SAME_RANK_REWARD_BPS) / 10000;
        uint256 paid = _payWorkingIncome(
            sponsor,
            rewardAmount,
            IIncomeManager.IncomeType.SameRank
        );

        if (paid > 0) {
            sameRankIncome[sponsor] += paid;
            emit SameRankIncomePaid(sponsor, user, paid);
        }
    }

    function _payWorkingIncome(
        address beneficiary,
        uint256 rewardAmount,
        IIncomeManager.IncomeType incomeType
    ) internal returns (uint256 acceptedAmount) {
        if (rewardAmount == 0) {
            return 0;
        }

        uint256 available = treasury.workingFundBalance();
        if (available == 0) {
            return 0;
        }
        if (rewardAmount > available) {
            rewardAmount = available;
        }

        acceptedAmount = incomeManager.recordIncome(
            beneficiary,
            rewardAmount,
            incomeType
        );

        if (acceptedAmount == 0) {
            return 0;
        }

        treasury.payWorkingIncome(beneficiary, acceptedAmount);
        return acceptedAmount;
    }
}
