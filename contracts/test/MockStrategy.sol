pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../interfaces/yearn/Strategy.sol";
import "../interfaces/yearn/IController.sol";
import "../interfaces/yearn/OneSplitAudit.sol";
import "./IMockPool.sol";

contract MockStrategy is Strategy {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IMockPool public pool;
    address public controller;
    address public override want;
    address public governance;
    address public onesplit;

    constructor(
        address _controller,
        address _onesplit
    ) public {
        controller = _controller;
        onesplit = _onesplit;
        governance = msg.sender;
    }

    function getName() external pure returns (string memory) {
        return "MockStrategy";
    }

    function setGovernance(address _governance) external {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    function setController(address _controller) external {
        require(msg.sender == governance, "!governance");
        controller = _controller;
    }

    function deposit() external override {
        require(msg.sender == controller, "!controller");
        uint256 balance = balanceOfWant();
        IERC20(want).safeApprove(controller, 0);
        IERC20(want).safeApprove(controller, balance);
        pool.deposit(balance);
    }

    // NOTE: must exclude any tokens used in the yield
    // Controller role - withdraw should return to Controller
    function withdraw(address _asset) external override {
        require(msg.sender == controller, "!controller");
        require(want != address(_asset), "want");
        uint256 balance = IERC20(_asset).balanceOf(address(this));
        IERC20(_asset).safeTransfer(controller, balance);
    }

    // Controller | Vault role - withdraw should always return to Vault
    // withdraws the want token
    function withdraw(uint256 _amount) external override {
        require(msg.sender == controller, "!controller");
        pool.withdraw(_amount);
        address _vault = IController(controller).vaults(want);
        require(_vault != address(0), "!vault");
        IERC20(want).safeTransfer(_vault, _amount);
    }

    // Controller | Vault role - withdraw should always return to Vault
    // withdraws the want token
    function withdrawAll() external override returns (uint256 balance) {
        require(msg.sender == controller, "!controller");
        pool.withdraw(pool.deposits(address(this)));
        address _vault = IController(controller).vaults(want);
        require(_vault != address(0), "!vault");
        balance = balanceOfWant();
        IERC20(want).safeTransfer(_vault, balance);
    }

    // For the purpose of mocking a strategy with the DelegatedController,
    // skim should send want tokens to the controller.
    function skim() external override {
        require(msg.sender == controller, "!controller");
        // Get the pool token from the pool to the strategy
        pool.harvest();
        uint256 poolTokenBalance = balanceOfPoolToken();
        // Swap it for the want token
        IERC20(pool).safeApprove(onesplit, 0);
        IERC20(pool).safeApprove(onesplit, poolTokenBalance);
        (
            uint256 _expected,
            uint256[] memory _distribution
        ) = OneSplitAudit(onesplit).getExpectedReturn(address(pool), want, poolTokenBalance, 1, 0);
        OneSplitAudit(onesplit).swap(address(pool), want, poolTokenBalance, _expected, _distribution, 0);
        // Transfer this address' want token balance to the controller
        IERC20(want).safeTransfer(controller, balanceOfWant());
    }

    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    function balanceOfPoolToken() public view returns (uint256) {
        return pool.balanceOf(address(this));
    }

    function balanceOf() public view override returns (uint256) {
        return balanceOfWant().add(balanceOfPoolToken());
    }
}
