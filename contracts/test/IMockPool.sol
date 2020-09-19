pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMockPool is IERC20 {
    function deposits(address _account) external view returns (uint256);
    function deposit(uint256 _amount) external;
    function harvest() external;
    function withdraw(uint256 _amount) external;
    function yield(address _account) external view returns (uint256);
}
