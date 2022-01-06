const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const cmdSync = require("./cmd/sync");

yargs(hideBin(process.argv))
  .command("sync", "synchronize security champions list", () => {}, cmdSync)
  .demandCommand(1)
  .parse();
