pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "./HatcheryRegistry.sol";
import "../balancer/BFactory.sol";
import "./IArbiter.sol";
import "./ITurboHatchery.sol";

contract AMMFactory is HasTurboStruct {
    using SafeMathUint256 for uint256;

    uint256 private constant MAX_UINT = 2**256 - 1;

    BFactory public bFactory;

    event PoolCreated(address _pool, address indexed _hatchery, uint256 indexed _turboId, address indexed _creator);

    constructor(BFactory _bFactory) public {
        bFactory = _bFactory;
    }

    function createPool(ITurboHatchery _hatchery, uint256 _turboId, uint256 _initialLiquidity, uint256[] memory _weights, address _lpTokenRecipient) public returns (BPool) {
        Turbo memory _turbo = getTurbo(_hatchery, _turboId);
        require(_weights.length == _turbo.shareTokens.length, "Must have one weight for each share token");

        //  Turn collateral into shares
        IERC20 _collateral = _hatchery.collateral();
        _collateral.transferFrom(msg.sender, address(this), _initialLiquidity);
        _collateral.approve(address(_hatchery), MAX_UINT);
        uint256 _sets = _initialLiquidity / _turbo.numTicks;
        _hatchery.mintCompleteSets(_turboId, _sets, address(this));

        // Setup pool
        BPool _pool = bFactory.newBPool();
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            ITurboShareToken _token = _turbo.shareTokens[i];
            _token.approve(address(_pool), MAX_UINT);
            _pool.bind(address(_token), _sets, _weights[i]);
        }
        _pool.finalize();

        // Pass along LP tokens for initial liquidity
        uint256 _lpTokenBalance = _pool.balanceOf(address(this));
        _pool.transfer(_lpTokenRecipient, _lpTokenBalance);

        emit PoolCreated(address(_pool), address(_hatchery), _turboId, msg.sender);
        return _pool;
    }

    function getTurbo(ITurboHatchery _hatchery, uint256 _turboId) private view returns (Turbo memory) {
        (address _creator, uint256 _creatorFee, uint256 _numTicks, IArbiter _arbiter, uint256 _creatorFees) = _hatchery.turbos(_turboId);
        ITurboShareToken[] memory _shareTokens = _hatchery.getShareTokens(_turboId); // solidity won't return complex types in structs
        return Turbo(_creator, _creatorFee, _numTicks, _arbiter, _shareTokens, _creatorFees);
    }
}
