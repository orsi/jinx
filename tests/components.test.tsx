import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { useState } from "jinx";

describe("Components", () => {
  test("returns array of mixed values", async () => {
    const Comp = () => [1, "hi", 2, 3, 4];
    document.body.appendChild(<Comp />);
    await expect.element(page.getByText("1hi234")).toBeInTheDocument();
  });

  test("returns array with conditional element", async () => {
    const Comp = () => [1, "hi", false ? <span>true</span> : <span>false</span>];
    document.body.appendChild(<Comp />);

    await expect.element(page.getByText(/1hi/)).toBeInTheDocument();
    const span = document.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.innerHTML).toContain("false");
  });

  test("returns string", async () => {
    const Comp = () => "hi";
    document.body.appendChild(<Comp />);
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  });

  test("returns number", async () => {
    const Comp = () => 4;
    document.body.appendChild(<Comp />);
    await expect.element(page.getByText("4")).toBeInTheDocument();
  });

  test("returns true boolean, renders empty", async () => {
    const Comp = () => true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<Comp />);
    expect(container.innerText).toBe("");
  });

  test("returns false boolean, renders empty", async () => {
    const Comp = () => false;
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<Comp />);
    expect(container.innerText).toBe("");
  });

  test("props propagated correctly to child component", async () => {
    let PropsTestState: any;

    const Counter = ({ count }: { count: number }) => (
      <div id="counter">
        {count} is{` `}
        {count % 2 === 0 ? <small id="even">EVEN!</small> : <small id="odd">ODD!</small>}
      </div>
    );

    const PropsTest = () => {
      PropsTestState = useState(0);
      const [count] = PropsTestState;
      return <Counter count={count} />;
    };

    document.body.appendChild(<PropsTest />);

    PropsTestState[1](10);
    const counter = document.querySelector<HTMLElement>("#counter")!;
    expect(counter).not.toBeNull();
    expect(counter.innerText).toContain("10");
    expect(counter.innerText).toContain("EVEN!");
  });

  test("nesting with awkward children", async () => {
    let testButtonState: any;
    const childText = "I'm a child";

    const OneMore = () => " ...hi";
    const NestedStuff = () => (
      <span>
        <OneMore />
      </span>
    );

    interface TestButton extends JSX.PropsWithChildren {
      message?: string;
    }
    const TestButton = ({ children, message }: TestButton) => {
      let [count, setCount] = (testButtonState = useState(1));
      return (
        <>
          <button onClick={() => setCount(++count)}>
            {children} {count}
          </button>
          <NestedStuff />
          <br />
          Count: {count} is {count % 2 === 0 ? "even" : <span>odd</span>}
          <br />
          <div id="bordered" style={{ border: "5px solid red" }}>
            <div>
              <div>yo</div>
            </div>
            {message}
          </div>
          {children}
        </>
      );
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.appendChild(<TestButton message="hello">{childText}</TestButton>);

    testButtonState[1](2);
    expect(container.innerText).toContain("even");
    expect(container.childNodes[0]?.textContent).toContain(childText);
    expect(container.childNodes[9]?.textContent).toBe(childText);
  });
});
