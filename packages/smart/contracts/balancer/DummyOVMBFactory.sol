// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is disstributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./BColor.sol";

/**
 * @dev This contract is just a dummy to be deployed to the OVM
 *      The standard BFactory contract can't fit within the block gas limit so will always fail.
 *      This contract should be replaced with a factory for an AMM implementation which can be deployed
 */
contract DummyOVMBFactory is BBronze {
    event LOG_NEW_POOL(address indexed caller, address indexed pool);

    event LOG_BLABS(address indexed caller, address indexed blabs);

    mapping(address => bool) private _isBPool;

    function isBPool(address b) external view returns (bool) {
        return _isBPool[b];
    }

    function newBPool() external returns (address) {
        return address(this);
    }

    address private _blabs;

    constructor() {
        _blabs = msg.sender;
    }

    function getBLabs() external view returns (address) {
        return _blabs;
    }

    function setBLabs(address b) external {
        require(msg.sender == _blabs, "ERR_NOT_BLABS");
        emit LOG_BLABS(msg.sender, b);
        _blabs = b;
    }

    function collect(address pool) external {
        require(msg.sender == _blabs, "ERR_NOT_BLABS");
    }
}
