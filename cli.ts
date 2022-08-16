const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const cmdSync = require("./cmd/sync");
const cmdTestStorage = require("./cmd/test-storage");
const cmdGetSlackUsers = require("./cmd/get-slack-users");

yargs(hideBin(process.argv))
  .command("sync", "synchronize security champions list", () => {}, cmdSync)
  .command("test-storage", "test storage", () => {}, cmdTestStorage)
  .command("get-slack-users", "get slack users", () => {}, cmdGetSlackUsers)
  .demandCommand(1)
  .parse();
