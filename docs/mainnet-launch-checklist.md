# Mainnet launch checklist

Copy this list into the launch issue and tick items as you go. Background and commands are in [`mainnet-deployment.md`](mainnet-deployment.md).

Network: ______  Chain ID: ______  Ignition module: ______  Commit: ______

## Before deploying

- [ ] The commit being deployed is tagged, and `main` has no unreleased contract changes you did not intend to ship.
- [ ] `npx hardhat compile` and `npx hardhat test` pass on that commit.
- [ ] The same Ignition module was deployed to a testnet from the same commit, and the examples or downstream smoke tests ran against it.
- [ ] Any audit findings for this commit are resolved or explicitly accepted.
- [ ] Safe exists **on the target chain**, threshold is at least 2, and the owners listed in the Safe app are the expected people. Safe address: ______
- [ ] At least `threshold` Safe signers are available on launch day to act on follow-up transactions.
- [ ] Ledger: firmware and Ethereum app up to date, blind signing enabled, device unlocked with the Ethereum app open.
- [ ] `MAINNET_DEPLOYER_ADDRESS` is the Ledger account (checked on the device screen) and is funded for 9 deployments plus 4 hand-off transactions. Balance: ______
- [ ] `MAINNET_SAFE_ADDRESS`, `MAINNET_SAFE_OWNERS`, `MAINNET_IGNITION_MODULE` and the RPC URL are set. The RPC answers `eth_accounts`. Apart from `TESTNET_DEPLOYER_PRIVATE_KEY`, nothing is set whose name contains `PRIVATE_KEY`, `PRIVKEY`, `MNEMONIC`, `SEED_PHRASE`, `DEPLOYER_KEY`, `SIGNER_KEY` or `WALLET_KEY` (in any case, except `_PATH`/`_ID` names), and nothing holds a 32-byte hex value, unless it is checked and listed in `MAINNET_ALLOW_ENV`.
- [ ] `ignition/deployments/chain-<chainId>/` does not exist yet (fresh deploy), or you intend to resume it.
- [ ] Explorer API key set if deploying to Ethereum mainnet (`ETHERSCAN_API_KEY`).

## Deploying

- [ ] `npm run deploy:mainnet:<network>` started from the host, not Docker. Not `hardhat ignition deploy` directly, which skips the hand-off.
- [ ] Every transaction checked on the Ledger screen before confirming.
- [ ] Script finished and printed the admin read-back with no `Post-deploy checks failed` line.

## Verifying on the block explorer

- [ ] `npm run post-deploy` run; `deployments.md` lists the new chain.
- [ ] `npx hardhat ignition verify chain-<chainId> --network <network>` run; all 9 contracts show verified source on the explorer.
- [ ] Each contract's creation transaction was sent by the Ledger address.
- [ ] Hand-off transactions are visible: `RoleGranted` (Safe, `ADMIN_ROLE`) and `RoleRevoked` (deployer) on DataProvenance, a `transferAdmin` call on PurposeRegistry, and `AdminTransferred` on ConsentAuditLog.

## Ownership transfer, read back independently

Read these on the explorer's "Read Contract" tab, not only from the script output.

- [ ] DataProvenance `hasRole(ADMIN_ROLE, <Safe>)` is `true`.
- [ ] DataProvenance `hasRole(ADMIN_ROLE, <deployer>)` is `false`, and `getRoleMemberCount(ADMIN_ROLE)` is `1`.
- [ ] DataProvenance `hasRole(OPERATOR_ROLE, <deployer>)` and `hasRole(AUDITOR_ROLE, <deployer>)` are `false`, and `getRoleMemberCount` for both roles is `0` (before the Safe grants any).
- [ ] PurposeRegistry `admin()` is the Safe.
- [ ] ConsentAuditLog `admin()` is the Safe.
- [ ] Noted: DataProvenance `contractAdmin()` still shows the deployer. It is informational only and grants nothing.

## Post-deploy smoke reads

- [ ] IntegratedConsentProvenanceSystem `consentContract()` and `provenanceContract()` are the new ConsentReceipt and DataProvenance addresses.
- [ ] DataAccessControl and DataDeletion `provenanceContract()` is the new DataProvenance address.
- [ ] PurposeRegistry `getPurposeCount()` is 10 (the core purposes).
- [ ] ConsentReceipt `DOMAIN_SEPARATOR()` is non-zero.
- [ ] One end-to-end read from a downstream client (SDK or app) configured with the new addresses succeeds.

## After launch

- [ ] Safe transaction prepared and executed for any roles needed in operation (`OPERATOR_ROLE`, `AUDITOR_ROLE`, audit recorders).
- [ ] `deployed_addresses.json`, `deployments.md`, `dist/abis/` and the README address table committed.
- [ ] Downstream repos notified with the new addresses and ABIs (list in `CLAUDE.md`).
- [ ] Ledger deployer account no longer needed for anything: leftover funds moved out.
