pragma solidity 0.5.15;

import "./TurboHatchery.sol";
import "./TurboShareTokenFactory.sol";
import "../libraries/Ownable.sol";
import "../augur-para/FeePot.sol";


contract HatcheryRegistry is Ownable {
    using SafeMathUint256 for uint256;

    IERC20DynamicSymbol public reputationToken;
    address[] public hatcheries;
    // collateral => hatchery
    mapping(address => TurboHatchery) public getHatchery;

    event NewHatchery(address id, address indexed collateral);

    constructor(address _owner, IERC20DynamicSymbol _reputationToken) public {
        owner = _owner;
        reputationToken = _reputationToken;
    }

    function createHatchery(IERC20 _collateral) public onlyOwner returns (TurboHatchery) {
        require(getHatchery[address(_collateral)] == TurboHatchery(0), "Only one hatchery per collateral");
        TurboShareTokenFactory _shareTokenFactory = new TurboShareTokenFactory();
        FeePot _feePot = new FeePot(_collateral, reputationToken);
        TurboHatchery _hatchery = new TurboHatchery(ITurboShareTokenFactory(address(_shareTokenFactory)), _feePot);
        _shareTokenFactory.initialize(_hatchery);
        hatcheries.push(address(_hatchery));
        getHatchery[address(_collateral)] = _hatchery;
        emit NewHatchery(address(_hatchery), address(_collateral));
        return _hatchery;
    }

    function onTransferOwnership(address, address) internal {}
}