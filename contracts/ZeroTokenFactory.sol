// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ZeroToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZeroTokenFactory
 * @dev Factory contract for deploying ZeroToken instances.
 */
contract ZeroTokenFactory is AccessControl {
    
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");
    bytes32 private constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 private constant PROTOCOL_ROLE = keccak256("PROTOCOL_ROLE");

    /// @notice Emitted when a new ZeroToken is deployed.
    /// @param zeroTokenAddress The address of the deployed ZeroToken.
    /// @param deployer The address that initiated the deployment.
    event ZeroTokenCreated(address indexed zeroTokenAddress, address indexed deployer);

    constructor(address adminAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(FACTORY_ADMIN_ROLE, adminAddress);
    }

    /**
     * @dev Deploys a new ZeroToken instance.
     * @param name The name of the ERC20 token.
     * @param symbol The symbol of the ERC20 token.
     * @param reserveToken The ERC20 token used as the reserve asset.
     * @param vaultEntryFeeBps The vault entry fee in basis points.
     * @param vaultExitFeeBps The vault exit fee in basis points.
     * @param protocolEntryFeeBps The protocol entry fee in basis points.
     * @param protocolExitFeeBps The protocol exit fee in basis points.
     * @param creatorEntryFeeBps The creator entry fee in basis points.
     * @param creatorExitFeeBps The creator exit fee in basis points.
     * @param protocolAddress The protocol fee recipient address.
     * @param adminAddress The default admin role address for the new ZeroToken.
     * @return zeroToken The address of the newly deployed ZeroToken contract.
     */
    function createZeroToken(
        string memory name,
        string memory symbol,
        IERC20 reserveToken,
        uint256 vaultEntryFeeBps,
        uint256 vaultExitFeeBps,
        uint256 protocolEntryFeeBps,
        uint256 protocolExitFeeBps,
        uint256 creatorEntryFeeBps,
        uint256 creatorExitFeeBps,
        address protocolAddress,
        address adminAddress
    ) external onlyRole(FACTORY_ADMIN_ROLE) returns (address zeroToken) {
        ZeroToken token = new ZeroToken(
            name,
            symbol,
            reserveToken,
            vaultEntryFeeBps,
            vaultExitFeeBps,
            protocolEntryFeeBps,
            protocolExitFeeBps,
            creatorEntryFeeBps,
            creatorExitFeeBps,
            protocolAddress,
            adminAddress
        );

        // Transfer the CREATOR_ROLE to the msg.sender (deployer)
        token.grantRole(CREATOR_ROLE, msg.sender);
        token.renounceRole(CREATOR_ROLE, address(this));

        emit ZeroTokenCreated(address(token), msg.sender);

        return address(token);
    }

    // Function to update the FACTORY_ADMIN_ROLE
    function setFactoryAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(FACTORY_ADMIN_ROLE, newAdmin);
    }

    // Function to remove an admin from FACTORY_ADMIN_ROLE
    function removeFactoryAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(FACTORY_ADMIN_ROLE, admin);
    }

    // Override supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
