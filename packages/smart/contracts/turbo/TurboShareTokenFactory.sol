pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "../libraries/Initializable.sol";
import "./ITurboShareToken.sol";
import "./TurboShareToken.sol";


contract TurboShareTokenFactory is Initializable {

    string constant public INVALID_SYMBOL = "INVALID";
    bytes32 constant public INVALID_NAME = "INVALID SHARE";
    
    address public hatchery;

    function initialize(address _hatchery) public beforeInitialized returns (bool) {
        endInitialization();
        hatchery = _hatchery;
        return true;
    }

    function createShareTokens(bytes32[] calldata _names, string[] calldata _symbols) external returns (ITurboShareToken[] memory) {
        require(msg.sender == hatchery, "Only hatchery may create new share tokens");
        uint256 _numOutcomes = _names.length + 1;
        ITurboShareToken[] memory _tokens = new ITurboShareToken[](_numOutcomes);
        _tokens[0] = new TurboShareToken(INVALID_SYMBOL, INVALID_NAME, hatchery);
        for (uint256 _i = 1; _i < _numOutcomes; _i++) {
            _tokens[_i] = new TurboShareToken(_symbols[_i-1], _names[_i-1], hatchery);
        }
        return _tokens;
    }
}