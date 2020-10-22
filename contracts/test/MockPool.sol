pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IMockPool.sol";

contract MockPool is IMockPool, ERC20 {
    IERC20 public immutable depositToken;
    mapping(address => uint256) public override deposits;
    mapping(address => uint256) public override yield;

    constructor(
        IERC20 _depositToken
    )
        public
        ERC20("Pool Token", "PT")
    {
        depositToken = _depositToken;
    }

    function deposit(uint256 _amount) external override {
        deposits[msg.sender] += _amount;
        depositToken.transferFrom(msg.sender, address(this), _amount);
    }

    function withdraw(uint256 _amount) external override {
        require(deposits[msg.sender] >= _amount, "!balance");
        deposits[msg.sender] -= _amount;
        depositToken.transfer(msg.sender, _amount);
    }

    function harvest() external override {
        uint256 balance = yield[msg.sender];
        delete yield[msg.sender];
        _mint(msg.sender, balance);
    }

    // mock helper function to simulate yield being generated
    function addYield(address _account, uint256 _amount) external {
        yield[_account] += _amount;
    }

    // mock helper function to simulate impermanent loss
    function subYield(address _account, uint256 _amount) external {
        require(yield[_account] >= _amount, "!yield");
        yield[_account] -= _amount;
    }
}
