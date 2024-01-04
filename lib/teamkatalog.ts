import fetch from "cross-fetch";
import config from "../config";

type TeamkatalogResourceType = "team" | "productarea" | "cluster";
type TeamkatalogRole = string;

async function getResource(resourceType: TeamkatalogResourceType) {
  const response = await fetch(
    `${config.TEAMKATALOG_API_URL}/${resourceType}`,
    {
      headers: {
        cookie: `MRHSession=${config.TEAMKATALOG_MRH_SESSION}`,
        accept: "application/json",
        "Nav-Consumer-Id": "security-champion-slackbot"
      },
    }
  );
  return await response.json();
}

export type ResourceMember = {
  navIdent: string;
  roles: TeamkatalogRole[];
  resource: {
    navIdent: string;
    email: string;
    fullName: string;
    resourceType: "INTERNAL" | "EXTERNAL";
  };
};

type Resource = {
  id: string;
  name: string;
  members: ResourceMember[];
  links: {
    ui: string;
  };
};

export async function getAllMemberGroups() {
  const types: TeamkatalogResourceType[] = ["team", "productarea", "cluster"];
  const responses = await Promise.all(types.map((type) => getResource(type)));
  return responses.flatMap((resp) => resp.content as Resource[]);
}

export type ResourceMemberWithGroup = ResourceMember & {
  group: Resource;
};

export async function getMembersWithRole(
  role: TeamkatalogRole
): Promise<ResourceMemberWithGroup[]> {
  const groups = await getAllMemberGroups();
  const allMembers = groups.flatMap((group) =>
    group.members.map((member) => ({ ...member, group }))
  );
  return allMembers.filter((member) => member.roles.includes(role));
}
