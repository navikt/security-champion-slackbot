const fs = require("fs");
const teamkatalog = require("../lib/teamkatalog");
const slack = require("../lib/slack");
const config = require("../config");
const { writeFileAsJson, readFileAsJson, diffLists } = require("../lib/util");

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

async function broadcastDiff(diffWithSlack) {
  const { added, removed, unchanged } = diffWithSlack;
  if (added.length === 0 || removed.length === 0) {
    console.log(`No changes detected (${unchanged.length} unchanged)`);
    return;
  }
  console.log(
    `${added.length} added, ${removed.length} removed, ${unchanged.length} unchanged`
  );

  const addedBlocks = added.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:tada: Ny Security Champion i *<${user.group.links.ui} | ${user.group.name}>*\n:security-champion: <@${user.slackUser.id}>`
    )
  );
  const removedBlocks = removed.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:sadpanda: Security Champion fjernet fra *<${user.group.links.ui} | ${user.group.name}>*\n<@${user.slackUser.id}>`
    )
  );

  const simpleMessageParts = ["Oppdatering av Security Champions"];
  if (added.length) {
    const addedMessages = added.map(
      (user) =>
        `- <@${user.slackUser.id}> (<${user.group.links.ui} | ${user.group.name}>)`
    );
    simpleMessageParts.push("*Lagt til:*", ...addedMessages);
  }
  if (removed.length) {
    const removedMessages = removed.map(
      (user) =>
        `- <@${user.slackUser.id}> (<${user.group.links.ui} | ${user.group.name}>)`
    );
    simpleMessageParts.push("*Fjernet:*", ...removedMessages);
  }

  await slack.sendMessage(config.SECURITY_CHAMPION_CHANNEL, {
    text: simpleMessageParts.join("\n"),
    blocks: [
      {
        type: "divider",
      },
      ...removedBlocks,
      ...addedBlocks,
    ],
  });
}

module.exports = async function cmdSync() {
  const members = await teamkatalog.getMembersWithRole("SECURITY_CHAMPION");
  if (!members.length) {
    console.error("Could not find any security champions");
    process.exit(1);
  }

  console.log(`Found ${members.length} security champions`);

  const diff = getMemberDiff(members);
  const diffWithSlack = await lookupDiffUsersInSlack(diff);

  await broadcastDiff(diffWithSlack);
};
