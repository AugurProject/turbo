// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;
pragma abicoder v2;

/**
 * @dev abstract / interface of the market factory (no implementation).
 * Use for communication between MarketFactory and AMMFactory.
 * help no dependencies conflict.
 */

abstract contract IMarketFactory {
    struct Market {
        address settlementAddress;
        address[] shareTokens; //OwnedERC20
        uint256 endTime;
        address winner; //OwnedERC20
        uint256 settlementFee;
        uint256 protocolFee;
        uint256 stakerFee;
        uint256 creationTimestamp;
        uint256[] initialOdds;
    }

    function collateral() public view virtual returns (address);

    function calcShares(uint256 _collateralIn) public view virtual returns (uint256);

    function mintShares(
        uint256 _id,
        uint256 _shareToMint,
        address _receiver
    ) public virtual;

    function burnShares(
        uint256 _id,
        uint256 _sharesToBurn,
        address _receiver
    ) public virtual returns (uint256);

    function getMarket(uint256 _id) public view virtual returns (Market memory);

    function shareFactor() public view virtual returns (uint256);

    function isMarketResolved(uint256 _id) public view virtual returns (bool);

    function claimWinnings(uint256 _id, address _receiver) public virtual returns (uint256);

    function calcCost(uint256 _shares) public view virtual returns (uint256);
}
