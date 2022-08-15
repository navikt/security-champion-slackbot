const slack = require("../lib/slack");
const fs = require("fs");

module.exports = async function cmdGetSlackUsers() {
  const users = await slack.getAllUsers();

  console.log(`Found ${users.length} Slack users`);
  fs.writeFileSync(
    "tmp/slack-users.json",
    JSON.stringify(users, undefined, 2),
    { encoding: "utf8" }
  );
};
