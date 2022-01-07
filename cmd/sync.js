const teamkatalog = require("../lib/teamkatalog");
const slack = require("../lib/slack");
const config = require("../config");
const { diffLists } = require("../lib/util");
const storage = require("../lib/storage");

const snapshotFile = "security-champions.json";

async function getMemberDiff(currentSnapshot) {
  const previousSnapshot = (await storage.fileExists(snapshotFile))
    ? JSON.parse((await storage.getFileContent(snapshotFile)).toString("utf8"))
    : currentSnapshot;
  const identityMapper = (item) => item.group.id + "/" + item.navIdent;
  const diff = diffLists(previousSnapshot, currentSnapshot, identityMapper);

  if (!config.DRY_RUN) {
    const json = JSON.stringify(currentSnapshot, undefined, 2);
    await storage.setFileContents(snapshotFile, json);
  }
  return diff;
}

function createLookupMap(list, lookupMapper) {
  const mappedItems = {};
  list.forEach((item) => (mappedItems[lookupMapper(item)] = item));
  return mappedItems;
}

async function lookupDiffUsersInSlack(diff) {
  const slackUsers = await slack.getAllUsers();
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

function formatSimpleUserList(userList) {
  return userList.map(
    (user) =>
      `- <@${user.slackUser.id}> (<${user.group.links.ui} | ${user.group.name}>)`
  );
}

async function handleAddedChampions(added) {
  try {
    const addedSlackUserIds = added.map((user) => user.slackUser.id);
    await slack.addMembersToGroup(
      addedSlackUserIds,
      config.SECURITY_CHAMPION_SLACK_USERGROUP
    );
  } catch (e) {
    console.error("Error updating slack user group", e);
  }

  const simpleMessageParts = [
    "Nye Security Champions:",
    ...formatSimpleUserList(added),
  ];
  const messageBlocks = added.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:tada: *<${user.group.links.ui} | ${user.group.name}>* har fått seg en ny Security Champion!\n:security-champion: ${user.slackUser.profile.real_name} (<@${user.slackUser.id}>)\n\nVelkommen! :meow_wave: :security-pepperkake:`
    )
  );

  await slack.sendMessage(config.SECURITY_CHAMPION_CHANNEL, {
    text: simpleMessageParts.join("\n"),
    blocks: [...messageBlocks],
  });
}

async function handleRemovedChampons(removed) {
  const simpleMessageParts = [
    "Fjernede Security Champions:",
    ...formatSimpleUserList(removed),
  ];
  const messageBlocks = removed.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:sadpanda: Security Champion fjernet fra *<${user.group.links.ui} | ${user.group.name}>*\n<@${user.slackUser.id}>`
    )
  );

  await slack.sendMessage(config.SECURITY_CHAMPION_ADMIN_CHANNEL, {
    text: simpleMessageParts.join("\n"),
    blocks: [...messageBlocks],
  });
}

async function handleDiff(diffWithSlack) {
  const { added, removed, unchanged } = diffWithSlack;
  console.log(
    `${added.length} added, ${removed.length} removed, ${unchanged.length} unchanged`
  );

  if (added.length) {
    await handleAddedChampions(added);
  }
  if (removed.length) {
    await handleRemovedChampons(removed);
  }
}

module.exports = async function cmdSync() {
  const members = await teamkatalog.getMembersWithRole("SECURITY_CHAMPION");
  if (!members.length) {
    console.error("Could not find any security champions");
    process.exit(1);
  }

  console.log(`Found ${members.length} security champions`);

  const diff = await getMemberDiff(members);
  if (diff.added.length === 0 && diff.removed.length === 0) {
    console.log(`No changes detected (${diff.unchanged.length} unchanged)`);
    return;
  }

  const diffWithSlack = await lookupDiffUsersInSlack(diff);
  await handleDiff(diffWithSlack);
};
