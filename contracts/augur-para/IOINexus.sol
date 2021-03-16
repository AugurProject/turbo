pragma solidity 0.5.15;

import "../augur-core/reporting/IUniverse.sol";
import "./IParaUniverse.sol";


contract IOINexus {
    function getAttoCashPerRep(address _cash, address _reputationToken) public returns (uint256);
    function universeReportingFeeDivisor(address _universe) external returns (uint256);
    function addParaAugur(address _paraAugur) external returns (bool);
    function registerParaUniverse(IUniverse _universe, IParaUniverse _paraUniverse) external;
    function recordParaUniverseValuesAndUpdateReportingFee(IUniverse _universe, uint256 _targetRepMarketCapInAttoCash, uint256 _repMarketCapInAttoCash) external returns (uint256);
}
