import { expect, test } from "vitest";

test("element should not have children attribute", async () => {
  document.body.append(<div id="children-test" />);
  await expect.element(document.getElementById("children-test")).not.toHaveAttribute("children");
});
