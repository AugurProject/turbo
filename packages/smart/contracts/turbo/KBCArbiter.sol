pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "../libraries/IERC20.sol";
import "../augur-core/reporting/IMarket.sol";
import "../libraries/Initializable.sol";
import "./IArbiter.sol";
import "../libraries/SafeMathUint256.sol";
import "./ITurboHatchery.sol";


interface IMarketAccesors {
    function repBond() external returns (uint256);
    function crowdsourcers(bytes32) external returns(IERC20);
    function preemptiveDisputeCrowdsourcer() external returns(IERC20);
    function transferRepBondOwnership(address _newOwner) external returns (bool);
    function contribute(uint256[] calldata _payoutNumerators, uint256 _amount, string calldata _description) external returns (bool);
    function contributeToTentative(uint256[] calldata _payoutNumerators, uint256 _amount, string calldata _description) external returns (bool);
}

contract KBCArbiter is IArbiter, Initializable {
    using SafeMathUint256 for uint256;

    // How long the dispute takes in the best case
    uint256 private constant MIN_DURATION = 2 hours;
    uint256 private constant MAX_DURATION = 7 days;

    // When the winning payout changes the duration will be extended if needed to ensure at least the configured response time remains
    uint256 private constant MIN_RESPONSE_DURATION = 1 hours;
    uint256 private constant MAX_RESPONSE_DURATION = 2 days;

    // If a single stake exceeds the threshold KBC staking ends and a fallback market becomes needed to resolve the turbo
    uint256 private constant MIN_THRESHOLD = 1000 * 10**18;
    uint256 private constant MAX_THRESHOLD = 50000 * 10**18;

    uint256 private constant MAX_UINT = 2**256 - 1;
    address private constant NULL_ADDRESS = address(0);

    struct KBCConfiguration {
        uint256 duration;
        uint256 responseDuration;
        uint256 threshold;
        uint256 endTime;
        string extraInfo;
        int256[] prices;
        IMarket.MarketType marketType;
    }

    struct PayoutStake {
        mapping(address => uint256) userStake;
        uint256 totalPayoutStake;
        uint256[] payout;
    }

    struct TurboData {
        mapping(bytes32 => PayoutStake) stakes;
        uint256 beginTime;          // 0
        uint256 endTime;            // 1
        string extraInfo;           // 2
        uint256 responseDuration;   // 3
        uint256 threshold;          // 4
        uint256 numTicks;           // 5
        bytes32[] outcomeNames;
        string[] outcomeSymbols; // TODO does this mess up struct layout?
        int256[] prices;
        IMarket.MarketType marketType;  // 6
        bytes32 winningPayoutHash;      // 7
        uint256 totalStake;             // 8
        IMarket fallbackMarket;         // 9
    }

    address public hatchery;
    mapping(uint256 => TurboData) public turboData;

    IERC20 public reputationToken;
    IERC20 public collateral;
    IUniverse public universe;

    event Stake(uint256 turboId, uint256[] payout, uint256 amount, bool isWinner, address staker);
    event Withdraw(uint256 turboId, address staker, uint256 amount);

    function initialize(ITurboHatchery _hatchery, IUniverse _universe) public beforeInitialized returns (bool) {
        endInitialization();
        hatchery = address(_hatchery);
        universe = _universe;
        collateral = _hatchery.collateral();
        reputationToken = IFeePot(_hatchery.feePot()).reputationToken();
        return true;
    }

    function onTurboCreated(uint256 _id, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, bytes memory _arbiterConfiguration) public {
        require(msg.sender == hatchery, "Can only call `onTurboCreated` from the hatchery");
        (KBCConfiguration memory _config) = abi.decode(_arbiterConfiguration, (KBCConfiguration));
        require(_config.duration >= MIN_DURATION && _config.duration <= MAX_DURATION, "KBC duration is out of bounds");
        require(_config.threshold >= MIN_THRESHOLD && _config.threshold <= MAX_THRESHOLD, "KBC threshold is out of bounds");
        require(_config.endTime > block.timestamp, "Cannot create a market that is already over");
        require(_config.prices.length == 2);
        require(_config.prices[0] < _config.prices[1]);
        require(uint256(_config.prices[1] - _config.prices[0]) > _numTicks);
        require(_config.marketType != IMarket.MarketType.YES_NO, "YES/NO not permitted"); // just use categorical
        turboData[_id].beginTime = _config.endTime;
        turboData[_id].endTime = _config.endTime + _config.duration;
        turboData[_id].responseDuration = _config.responseDuration;
        turboData[_id].threshold = _config.threshold;
        turboData[_id].extraInfo = _config.extraInfo;
        turboData[_id].numTicks = _numTicks;
        turboData[_id].prices = _config.prices;
        turboData[_id].outcomeNames = _outcomeNames;
        turboData[_id].outcomeSymbols = _outcomeSymbols;
        turboData[_id].marketType = _config.marketType;
    }

    function encodeConfiguration(
        uint256 _duration,
        uint256 _responseDuration,
        uint256 _threshold,
        uint256 _endTime,
        string memory _extraInfo,
        int256[] memory _prices,
        IMarket.MarketType _marketType
    ) public pure returns (bytes memory) {
        return abi.encode(KBCConfiguration(_duration, _responseDuration, _threshold, _endTime, _extraInfo, _prices, _marketType));
    }

    function decodeConfiguration(bytes memory _arbiterConfiguration) public pure returns (KBCConfiguration memory) {
        (KBCConfiguration memory _config) = abi.decode(_arbiterConfiguration, (KBCConfiguration));
        return _config;
    }

    function getTurboResolution(uint256 _id) public returns (uint256[] memory) {
        uint256 _currentTime = block.timestamp;
        require(_currentTime >= turboData[_id].endTime, "KBC Arbiter has not finished resolving this turbo");
        if (turboData[_id].fallbackMarket != IMarket(0)) {
            require(turboData[_id].fallbackMarket.isFinalized(), "KBC Arbiter fallback market is not resolved");
            bool _isForked = turboData[_id].fallbackMarket.isForkingMarket();
            if (_isForked) {
                turboData[_id].fallbackMarket.getUniverse().getWinningChildUniverse().getPayoutNumerators();
            }
            return turboData[_id].fallbackMarket.getWinningReportingParticipant().getPayoutNumerators();
        }
        require(turboData[_id].totalStake < turboData[_id].threshold, "Threshold has been hit. Augur Fallback must be initiated and complete before resolution");
        return turboData[_id].stakes[turboData[_id].winningPayoutHash].payout;
    }

    function stake(uint256 _id, uint256[] calldata _payout, uint256 _amount) external {
        validatePayout(_id, _payout);
        uint256 _currentTime = block.timestamp;
        require(_currentTime < turboData[_id].endTime, "KBC Arbiter has finished staking time");
        require(turboData[_id].totalStake < turboData[_id].threshold, "Threshold has been hit. No more stake can be added to the KBC arbiter");
        reputationToken.transferFrom(msg.sender, address(this), _amount);
        bytes32 _payoutHash = getPayoutHash(_payout);
        turboData[_id].stakes[_payoutHash].userStake[msg.sender] += _amount;
        turboData[_id].stakes[_payoutHash].totalPayoutStake += _amount;
        turboData[_id].stakes[_payoutHash].payout = _payout;
        turboData[_id].totalStake += _amount;
        bytes32 _winningPayoutHash = turboData[_id].winningPayoutHash;
        if (_payoutHash != _winningPayoutHash && turboData[_id].stakes[_payoutHash].totalPayoutStake > turboData[_id].stakes[_winningPayoutHash].totalPayoutStake) {
            turboData[_id].winningPayoutHash = _payoutHash;
            if ((turboData[_id].endTime - _currentTime) < turboData[_id].responseDuration) {
                turboData[_id].endTime = _currentTime + turboData[_id].responseDuration;
            }
        }
        emit Stake(_id, _payout, _amount, turboData[_id].winningPayoutHash == _payoutHash, msg.sender);
    }

    function validatePayout(uint256 _id, uint256[] memory _payout) public view returns (bool) {
        uint256 _numOutcomes = turboData[_id].outcomeNames.length + 1;
        uint256 _numTicks = turboData[_id].numTicks;
        require(_payout[0] == 0 || _payout[0] == _numTicks);
        require(_payout.length == _numOutcomes, "Malformed payout length");
        uint256 _sum = 0;
        for (uint256 i = 0; i < _payout.length; i++) {
            uint256 _value = _payout[i];
            _sum = _sum.add(_value);
        }
        require(_sum == _numTicks, "Malformed payout sum");
        return true;
    }

    function getPayoutHash(uint256[] memory _payout) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_payout));
    }

    function withdraw(uint256 _id) external {
        uint256[] memory _payout = getTurboResolution(_id);
        bytes32 _payoutHash = getPayoutHash(_payout);
        uint256 _userStake = turboData[_id].stakes[_payoutHash].userStake[msg.sender];
        uint256 _totalPayoutStake = turboData[_id].stakes[_payoutHash].totalPayoutStake;
        uint256 _totalStake = turboData[_id].totalStake;
        uint256 _repPayout = _userStake * _totalStake / _totalPayoutStake;
        reputationToken.transfer(msg.sender, _repPayout);
        emit Withdraw(_id, msg.sender, _repPayout);
    }

    // Fallback Market Functions

    function initateAugurResolution(uint256 _id) external {
        require(turboData[_id].fallbackMarket == IMarket(0), "Fallback market already made");
        require(turboData[_id].totalStake >= turboData[_id].threshold, "Threshold has not been hit");
        // Pull in Validity bond from msg.sender
        collateral.transferFrom(msg.sender, address(this), universe.getOrCacheValidityBond());
        // Pull in REP bond from msg.sender
        reputationToken.transferFrom(msg.sender, address(this), universe.getOrCacheMarketRepBond());
        TurboData memory _turboData = turboData[_id];
        IMarket _market;
        if (_turboData.marketType == IMarket.MarketType.CATEGORICAL) {
            _market = universe.createCategoricalMarket(block.timestamp + 1, 0, IAffiliateValidator(NULL_ADDRESS), 0, address(this), turboData[_id].outcomeNames, turboData[_id].extraInfo);
        } else {
            _market = universe.createScalarMarket(block.timestamp + 1, 0, IAffiliateValidator(NULL_ADDRESS), 0, address(this), turboData[_id].prices, turboData[_id].numTicks, turboData[_id].extraInfo);
        }
        _market.transferOwnership(msg.sender);
        IMarketAccesors(address(_market)).transferRepBondOwnership(msg.sender);
        turboData[_id].fallbackMarket = _market;
    }

    function doInitialReportInFallback(uint256 _id, uint256[] calldata _payout, uint256 _additionalStake) external {
        IMarket _market = turboData[_id].fallbackMarket;
        uint256 _requiredStake = IMarketAccesors(address(_market)).repBond();
        uint256 _totalREPRequired = _requiredStake.add(_additionalStake);
        bytes32 _payoutHash = getPayoutHash(_payout);
        reduceStake(_id, _payoutHash, msg.sender, _totalREPRequired);
        _market.doInitialReport(_payout, "", _additionalStake);
        _market.getInitialReporter().transferOwnership(msg.sender);
    }

    function contributeInFallback(uint256 _id, uint256[] calldata _payout, uint256 _amount) external {
        IMarket _market = turboData[_id].fallbackMarket;
        bytes32 _payoutHash = getPayoutHash(_payout);
        reduceStake(_id, _payoutHash, msg.sender, _amount);
        IMarketAccesors(address(_market)).contribute(_payout, _amount, "");
        IERC20 _crowdsourcer = IMarketAccesors(address(_market)).crowdsourcers(_payoutHash);
        _crowdsourcer.transfer(msg.sender, _crowdsourcer.balanceOf(address(this)));
    }

    function contributeToTentativeInFallback(uint256 _id, uint256[] calldata _payout, uint256 _amount) external {
        IMarket _market = turboData[_id].fallbackMarket;
        bytes32 _payoutHash = getPayoutHash(_payout);
        reduceStake(_id, _payoutHash, msg.sender, _amount);
        IMarketAccesors(address(_market)).contributeToTentative(_payout, _amount, "");
        IERC20 _crowdsourcer = IMarketAccesors(address(_market)).preemptiveDisputeCrowdsourcer();
        _crowdsourcer.transfer(msg.sender, _crowdsourcer.balanceOf(address(this)));
    }

    function reduceStake(uint256 _id, bytes32 _payoutHash, address _user, uint256 _amount) private {
        turboData[_id].stakes[_payoutHash].userStake[_user] = turboData[_id].stakes[_payoutHash].userStake[_user].sub(_amount);
        turboData[_id].stakes[_payoutHash].totalPayoutStake = turboData[_id].stakes[_payoutHash].totalPayoutStake.sub(_amount);
        turboData[_id].totalStake = turboData[_id].totalStake.sub(_amount);
    }
}