import { diffLists } from "./util";

describe("diffLists", () => {
  test("empty lists", () => {
    const diff = diffLists([], [], () => "");
    expect(diff).toStrictEqual({ added: [], removed: [], unchanged: [] });
  });
});
