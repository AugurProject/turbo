// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../balancer/BPool.sol";
import "../turbo/AbstractMarketFactoryV3.sol";
import "hardhat/console.sol";

contract EvenTheOdds is BNum {
    using SafeMathUint256 for uint256;

    uint256 private constant MAX_UINT = 2**256 - 1;

    function bringTokenBalanceToMatchOtherToken(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        BPool _bPool,
        uint256 _maxOutcome,
        uint256 _maxCollateralIn
    ) public returns (uint256 _collateralOut, uint256[] memory _balancesOut) {
        IERC20 _collateral = _marketFactory.collateral();

        // Will send remaining back.
        _collateral.transferFrom(msg.sender, address(this), _maxCollateralIn);
        _collateral.approve(address(_marketFactory), _maxCollateralIn);

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = _marketFactory.calcShares(_maxCollateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        uint256 _poolAmountOut = 0;
        uint256 _targetBalance = _bPool.getBalance(address(_market.shareTokens[_maxOutcome]));
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            if (i == _maxOutcome) continue;

            OwnedERC20 _token = _market.shareTokens[i];
            address _tokenAddress = address(_token);
            uint256 _amountToAdd = _targetBalance.sub(_bPool.getBalance(_tokenAddress));
            _token.approve(address(_bPool), _amountToAdd);

            require(_sets >= _amountToAdd, "_maxCollateralIn is insufficient");

            while (_amountToAdd > 0) {
                // This amount will increase as more of the token is added.
                uint256 _maxAmountAddable = bmul(_bPool.getBalance(_tokenAddress), MAX_IN_RATIO);
                uint256 _amountThisPass = _amountToAdd;

                if (_amountToAdd >= _maxAmountAddable) {
                    _amountThisPass = _maxAmountAddable;
                }

                _poolAmountOut += _bPool.joinswapExternAmountIn(_tokenAddress, _amountThisPass, 0);
                _amountToAdd = _amountToAdd.sub(_amountThisPass);
            }
        }

        uint256[] memory minAmountsOut = new uint256[](_market.shareTokens.length);
        _bPool.exitPool(_poolAmountOut, minAmountsOut);

        uint256 _setsToSell = MAX_UINT;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            if (_setsToSell > _market.shareTokens[i].balanceOf(address(this))) {
                _setsToSell = _market.shareTokens[i].balanceOf(address(this));
            }
        }

        // Must be a multiple of share factor.
        _setsToSell = (_setsToSell / _marketFactory.shareFactor()) * _marketFactory.shareFactor();

        // Send back collateral.
        _collateralOut = _marketFactory.burnShares(_marketId, _setsToSell, msg.sender);

        // Send back any lingering shares.
        _balancesOut = new uint256[](_market.shareTokens.length);
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            _balancesOut[i] = _market.shareTokens[i].balanceOf(address(this));
            _market.shareTokens[i].transfer(msg.sender, _balancesOut[i]);
        }
    }
}
