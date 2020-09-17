pragma solidity ^0.6.12;

import "../interfaces/yearn/OneSplitAudit.sol";

contract MockOneSplit is OneSplitAudit {
    uint256 public returnAmount;
    uint256[] public distribution;

    constructor(
        uint256 _returnAmount,
        uint256[] memory _distribution
    )
        public
    {
        setValues(_returnAmount, _distribution);
    }

    function setValues(
        uint256 _returnAmount,
        uint256[] memory _distribution
    )
        public
    {
        returnAmount = _returnAmount;
        distribution = _distribution;
    }

    function swap(
        address _fromToken,
        address _destToken,
        uint256 _amount,
        uint256 _minReturn,
        uint256[] calldata _distribution,
        uint256 _flags
    )
        external
        payable
        override
        returns (uint256)
    {
        return returnAmount;
    }

    function getExpectedReturn(
        address _fromToken,
        address _destToken,
        uint256 _amount,
        uint256 _parts,
        uint256 _flags // See constants in IOneSplit.sol
    )
        external
        view
        override
        returns (uint256, uint256[] memory)
    {
        return (returnAmount, distribution);
    }
}
