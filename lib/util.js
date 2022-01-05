const fs = require("fs");

function readFileAsJson(filename) {
  const json = fs.readFileSync(filename, { encoding: "utf8" });
  return JSON.parse(json);
}
function writeFileAsJson(filename, data) {
  const json = JSON.stringify(data, undefined, 2);
  fs.writeFileSync(filename, json, { encoding: "utf8" });
}

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
  readFileAsJson,
  writeFileAsJson,
  diffLists,
};
