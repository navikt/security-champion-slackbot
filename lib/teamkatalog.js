const fetch = require("cross-fetch");
const config = require("../config");

async function getResource(resourceType) {
  const response = await fetch(
    `${config.TEAMKATALOG_API_URL}/${resourceType}`,
    {
      headers: {
        cookie: `MRHSession=${config.TEAMKATALOG_MRH_SESSION}`,
        accept: "application/json",
      },
    }
  );
  return await response.json();
}

async function getAllMemberGroups() {
  const types = ["team", "productarea", "cluster"];
  const responses = await Promise.all(types.map((type) => getResource(type)));
  return responses.flatMap((resp) => resp.content);
}

async function getMembersWithRole(role) {
  const groups = await getAllMemberGroups();
  const allMembers = groups.flatMap((group) =>
    group.members.map((member) => ({ ...member, group }))
  );
  return allMembers.filter((member) => member.roles.includes(role));
}

module.exports = {
  getAllMemberGroups,
  getMembersWithRole,
};
