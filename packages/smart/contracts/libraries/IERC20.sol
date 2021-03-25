// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;


abstract contract IERC20 {
    uint8 public decimals = 18;
    function totalSupply() virtual external view returns (uint256);
    function balanceOf(address owner) virtual public view returns (uint256);
    function transfer(address to, uint256 amount) virtual public returns (bool);
    function transferFrom(address from, address to, uint256 amount) virtual public returns (bool);
    function approve(address spender, uint256 amount) virtual public returns (bool);
    function allowance(address owner, address spender) virtual public view returns (uint256);

    // solhint-disable-next-line no-simple-event-func-name
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
