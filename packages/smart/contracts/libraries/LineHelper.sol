// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

abstract contract LineHelper {
    function build1Line() internal pure returns (int256[] memory _lines) {
        _lines = new int256[](1);
    }

    function build3Lines(int256 _homeSpread, int256 _totalScore) internal pure returns (int256[] memory _lines) {
        _lines = new int256[](3);
        // 0 is the Head-to-Head market, which has no lines
        _lines[1] = addHalfPoint(_homeSpread);
        _lines[2] = addHalfPoint(_totalScore);
    }

    function addHalfPoint(int256 _line) private pure returns (int256) {
        // The line is a quantity of tenths. So 55 is 5.5 and -6 is -60.
        // If the line is a whole number then make it a half point more extreme, to eliminate ties.
        // So 50 becomes 55, -60 becomes -65, and 0 becomes 5.
        if (_line >= 0 && _line % 10 == 0) {
            return _line + 5;
        } else if (_line < 0 && (-_line) % 10 == 0) {
            return _line - 5;
        } else {
            return _line;
        }
    }
}
