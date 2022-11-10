import { diffLists, removeDuplicates } from "./util";

describe("diffLists", () => {
  test("empty lists", () => {
    const diff = diffLists([], [], () => "");
    expect(diff).toStrictEqual({ added: [], removed: [], unchanged: [] });
  });

  test("only added or removed", () => {
    type Type = { id: number };
    const listA: Type[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const emptyList: Type[] = [];
    const onlyAdded = diffLists(emptyList, listA, (elem) => elem.id.toString());
    expect(onlyAdded).toStrictEqual({
      added: listA,
      removed: emptyList,
      unchanged: emptyList,
    });

    const onlyRemoved = diffLists(listA, emptyList, (elem) =>
      elem.id.toString()
    );
    expect(onlyRemoved).toStrictEqual({
      added: emptyList,
      removed: listA,
      unchanged: emptyList,
    });
  });

  test("all unchanged", () => {
    type Type = { id: number };
    const listA: Type[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const emptyList: Type[] = [];
    const allUnchanged = diffLists(listA, listA, (elem) => elem.id.toString());
    expect(allUnchanged).toStrictEqual({
      added: emptyList,
      removed: emptyList,
      unchanged: listA,
    });
  });

  test("both added and removed", () => {
    type Type = { id: number };
    const listA: Type[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const listB: Type[] = [{ id: 4 }, { id: 5 }, { id: 6 }];
    const emptyList: Type[] = [];

    const bothAddedAndRemoved = diffLists(listA, listB, (elem) =>
      elem.id.toString()
    );
    expect(bothAddedAndRemoved).toStrictEqual({
      added: listB,
      removed: listA,
      unchanged: emptyList,
    });
  });

  test("added, removed, and unchanged", () => {
    type Type = { id: number };
    const listA: Type[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const listB: Type[] = [{ id: 4 }, { id: 5 }, { id: 6 }];
    const commonElement = { id: 10 };

    const bothAddedAndRemoved = diffLists(
      [...listA, commonElement],
      [...listB, commonElement],
      (elem) => elem.id.toString()
    );
    expect(bothAddedAndRemoved).toStrictEqual({
      added: listB,
      removed: listA,
      unchanged: [commonElement],
    });
  });
});

describe("removeDuplicates", () => {
  test("empty list", () => {
    expect(removeDuplicates([])).toStrictEqual([]);
  });

  test("no duplicated", () => {
    const list = [1, 2, 3, 4, 5, 6];
    expect(removeDuplicates(list)).toStrictEqual(list);
  });

  test("all duplicates", () => {
    const list = [1, 1, 2, 2, 3, 3, 1, 1, 1, 2];
    expect(removeDuplicates(list)).toStrictEqual([1, 2, 3]);
  });

  test("some duplicates", () => {
    const list = [1, 3, 2, 1, 3, 4];
    expect(removeDuplicates(list)).toStrictEqual([1, 3, 2, 4]);
  });
});
