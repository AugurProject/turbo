pragma solidity 0.7.6;

import "./IWeightedPoolFactory.sol";

library TypeHelper {
    // convert address token to Asset
    function toAsset(address _token) internal pure returns (IAsset) {
        return IAsset(_token);
    }

		
    function toAsset(IERC20 _erc20) internal pure returns (IAsset) {
        return IAsset(address(_erc20));
    }
		
    // convert _tokenAddress to ERC20 interface
    function toERC20(address _tokenAddress) internal pure returns (IERC20) {
        return IERC20(_tokenAddress);
    }

    function toERC20s(address[] memory tokenAddresses) internal pure returns (IERC20[] memory) {
        IERC20[] memory tokens = new IERC20[](tokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length; ++i) {
            tokens[i] = toERC20(tokenAddresses[i]);
        }

        return tokens;
    }

    function toAssets(address[] memory tokenAddresses) internal pure returns (IAsset[] memory) {
        IAsset[] memory assets = new IAsset[](tokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length; ++i) {
            assets[i] = toAsset(tokenAddresses[i]);
        }

        return assets;
    }

    function toAssets(IERC20[] memory erc20Tokens) internal pure returns (IAsset[] memory) {
        IAsset[] memory assets = new IAsset[](erc20Tokens.length);

        for (uint256 i = 0; i < erc20Tokens.length; ++i) {
            assets[i] = toAsset(erc20Tokens[i]);
        }

        return assets;
    }

    function toAddress(IERC20[] memory tokens) internal pure returns (address[] memory) {
        address[] memory tokenAddresses = new address[](tokens.length);

        for (uint256 i = 0; i < tokens.length; ++i) {
            tokenAddresses[i] = address(tokens[i]);
        }

        return tokenAddresses;
    }
}
