const fs = require("fs");
const teamkatalog = require("./lib/teamkatalog");
const slack = require("./lib/slack");
const config = require("./config");
const { writeFileAsJson, readFileAsJson, diffLists } = require("./lib/util");

const snapshotFile = "tmp/security-champions.snapshot.json";
const slackUsersCache = "tmp/users.json";

function getMemberDiff(currentSnapshot) {
  const previousSnapshot = fs.existsSync(snapshotFile)
    ? readFileAsJson(snapshotFile)
    : currentSnapshot;
  const identityMapper = (item) => item.group.id + "/" + item.navIdent;
  const diff = diffLists(previousSnapshot, currentSnapshot, identityMapper);
  if (!config.DRY_RUN) {
    writeFileAsJson(snapshotFile, currentSnapshot);
  }
  return diff;
}

async function loadSlackUsers() {
  if (fs.existsSync(slackUsersCache)) {
    return readFileAsJson(slackUsersCache);
  }
  const slackUsers = await slack.getAllUsers();
  if (!config.DRY_RUN) {
    writeFileAsJson(slackUsersCache, slackUsers);
  }
  return slackUsers;
}

function createLookupMap(list, lookupMapper) {
  const mappedItems = {};
  list.forEach((item) => (mappedItems[lookupMapper(item)] = item));
  return mappedItems;
}

async function lookupDiffUsersInSlack(diff) {
  const slackUsers = await loadSlackUsers();
  const slackByName = createLookupMap(slackUsers, (user) =>
    user.name?.toLowerCase()
  );
  const slackByEmail = createLookupMap(slackUsers, (user) =>
    user.profile?.email?.toLowerCase()
  );

  const mapper = (teamkatalogUser) => {
    const slackUser =
      slackByName[teamkatalogUser.navIdent.toLowerCase()] ??
      slackByEmail[teamkatalogUser.resource.email.toLowerCase()];
    return { ...teamkatalogUser, slackUser };
  };

  return {
    added: diff.added.map(mapper),
    removed: diff.removed.map(mapper),
    unchanged: diff.unchanged.map(mapper),
  };
}

function userSlackBlock(slackUser, markdownMessage) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: markdownMessage,
    },
    accessory: {
      type: "image",
      image_url: slackUser.profile.image_192,
      alt_text: slackUser.profile.real_name,
    },
  };
}

(async () => {
  const members = await teamkatalog.getMembersWithRole("SECURITY_CHAMPION");
  console.log(`Found ${members.length} security champions`);

  const diff = getMemberDiff(members);
  const diffWithSlack = await lookupDiffUsersInSlack(diff);
  console.log(
    `${diffWithSlack.added.length} added, ${diffWithSlack.removed.length} removed, ${diffWithSlack.unchanged.length} unchanged`
  );

  const addedBlocks = diffWithSlack.added.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:tada: Ny Security Champion i *<${user.group.links.ui} | ${user.group.name}>*\n:security-champion: <@${user.slackUser.id}>`
    )
  );
  const removedBlocks = diffWithSlack.removed.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:sadpanda: Security Champion fjernet fra *<${user.group.links.ui} | ${user.group.name}>*\n<@${user.slackUser.id}>`
    )
  );

  if (addedBlocks.length || removedBlocks.length) {
    await slack.sendMessageBlocks(config.SECURITY_CHAMPION_CHANNEL, [
      {
        type: "divider",
      },
      ...removedBlocks,
      ...addedBlocks,
    ]);
  }
})();
