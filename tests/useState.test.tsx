import { beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { useState } from "jinx";

describe("useState", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("should render state value", async () => {
    const MyComponent = () => {
      const [value] = useState(1);
      return <small>{value}</small>;
    };

    document.body.append(<MyComponent />);
    await expect.element(page.getByText("1")).toBeInTheDocument();
  });

  test("should not update on setting same value", () => {
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

  test("updates on setting different state", async () => {
    let RenderOnDifferentStateTestState: any;
    const RenderOnDifferentStateTest = () => {
      RenderOnDifferentStateTestState = useState(1);
      return (
        <small>
          {RenderOnDifferentStateTestState[0]} ={">"} setState(2)
        </small>
      );
    };

    document.body.appendChild(<RenderOnDifferentStateTest />);

    const didUpdate = RenderOnDifferentStateTestState[1](2);
    expect(didUpdate).toBe(true);
  });

  test("changes to null then back to value", async () => {
    let NullStateTestState: any;
    const NullStateTest = () => {
      NullStateTestState = useState(1);
      const [data] = NullStateTestState;
      return data;
    };

    document.body.appendChild(<NullStateTest />);

    NullStateTestState[1](null);
    expect(document.body.childNodes[0]).toBeInstanceOf(Comment);
    NullStateTestState[1](3);
    expect(document.body.childNodes[0]).toBeInstanceOf(Text);
    expect(document.body.childNodes[0]?.textContent).toBe("3");
  });

  test("changes to undefined", async () => {
    let UndefinedStateTestState: any;
    const UndefinedStateTest = () => {
      UndefinedStateTestState = useState("hi");
      const [data] = UndefinedStateTestState;
      return data;
    };

    document.body.appendChild(<UndefinedStateTest />);
    UndefinedStateTestState[1](undefined);
    expect(document.body.childNodes[0]).toBeInstanceOf(Comment);
  });

  test("update to 2 and isolated fragment stays in dom", async () => {
    let state: any;
    function Test({ children }: JSX.PropsWithChildren) {
      state = useState(0);
      const [count, setCount] = state;
      return (
        <>
          <button onClick={() => setCount(count + 1)}>Push me {count}</button>
          {children}
        </>
      );
    }

    document.body.appendChild(
      <Test>
        <>hi</>
      </Test>
    );

    state[1](2);
    await expect.element(page.getByText(/Push me 2/)).toBeInTheDocument();
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  });

  test("replace same element type on toggle", async () => {
    let ReplaceSameElementState: any;
    const ReplaceSameElement = () => {
      const [toggle] = (ReplaceSameElementState = useState(true));
      return toggle ? <div>hi</div> : <div>bye</div>;
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<ReplaceSameElement />);

    ReplaceSameElementState[1]((value: boolean) => !value);
    expect(container.textContent).toBe("bye");
  });
});
