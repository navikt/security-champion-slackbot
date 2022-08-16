export type Diff<T> = { added: T[]; removed: T[]; unchanged: T[] };

export function diffLists<T>(
  oldList: T[],
  newList: T[],
  identityMapper: (t: T) => string = JSON.stringify
): Diff<T> {
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

export function removeDuplicates<T>(list: T[]): T[] {
  return [...new Set(list)];
}
