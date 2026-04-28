import { beforeEach, describe, expect, test } from "vitest";
import { useState } from "jinx";
import { page } from "vitest/browser";

describe("Integrations", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("replace element with array on toggle", async () => {
    let ReplaceElementWithArrayState: any;
    const ReplaceElementWithArray = () => {
      const [toggle] = (ReplaceElementWithArrayState = useState(true));
      return toggle ? <div>hi</div> : ["good", "bye"];
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<ReplaceElementWithArray />);

    ReplaceElementWithArrayState[1]((value: boolean) => !value);
    expect(container.textContent).toBe("goodbye");
  });

  test("replace array with element on toggle", async () => {
    let ReplaceArrayWithElementState: any;
    const ReplaceArrayWithElement = () => {
      const [toggle] = (ReplaceArrayWithElementState = useState(true));
      return toggle ? ["good", "bye"] : <div>hi</div>;
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<ReplaceArrayWithElement />);

    ReplaceArrayWithElementState[1]((value: boolean) => !value);
    expect(container.textContent).toBe("hi");
  });

  test("replace different element type on toggle", async () => {
    let ReplaceDiffElementState: any;
    const ReplaceDifferentElement = () => {
      const [toggle, setToggle] = (ReplaceDiffElementState = useState(true));
      const swap = () => setToggle(!toggle);
      return toggle ? <div>hi</div> : <span>bye</span>;
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<ReplaceDifferentElement />);

    ReplaceDiffElementState[1]((value: boolean) => !value);
    expect(container.textContent).toBe("bye");
  });

  test("fragments: nested and toggling in dom", async () => {
    let FragmentTestState: any;
    const FragmentTest = ({ children }: JSX.PropsWithChildren) => {
      FragmentTestState = useState(0);
      const [count] = FragmentTestState;
      return (
        <>
          <>one, </>
          {count % 3 === 0 ? children : "muahaha!"}
        </>
      );
    };

    document.body.appendChild(
      <FragmentTest>
        <>two, </>
        <>three</>
      </FragmentTest>
    );

    await expect.element(page.getByText("one, two, three")).toBeInTheDocument();
    FragmentTestState[1](2);
    await expect.element(page.getByText("one, muahaha!")).toBeInTheDocument();
    FragmentTestState[1](3);
    await expect.element(page.getByText("one, two, three")).toBeInTheDocument();
  });
});
