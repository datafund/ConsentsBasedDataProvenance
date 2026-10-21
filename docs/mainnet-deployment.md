# Mainnet deployment

Mainnet deploys differ from testnet deploys in three ways:

| | Testnets (`sepolia`, `chiado`, `baseSepolia`) | Mainnets (`mainnet`, `gnosis`, `base`) |
|---|---|---|
| Signing | Plaintext key in `TESTNET_DEPLOYER_PRIVATE_KEY` | Ledger hardware wallet, address in `MAINNET_DEPLOYER_ADDRESS` |
| Entry point | `npx hardhat ignition deploy ... --network <testnet>` | `npm run deploy:mainnet:<ethereum\|gnosis\|base>` |
| Admin rights after deploy | Stay with the deployer | Moved to a Gnosis Safe (`MAINNET_SAFE_ADDRESS`) before the script finishes |

Use [`mainnet-launch-checklist.md`](mainnet-launch-checklist.md) when doing a real launch.

## What the config enforces

These checks live in [`config/networks.ts`](../config/networks.ts) and run every time Hardhat starts with a mainnet network selected. A network counts as mainnet if its name is `mainnet`, `gnosis` or `base`, or if its chain ID is 1, 100 or 8453 (so a renamed copy of a mainnet network is still checked).

- **No plaintext keys on mainnet.** Mainnet networks leave `accounts` unset (Hardhat's default, `"remote"`) and sign only through `ledgerAccounts` (`@nomicfoundation/hardhat-ledger`). If a mainnet network sets `accounts` at all (a key list, a mnemonic, or even `[]`), Hardhat refuses to start. In Hardhat 2, any `accounts` array is wrapped *outside* hardhat-ledger, which hides the Ledger account (`eth_accounts` returns `[]` and sends fail with `HH103`).
- **Separate variables.** Mainnet networks never read `TESTNET_DEPLOYER_PRIVATE_KEY`. Hardhat refuses every mainnet network while any variable not prefixed `TESTNET_` (in any case) either has a key-like name, or holds a 32-byte hex value. Only variable names are printed, never values.
  - Key-like names contain `PRIVATE_KEY`, `PRIVKEY`, `MNEMONIC`, `SEED_PHRASE`, `DEPLOYER_KEY`, `SIGNER_KEY` or `WALLET_KEY`, in any case and anywhere in the name: for example `MAINNET_DEPLOYER_PRIVATE_KEY`, `private_key_mainnet`, `DEPLOYER_KEY`.
  - Names ending in `_PATH` or `_ID` (for example `SSH_PRIVATE_KEY_PATH`, `KMS_SIGNER_KEY_ID`) are not flagged by name, because they point at a key rather than hold one. Their values are still checked.
  - The check fails closed, so a 32-byte salt or hash (`DEPLOY_SALT`, `CREATE2_SALT`, `INIT_CODE_HASH`, ...) is refused too. If you have checked that such a variable is not a key, list it in `MAINNET_ALLOW_ENV=NAME1,NAME2`. Names containing `PRIVATE_KEY`, `PRIVKEY`, `MNEMONIC` or `SEED_PHRASE` are never allowed, even if listed.
- **Address, not key.** `MAINNET_DEPLOYER_ADDRESS` must be a 20-byte address. If it holds a 32-byte value (a private key pasted into the wrong variable), Hardhat refuses to load at all. Treat that key as leaked.

`test/MainnetDeploy.test.ts` covers each of these. It also runs the real Hardhat runtime with `--network mainnet` against a local node that reports chain ID 1, and checks that `eth_accounts` includes the Ledger address and that a send from it reaches hardhat-ledger.

## What the deploy script does

[`scripts/deploy-mainnet.ts`](../scripts/deploy-mainnet.ts) runs these steps in order. Every check in steps 1 to 4 happens before the first transaction, so a misconfigured run costs nothing.

1. Refuses anything that is not a mainnet network.
2. Checks, without deploying, that the module returns futures named `dataProvenance`, `purposeRegistry` and `consentAuditLog`.
3. Refuses if `MAINNET_SAFE_ADDRESS` is unset or malformed.
4. Reads the Safe on the target chain. It must have contract code and answer `getOwners()`, `getThreshold()` and `VERSION()`. The version must be 1.3.0, 1.4.1 or 1.5.0, and the threshold at least 2. `MAINNET_SAFE_OWNERS` (a comma-separated address list) is **required**, and the Safe's owners must match it exactly; order and case don't matter. The owner check is the real identity check: any contract can return a plausible `VERSION()`.
5. Checks that `eth_accounts` on the network includes the Ledger account in `MAINNET_DEPLOYER_ADDRESS`. It then signs as that address; it does not pick the first account, because accounts reported by the RPC node itself come first. It also checks that the Ledger account is not the Safe.
6. Deploys the Ignition module in `MAINNET_IGNITION_MODULE`. The deployment ID is `chain-<chainId>`, the same as the Ignition CLI uses, so an interrupted run resumes when re-run.
7. Hands every admin right to the Safe (see the table below). Steps already done are skipped, so re-running is safe.
8. Reads back the result and fails loudly if any check does not hold. The Safe must be the only `ADMIN_ROLE` member, and the deployer must hold none of `ADMIN_ROLE`, `OPERATOR_ROLE` or `AUDITOR_ROLE`. `OPERATOR_ROLE` and `AUDITOR_ROLE` must have no members (a fresh deploy), and both `admin()` values must be the Safe.

   The read-back is a fresh-deploy check. Once the Safe has granted `OPERATOR_ROLE` or `AUDITOR_ROLE` to anyone, re-running the script on that deployment fails the read-back by design. That is expected, not a problem with the deployment; check the roles on the explorer instead.

> **Warning:** do not run `npx hardhat ignition deploy ... --network mainnet|gnosis|base` directly. It deploys with the Ledger, but it skips the Safe check before the deploy and the admin hand-off after it, so the Ledger account remains admin. If that happened, set `MAINNET_IGNITION_MODULE` to the same module and run `npm run deploy:mainnet:<network>`. Ignition sees the deployment as complete, and the script then does the hand-off and the read-back.

### Admin rights that move to the Safe

| Contract | Admin right | Hand-off |
|---|---|---|
| DataProvenance | `ADMIN_ROLE` (grants and revokes `OPERATOR_ROLE` and `AUDITOR_ROLE`) | `grantRole(ADMIN_ROLE, safe)`, then the deployer calls `renounceRole(ADMIN_ROLE)`. The Safe always gets the role before the deployer gives it up. |
| PurposeRegistry | `admin` (register, deactivate and reactivate purposes) | `transferAdmin(safe)` |
| ConsentAuditLog | `admin` (authorize audit recorders) | `transferAdmin(safe)` |

ConsentReceipt, KantaraConsentReceipt, ConsentProxy, DataAccessControl, DataDeletion and IntegratedConsentProvenanceSystem have no admin role.

`DataProvenance.contractAdmin()` keeps returning the deployer address after the hand-off. It is set once in the constructor and not used for any access check, so it does not grant anything. Check `hasRole(ADMIN_ROLE, ...)` instead.

After the hand-off, granting `OPERATOR_ROLE` or `AUDITOR_ROLE`, registering purposes and authorizing audit recorders all go through Safe transactions.

## One-time setup

1. **Ledger.** Install the Ethereum app, and enable "Blind signing" (called "Contract data" on older firmware) in its settings: contract deployments cannot be clear-signed. Connect the device over USB, unlock it, and open the Ethereum app before running any command. Linux needs udev rules for Ledger devices.
2. **Deployer address.** Note the Ledger account address you will deploy from (default derivation path `m/44'/60'/0'/0/0`), fund it with enough native gas token for 9 contract deployments plus 4 hand-off transactions on the target chain, and set it as `MAINNET_DEPLOYER_ADDRESS`.
3. **Safe.** Create a Safe on the target chain (https://app.safe.global) with a threshold of at least 2. A Safe address is per chain: check that the Safe exists on the chain you are deploying to. Set `MAINNET_SAFE_ADDRESS`.
4. **Module.** Set `MAINNET_IGNITION_MODULE` to the module to deploy, for example `ignition/modules/ConsentSystemV3.ts`. There is deliberately no default.
5. **RPC.** Optionally set `MAINNET_ETHEREUM_RPC_URL`, `MAINNET_GNOSIS_RPC_URL` or `MAINNET_BASE_RPC_URL` to a dedicated provider. The public defaults work but can rate-limit. The endpoint must answer `eth_accounts`, because hardhat-ledger calls it. `https://mainnet.base.org` rejects it, which is why the Base default is `https://base-rpc.publicnode.com`. The script stops with a clear error if `eth_accounts` fails.
6. **Safe owners (required).** Set `MAINNET_SAFE_OWNERS` to the comma-separated owner addresses you expect. The script refuses to deploy without it, and refuses a Safe whose owners differ.
7. Make sure no variable that trips the plaintext-key check is set in your shell or `.env`, other than `TESTNET_DEPLOYER_PRIVATE_KEY`. That means any name containing `PRIVATE_KEY`, `PRIVKEY`, `MNEMONIC`, `SEED_PHRASE`, `DEPLOYER_KEY`, `SIGNER_KEY` or `WALLET_KEY` (in any case, except names ending in `_PATH` or `_ID`), and any variable holding a 32-byte hex value. If a flagged variable is not a key, list it in `MAINNET_ALLOW_ENV`.

These variables are not secret, but keep them out of git anyway: `.env` is gitignored.

## Deploying

Run on the host, not in Docker: the container has no access to the USB device.

```bash
npx hardhat compile
npx hardhat test
npm run deploy:mainnet:gnosis      # or deploy:mainnet:ethereum / deploy:mainnet:base
```

Confirm each transaction on the Ledger screen. Check the recipient and data before confirming. Expect 9 deployments followed by up to 4 hand-off transactions.

If the run stops part-way (a rejected confirmation, a nonce error, a dropped RPC), run the same command again. Ignition resumes the deployment from `ignition/deployments/chain-<chainId>/`, and the hand-off skips steps already done. If the Ledger was absent or locked (Ignition error `IGN411`), nothing was broadcast, so just re-run. `npx hardhat ignition track-tx` only applies after a transaction was actually broadcast.

The script ends by printing the read-back of every admin right. If it prints `Post-deploy checks failed`, do not announce the deployment: fix the failed item first.

## After deploying

```bash
npm run post-deploy                                                  # deployments.md and dist/abis/
npx hardhat ignition verify chain-<chainId> --network <network>      # source verification
```

Ethereum mainnet verification goes through Etherscan and needs `ETHERSCAN_API_KEY`. Gnosis and Base verify through Blockscout with no key.

Then follow the post-deploy section of the [launch checklist](mainnet-launch-checklist.md), and commit `ignition/deployments/chain-<chainId>/deployed_addresses.json`, `deployments.md` and `dist/abis/` as described in `CLAUDE.md`.

## Upgradeable contracts (issue #7)

The contracts are not upgradeable yet. Issue #7 plans to put them behind UUPS proxies. This flow is meant to keep working when that lands:

- The hand-off works on contract addresses, not on how they were deployed. A proxy-based Ignition module only has to return futures named `dataProvenance`, `purposeRegistry` and `consentAuditLog` that point at the proxies (the addresses users call). Point `MAINNET_IGNITION_MODULE` at it.
- In the #7 design, `_authorizeUpgrade` checks `ADMIN_ROLE`. Moving `ADMIN_ROLE` to the Safe therefore also puts upgrade authority with the Safe, and the read-back already checks that the deployer no longer holds it.
- If #7 adds a new kind of privileged role (for example a separate upgrader role, or `ADMIN_ROLE` on more contracts), add it to `handOffAdmin` and `verifyHandoff` in `scripts/lib/mainnet-deploy.ts`, with a test.
