// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;


interface ITurboShareToken {
    function trustedTransfer(address _from, address _to, uint256 _amount) external;
    function trustedMint(address _target, uint256 _amount) external;
    function trustedBurn(address _target, uint256 _amount) external;
    function trustedBurnAll(address _target) external returns (uint256);

    // IERC20
    function totalSupply() external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}