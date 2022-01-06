const { App } = require("@slack/bolt");
const config = require("../config");
const util = require("./util");

const app = new App({
  signingSecret: config.SLACK_SIGNING_SECRET,
  token: config.SLACK_BOT_TOKEN,
});

async function getAllUsers() {
  const allUsers = await queryAllUsers();
  return allUsers;
}

async function queryAllUsers(cursor, level = 0) {
  if (level > 20) {
    console.error(
      `Reached ${level} recursive user list queries. Something is probably wrong.`
    );
    return [];
  }
  const response = await app.client.users.list({ cursor });
  const members = response.members;

  const nextCursor = response.response_metadata.next_cursor;
  if (!nextCursor) {
    return members;
  }
  const nextUsers = await queryAllUsers(nextCursor, level + 1);
  return members.concat(nextUsers);
}

async function getUsersById() {
  const users = await getAllUsers();
  const usersById = {};
  users
    .filter((user) => user.profile.email)
    .forEach((user) => {
      usersById[user.id] = user;
    });
  return usersById;
}

async function getGroupUsers(groupId) {
  const data = await app.client.usergroups.users.list({ usergroup: groupId });
  if (!data.ok) throw data.error || "unknown error";
  return data.users;
}

async function sendMessage(channel, options) {
  if (config.DRY_RUN) {
    console.log(
      `[DRY_RUN] Sending to Slack channel ${channel}: ${JSON.stringify(
        options
      )}`
    );
    return;
  }
  return await app.client.chat.postMessage({
    channel,
    ...options,
  });
}

async function addMembersToGroup(userIds, groupId) {
  const existingIds = await getGroupUsers(groupId);
  const updatedIds = util.removeDuplicates([...existingIds, ...userIds]);
  if (!config.DRY_RUN) {
    return await app.client.usergroups.users.update({
      usergroup: groupId,
      users: updatedIds.join(","),
    });
  }
}

module.exports = {
  getAllUsers,
  getUsersById,
  getGroupUsers,
  sendMessage,
  addMembersToGroup,
};
