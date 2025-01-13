import { App } from "@slack/bolt";
import { ChatPostMessageArguments } from "@slack/web-api";

import config from "../config";
import { Member } from "@slack/web-api/dist/types/response/UsersListResponse";
import { removeDuplicates } from "./util";

const app = new App({
  signingSecret: config.SLACK_SIGNING_SECRET,
  token: config.SLACK_BOT_TOKEN,
});

export async function getAllUsers() {
  return await queryAllUsers(undefined);
}

async function queryAllUsers(
  cursor: string | undefined,
  level = 0,
): Promise<Member[]> {
  if (level > 20) {
    console.error(
      `Reached ${level} recursive user list queries. Something is probably wrong.`,
    );
    return [];
  }
  const response = await app.client.users.list({ cursor });
  const members = response.members ?? [];

  const nextCursor = response.response_metadata?.next_cursor;
  if (!nextCursor) {
    return members;
  }
  const nextUsers = await queryAllUsers(nextCursor, level + 1);
  return members.concat(nextUsers);
}

export async function getUsersById() {
  const users = await getAllUsers();
  const usersById: { [key: string]: Member } = {};
  users
    .filter((user) => user.profile?.email)
    .forEach((user) => {
      usersById[user.id!] = user;
    });
  return usersById;
}

export async function getGroupUsers(groupId: string) {
  const data = await app.client.usergroups.users.list({ usergroup: groupId });
  if (!data.ok) throw data.error || "unknown error";
  return data.users ?? [];
}

export async function sendMessage(options: ChatPostMessageArguments) {
  if (config.DRY_RUN) {
    console.log(
      `[DRY_RUN] Sending to Slack channel ${options.channel}: ${JSON.stringify(
        options,
      )}`,
    );
    return;
  }
  return await app.client.chat.postMessage(options);
}

export async function addMembersToGroup(userIds: string[], groupId: string) {
  const existingIds = await getGroupUsers(groupId);
  const updatedIds = removeDuplicates([...existingIds, ...userIds]);
  if (!config.DRY_RUN) {
    return await app.client.usergroups.users.update({
      usergroup: groupId,
      users: updatedIds.join(","),
    });
  }
}

export async function setMembersInGroup(userIds: string[], groupId: string) {
  if (!config.DRY_RUN) {
    return await app.client.usergroups.users.update({
      usergroup: groupId,
      users: userIds.join(","),
    });
  }
}
