// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasuryManager
 * @notice Handles all treasury fund accounting and payouts.
 *
 * Activation distribution (Phase 1):
 * - 30% ROI Pool → interdependentFundBalance (entire 30%, unsplit)
 * - 70% Working Wallet
 *     - 5% of Working Wallet → Charity (~3.5% of package)
 *     - remainder (~66.5% of package) → working incomes
 *
 * Income recycling (Phase 2) — applies to EVERY payout (Self ROI, working, community):
 * - 70% → user wallet
 * - 25% → ROI Pool
 * -  3% → Reserve
 * -  2% → Community Builder Pool
 *
 * IncomeManager caps still count the gross accepted amount before recycling.
 * Regeneration Wallet is no longer funded on activation.
 */
contract TreasuryManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public btcbToken;

    address public owner;
    address public coreContract;
    address public rewardContract;
    address public communityBuilderContract;
    address public charityWallet;
    /// @dev Legacy wallet — no longer credited on activation; may still withdraw prior balance.
    address public regenerationWallet;

    mapping(address => bool) public workingPayers;

    uint256 public interdependentFundBalance;
    uint256 public reserveFundBalance;
    uint256 public communityBuilderFundBalance;
    uint256 public charityFundBalance;
    uint256 public workingFundBalance;
    /// @dev Legacy balance — no new activation credits; withdrawable via transferRegenerationFunds.
    uint256 public regenerationFundBalance;

    uint256 public totalSelfRoiPaid;
    uint256 public totalWorkingIncomePaid;
    uint256 public totalCommunityPaid;
    uint256 public totalCharityPaid;
    uint256 public totalRegenerationPaid;
    uint256 public totalReserveWithdrawn;
    uint256 public totalIncomeRecycled;
    uint256 public totalRecycledToRoi;
    uint256 public totalRecycledToReserve;
    uint256 public totalRecycledToCommunity;

    /// @notice Gross Working Wallet share of each activation (before charity cut).
    uint256 public constant WORKING_SIDE_BPS = 7000; // 70%
    /// @notice Share of the Working Wallet allocated to Charity (5% of Working ≈ 3.5% of package).
    uint256 public constant CHARITY_BPS = 500; // 5% of working side
    /// @notice Entire ROI Pool share on activation (unsplit — no reserve/community cut).
    uint256 public constant INTERDEPENDENT_BPS = 3000; // 30% ROI Pool
    /// @notice Recycle / legacy reserve share (3% of recycled income).
    uint256 public constant RESERVE_BPS = 300;
    /// @notice Recycle / legacy community share (2% of recycled income).
    uint256 public constant COMMUNITY_BPS = 200;

    /// @notice User net payout share of every recycled income.
    uint256 public constant RECYCLE_USER_BPS = 7000; // 70%
    /// @notice Recycled share returning to ROI Pool.
    uint256 public constant RECYCLE_ROI_BPS = 2500; // 25%
    // RECYCLE reserve/community reuse RESERVE_BPS / COMMUNITY_BPS (300 / 200)

    event CoreContractUpdated(address indexed coreContract);
    event RewardContractUpdated(address indexed rewardContract);
    event CommunityBuilderUpdated(address indexed communityBuilder);
    event CharityWalletUpdated(address indexed charityWallet);
    event RegenerationWalletUpdated(address indexed regenerationWallet);
    event WorkingPayerUpdated(address indexed payer, bool status);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContributionProcessed(
        uint256 amount,
        uint256 interdependentAmount,
        uint256 reserveAmount,
        uint256 communityAmount,
        uint256 workingAmount,
        uint256 charityAmount
    );
    /// @notice Net amount transferred to the user after recycling.
    event SelfRoiPaid(address indexed user, uint256 amount);
    /// @notice Net amount transferred to the user after recycling.
    event WorkingIncomePaid(address indexed user, uint256 amount);
    /// @notice Net amount transferred to the user after recycling.
    event CommunityBuilderPaid(address indexed user, uint256 amount);
    event IncomeRecycled(
        address indexed user,
        uint256 grossAmount,
        uint256 userPayout,
        uint256 toRoiPool,
        uint256 toReserve,
        uint256 toCommunity
    );
    event CharityFundsTransferred(address indexed wallet, uint256 amount);
    event RegenerationFundsTransferred(address indexed wallet, uint256 amount);
    event ReserveFundsWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _btcbToken) {
        require(_btcbToken != address(0), "Invalid BTCB token");
        owner = msg.sender;
        btcbToken = IERC20(_btcbToken);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
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

    function setRegenerationWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        regenerationWallet = _wallet;
        emit RegenerationWalletUpdated(_wallet);
    }

    function setWorkingPayer(address payer, bool status) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        workingPayers[payer] = status;
        emit WorkingPayerUpdated(payer, status);
    }

    function processContribution(uint256 amount) external {
        require(msg.sender == coreContract, "Only core contract");
        require(amount > 0, "Invalid amount");

        // ROI Pool: entire 30% stays in interdependent fund (unsplit on activation).
        uint256 interdependentAmount = (amount * INTERDEPENDENT_BPS) / 10000;
        // Reserve / Community funded via income recycling — not on activation.
        uint256 reserveAmount = 0;
        uint256 communityAmount = 0;

        // Working Wallet (70%): remainder so flooring dust stays on the working side.
        uint256 workingSide = amount - interdependentAmount;

        // From Working Wallet, allocate 5% to Charity; rest pays working incomes.
        uint256 charityAmount = (workingSide * CHARITY_BPS) / 10000;
        uint256 workingAmount = workingSide - charityAmount;

        interdependentFundBalance += interdependentAmount;
        charityFundBalance += charityAmount;
        workingFundBalance += workingAmount;

        emit ContributionProcessed(
            amount,
            interdependentAmount,
            reserveAmount,
            communityAmount,
            workingAmount,
            charityAmount
        );
    }

    function getAvailableDailyRoiBudget() external view returns (uint256) {
        // Max 5% of ROI pool that may be paid as Self ROI per day.
        // Actual payout can be lower (1% per-user cap); remainder stays in pool.
        return (interdependentFundBalance * 5) / 100;
    }

    /**
     * @notice Preview recycling split for a gross income amount.
     * @dev User gets remainder after 25/3/2 cuts so parts always sum to `amount`.
     */
    function previewRecycling(uint256 amount)
        external
        pure
        returns (
            uint256 userPayout,
            uint256 toRoiPool,
            uint256 toReserve,
            uint256 toCommunity
        )
    {
        return _splitRecycled(amount);
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

        // Debit gross from ROI pool; recycling credits 25% back into the same pool.
        interdependentFundBalance -= amount;

        uint256 userPayout = _recycleAndPay(user, amount);
        totalSelfRoiPaid += userPayout;

        emit SelfRoiPaid(user, userPayout);
    }

    /**
     * @notice Pays working-pool income (contribution / booster / rank / same-rank leadership).
     * @dev Only source for working incomes — Community Builder uses payCommunityBuilder.
     *      `amount` is the gross accepted income; user receives 70% after recycling.
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

        uint256 userPayout = _recycleAndPay(user, amount);
        totalWorkingIncomePaid += userPayout;

        emit WorkingIncomePaid(user, userPayout);
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

        uint256 userPayout = _recycleAndPay(user, amount);
        totalCommunityPaid += userPayout;

        emit CommunityBuilderPaid(user, userPayout);
    }

    function transferCharityFunds(uint256 amount) external onlyOwner nonReentrant {
        require(charityWallet != address(0), "Charity wallet not set");
        require(charityFundBalance >= amount, "Insufficient charity fund");

        charityFundBalance -= amount;
        totalCharityPaid += amount;

        btcbToken.safeTransfer(charityWallet, amount);

        emit CharityFundsTransferred(charityWallet, amount);
    }

    /**
     * @notice Withdraw legacy regeneration balance (no longer funded on activation).
     */
    function transferRegenerationFunds(uint256 amount) external onlyOwner nonReentrant {
        require(regenerationWallet != address(0), "Regeneration wallet not set");
        require(regenerationFundBalance >= amount, "Insufficient regeneration fund");

        regenerationFundBalance -= amount;
        totalRegenerationPaid += amount;

        btcbToken.safeTransfer(regenerationWallet, amount);

        emit RegenerationFundsTransferred(regenerationWallet, amount);
    }

    /**
     * @notice Owner withdraw from reserve (ops / contingency).
     */
    function withdrawReserve(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(reserveFundBalance >= amount, "Insufficient reserve fund");

        reserveFundBalance -= amount;
        totalReserveWithdrawn += amount;

        btcbToken.safeTransfer(to, amount);

        emit ReserveFundsWithdrawn(to, amount);
    }

    /**
     * @notice Credit community builder fund when matching BTCB is already held by treasury.
     * @dev Useful for tests / ops top-ups; recycling also credits this bucket on every payout.
     */
    function creditCommunityBuilderFund(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        communityBuilderFundBalance += amount;
    }

    /**
     * @notice Credit reserve fund when matching BTCB is already held by treasury.
     */
    function creditReserveFund(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        reserveFundBalance += amount;
    }

    function _splitRecycled(uint256 amount)
        internal
        pure
        returns (
            uint256 userPayout,
            uint256 toRoiPool,
            uint256 toReserve,
            uint256 toCommunity
        )
    {
        toRoiPool = (amount * RECYCLE_ROI_BPS) / 10000;
        toReserve = (amount * RESERVE_BPS) / 10000;
        toCommunity = (amount * COMMUNITY_BPS) / 10000;
        // Remainder (~70% + flooring dust) goes to the user so parts sum exactly.
        userPayout = amount - toRoiPool - toReserve - toCommunity;
    }

    /**
     * @dev Credits recycle buckets and transfers the user share. Tokens for recycle
     *      stay in the treasury (already held); only `userPayout` leaves.
     */
    function _recycleAndPay(
        address user,
        uint256 amount
    ) internal returns (uint256 userPayout) {
        uint256 toRoiPool;
        uint256 toReserve;
        uint256 toCommunity;
        (userPayout, toRoiPool, toReserve, toCommunity) = _splitRecycled(amount);

        interdependentFundBalance += toRoiPool;
        reserveFundBalance += toReserve;
        communityBuilderFundBalance += toCommunity;

        totalRecycledToRoi += toRoiPool;
        totalRecycledToReserve += toReserve;
        totalRecycledToCommunity += toCommunity;
        totalIncomeRecycled += toRoiPool + toReserve + toCommunity;

        btcbToken.safeTransfer(user, userPayout);

        emit IncomeRecycled(
            user,
            amount,
            userPayout,
            toRoiPool,
            toReserve,
            toCommunity
        );
    }
}
