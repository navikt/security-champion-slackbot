const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const cmdSync = require("./cmd/sync");
const cmdTestStorage = require("./cmd/test-storage");

yargs(hideBin(process.argv))
  .command("sync", "synchronize security champions list", () => {}, cmdSync)
  .command("test-storage", "test storage", () => {}, cmdTestStorage)
  .demandCommand(1)
  .parse();
