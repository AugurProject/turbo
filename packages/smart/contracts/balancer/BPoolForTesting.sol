// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./BFactory.sol";
import "../libraries/IERC20Full.sol";

contract BPoolForTesting {
    BFactory public bFactory;
    uint256 private constant MAX_UINT = 2**256 - 1;

    function createBPoolForTesting(
        IERC20Full[] calldata _tokens,
        uint256[] calldata _initialLiquidity,
        uint256[] calldata _weights
    ) external returns (BPool) {
        require(
            _tokens.length == _weights.length && _tokens.length == _initialLiquidity.length,
            "Tokens, weights and initial liquidity should all have the same length."
        );

        BPool _pool = bFactory.newBPool();

        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].approve(address(_pool), MAX_UINT);
            _pool.bind(address(_tokens[i]), _initialLiquidity[i], _weights[i]);
        }

        _pool.finalize();

        return _pool;
    }
}
