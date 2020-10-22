pragma solidity ^0.6.12;

interface DelegatedVault {
    function token() external view returns (address);
    function deposit(uint256) external;
    function depositAll() external;
    function withdraw(uint256) external;
    function withdrawAll() external;
    function getPricePerFullShare() external view returns (uint);
    function claimInsurance() external;
}
