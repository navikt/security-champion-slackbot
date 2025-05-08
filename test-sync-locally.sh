#!/bin/bash

# Check if security-champions.json exists in the root folder
if [ ! -f "security-champions.json" ]; then
    echo "ERROR: security-champions.json file not found in the root folder."
    echo "Please download it from the bucket before running this script."
    echo "You can use the following command to download it:"
    echo "gsutil cp gs://[YOUR-BUCKET-NAME]/security-champions.json ."
    exit 1
fi

# Set environment variables for local testing
export DRY_RUN=true
export FORCE_UPDATE=true  # Force update to ensure the script runs even if no changes are detected

# Required environment variables (using dummy values for local testing)
export SLACK_SIGNING_SECRET="dummy-secret-for-local-testing"
export SLACK_BOT_TOKEN="dummy-token-for-local-testing"
export SECURITY_CHAMPION_CHANNEL="dummy-channel"
export SECURITY_CHAMPION_ADMIN_CHANNEL="dummy-admin-channel"
export SECURITY_CHAMPION_SLACK_USERGROUP="dummy-usergroup"

# Uncomment one of the following lines to choose behavior:
SKIP_EMAIL_VALIDATION=false # Keep email validation (default behavior)

# Create a temporary mock implementation file for teamkatalog API
cat > mock-teamkatalog.ts << EOF
import fs from 'fs';

