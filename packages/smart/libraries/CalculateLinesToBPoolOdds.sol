// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./SafeMathUint256.sol";
import "./SafeMathInt256.sol";
/**
 * 
 */
abstract contract CalculateLinesToBPoolOdds {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    function evenOdds(bool _invalid, uint256 _outcomes) internal pure returns (uint256[] memory _odds) {
        uint256 _size = _outcomes + (_invalid ? 1 : 0);
        _odds = new uint256[](_size);

        if (_invalid) _odds[0] = 1e18; // 2%

        uint256 _each = (_invalid ? 49e18 : 50e18) / _outcomes;
        for (uint256 i = _invalid ? 1 : 0; i < _size; i++) {
            _odds[i] = _each;
        }
    }

    function oddsFromLines(int256 _moneyline1, int256 _moneyline2) internal pure returns (uint256[] memory _odds) {
        uint256 _odds1 = __calcLineToOdds(_moneyline1);
        uint256 _odds2 = __calcLineToOdds(_moneyline2);

        uint256 _total = _odds1 + _odds2;

        _odds1 = uint256(49e18).mul(_odds1).div(_total);
        _odds2 = uint256(49e18).mul(_odds2).div(_total);

        require(_odds1 >= 1e18, "Moneyline odds are too skewed: would have under 2% odds");
        require(_odds2 >= 1e18, "Moneyline odds are too skewed: would have under 2% odds");

        _odds = new uint256[](3);
        _odds[0] = 1e18; // Invalid, 2%
        _odds[1] = _odds1;
        _odds[2] = _odds2;
    }

    function __calcLineToOdds(int256 _line) internal pure returns (uint256) {
        if (_line < 0) {
            // favored
            uint256 _posLine = uint256(-_line);
            return _posLine.mul(49e18).div(_posLine.add(100)); // 49e18 * _line / (_line + 100)
        } else {
            // underdog
            return uint256(4900e18).div(uint256(_line).add(100)); // 49e18 * 100 / (_line + 100)
        }
    }
}
