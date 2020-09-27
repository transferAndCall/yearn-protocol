pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/aave/AaveToken.sol";

contract MockAaveToken is AaveToken, ERC20 {
    address public immutable underlying;

    constructor(
        address _underlying
    )
        public
        ERC20("Chainlink aToken", "aLINK")
    {
        _mint(msg.sender, 30000 * 10**18);
        underlying = _underlying;
    }

    function underlyingAssetAddress() external view override returns (address) {
        return underlying;
    }
}