// Use the existing security-champions.json file for mock data
export async function getMembersWithRole(role: string) {
  console.log(\`[MOCK] Getting members with role: \${role}\`);
  
  try {
    // Read the existing security-champions.json file
    const data = fs.readFileSync('security-champions.json', 'utf8');
    const members = JSON.parse(data);
    console.log(\`[MOCK] Found \${members.length} members in security-champions.json\`);
    return members;
  } catch (error) {
    console.error(\`[MOCK] Error reading security-champions.json: \${error}\`);
    return [];
  }
}
EOF

# Create a temporary mock implementation file for Slack API
cat > mock-slack.ts << EOF
// Define a simplified Member type to match what the code expects
export interface SlackProfile {
  email?: string;
  real_name?: string;
  image_192?: string;
}

export interface Member {
  id?: string;
  name?: string;
  deleted?: boolean;
  profile?: SlackProfile;
}

export async function getAllUsers(): Promise<Member[]> {
  console.log('[MOCK] Getting all Slack users');
  // Return an array with some mock Slack users
  return [
    {
      id: 'U12345',
      name: 'user1',
      deleted: false,
      profile: {
        email: 'user1@example.com',
        real_name: 'User One',
        image_192: 'https://example.com/img.png'
      }
    },
    {
      id: 'U67890',
      name: 'user2',
      deleted: false,
      profile: {
        email: 'user2@example.com',
        real_name: 'User Two',
        image_192: 'https://example.com/img2.png'
      }
    }
  ];
}

export async function setMembersInGroup(userIds: string[], userGroupId: string) {
  console.log(\`[MOCK] Setting \${userIds.length} members in Slack group: \${userGroupId}\`);
  return true;
}

export async function sendMessage(message: any) {
  console.log('[MOCK] Sending message to Slack');
  console.log(JSON.stringify(message, null, 2));
  return true;
}
EOF

# Create temporary mock implementation file
cat > test-sync.ts << EOF
// Import original modules
import config from "./config";
import * as storage from "./lib/storage";
import { diffLists, Diff } from "./lib/util";
import { ResourceMember, ResourceMemberWithGroup } from "./lib/teamkatalog";

// Import our mock implementations
import * as teamkatalog from "./mock-teamkatalog";
import * as slack from "./mock-slack";
import { Member } from "./mock-slack";

// Get environment variable for skipping validation
const SKIP_EMAIL_VALIDATION = ${SKIP_EMAIL_VALIDATION};

// Type definitions and copied code from sync.ts
const snapshotFile = "security-champions.json";

type ResourceMemberWithGroupAndSlack = ResourceMemberWithGroup & {
  slackUser: Member | undefined;
};

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

async function lookupDiffUsersInSlack(diff: Diff<ResourceMemberWithGroup>) {
  const allSlackUsers = await slack.getAllUsers();
  const slackUsers = allSlackUsers.filter((slackUser) => !slackUser.deleted);
  const slackByName = createLookupMap(slackUsers, (user) =>
    user.name?.toLowerCase(),
  );
  const slackByEmail = createLookupMap(slackUsers, (user) =>
    user.profile?.email?.toLowerCase(),
  );

  // Validate that all members have email addresses
  const validateMembersWithEmail = (members: ResourceMemberWithGroup[]) => {
    if (SKIP_EMAIL_VALIDATION) {
      console.log("[MOCK] Skipping email validation for testing purposes");
      return;
    }
    
    const membersWithoutEmail = members.filter(member => !member.resource?.email);
    if (membersWithoutEmail.length > 0) {
      console.error("ERROR: Found members without email addresses:");
      membersWithoutEmail.forEach(member => {
        console.error(\`  - \${member.navIdent}: \${member.resource?.fullName || 'Unknown name'}\`);
      });
      console.error("Email addresses are required for all members. Please fix the data and try again.");
      process.exit(1);
    }
  };

  // Validate all members in the diff
  validateMembersWithEmail(diff.added);
  validateMembersWithEmail(diff.removed);
  validateMembersWithEmail(diff.unchanged);

  const mapper = (
    teamkatalogUser: ResourceMemberWithGroup,
  ): ResourceMemberWithGroupAndSlack => {
    // For testing without emails, provide a default empty string for email
    const email = teamkatalogUser.resource?.email || (SKIP_EMAIL_VALIDATION ? "" : undefined);
    
    const slackUser =
      (teamkatalogUser.navIdent ? slackByName[teamkatalogUser.navIdent.toLowerCase()] : undefined) ??
      (email ? slackByEmail[email.toLowerCase()] : undefined);
    return { ...teamkatalogUser, slackUser };
  };

  const mappedDiff: Diff<ResourceMemberWithGroupAndSlack> = {
    added: diff.added.map(mapper),
    removed: diff.removed.map(mapper),
    unchanged: diff.unchanged.map(mapper),
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

function userSlackBlock(slackUser: Member | undefined, markdownMessage: string) {
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
      ? \`- <@\${user.slackUser.id}> (<\${user.group.links.ui} | \${user.group.name}>)\`
      : \`- <\${user.group.links.ui} | \${user.group.name})\`,
  );
}

function formatTeamkatalogUser(tkUser: ResourceMember) {
  return \`\${tkUser.navIdent} (\${tkUser.resource?.email || 'no-email'})\`;
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
      \`:tada: *<\${user.group.links.ui} | \${
        user.group.name
      }>* har fått seg en ny Security Champion!\n:security-champion: \${
        user.resource.fullName
      }\${user.slackUser ? \` (<@\${user.slackUser.id}>)\` : ""}\`,
    ),
  );

  const outroBlock = simpleBlock(
    \`Velkommen! :meow_wave: :security-pepperkake:\nSjekk <https://sikkerhet.nav.no/docs/ny-security-champion | «Ny Security Champion»> for praktiske oppgaver å starte med :muscle:\`,
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
      \`:sadpanda-t: Security Champion fjernet fra *<\${user.group.links.ui} | \${
        user.group.name
      }>*\n\${
        user.slackUser ? \`<@\${user.slackUser.id}>\` : user.resource.fullName
      }\`,
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
    \`\${added.length} added, \${removed.length} removed, \${unchanged.length} unchanged\`,
  );

  await handleModifiedChampions([...unchanged, ...added]);

  if (added.length) {
    await handleAddedChampions(added);
  }
  if (removed.length) {
    await handleRemovedChampions(removed);
  }
}

// Export the sync function
export async function cmdSync() {
  const members = await teamkatalog.getMembersWithRole("SECURITY_CHAMPION");
  if (!members.length) {
    console.error("Could not find any security champions");
    process.exit(1);
  }

  console.log(\`Found \${members.length} security champions\`);

  const diff = await getMemberDiff(members);
  const changesDetected = diff.added.length > 0 || diff.removed.length > 0;
  if (changesDetected || config.FORCE_UPDATE) {
    const diffWithSlack = await lookupDiffUsersInSlack(diff);
    await handleDiff(diffWithSlack);
  } else {
    console.log(\`No changes detected (\${diff.unchanged.length} unchanged)\`);
  }
}
EOF

echo "Running local test with mock implementations"
echo "This will use the existing security-champions.json file for testing"
echo "No changes will be made to Slack or the security-champions.json file (DRY_RUN=true)"
echo "(Email validation is ${SKIP_EMAIL_VALIDATION:+DISABLED}${SKIP_EMAIL_VALIDATION:+ENABLED})"

# Run the test sync script with our mocks
npx ts-node -e "import { cmdSync } from './test-sync'; cmdSync().then(() => console.log('Test completed')).catch(err => { console.error('Error:', err); process.exit(1); });"

# Clean up temporary files
rm -f mock-teamkatalog.ts mock-slack.ts test-sync.ts