const fs = require("fs");

function diffLists(oldList, newList, identityMapper = JSON.stringify) {
  const oldIdentities = oldList.map(identityMapper);
  const newIdentities = newList.map(identityMapper);

  const removed = oldList.filter((item) => {
    const identity = identityMapper(item);
    return !newIdentities.includes(identity);
  });
  const added = newList.filter((item) => {
    const identity = identityMapper(item);
    return !oldIdentities.includes(identity);
  });
  const unchanged = newList.filter((item) => {
    const identity = identityMapper(item);
    return oldIdentities.includes(identity) && newIdentities.includes(identity);
  });

  return { added, removed, unchanged };
}

module.exports = {
  diffLists,
};
