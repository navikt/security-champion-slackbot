import config from "../config";
import * as teamkatalog from "../lib/teamkatalog";
import * as slack from "../lib/slack";
import * as storage from "../lib/storage";
import { diffLists, Diff } from "../lib/util";
import { ResourceMember, ResourceMemberWithGroup } from "../lib/teamkatalog";
import { Member } from "@slack/web-api/dist/types/response/UsersListResponse";

const snapshotFile = "security-champions.json";

async function getMemberDiff(currentSnapshot: ResourceMemberWithGroup[]) {
  const previousSnapshot = (await storage.fileExists(snapshotFile))
    ? JSON.parse((await storage.getFileContent(snapshotFile)).toString("utf8"))
    : currentSnapshot;
  const identityMapper = (item: ResourceMemberWithGroup) => item.navIdent;
  const diff = diffLists(previousSnapshot, currentSnapshot, identityMapper);

  if (!config.DRY_RUN) {
    const json = JSON.stringify(currentSnapshot, undefined, 2);
    await storage.setFileContents(snapshotFile, json);
  }
  return diff;
}

function createLookupMap<T>(
  list: T[],
  lookupMapper: (item: T) => string | undefined,
) {
  const mappedItems: { [key: string]: T } = {};
  list.forEach((item) => {
    const key = lookupMapper(item);
    if (key) {
      mappedItems[key] = item;
    }
  });
  return mappedItems;
}

type ResourceMemberWithGroupAndSlack = ResourceMemberWithGroup & {
  slackUser: Member | undefined;
};

async function lookupDiffUsersInSlack(diff: Diff<ResourceMemberWithGroup>) {
  const allSlackUsers = await slack.getAllUsers();
  const slackUsers = allSlackUsers.filter((slackUser) => !slackUser.deleted);
  const slackByName = createLookupMap(slackUsers, (user) =>
    user.name?.toLowerCase(),
  );
  const slackByEmail = createLookupMap(slackUsers, (user) =>
    user.profile?.email?.toLowerCase(),
  );

  // Filter out members who have left the company (have an endDate that's in the past)
  const isActiveMember = (member: ResourceMemberWithGroup): boolean => {
    const now = new Date();
    const endDate = member.resource?.endDate
      ? new Date(member.resource.endDate)
      : null;
    return !endDate || endDate > now;
  };

  // Apply the filter to all diff parts
  const activeDiff = {
    added: diff.added.filter(isActiveMember),
    removed: diff.removed.filter(isActiveMember),
    unchanged: diff.unchanged.filter(isActiveMember),
  };

  console.log(
    `Filtered out ${diff.added.length - activeDiff.added.length} inactive members from added`,
  );
  console.log(
    `Filtered out ${diff.removed.length - activeDiff.removed.length} inactive members from removed`,
  );
  console.log(
    `Filtered out ${diff.unchanged.length - activeDiff.unchanged.length} inactive members from unchanged`,
  );

  // Validate that all active members have email addresses
  const validateMembersWithEmail = (members: ResourceMemberWithGroup[]) => {
    const membersWithoutEmail = members.filter(
      (member) => !member.resource?.email,
    );
    if (membersWithoutEmail.length > 0) {
      console.error("ERROR: Found members without email addresses:");
      membersWithoutEmail.forEach((member) => {
        console.error(
          `  - ${member.navIdent}: ${member.resource?.fullName || "Unknown name"}`,
        );
      });
      console.error(
        "Email addresses are required for all members. Please fix the data and try again.",
      );
      process.exit(1);
    }
  };

  // Validate all members in the filtered diff
  validateMembersWithEmail(activeDiff.added);
  validateMembersWithEmail(activeDiff.removed);
  validateMembersWithEmail(activeDiff.unchanged);

  const mapper = (
    teamkatalogUser: ResourceMemberWithGroup,
  ): ResourceMemberWithGroupAndSlack => {
    const slackUser =
      (teamkatalogUser.navIdent
        ? slackByName[teamkatalogUser.navIdent.toLowerCase()]
        : undefined) ??
      (teamkatalogUser.resource?.email
        ? slackByEmail[teamkatalogUser.resource.email.toLowerCase()]
        : undefined);
    return { ...teamkatalogUser, slackUser };
  };

  const mappedDiff: Diff<ResourceMemberWithGroupAndSlack> = {
    added: activeDiff.added.map(mapper),
    removed: activeDiff.removed.map(mapper),
    unchanged: activeDiff.unchanged.map(mapper),
  };
  return mappedDiff;
}

