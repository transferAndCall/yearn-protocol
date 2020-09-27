pragma solidity ^0.6.12;

import "../interfaces/aave/LendingPoolAddressesProvider.sol";

contract MockAave is LendingPoolAddressesProvider {
    address public immutable lendingPool;
    address public immutable oracle;
    constructor(
        address _lendingPool,
        address _oracle
    )
        public
    {
        lendingPool = _lendingPool;
        oracle = _oracle;
    }

    function getLendingPool() external view override returns (address) {
        return lendingPool;
    }

    function getLendingPoolCore() external view override returns (address) {
        return lendingPool;
    }

    function getPriceOracle() external view override returns (address) {
        return oracle;
    }
}
