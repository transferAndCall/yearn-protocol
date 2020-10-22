pragma solidity ^0.6.12;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "../interfaces/aave/Oracle.sol";

contract MockOracle is Oracle {
    mapping(address => address) internal feeds;

    function setPriceOracle(address _asset, address _feed) external {
        feeds[_asset] = _feed;
    }

    function getAssetPrice(address reserve) external view override returns (uint256) {
        return uint256(AggregatorInterface(feeds[reserve]).latestAnswer());
    }

    function latestAnswer() external view override returns (uint256) {
        return 0;
    }
}
