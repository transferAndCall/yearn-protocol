pragma solidity ^0.6.12;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/aave/Aave.sol";

// Mocks a lending pool using a single asset as collateral
contract MockLendingPool is Aave {
    address immutable feedReserve;
    address immutable feedStable;
    address immutable reserve;
    address immutable stable;
    mapping(address => mapping(address => uint256)) internal borrowed;

    constructor(
        address _feedReserve,
        address _reserve,
        address _feedStable,
        address _stable
    )
        public
    {
        feedReserve = _feedReserve;
        reserve = _reserve;
        feedStable = _feedStable;
        stable = _stable;
    }

    function borrow(
        address,
        uint256 _amount,
        uint256,
        uint16
    )
        external
        override
    {
        uint256 availableBorrowsETH = getAvailable(msg.sender);
        require(availableBorrowsETH >= _amount, "!balance");
        borrowed[stable][msg.sender] += _amount;
        IERC20(stable).transfer(msg.sender, _amount);
    }

    function setUserUseReserveAsCollateral(
        address,
        bool
    )
        external
        override
    {
        return;
    }

    function repay(
        address _reserve,
        uint256 _amount,
        address payable
    )
        external
        payable
        override
    {

        borrowed[stable][msg.sender] -= _amount;
        IERC20(stable).transferFrom(msg.sender, address(this), _amount);
    }

    function getUserAccountData(address _user)
        external
        view
        override
        returns (
            uint256,
            uint256,
            uint256 totalBorrowsETH,
            uint256,
            uint256 availableBorrowsETH,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 priceStable = uint256(AggregatorInterface(feedStable).latestAnswer());
        totalBorrowsETH = borrowed[stable][_user] * priceStable / 1e18;
        availableBorrowsETH = getAvailable(msg.sender);
        return (0,0,totalBorrowsETH,0,availableBorrowsETH,0,0,0);
    }

    function getUserReserveData(address _reserve, address _user)
        external
        view
        override
        returns (
            uint256,
            uint256 currentBorrowBalance,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            bool
        )
    {
        uint256 priceStable = uint256(AggregatorInterface(feedStable).latestAnswer());
        currentBorrowBalance = priceStable * borrowed[stable][_user] / 1e18;
        return (0,currentBorrowBalance,0,0,0,0,0,0,0,true);
    }

    function getAvailable(address _user) internal view returns (uint256 availableBorrowsETH) {
        uint256 priceReserve = uint256(AggregatorInterface(feedReserve).latestAnswer());
        availableBorrowsETH = IERC20(reserve).balanceOf(_user) * 65 / 100;
        availableBorrowsETH = availableBorrowsETH * priceReserve / 1e18;
    }
}
