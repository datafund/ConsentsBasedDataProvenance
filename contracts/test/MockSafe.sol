// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @notice Test-only stand-in for a Gnosis Safe: exposes the two read
///         functions the mainnet deploy script checks before handing over
///         admin rights. Never deploy this to a live network.
contract MockSafe {
    address[] private owners;
    uint256 private threshold;

    constructor(address[] memory _owners, uint256 _threshold) {
        owners = _owners;
        threshold = _threshold;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getThreshold() external view returns (uint256) {
        return threshold;
    }
}
