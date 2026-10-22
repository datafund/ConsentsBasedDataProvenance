// Test fixture, not a deploy script. Run as a child process by test/MainnetDeploy.test.ts against a local node
// with a mainnet chain ID. Prints what the real Hardhat runtime (config +
// hardhat-ledger, no device attached) exposes for the selected network.
import hre from "hardhat";

async function main() {
  const accounts = (await hre.network.provider.request({ method: "eth_accounts" })) as string[];
  const from = process.env.MAINNET_DEPLOYER_ADDRESS!;
  let sendError = "";
  try {
    await Promise.race([
      hre.network.provider.request({
        method: "eth_sendTransaction",
        params: [{ from, to: from, value: "0x0" }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 20000)),
    ]);
    sendError = "NO_ERROR";
  } catch (e: any) {
    sendError = `${e?.constructor?.name ?? "Error"}: ${e?.message ?? e}`;
  }
  console.log("RESULT " + JSON.stringify({ accounts, sendError }));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
