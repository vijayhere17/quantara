// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";
import {IBTCPriceFeed} from "../interfaces/IBTCPriceFeed.sol";

/**
 * @title ChainlinkBTCPriceFeed
 * @notice Adapts a Chainlink AggregatorV3 BTC/USD feed to IBTCPriceFeed.
 * @dev Chainlink BTC/USD answers use 8 decimals. BTCPlanCore expects a plain
 *      USD integer (e.g. 65000 for $65,000), matching MockBTCPriceFeed.
 */
contract ChainlinkBTCPriceFeed is IBTCPriceFeed {
    AggregatorV3Interface public immutable aggregator;

    constructor(address aggregatorAddress) {
        require(aggregatorAddress != address(0), "Invalid aggregator");
        aggregator = AggregatorV3Interface(aggregatorAddress);
    }

    function getBTCPrice() external view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = aggregator.latestRoundData();
        require(answer > 0, "Invalid Chainlink answer");
        require(updatedAt > 0, "Stale Chainlink round");

        uint8 feedDecimals = aggregator.decimals();
        if (feedDecimals == 0) {
            return answer;
        }

        return answer / int256(10 ** uint256(feedDecimals));
    }
}
