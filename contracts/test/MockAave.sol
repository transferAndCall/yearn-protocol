pragma solidity ^0.6.12;

import "../interfaces/aave/LendingPoolAddressesProvider.sol";

contract MockAave is LendingPoolAddressesProvider {
    address public immutable lendingPool;
    constructor(
        address _lendingPool
    )
        public
    {
        lendingPool = _lendingPool;
    }

    function getLendingPool() external view override returns (address) {
        return lendingPool;
    }

    function getLendingPoolCore() external view override returns (address) {
        return address(0);
    }

    function getPriceOracle() external view override returns (address) {
        return address(0);
    }
}
