import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DataProvenanceModule = buildModule("DataProvenance", (m) => {
  const dataProvenance = m.contract("DataProvenance");
  return { dataProvenance };
});

export default DataProvenanceModule;
