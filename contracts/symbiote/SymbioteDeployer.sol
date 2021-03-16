pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "../augur-para/IParaUniverse.sol";
import "../libraries/Initializable.sol";
import "../libraries/SafeMathUint256.sol";
import "../libraries/IERC20.sol";
import "../augur-para/IFeePot.sol";
import "../augur-para/IParaOICash.sol";
import "./ISymbioteShareToken.sol";
import "./ISymbioteShareTokenFactory.sol";
import "./SymbioteShareTokenFactory.sol";
import "./IArbiter.sol";
import "./SymbioteHatchery.sol";


contract SymbioteDeployer {
    function deploy(IParaUniverse _universe) external {
        SymbioteShareTokenFactory _tokenFactory = new SymbioteShareTokenFactory();
        SymbioteHatchery _hatchery = new SymbioteHatchery();
        require(_hatchery.initialize(_universe, ISymbioteShareTokenFactory(address(_tokenFactory))), "hatchery initialization");
        require(_tokenFactory.initialize(address(_hatchery)), "token factory initialization");
    }
}