function simpleBlock(markdownMessage: string) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: markdownMessage,
    },
  };
}

function userSlackBlock(
  slackUser: Member | undefined,
  markdownMessage: string,
) {
  if (!slackUser) return simpleBlock(markdownMessage);

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: markdownMessage,
    },
    accessory: {
      type: "image",
      image_url: slackUser.profile?.image_192,
      alt_text: slackUser.profile?.real_name,
    },
  };
}

function formatSimpleUserList(userList: ResourceMemberWithGroupAndSlack[]) {
  return userList.map((user) =>
    user.slackUser
      ? `- <@${user.slackUser.id}> (<${user.group.links.ui} | ${user.group.name}>)`
      : `- <${user.group.links.ui} | ${user.group.name})`,
  );
}

function formatTeamkatalogUser(tkUser: ResourceMember) {
  return `${tkUser.navIdent} (${tkUser.resource?.email})`;
}

async function handleModifiedChampions(all: ResourceMemberWithGroupAndSlack[]) {
  try {
    const nonExistingUsers = all.filter((user) => !user.slackUser);
    if (nonExistingUsers.length > 0) {
      console.log(
        "Users not found in Slack, removing from Slack group:",
        nonExistingUsers.map(formatTeamkatalogUser),
      );
    }

    const slackUserIds = all
      .filter((user) => user.slackUser)
      .map((user) => user.slackUser?.id)
      .filter((id): id is string => id !== undefined);
    await slack.setMembersInGroup(
      slackUserIds,
      config.SECURITY_CHAMPION_SLACK_USERGROUP,
    );
  } catch (e) {
    console.error("Error updating slack user group", e);
  }
}

async function handleAddedChampions(added: ResourceMemberWithGroupAndSlack[]) {
  const simpleMessageParts = [
    "Nye Security Champions:",
    ...formatSimpleUserList(added),
  ];
  const messageBlocks = added.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:tada: *<${user.group.links.ui} | ${
        user.group.name
      }>* har fått seg en ny Security Champion!\n:security-champion: ${
        user.resource.fullName
      }${user.slackUser ? ` (<@${user.slackUser.id}>)` : ""}`,
    ),
  );

  const outroBlock = simpleBlock(
    `Velkommen! :meow_wave: :security-pepperkake:\nSjekk <https://sikkerhet.nav.no/docs/ny-security-champion | «Ny Security Champion»> for praktiske oppgaver å starte med :muscle:`,
  );

  await slack.sendMessage({
    channel: config.SECURITY_CHAMPION_CHANNEL,
    text: simpleMessageParts.join("\n"),
    blocks: [...messageBlocks, outroBlock],
    unfurl_links: false,
  });
}

async function handleRemovedChampions(
  removed: ResourceMemberWithGroupAndSlack[],
) {
  const simpleMessageParts = [
    "Fjernede Security Champions:",
    ...formatSimpleUserList(removed),
  ];
  const messageBlocks = removed.map((user) =>
    userSlackBlock(
      user.slackUser,
      `:sadpanda-t: Security Champion fjernet fra *<${user.group.links.ui} | ${
        user.group.name
      }>*\n${
        user.slackUser ? `<@${user.slackUser.id}>` : user.resource.fullName
      }`,
    ),
  );

  await slack.sendMessage({
    channel: config.SECURITY_CHAMPION_ADMIN_CHANNEL,
    text: simpleMessageParts.join("\n"),
    blocks: [...messageBlocks],
  });
}

async function handleDiff(
  diffWithSlack: Diff<ResourceMemberWithGroupAndSlack>,
) {
  const { added, removed, unchanged } = diffWithSlack;
  console.log(
    `${added.length} added, ${removed.length} removed, ${unchanged.length} unchanged`,
  );

  await handleModifiedChampions([...unchanged, ...added]);

  if (added.length) {
    await handleAddedChampions(added);
  }
  if (removed.length) {
    await handleRemovedChampions(removed);
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
  const changesDetected = diff.added.length > 0 || diff.removed.length > 0;
  if (changesDetected || config.FORCE_UPDATE) {
    const diffWithSlack = await lookupDiffUsersInSlack(diff);
    await handleDiff(diffWithSlack);
  } else {
    console.log(`No changes detected (${diff.unchanged.length} unchanged)`);
  }
};
