// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @notice Test-only stand-in for a Gnosis Safe: exposes the read
///         functions the mainnet deploy script checks before handing over
///         admin rights. Never deploy this to a live network.
contract MockSafe {
    address[] private owners;
    uint256 private threshold;
    string private version;

    constructor(address[] memory _owners, uint256 _threshold, string memory _version) {
        owners = _owners;
        threshold = _threshold;
        version = _version;
    }

    function VERSION() external view returns (string memory) {
        return version;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getThreshold() external view returns (uint256) {
        return threshold;
    }
}
