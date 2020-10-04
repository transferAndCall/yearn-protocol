pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/aave/AaveToken.sol";

contract MockAaveToken is AaveToken, ERC20 {
    address public immutable underlying;

    constructor(
        address _underlying
    )
        public
        ERC20(
            string(abi.encodePacked("Aave Interest bearing ", ERC20(_underlying).symbol())),
            string(abi.encodePacked("a", ERC20(_underlying).symbol()))
        )
    {
        _mint(msg.sender, 1000000000 * 10**18);
        underlying = _underlying;
    }

    function underlyingAssetAddress() external view override returns (address) {
        return underlying;
    }
}
