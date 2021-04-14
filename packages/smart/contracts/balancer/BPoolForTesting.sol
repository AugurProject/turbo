// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./BFactory.sol";
import "../libraries/IERC20Full.sol";
import "../libraries/Cash.sol";

contract BPoolForTesting {
    BFactory private bFactory;
    BPool private bPool;
    uint256 private constant MAX_UINT = 2**256 - 1;

    constructor(BFactory _bFactory) {
        bFactory = _bFactory;
    }

    function createBPoolForTesting(
        Cash[] calldata _tokens,
        uint256[] calldata _initialLiquidity,
        uint256[] calldata _weights
    ) external returns (BPool) {
        require(
            _tokens.length == _weights.length && _tokens.length == _initialLiquidity.length,
            "Tokens, weights and initial liquidity should all have the same length."
        );

        bPool = bFactory.newBPool();

        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].approve(address(bPool), MAX_UINT);
            bPool.bind(address(_tokens[i]), _initialLiquidity[i], _weights[i]);
        }

        bPool.finalize();

        return bPool;
    }

    function getBPool() external view returns(BPool) {
        return bPool;
    }
}
