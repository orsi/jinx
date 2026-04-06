import { expect, test } from "vitest";
import { useState } from "jinx";

test("state should not update on setting same value", () => {
    let DoNotRenderSameStateTestState: any;
  const DoNotRenderSameStateTest = () => {
    DoNotRenderSameStateTestState = useState(1);
    return (
      <small id="test">
        {DoNotRenderSameStateTestState[0]} ={">"} setState(1)
      </small>
    );
  };

  document.body.append(<DoNotRenderSameStateTest />);
  expect(DoNotRenderSameStateTestState[1](1)).toBeFalsy();
});
